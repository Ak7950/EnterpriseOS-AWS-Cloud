# Security Implementation and Limitations

## Implemented controls

- Passwords are stored as bcrypt hashes; plaintext passwords are not stored in the database.
- JWT bearer tokens include user, organization, and role claims and expire after eight hours.
- A signing secret is required and must be at least 32 characters. The known development secret is rejected in production.
- Protected routes verify bearer tokens and apply server-side role checks.
- Organization-scoped database queries use the organization claim from the verified token.
- Manager visibility is limited to their direct reports for the applicable people, attendance, leave, and performance views; manager task creation validates project ownership and assignee organization.
- Employee creation validates role values and organization-owned departments. Only a Super Admin can create another Super Admin.
- New employees receive a cryptographically random one-time initial password. Only its hash is persisted; the authorized create response returns the initial password once. The employee must change it before using the rest of the application.
- Parameterized PostgreSQL queries are used for user-controlled values in the reviewed routes.
- Production startup requires DATABASE_URL and a valid JWT_SECRET. CORS is restricted to configured origins and recognized Vercel deployment hostnames.
- Responses include basic security headers. JSON request bodies are limited to 100 KB.
- Login attempts are limited in-process by client IP to five failures within a 15-minute window.
- Database constraints protect organization/email, organization/department name, and attendance user/work-date uniqueness.

## Known limitations and follow-up work

- The login-attempt limiter is in-memory and per process; it is not a distributed account lockout.
- JWTs are stored by the browser client in sessionStorage. Refresh-token rotation and token revocation are not implemented.
- No password-reset workflow or CSRF strategy is implemented.
- Route validation is manual and distributed across handlers rather than implemented through one shared schema-validation layer.
- Application audit records are not immutable external audit storage.
- Automated tests do not replace a full browser end-to-end, load, penetration, or production database integration test suite.

## Secrets and reporting

Never commit .env, database connection strings, JWT secrets, generated initial passwords, or real employee information. Use synthetic data in public screenshots and demonstrations.

Report suspected vulnerabilities privately using SECURITY.md.
