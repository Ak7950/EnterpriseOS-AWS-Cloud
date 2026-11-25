# Project Handoff and Release Status

## Repository and release

- Public repository: https://github.com/Ak7950/EnterpriseOS
- Default branch: `main`
- Production release is merged into `main`.
- Release pull request: https://github.com/Ak7950/EnterpriseOS/pull/1
- Merge commit: `43612418c3ce616109c15b20414ccfe797a8e176`
- Latest post-release documentation commit: recorded in repository history.

## Current Production application

https://enterprise-os-alpha.vercel.app/

This is the current Production URL. It was opened in an incognito browser and the following pages were visually smoke-tested: dashboard, people directory, departments, projects, execution board, attendance, leave center, notifications, and audit trail. The attendance clock-in/dashboard count/clock-out flow was verified on the India-local date.

## Submitted IEEE report link

The submitted report contains this earlier Preview URL:

https://enterprise-ra6w4zeh7-ak795.vercel.app/

This is a deployment-specific generated URL for the earlier Preview build. Vercel generates unique URLs for individual deployments; the current Production application uses the separate URL above. The submitted report PDF and its source/ZIP have not been modified.

## Verified application data

The demonstrated Neon workspace contains synthetic example records:

- One Engineering department.
- Three accounts: one Super Admin and two employees.
- One active project.
- Three tasks across To Do, In Progress, and Done.
- Attendance records for November 17 and 18, 2026.

## Verification

- GitHub Actions on the release: 21 tests passed, 0 failed.
- The recorded production dependency audit found 0 vulnerabilities.
- Production visual smoke tests covered major application pages.
- The attendance API regression test covers clock-in work date, dashboard attendance count, and clock-out.
- Leave request creation/approval has not been exercised end to end.
- A full browser end-to-end suite, load test, penetration test, and dedicated PostgreSQL integration suite have not been completed.

## Operational safeguards

- Never commit `.env` or real secrets.
- Do not run demo seeding in production.
- Do not rerun the first-administrator bootstrap against an organization that already has an administrator.
- Run database migrations explicitly against the intended PostgreSQL/Neon database.
- Keep Production credentials separate from Preview credentials.

## Local verification commands

```bash
npm ci
npm test
npm audit --omit=dev
git diff --check
```
