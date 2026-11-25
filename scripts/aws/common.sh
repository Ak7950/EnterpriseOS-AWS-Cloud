#!/usr/bin/env bash
# Shared settings and guard-rails for the AWS scripts. Sourced, not executed.
# Nothing in these scripts ever prints credentials, secret values or the full
# AWS account ID.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export REPO_ROOT
STAGE="${STAGE:-dev}"
STACK_NAME="${STACK_NAME:-enterpriseos-${STAGE}}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SSM_PARAMETER_PATH="${SSM_PARAMETER_PATH:-/enterpriseos/${STAGE}/}"
# AWS Academy Learner Lab only permits these regions.
ALLOWED_REGIONS="${ALLOWED_REGIONS:-us-east-1 us-west-2}"
export STAGE STACK_NAME AWS_REGION SSM_PARAMETER_PATH ALLOWED_REGIONS
export AWS_PAGER=""

info() { printf '\033[1;34m[enterpriseos]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warning]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[blocked]\033[0m %s\n' "$*" >&2; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is not installed. Use AWS CloudShell (it ships the AWS CLI and SAM CLI) or install it."
}

require_allowed_region() {
  case " ${ALLOWED_REGIONS} " in
    *" ${AWS_REGION} "*) ;;
    *) fail "Region ${AWS_REGION} is not in the permitted list (${ALLOWED_REGIONS})." ;;
  esac
}

require_valid_names() {
  [[ "${STAGE}" =~ ^[a-z][a-z0-9-]{1,15}$ ]] || fail "STAGE must match ^[a-z][a-z0-9-]{1,15}$"
  [[ "${STACK_NAME}" =~ ^[a-zA-Z][a-zA-Z0-9-]{1,40}$ ]] || fail "STACK_NAME is invalid."
}

masked_account() {
  local account
  account="$(aws sts get-caller-identity --query Account --output text)"
  printf '********%s' "${account: -4}"
}

confirm() {
  local prompt="$1" expected="$2" answer
  if [[ "${NONINTERACTIVE:-}" == "yes" ]]; then return 0; fi
  read -r -p "${prompt} Type '${expected}' to continue: " answer
  [[ "${answer}" == "${expected}" ]] || fail "Not confirmed."
}
