# Technical baseline report

Recorded on 2026-11-25 against the imported code (commit `3b3800f`), before any AWS change.

## Repository

| Item | Finding |
|---|---|
| Location | `~/Desktop/EnterpriseOS-AWS-Cloud`, Git root, branch `main`, no prior commits (fresh history) |
| Remote | `origin` → `github.com/Ak7950/EnterpriseOS-AWS-Cloud` (private, empty); original repo **not** a remote |
| Size | `server/` 7 files (~360 lines), `public/` SPA (`app.js` 659 lines), 5 test files |

## Architecture as found

* **Backend:** Express 4 (ES modules). All 24 API routes plus the SPA fallback are in `server/index.js`; `auth.js` handles
  JWT/bcrypt/roles, `db.js` the pool and migrations, `seed.js` the synthetic data, and `time.js` the
  India-date helper.
* **Database:** PostgreSQL through `pg`. The schema is idempotent `CREATE TABLE IF NOT EXISTS` in
  `migrate()`, with 10 tables (organizations, departments, users, attendance, leave_requests,
  projects, tasks, performance_reviews, notifications, audit_logs). When `DATABASE_URL` is empty,
  `pg-mem` is used, and this is refused when `NODE_ENV=production`.
* **Auth:** HS256 JWT (8 h) carrying `sub`, `org`, `role` and `passwordChangeRequired`. The secret
  must be ≥ 32 chars. Per-IP login lockout after 5 failures.
* **Frontend:** a vanilla JS SPA that stores the token in `sessionStorage` and makes up to 4 parallel
  API calls per view.
* **Config:** `.env.example` covers `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET` and
  `CORS_ORIGIN`. It also reads Vercel URL environment variables.
* **Deployment (original):** Vercel entry point `index.js`, Dockerfile (node:24-alpine), and a
  docker-compose with local Postgres. Its credentials are local placeholders only.
* **CI:** a single job running `npm ci` and `npm test` on Node 24.

## Baseline results

| Check | Result |
|---|---|
| `npm ci` | 0 vulnerabilities reported |
| `npm test` | **21 tests, 21 passed, 0 failed** (~3 s) |
| `npm audit` | **0 vulnerabilities** |
| `npm outdated` | Major versions available (bcryptjs 3, dotenv 18, express 5) and a pg patch. No upgrade was made: majors carry breaking-change risk and the audit is clean |
| Build | No build step |
| Manual smoke | `/` 200; demo login returns a JWT; `/api/dashboard` without a token returns 401 |
| Secret scan | Only intentional local placeholders (docker-compose dev DB, test fixture host `db.example.test`) |

## Hardcoded configuration / observations

* Port 4000 default, a 15-minute/5-attempt lockout, and a 100 kB body limit are inline constants (acceptable).
* The `Asia/Kolkata` time zone is hardcoded by design (India work date).
* The original docs referenced the production Vercel URL and Neon. They were moved to
  `docs/legacy/` so they are not mistaken for this project's deployment.
* Found later through new tests: two manager SQL statements that pg-mem cannot execute (see the
  testing report).
