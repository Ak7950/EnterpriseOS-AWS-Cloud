# Deployment Guide

## Current release status

The current Production application is available at:

**https://enterprise-os-alpha.vercel.app/**

The Production domain is attached to the Vercel project and was opened successfully in an incognito browser. The dashboard, People Directory, Departments, Projects, Execution Board, Attendance Hub, Leave Center page, Notifications, and Audit Trail were smoke-tested against the connected Neon database. The attendance clock-in/dashboard count/clock-out flow was verified using the Asia/Kolkata work date. GitHub Actions passed 21 automated tests on the merged `main` release; the recorded production dependency audit reported 0 vulnerabilities.

The submitted IEEE report contains the earlier deployment-specific Preview URL:

**https://enterprise-ra6w4zeh7-ak795.vercel.app/**

That generated URL identifies the earlier Preview deployment and should not be represented as the latest Production build. The report file has not been modified. For the latest deployed application, use the Production URL at the top of this section.

The leave request approval workflow has not been exercised end to end. Full browser end-to-end, load, penetration, and dedicated PostgreSQL integration testing have not been performed.

## Hosting architecture

- **Vercel:** hosts the root Express entry point and serves the browser's static assets.
- **Express / Node.js:** handles the JSON API routes under /api.
- **Neon PostgreSQL:** stores persistent organization and application data.
- **GitHub:** stores the source repository and triggers the configured GitHub Actions workflow.

The root index.js default-exports the Express application. server/index.js does not run migrations or demo seeding as a side effect of a Vercel request or cold start.

## Neon database setup

1. Create or select the Neon PostgreSQL project and database.
2. Copy the pooled PostgreSQL connection string from Neon. Keep its credentials private.
3. Store the connection string as DATABASE_URL in the Vercel project's environment variables.
4. Use the intended Neon database/branch for the migration. Do not run demo seeding against a public or production database.

## Vercel environment variables

Configure the following variables in Project Settings → Environment Variables. Preview and Production scopes are separate; configure each intentionally.

| Variable | Value |
| --- | --- |
| DATABASE_URL | Neon PostgreSQL pooled connection string. |
| JWT_SECRET | A unique random secret with at least 32 characters. Use a different value for Production and Preview. |
| NODE_ENV | production for the hosted production environment. |
| CORS_ORIGIN | Comma-separated allowlist containing the canonical browser origin(s), including the intended Production domain. |

Never paste credentials into source files, screenshots, issues, chat, or commits. Never upload .env. The .env.example file contains placeholders only.

Vercel provides deployment hostname environment variables which the application also recognizes. An explicit CORS_ORIGIN allowlist is still recommended so the intended browser origins are clear.

## Apply the database schema

Run migrations from a trusted terminal against the intended Neon database:

~~~bash
npm ci
npm run db:migrate
~~~

Set DATABASE_URL in the terminal environment before running the command. Do not place the connection string in a command that will be saved in shell history. Migrations are an explicit deployment operation; the application does not apply them during an HTTP request or serverless cold start.

## First administrator bootstrap

Use npm run db:bootstrap-admin only when the target database/organization does not already contain an Admin or Super Admin. The command uses PostgreSQL, a transaction, and an advisory transaction lock. It refuses to create another administrator for an organization that already has one. The generated initial password is displayed once in the terminal and must be delivered securely.

For the macOS default zsh shell, enter the following in a trusted terminal after configuring the project dependencies:

~~~zsh
read -rs "DATABASE_URL?Neon DATABASE_URL: "
echo
export DATABASE_URL
read -r "BOOTSTRAP_ADMIN_EMAIL?Administrator email: "
export BOOTSTRAP_ADMIN_EMAIL
read -r "BOOTSTRAP_ADMIN_FIRST_NAME?Administrator first name: "
export BOOTSTRAP_ADMIN_FIRST_NAME
read -r "BOOTSTRAP_ADMIN_LAST_NAME?Administrator last name: "
export BOOTSTRAP_ADMIN_LAST_NAME
export BOOTSTRAP_ADMIN_CONFIRM=CREATE_PRODUCTION_ADMIN
npm run db:bootstrap-admin
unset DATABASE_URL BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_FIRST_NAME BOOTSTRAP_ADMIN_LAST_NAME BOOTSTRAP_ADMIN_CONFIRM
~~~

The current demonstration database already has an administrator. Do not rerun this bootstrap command against that database.

## Demo seed data

npm run db:seed-demo is for local development only and refuses to run when NODE_ENV is production. Do not expose the shared development demo accounts in a public deployment. The public Preview demonstration uses synthetic records created through the application.

## Deployment smoke test

After the intended build is deployed:

1. Open the deployment URL in a private/incognito browser window and confirm that the application is reachable without Vercel team login.
2. Confirm the login page loads and authenticate with an account intentionally created in the target Neon database.
3. Confirm /api/me returns the expected profile after login.
4. Verify dashboard, departments, people directory, projects, tasks, attendance, leave, notifications, and audit-log pages using the relevant role.
5. Verify that managers cannot see unrelated employees or assign tasks outside their organization.
6. Confirm that an unknown /api/... route returns JSON 404 rather than the SPA HTML.
7. Confirm that an unlisted browser Origin is rejected by CORS.
8. Check Vercel Runtime Logs for function errors and confirm Neon database connectivity.

## Important operational notes

- The dashboard attendance count and attendance clock-in/clock-out operations now use the server-side Asia/Kolkata date helper.
- The India-local date helper is covered by UTC/IST boundary unit tests, and an API regression test covers clock-in, dashboard attendance counting, and clock-out.
- The Production URL above is the current live application. The deployment-specific Preview URL in the submitted report is a separate, older build.
