#!/usr/bin/env bash
# Lightweight secret scan over every tracked and staged file. Fails the build if
# anything that looks like a credential is found. Known, intentional local-only
# placeholders are allow-listed explicitly below.
set -euo pipefail
cd "$(dirname "$0")/.."

files=()
while IFS= read -r line; do files+=("$line"); done < <( { git ls-files; git diff --cached --name-only --diff-filter=AM 2>/dev/null || true; } | sort -u | grep -v '^package-lock.json$' )
status=0

for f in "${files[@]}"; do
  [[ -f "$f" ]] || continue
  case "$f" in
    .env|.env.*) [[ "$f" == ".env.example" ]] || { echo "Tracked environment file: $f"; status=1; } ;;
    *.pem|*.key|*.p12|*.pfx|*credentials*) echo "Tracked key/credential file: $f"; status=1 ;;
  esac
done

patterns=(
  'AKIA[0-9A-Z]{16}'                                  # AWS access key ID
  'ASIA[0-9A-Z]{16}'                                  # AWS temporary access key ID
  'aws_secret_access_key[[:space:]]*[=:]'             # AWS credentials file entry
  'aws_session_token[[:space:]]*[=:]'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'ghp_[A-Za-z0-9]{36}'                               # GitHub token
  'github_pat_[A-Za-z0-9_]{40,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'                      # Slack token
  'sk_live_[A-Za-z0-9]{10,}'
  'postgres(ql)?://[^:/[:space:]]+:[^@[:space:]]+@'   # connection string with password
  'neon\.tech'
)
# Intentional, non-secret placeholders: local Docker Compose database and test fixtures.
allow='docker-compose.yml:.*enterpriseos:enterpriseos@postgres|test/.*(db\.example\.test|user:pw@)|scripts/check-secrets.sh|docs/.*neon\.tech'

for pattern in "${patterns[@]}"; do
  if matches="$(grep -nIE -e "$pattern" -- "${files[@]}" 2>/dev/null | grep -vE "$allow")"; then
    echo "Possible secret ($pattern):"; echo "$matches" | sed -E 's/(.{0,120}).*/  \1/'
    status=1
  fi
done

if [[ $status -ne 0 ]]; then echo "Secret scan FAILED"; exit 1; fi
echo "Secret scan passed (${#files[@]} files checked)."
