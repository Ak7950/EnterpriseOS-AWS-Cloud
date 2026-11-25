# Testing and Verification

## Automated test runner

EnterpriseOS uses Node.js's built-in test runner. Run the suite with:

~~~bash
npm test
~~~

The latest GitHub Actions run recorded **21 tests passed, 0 failed**. The production-dependency audit during CI recorded **0 vulnerabilities**. Run the same checks locally with:

~~~bash
npm audit --omit=dev
~~~

The updated feature branch has a successful CI run. Your local checkout should also be updated and tested before considering local verification complete.

## Test coverage areas

The current automated tests cover:

- JWT claim creation, missing/weak secret rejection, and rejection of the known development secret in production.
- Bearer-token authentication and role-authorization middleware behavior.
- Manager task assignment and employee visibility boundaries.
- Rejection of unauthorized Super Admin creation.
- Unique employee initial passwords and mandatory first-login password change behavior.
- Local SPA asset behavior and JSON responses for unknown API routes.
- Safe administrator-bootstrap configuration, transaction behavior, and duplicate-administrator rejection.
- In-memory development startup initialization.
- India-local date helper behavior around UTC/IST date boundaries.
- Attendance API behavior: clock-in work date, dashboard attendance count, and clock-out all use the India-local work date.

## Dependency audit

Run:

~~~bash
npm audit
npm audit --omit=dev
~~~

The previously recorded audit returned zero vulnerabilities. Audit results can change when dependency advisories are published, so check again before release.

## Verification limits

The current suite is not a comprehensive browser end-to-end suite. It does not provide code-coverage measurement, load testing, penetration testing, or a full integration run against a dedicated Neon test database. Local pg-mem behavior can differ from PostgreSQL; validate migrations and important database behavior against a non-production PostgreSQL/Neon branch before a Production release.

## CI

GitHub Actions runs npm ci and npm test for pull requests and pushes to main and feature/** branches, using Node.js 24.
