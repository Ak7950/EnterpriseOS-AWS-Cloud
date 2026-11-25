# Security

## 1. Application security (inherited, preserved and re-tested)

| Control | Implementation |
|---|---|
| Authentication | bcrypt (cost 12) password hashes; JWT HS256, 8-hour expiry; `JWT_SECRET` ≥ 32 chars, development secret rejected in production |
| First login | Admin-created users get a random one-time password and `must_change_password`; every API except change-password returns 403 until changed |
| Authorisation | Role middleware (`allow(...)`) + row-level scoping: managers only see/decide for direct reports and their own projects; employees only their own records |
| Multi-tenancy | Every SQL statement filters by `organization_id` from the signed token |
| SQL injection | All values use `pg` parameter placeholders (`$1…`). Dynamic SQL only concatenates fixed fragments chosen by role, never user input |
| Input limits | JSON body limit 100 kB; enum validation for roles, task status and leave decisions |
| Brute force | 5 failed logins per client IP → 15-minute lock (`429`) |
| Headers | CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS in production, `X-Powered-By` removed |
| CORS | Explicit allow-list; production refuses to start without one |
| Errors | Generic messages to clients; details only in server logs |

## 2. Cloud-specific controls added

| Risk | Control | Verified by |
|---|---|---|
| Secrets in code, Git, env vars or images | Secrets live only in **SSM Parameter Store SecureStrings**, loaded at cold start; the template has no secret parameters; Lambda env vars hold only a *path* | `test/infrastructure.test.js` "secrets are never placed in Lambda environment variables" |
| Over-broad parameter access | Loader copies only `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`; never overwrites existing env; never logs values | `cloud-units.test.js` |
| Client IP spoofing (rate-limit bypass) | Bridge **overwrites** `X-Forwarded-For` with the AWS-verified `sourceIp`; Express trusts exactly one loopback hop | `lambda-api-handler.test.js` rate-limit test |
| Loopback server exposure | Binds to `127.0.0.1` on an ephemeral port inside the Lambda sandbox only | code review |
| Excessive IAM permissions (normal accounts) | Per-function inline policies: exact actions on exact ARNs, no `*` actions/resources, no `logs:CreateLogGroup` | test "no IAM Allow statement grants wildcard…" |
| Excessive IAM permissions (Academy) | Not fixable — `LabRole` is broad and role creation is blocked. **Accepted sandbox risk**, documented; least-privilege policies are provided for real accounts | `infrastructure/iam/` |
| Data in transit to SQS | Queue policy denies any request without TLS (`aws:SecureTransport=false`) | test "queues are encrypted, TLS-only…" |
| Data at rest | SQS SSE (SQS-managed keys), SecureStrings with `aws/ssm`, CloudWatch Logs encrypted by default | template |
| PII in events, logs and e-mails | Events carry IDs, type, status and title only; SNS summaries contain IDs, no names or e-mails; access logs omit query strings | worker test asserts no `@` in messages |
| Denial-of-wallet | HTTP API stage throttling, max 100 rps enforced by parameter constraints, optional reserved concurrency, alarms, cleanup script | `cost-analysis.md` §4 |
| Unnecessary public access | No S3 bucket is public; SAM's artifact bucket is private; only the app endpoint is public | template review |
| Supply chain | One new **dev-only** dependency (`yaml`, zero dependencies); runtime adds none (AWS SDK v3 is provided by the Lambda runtime); `npm audit` in CI | `docs/evidence/npm-audit.txt` |
| Committed secrets | `scripts/check-secrets.sh` in CI (AWS keys, private keys, tokens, credentialed DB URLs, `.env` files); canary-tested | `docs/evidence/package-smoke-and-secret-scan.txt` |
| CI credentials | No AWS secrets in workflow files; deploy/cleanup are **manual**, need a typed phrase, use an `aws-academy` environment and short-lived session credentials; `permissions: contents: read` | test "GitHub workflows never deploy automatically…" |
| Ephemeral demo data on a public URL | Demo users (password `Demo@12345`, documented) are synthetic; data resets on cold start; stack is meant to live only for the evaluation | `architecture.md` §6 |

## 3. Known limitations and accepted risks

1. **LabRole** grants far more than needed (Academy restriction). Mitigation: short-lived
   stack, no real data, least-privilege roles used automatically in normal accounts.
2. **Rate limiting is per container** (in-memory `Map`). A distributed store (DynamoDB,
   designed in ADR-007) would make it global.
3. **Disallowed CORS origins return HTTP 500** (the `cors` callback error reaches the
   generic error handler). Pre-existing behaviour; the request is still rejected and no
   CORS headers are sent. Returning 403 is listed as future work.
4. JWTs are stored in `sessionStorage` (pre-existing design); a strict CSP without
   `unsafe-inline` scripts reduces XSS risk.
5. Function URL mode has no request throttling — prefer `HttpApi`.

## 4. Audit results (2026-11-25)

* `npm audit` (all and production-only): **0 vulnerabilities**.
* `cfn-lint 1.61.0`: **0 errors, 0 warnings**.
* ShellCheck: **0 findings**.
* Secret scan: **passed**; canary test confirmed it detects AWS keys and credentialed
  PostgreSQL URLs.
* Manual review: no `eval`, no shell execution from request data, no string-interpolated
  user input in SQL.
