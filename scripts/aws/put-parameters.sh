#!/usr/bin/env bash
# Creates the SecureString parameters the API reads at cold start.
# - JWT_SECRET is generated locally with openssl and never printed.
# - DATABASE_URL is optional (only for DatabaseMode=postgresql) and is read
#   silently from the terminal. Never use the original project's production DB.
# Standard-tier parameters encrypted with the AWS managed key (aws/ssm) have no
# Parameter Store charge.
# shellcheck source=SCRIPTDIR/common.sh
source "$(dirname "$0")/common.sh"
require_command aws
require_command openssl
require_allowed_region
require_valid_names

put_secure() {
  local name="$1" value="$2"
  # Value is passed via a temporary file readable only by this user so it never
  # appears in the process list or shell history.
  local tmp
  tmp="$(mktemp)"; chmod 600 "${tmp}"
  printf '%s' "${value}" > "${tmp}"
  aws ssm put-parameter --name "${name}" --type SecureString --tier Standard \
    --value "file://${tmp}" --overwrite --tags "Key=Project,Value=EnterpriseOS" "Key=Stage,Value=${STAGE}" >/dev/null 2>&1 \
  || aws ssm put-parameter --name "${name}" --type SecureString --tier Standard --value "file://${tmp}" --overwrite >/dev/null
  rm -f "${tmp}"
  info "Stored ${name} (SecureString, value not shown)"
}

jwt_name="${SSM_PARAMETER_PATH}JWT_SECRET"
if aws ssm get-parameter --name "${jwt_name}" >/dev/null 2>&1 && [[ "${ROTATE_JWT_SECRET:-}" != "yes" ]]; then
  info "${jwt_name} already exists (set ROTATE_JWT_SECRET=yes to rotate; this signs out all users)."
else
  put_secure "${jwt_name}" "$(openssl rand -base64 48 | tr -d '\n')"
fi

if [[ "${SET_DATABASE_URL:-}" == "yes" ]]; then
  read -r -s -p "PostgreSQL DATABASE_URL for this NON-production stage (input hidden): " database_url; echo
  [[ "${database_url}" =~ ^postgres(ql)?:// ]] || fail "Not a PostgreSQL connection string."
  put_secure "${SSM_PARAMETER_PATH}DATABASE_URL" "${database_url}"
  unset database_url
fi
