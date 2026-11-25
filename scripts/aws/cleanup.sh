#!/usr/bin/env bash
# Deletes everything the deployment created and verifies the deletion.
#
#   STAGE=dev bash scripts/aws/cleanup.sh
#   DELETE_PARAMETERS=yes   also delete /enterpriseos/<stage>/ SecureStrings
#   DELETE_SAM_BUCKET=yes   also empty and delete the SAM artifact bucket stack
# shellcheck source=SCRIPTDIR/common.sh
source "$(dirname "$0")/common.sh"
require_command aws
require_allowed_region
require_valid_names

confirm "This permanently deletes stack ${STACK_NAME} in ${AWS_REGION} and its queues, topics, functions and logs." "${STACK_NAME}"

if aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1; then
  info "Deleting stack ${STACK_NAME}"
  aws cloudformation delete-stack --stack-name "${STACK_NAME}"
  aws cloudformation wait stack-delete-complete --stack-name "${STACK_NAME}"
  info "Stack deleted."
else
  info "Stack ${STACK_NAME} does not exist."
fi

# Lambda can recreate a log group if an invocation was in flight during deletion.
for group in "/aws/lambda/${STACK_NAME}-api" "/aws/lambda/${STACK_NAME}-worker" "/enterpriseos/${STACK_NAME}/http-api-access"; do
  if aws logs describe-log-groups --log-group-name-prefix "${group}" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -qx "${group}"; then
    aws logs delete-log-group --log-group-name "${group}" && info "Deleted leftover log group ${group}"
  fi
done

if [[ "${DELETE_PARAMETERS:-}" == "yes" ]]; then
  names="$(aws ssm get-parameters-by-path --path "${SSM_PARAMETER_PATH}" --query 'Parameters[].Name' --output text)"
  for name in ${names}; do aws ssm delete-parameter --name "${name}" && info "Deleted parameter ${name}"; done
fi

if [[ "${DELETE_SAM_BUCKET:-}" == "yes" ]]; then
  sam_stack="aws-sam-cli-managed-default"
  bucket="$(aws cloudformation describe-stack-resource --stack-name "${sam_stack}" --logical-resource-id SamCliSourceBucket --query StackResourceDetail.PhysicalResourceId --output text 2>/dev/null || true)"
  if [[ -n "${bucket}" && "${bucket}" != "None" ]]; then
    info "Emptying versioned SAM artifact bucket"
    while :; do
      batch="$(aws s3api list-object-versions --bucket "${bucket}" --max-items 500 --output json --query '{Objects: [Versions[].{Key:Key,VersionId:VersionId}, DeleteMarkers[].{Key:Key,VersionId:VersionId}][] }')"
      [[ "$(echo "${batch}" | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("Objects") or []))')" == "0" ]] && break
      aws s3api delete-objects --bucket "${bucket}" --delete "${batch}" >/dev/null
    done
    aws cloudformation delete-stack --stack-name "${sam_stack}"
    aws cloudformation wait stack-delete-complete --stack-name "${sam_stack}"
    info "SAM artifact bucket stack deleted."
  fi
fi

info "Verifying cleanup"
leftover=0
aws cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1 && { warn "Stack still exists"; leftover=1; }
for fn in "${STACK_NAME}-api" "${STACK_NAME}-worker"; do
  aws lambda get-function --function-name "${fn}" >/dev/null 2>&1 && { warn "Function ${fn} still exists"; leftover=1; }
done
queues="$(aws sqs list-queues --queue-name-prefix "${STACK_NAME}-events" --query 'QueueUrls' --output text 2>/dev/null || true)"
[[ -n "${queues}" && "${queues}" != "None" ]] && { warn "Queues still exist (SQS deletion can take up to 60s)"; leftover=1; }
if [[ ${leftover} -eq 0 ]]; then info "Cleanup verified: no EnterpriseOS resources remain for ${STACK_NAME}."; else fail "Some resources remain - see warnings above."; fi
