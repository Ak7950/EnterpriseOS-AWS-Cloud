#!/usr/bin/env bash
# Read-only pre-deployment checks. Creates nothing and changes nothing.
# Usage: STAGE=dev AWS_REGION=us-east-1 bash scripts/aws/preflight.sh
# shellcheck source=SCRIPTDIR/common.sh
source "$(dirname "$0")/common.sh"

status=0
check() { if "$@"; then :; else status=1; fi; }
pass() { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
miss() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; return 1; }
note() { printf '  \033[33mINFO\033[0m %s\n' "$*"; }

info "Pre-flight checks for stack ${STACK_NAME} in ${AWS_REGION}"
require_valid_names
require_command aws
check require_allowed_region && pass "Region ${AWS_REGION} is permitted"

if aws sts get-caller-identity >/dev/null 2>&1; then
  pass "AWS credentials are valid (account $(masked_account))"
  arn="$(aws sts get-caller-identity --query Arn --output text)"
  case "${arn}" in
    *assumed-role/voclabs/*|*assumed-role/vocstartsoft/*) pass "Caller is an AWS Academy lab role" ;;
    *) note "Caller is not a recognised AWS Academy lab role - confirm this is NOT a personal billable account." ;;
  esac
else
  miss "No valid AWS credentials (Learner Lab session may have expired - restart the lab)."; status=1
fi

if command -v sam >/dev/null 2>&1; then pass "SAM CLI $(sam --version 2>/dev/null | awk '{print $NF}')"; else miss "SAM CLI not installed (AWS CloudShell includes it)"; status=1; fi

if aws iam get-role --role-name LabRole >/dev/null 2>&1; then
  pass "LabRole exists - it will be used as the Lambda execution role"
else
  note "LabRole not found - template will try to create least-privilege roles (fails in AWS Academy)."
fi

if aws ssm get-parameter --name "${SSM_PARAMETER_PATH}JWT_SECRET" --query Parameter.Type --output text >/dev/null 2>&1; then
  pass "SecureString ${SSM_PARAMETER_PATH}JWT_SECRET exists (value not read)"
else
  miss "Missing ${SSM_PARAMETER_PATH}JWT_SECRET - run scripts/aws/put-parameters.sh"; status=1
fi

for probe in "lambda list-functions --max-items 1" "sqs list-queues --max-results 1" "sns list-topics" "cloudformation list-stacks --max-items 1" "logs describe-log-groups --limit 1"; do
  # shellcheck disable=SC2086
  if aws ${probe} >/dev/null 2>&1; then pass "Read access: ${probe%% *}"; else miss "No read access to ${probe%% *}"; status=1; fi
done
if aws apigatewayv2 get-apis --max-results 1 >/dev/null 2>&1; then
  pass "Read access: apigatewayv2 (FRONT_DOOR=HttpApi is possible)"
else
  note "API Gateway not readable - use FRONT_DOOR=FunctionUrl"
fi

existing="$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || true)"
if [[ -n "${existing}" && "${existing}" != "None" ]]; then note "Stack already exists with status ${existing} (deploy will update it)"; else pass "No existing stack named ${STACK_NAME}"; fi

if [[ "${CONFIRM_COST_CHECKLIST:-}" == "yes" ]]; then
  pass "Operator confirmed docs/pre-deployment-checklist.md (CONFIRM_COST_CHECKLIST=yes)"
else
  miss "Complete docs/pre-deployment-checklist.md, then set CONFIRM_COST_CHECKLIST=yes"; status=1
fi

if [[ ${status} -ne 0 ]]; then fail "Pre-flight failed. Nothing was deployed."; fi
info "Pre-flight passed."
