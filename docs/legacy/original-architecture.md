# System Architecture

## Overview

EnterpriseOS is implemented as a modular monolith. The browser client is built with native HTML, CSS, and JavaScript. It sends JSON requests to an Express application. On Vercel, the root index.js exports the Express application as the serverless entry point; locally, server/index.js can start the same application as a Node process.

The persistent deployment uses PostgreSQL through the pg package. Neon hosts the managed PostgreSQL database. If DATABASE_URL is absent in local development, server/db.js creates an in-memory pg-mem database.

## Deployment architecture

~~~mermaid
flowchart TD
    Visitor[User browser]
    CDN[Vercel static asset delivery]
    Entry[Root index.js - Express export]
    App[server/index.js - Express application]
    Middleware[CORS, security headers, JSON body limit]
    Auth[JWT verification and role authorization]
    Routes[Workforce and delivery API routes]
    Neon[(Neon PostgreSQL)]
    Memory[(pg-mem - local development only)]

    Visitor --> CDN
    Visitor -->|/api/*| Entry
    Entry --> App --> Middleware --> Auth --> Routes --> Neon
    Routes -. local development .-> Memory
~~~

The deployment remains one application rather than independently deployed frontend and backend services. Vercel serves the browser assets and runs the Express application handler. Neon is the separate managed database service.

## Application layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Browser interface | public/index.html, public/styles.css, public/app.js | Login, dashboard, forms, navigation, task board, and API calls. |
| Application entry | index.js | Default-exports the Express application for Vercel. |
| HTTP application | server/index.js | Middleware, routes, input checks, authorization, notifications, and audit records. |
| Authentication | server/auth.js | JWT signing/verification, bcrypt password hashing, and role middleware. |
| Database | server/db.js | PostgreSQL pool or local pg-mem pool, schema creation, and query helper. |
| Date helper | server/time.js | India-local date conversion utility and regression-test target. |
| Database operations | server/migrate.js, server/seed-demo.js, server/bootstrap-admin.js | Explicit migration, local demo seed, and first-administrator bootstrap. |
| Verification | test/ | Node built-in test-runner tests. |

## Request lifecycle

1. The browser loads the static interface and sends a request to an API route.
2. Express applies security headers, CORS policy, and a JSON request-size limit.
3. The login route validates credentials and issues an eight-hour JWT.
4. Protected routes pass through bearer-token verification.
5. Role checks and organization-scoped SQL queries control access to records.
6. State-changing operations write application data and, where applicable, audit and notification records.
7. The API returns a structured JSON response.

## Tenant model

An organization is the tenant boundary. Workforce tables store an organization identifier. Authenticated request handlers use the organization claim from the verified JWT rather than accepting an organization identifier from the browser as the authority for access decisions.

Manager access is further restricted to their direct reports or projects they manage where the relevant route applies. Task creation validates that the selected project and assignee belong to the requester's organization.

## Local and hosted lifecycle

- Local in-memory mode initializes the pg-mem schema and development seed data in the application process before the local server starts.
- Persistent PostgreSQL schema changes are applied explicitly with npm run db:migrate.
- Demo data is added explicitly with npm run db:seed-demo, which refuses to run when NODE_ENV is production.
- First administrator creation is explicit through npm run db:bootstrap-admin; the script refuses to create another administrator in an organization that already has one.
- Vercel requests and serverless cold starts do not run database migrations or demo seeding.

## Design trade-offs

The modular-monolith approach keeps deployment and local setup straightforward. The browser-native frontend avoids a separate frontend build pipeline. The trade-off is that the application does not currently include a dedicated mobile app, a distributed rate limiter, a shared schema-validation framework, or a browser end-to-end test suite.
