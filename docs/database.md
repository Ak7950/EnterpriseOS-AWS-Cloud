# Database Design

## Database engine

EnterpriseOS uses PostgreSQL through the Node.js pg package. The hosted demonstration uses Neon PostgreSQL. When DATABASE_URL is absent in local development, server/db.js creates a pg-mem in-memory database. Production startup refuses to use the in-memory database.

The current schema is defined by the migrate() function in server/db.js. Run npm run db:migrate explicitly against a persistent PostgreSQL database. Application requests and Vercel cold starts do not run migrations.

## Entity relationship overview

~~~mermaid
erDiagram
    ORGANIZATIONS ||--o{ DEPARTMENTS : owns
    ORGANIZATIONS ||--o{ USERS : owns
    DEPARTMENTS ||--o{ USERS : contains
    USERS ||--o{ USERS : manages
    USERS ||--o{ ATTENDANCE : records
    USERS ||--o{ LEAVE_REQUESTS : submits
    USERS ||--o{ PROJECTS : manages
    PROJECTS ||--o{ TASKS : contains
    USERS ||--o{ TASKS : assigned
    USERS ||--o{ PERFORMANCE_REVIEWS : receives
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : performs
~~~

## Main tables

| Table | Purpose and key fields |
| --- | --- |
| organizations | Tenant root; UUID primary key and organization name. |
| departments | Organization-owned departments; unique organization/name pair. |
| users | User identity, password hash, role, department, optional manager, designation, active state, and first-login password-change flag; unique organization/email pair. |
| attendance | User/day clock-in and clock-out data, work date, and attendance status; unique user/work-date pair. |
| leave_requests | Leave type, date range, reason, status, reviewer, and review timestamp. |
| projects | Organization-owned project name, description, manager, priority, status, and due date. |
| tasks | Organization/project relationship, title, description, assignee, creator, priority, status, due date, and estimated hours. |
| performance_reviews | Employee, reviewer, rating, feedback, goals, and review date. |
| notifications | Per-recipient notification text, type, read state, and creation timestamp. |
| audit_logs | Organization-scoped actor, action, entity, entity identifier, metadata, and timestamp. |

## Tenant ownership and constraints

Tenant-owned records carry an organization identifier. Foreign keys connect departments and users, manager-to-user relationships, projects and tasks, and user-related attendance, leave, review, notification, and audit records. Unique constraints prevent duplicate organization email addresses, duplicate department names within an organization, and more than one attendance record per user/work date.

Indexes are defined for task tenant/status queries, manager lookups, and audit tenant/time queries.

## Initialization and data management

- Local in-memory development: npm run dev initializes the pg-mem schema and development seed data in the same application process.
- Persistent PostgreSQL: configure DATABASE_URL and run npm run db:migrate.
- Optional local seed: run npm run db:seed-demo; the script refuses to run when NODE_ENV is production.
- Initial administrator: run npm run db:bootstrap-admin only for a PostgreSQL organization that does not already have an Admin or Super Admin.

No real production credentials or personal records should be committed to this repository.
