# EnterpriseOS

**Enterprise Workforce Management System (EWMS)** — a browser-based, multi-tenant workspace for workforce administration and project delivery.

[![Live production demo](https://img.shields.io/badge/demo-production-159976)](https://enterprise-os-alpha.vercel.app/)
[![Repository](https://img.shields.io/badge/source-GitHub-181717?logo=github)](https://github.com/Ak7950/EnterpriseOS)

> **Current live Production application:** [Open EnterpriseOS](https://enterprise-os-alpha.vercel.app/)  
> **Important link note:** The submitted IEEE report contains the earlier deployment-specific Preview URL (`https://enterprise-ra6w4zeh7-ak795.vercel.app/`). That URL identifies the earlier Preview build. For the latest merged release, use the Production URL above. The submitted report file itself has not been modified.

## Overview

EnterpriseOS brings employee and department administration, attendance, leave workflows, project/task tracking, performance information, notifications, and audit activity into one organization-scoped workspace. It is implemented as a modular monolith: a browser-native frontend communicates with an Express JSON API, while PostgreSQL stores persistent application data.

The current public demonstration uses a Neon PostgreSQL database and synthetic example records created through the application. These records are for demonstration only and do not represent a real employer.

## Features

- **Authentication and access control:** JWT-based sign-in, bcrypt password hashing, and server-side role checks for Super Admin, Admin, Manager, and Employee roles.
- **Employee directory:** Create and view employees, assign departments, and record job designations.
- **Department management:** Create and view organization departments.
- **Attendance:** Clock in/out, view attendance records, search records, and export attendance data as CSV.
- **Leave management:** Submit leave requests, review pending requests, approve/reject requests, and notify requesters.
- **Project and task management:** Create projects, assign tasks, set priorities/due dates, and update task workflow status through an execution board.
- **Dashboard:** Organization-scoped workforce, project, task, leave, and attendance summaries.
- **Governance:** Notifications, performance-review records, and audit-log retrieval.
- **Tenant boundaries:** Authenticated API operations use the organization claim in the verified JWT and apply organization-scoped queries.

## Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript | Browser interface and API requests |
| Backend | Node.js (ES modules), Express | REST-style JSON API and business logic |
| Authentication | jsonwebtoken, bcryptjs | Signed access tokens and password hashing |
| Persistent database | PostgreSQL via pg | Organization, workforce, delivery, and audit records |
| Local test/development database | pg-mem | In-memory database when DATABASE_URL is unset |
| Cloud application hosting | Vercel | Static assets and Express application entry point |
| Managed database hosting | Neon PostgreSQL | Hosted relational database |
| Source control / CI | GitHub, GitHub Actions | Version control and automated Node test run |
| Local container workflow | Docker, Docker Compose | Local PostgreSQL and application setup |

## Architecture

~~~mermaid
flowchart TD
    Browser[Browser: HTML / CSS / JavaScript]
    Static[Vercel static asset delivery]
    Handler[Root Express entry point]
    Middleware[Security headers, CORS, JSON limits]
    Auth[JWT authentication and role checks]
    Routes[Express API routes]
    DB[(Neon PostgreSQL)]
    DevDB[(pg-mem for local development)]

    Browser --> Static
    Browser -->|/api requests| Handler
    Handler --> Middleware --> Auth --> Routes --> DB
    Routes -. local development .-> DevDB
~~~

The root index.js exports the Express application for Vercel. server/index.js defines routes and middleware. server/auth.js handles token and password operations, while server/db.js provides the PostgreSQL/pg-mem query layer and schema initialization.

See [Architecture](docs/architecture.md) and [Database Design](docs/database.md).

## Local development

### Requirements

- Node.js 24 or a compatible current Node.js release
- npm
- PostgreSQL only if you want persistent local data; otherwise the app uses pg-mem

### Setup

~~~bash
git clone https://github.com/Ak7950/EnterpriseOS.git
cd EnterpriseOS
git checkout feature/production-readiness
npm ci
cp .env.example .env
~~~

Edit .env before starting the application:

- Keep NODE_ENV=development.
- Set a local JWT_SECRET with at least 32 characters. You can generate one with openssl rand -base64 48.
- Leave DATABASE_URL empty to use the in-memory pg-mem database, or set it to a PostgreSQL connection string for persistent data.
- Keep CORS_ORIGIN=http://localhost:4000 for the local browser origin.

Start the application:

~~~bash
npm run dev
~~~

Open [http://localhost:4000](http://localhost:4000).

When DATABASE_URL is empty, local development initializes the in-memory schema and development seed data in the application process. The data is reset when the process stops. Do not use the development demo accounts or seed data in a public deployment.

### Persistent local PostgreSQL

Set DATABASE_URL in .env to your local PostgreSQL database, then run:

~~~bash
npm run db:migrate
npm run db:seed-demo
npm run dev
~~~

The demo-seed command refuses to run when NODE_ENV is production.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| PORT | No | Local HTTP port; defaults to 4000. |
| NODE_ENV | Yes | Use development locally and production in the hosted production environment. |
| DATABASE_URL | Production | PostgreSQL/Neon connection string. Leave blank only for local pg-mem development. |
| JWT_SECRET | Yes | Unique random signing secret of at least 32 characters. Never commit a real value. |
| CORS_ORIGIN | Production | Comma-separated allowlist of browser origins. Vercel deployment hostnames are also recognized by the application. |

See [.env.example](.env.example). Never commit .env, database credentials, JWT secrets, or generated one-time passwords.

## Database commands

| Command | Purpose |
| --- | --- |
| npm run db:migrate | Create/update the PostgreSQL schema against DATABASE_URL. |
| npm run db:seed-demo | Add local demo data; blocked when NODE_ENV is production. |
| npm run db:bootstrap-admin | Create the first Super Admin in a PostgreSQL database that does not already have an administrator. The generated initial password is printed once. |

Migrations and demo seeding are explicit operations. They are not run during a Vercel request or serverless cold start. Do not rerun the administrator bootstrap against a database that already has an administrator.

## Testing and verification

Run the automated tests and dependency audit:

~~~bash
npm test
npm audit --omit=dev
~~~

The latest GitHub Actions run recorded **21 passing tests and 0 failures**. The production-dependency audit in CI reported **0 vulnerabilities** at that verification point. The automated suite covers authentication, authorization/tenant boundaries, employee onboarding, bootstrap safeguards, local startup, API fallback behavior, and India-local attendance date behavior. It is not a full browser end-to-end or load-test suite.

See [Testing](docs/testing.md) and [Security](docs/security.md).

## Deployment

The tested public demonstration is the Vercel Preview URL shown at the top of this README and in the submitted IEEE report. Vercel hosts the application entry point and static assets; Neon provides PostgreSQL persistence.

**Production release status:** The Production domain `https://enterprise-os-alpha.vercel.app/` is configured and has been opened in an incognito browser. The dashboard, people directory, departments, projects, execution board, attendance, leave-center page, notifications, and audit trail were visually smoke-tested against the connected Neon database. The attendance flow was tested through clock-in and clock-out using the India-local work date. GitHub Actions passed 21 automated tests; the recorded production-dependency audit reported 0 vulnerabilities. A complete leave-request approval workflow, full browser end-to-end suite, load test, and dedicated PostgreSQL integration test suite have not been performed.

For environment configuration, database migration, first-admin setup, and the deployment smoke test, see [Deployment](docs/deployment.md).

## Repository structure

~~~text
public/                  Browser application (HTML, CSS, JavaScript)
server/                  Express routes, authentication, database and scripts
test/                    Node.js automated tests
docs/                    Architecture, API, database, deployment and security guides
.github/workflows/       GitHub Actions test workflow
index.js                 Vercel Express application entry point
package.json             Scripts and runtime dependencies
.env.example             Safe local environment template
~~~

## Project team

**Group 4 — Software Engineering (UCS503)**  
Department of Computer Engineering, Thapar Institute of Engineering and Technology

- Avik Khetarpal
- Humza Ali Choudhri
- Shashwat Tewari

## License

This project is released under the MIT License. See LICENSE.
