# Testing report

All results below were produced by commands actually run on 2026-11-25 (macOS, Node
v24.13.0). Raw output is in [`evidence/`](evidence/).

## 1. Baseline (imported code, before any change)

| Check | Result |
|---|---|
| `npm ci` | OK |
| `npm test` | **21 / 21 passed**, 0 failed |
| `npm audit` | 0 vulnerabilities |
| Manual smoke (`node server/index.js`) | `/` → 200, demo login → JWT issued, `/api/dashboard` without token → 401 |
| Build | No build step (plain ES modules) |

## 2. After the AWS work

| Suite | Tests | Result |
|---|---|---|
| Original suites (`app-security`, `auth`, `bootstrap-admin`, `startup`, `time`) | 21 | **21 passed** — unchanged |
| `cloud-config.test.js` — DB mode guard, health endpoint, deterministic seed IDs | 4 | passed |
| `cloud-units.test.js` — HTTP bridge, SSM loader, event publisher, SQS worker, logger | 12 | passed |
| `lambda-api-handler.test.js` — end-to-end Lambda events through the real Express app | 11 | passed |
| `infrastructure.test.js` — template and workflow guard-rails, queue timing and worker concurrency | 9 | passed |
| `scripts.test.js` — pre-flight refuses non-Academy AWS identities (personal-spend guard) | 2 | passed |
| **Total** | **59** | **59 passed, 0 failed** |

Other validation:

| Command | Result |
|---|---|
| `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities |
| `cfn-lint infrastructure/template.yaml` (v1.61.0) | 0 errors, 0 warnings |
| `shellcheck scripts/*.sh scripts/aws/*.sh` | 0 findings |
| `actionlint .github/workflows/*.yml` (v1.7.12) | 0 findings |
| `npm run package:lambda` | 2,008 files, 12.4 MiB unzipped, production dependencies only |
| `npm run smoke:lambda` (built artifact) | `/health` 200, UI 200, login 200, worker contract OK |
| `bash scripts/check-secrets.sh` | passed; a planted fake AWS key and credentialed DB URL were detected (canary test), then removed |
| Guard-rail scripts without AWS CLI / with a disallowed region | refused with a clear message, exit 1 |

## 3. What the new tests prove

* **API behaviour through Lambda:** health, static UI, login, `/api/me`, dashboard auth.
* **Authentication / authorisation:** invalid tokens rejected; a marketing manager cannot
  decide leave for an engineering employee (404); managers can update only their projects'
  tasks.
* **Security:** CORS rejects unknown origins; security headers and HSTS present; rate
  limiting is per client IP and cannot be bypassed with a forged `X-Forwarded-For`.
* **Event processing:** leave decisions publish a versioned `LEAVE_DECIDED` event; publisher
  failures never break requests; the worker validates the contract, fans out PII-free
  messages and reports only failed records for retry.
* **Configuration:** production refuses the in-memory DB unless `DEMO_EPHEMERAL_DATABASE`
  is exactly `true`; a real `DATABASE_URL` always wins; the SSM loader pages results, copies
  only allow-listed names and never overwrites env.
* **Infrastructure:** no NAT/ALB/EC2/RDS/EIP/Secrets Manager; no wildcard IAM; no secrets in
  env vars; log retention set; queues encrypted, TLS-only, with a DLQ; throttling present;
  deploy/cleanup workflows are manual-only.

## 4. Pre-existing defects found

| Defect | Impact | Fix |
|---|---|---|
| `PUT /api/leaves/:id/decision` used a correlated sub-query (`leave_requests.user_id`) that pg-mem cannot execute | Leave approvals failed with HTTP 500 in local/in-memory mode (worked on real PostgreSQL) | Rewritten to the equivalent `user_id IN (SELECT id FROM users WHERE manager_id=$6)` |
| `PUT /api/tasks/:id/status` (manager branch) used the same pattern with `tasks.project_id` | Managers could not move tasks in in-memory mode | Rewritten to `project_id IN (SELECT id FROM projects WHERE manager_id=$4)` |
| Disallowed CORS origin returns 500 instead of 403 | Cosmetic; request is still rejected | Documented, not changed |

Both rewrites keep identical semantics on PostgreSQL and are covered by new regression tests.

## 5. Not tested (and why)

* **Real AWS execution** — now covered: deployed and verified on 26 Nov 2026 (see `evidence/aws-deployment-2026-11-26.txt`). The first deploy exposed two defects no local check could catch (an empty SAM parameter override, and an SQS policy statement naming two queues); both were fixed, covered by tests and redeployed successfully.
* **Real PostgreSQL** — no non-production PostgreSQL server is available locally (Docker is
  not installed). The existing `pg`-based code path is unchanged.
* **Browser UI automation** — the frontend is unchanged; it was exercised through the same
  HTTP requests the UI makes.
