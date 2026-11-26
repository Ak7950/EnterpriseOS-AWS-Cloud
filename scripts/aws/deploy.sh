#!/usr/bin/env bash
# Deploys the EnterpriseOS stack. Refuses to run unless pre-flight passes and the
# operator has completed docs/pre-deployment-checklist.md.
#
#   CONFIRM_COST_CHECKLIST=yes STAGE=dev FRONT_DOOR=HttpApi bash scripts/aws/deploy.sh
#
# Optional: DATABASE_MODE=postgresql (needs DATABASE_URL in SSM), ALERT_EMAIL=...,
#           LAMBDA_ROLE_ARN=... (auto-detected LabRole otherwise)
# shellcheck source=SCRIPTDIR/common.sh
source "$(dirname "$0")/common.sh"

FRONT_DOOR="${FRONT_DOOR:-HttpApi}"
DATABASE_MODE="${DATABASE_MODE:-ephemeral-demo}"
APP_VERSION="${APP_VERSION:-$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo local)}"
[[ "${FRONT_DOOR}" =~ ^(HttpApi|FunctionUrl)$ ]] || fail "FRONT_DOOR must be HttpApi or FunctionUrl"
[[ "${DATABASE_MODE}" =~ ^(ephemeral-demo|postgresql)$ ]] || fail "DATABASE_MODE must be ephemeral-demo or postgresql"

bash "${REPO_ROOT}/scripts/aws/preflight.sh"
require_command sam
require_command npm

if [[ -z "${LAMBDA_ROLE_ARN:-}" ]]; then
  LAMBDA_ROLE_ARN="$(aws iam get-role --role-name LabRole --query Role.Arn --output text 2>/dev/null || true)"
fi
if [[ -n "${LAMBDA_ROLE_ARN}" ]]; then info "Using existing execution role (LabRole)"; else info "Creating least-privilege execution roles"; fi

if [[ "${SKIP_TESTS:-}" != "yes" ]]; then
  info "Running the test suite"
  (cd "${REPO_ROOT}" && npm test >/dev/null) || fail "Tests failed - not deploying."
fi
info "Packaging Lambda code"
(cd "${REPO_ROOT}" && node scripts/package-lambda.mjs && node scripts/smoke-lambda-package.mjs)

confirm "About to deploy stack ${STACK_NAME} to ${AWS_REGION} (front door ${FRONT_DOOR}, database ${DATABASE_MODE})." "deploy"

# SAM rejects empty values ("Key="), so optional parameters are only passed when
# set; the template defaults apply otherwise (e.g. empty LambdaRoleArn = create roles).
overrides=(
  "StageName=${STAGE}"
  "AppVersion=${APP_VERSION}"
  "FrontDoor=${FRONT_DOOR}"
  "DatabaseMode=${DATABASE_MODE}"
  "SsmParameterPath=${SSM_PARAMETER_PATH}"
)
[[ -n "${LAMBDA_ROLE_ARN}" ]] && overrides+=("LambdaRoleArn=${LAMBDA_ROLE_ARN}")
[[ -n "${ALERT_EMAIL:-}" ]] && overrides+=("AlertEmail=${ALERT_EMAIL}")

changeset_flag="--confirm-changeset"
[[ "${NONINTERACTIVE:-}" == "yes" ]] && changeset_flag="--no-confirm-changeset"

sam deploy \
  --template-file "${REPO_ROOT}/infrastructure/template.yaml" \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --no-fail-on-empty-changeset \
  "${changeset_flag}" \
  --tags "Project=EnterpriseOS" "Stage=${STAGE}" "Owner=student-academy-lab" \
  --parameter-overrides "${overrides[@]}"

app_url="$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${AWS_REGION}" --query "Stacks[0].Outputs[?OutputKey=='AppUrl'].OutputValue" --output text)"
info "Application URL: ${app_url}"
info "Smoke test: ${app_url%/}/health"
for attempt in 1 2 3 4 5; do
  if curl -fsS --max-time 20 "${app_url%/}/health"; then echo; info "Deployment healthy."; exit 0; fi
  warn "Health check attempt ${attempt} failed, retrying in 5s"; sleep 5
done
fail "Stack deployed but /health did not succeed. Check CloudWatch Logs: /aws/lambda/${STACK_NAME}-api"
