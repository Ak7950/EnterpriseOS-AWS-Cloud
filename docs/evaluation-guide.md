# Evaluation guide (viva preparation)

Use this to explain the project confidently and **accurately**. The most important rule:
say what is deployed only when you can show evidence. As of 2026-11-25 the AWS stack is
*implemented and tested locally, not deployed*.

---

## 1. The 30-second explanation

> EnterpriseOS is a workforce-management web app: employees, departments, projects, tasks,
> attendance, leave approvals, notifications and an audit trail. I made an independent
> AWS version. The same Express application runs on AWS Lambda behind API Gateway, secrets
> come from SSM Parameter Store, leave and task events go through an SQS queue to a worker
> Lambda that fans out through SNS, and everything is logged and alarmed in CloudWatch. The
> whole stack is one SAM/CloudFormation template that can be created and deleted with one
> command, designed to cost cents and to fit inside AWS Academy's restrictions.

## 2. The detailed explanation (2–3 minutes)

1. **Problem.** The original app ran on Vercel + Neon. For a cloud computing course I
   wanted to show core AWS concepts — serverless compute, managed messaging, secret
   management, observability, IAM, infrastructure as code and CI/CD — without changing the
   business logic and without spending money.
2. **Compute.** Lambda runs the unchanged Express app. A small bridge I wrote starts Express
   on a private loopback port inside the Lambda sandbox and replays each API Gateway event
   as a real HTTP request, so every security middleware behaves exactly as it does locally.
3. **Front door.** An API Gateway HTTP API gives HTTPS, throttling (10 requests/s, burst 20)
   and access logs. If the lab does not allow API Gateway, a parameter switches to a Lambda
   Function URL.
4. **Secrets.** The JWT signing key and optional database URL are SecureStrings in Parameter
   Store, read once per cold start. They are never in Git, the template, CI logs or Lambda
   environment variables.
5. **Event-driven processing.** When a manager approves leave or assigns a task, the API
   still writes the notification and audit rows synchronously (original behaviour) and
   *also* publishes a versioned event to SQS. A worker Lambda validates it, logs it and
   publishes a PII-free summary to SNS. Failed messages are retried individually; after three
   attempts they go to a dead-letter queue, which raises a CloudWatch alarm.
6. **Observability.** JSON logs with request IDs, 7-day retention, alarms on Lambda errors,
   HTTP 5xx and DLQ depth, and an optional dashboard.
7. **IaC and CI/CD.** One SAM template; GitHub Actions run 56 tests, `npm audit`, a Lambda
   package smoke test, `cfn-lint`, ShellCheck and a secret scan on every push. Deployment is
   manual and gated by a cost checklist.
8. **Cost.** No servers, NAT gateways, load balancers or managed databases. A demo session is
   estimated at about $0.01–0.03; the main risk is a public URL being abused, which is limited
   by throttling and removed by the cleanup script.

## 3. Your 15 questions

| # | Question | Answer |
|---|---|---|
| 1 | What does EnterpriseOS do? | Multi-tenant HR/workforce platform: people, departments, projects, a task board, attendance in India time, leave approvals with manager scoping, reviews, notifications and an admin audit trail. |
| 2 | Why an independent AWS version? | To show cloud architecture without any risk to the graded Software Engineering project: separate repository and history, and no reference to the original Vercel project or Neon database. |
| 3 | What changed in the architecture? | Vercel function → Lambda behind API Gateway; secrets → Parameter Store; new asynchronous event path (SQS → Lambda → SNS); structured logging, health check, alarms; everything defined as code. Business logic is unchanged. |
| 4 | Why these services? | Each solves a concrete need at near-zero idle cost: Lambda (scale to zero), HTTP API (cheapest managed HTTPS front door, with throttling), SQS (durable retries + DLQ), SNS (fan-out), SSM (free encrypted secrets), CloudWatch (logs/alarms), SAM (reproducible stacks). |
| 5 | How is a request handled? | Browser → API Gateway (TLS, throttle) → Lambda event → bridge → Express on 127.0.0.1 → auth, roles, tenant-scoped SQL → response converted back to API Gateway format. See `architecture.md` §4. |
| 6 | How do authentication and authorisation work? | bcrypt password check → 8-hour JWT signed with a secret from SSM; middleware verifies it per request; role checks per route; every query filters by the organisation in the token; managers are limited to their direct reports. |
| 7 | How does event-driven processing work? | `server/events.js` publishes `LEAVE_DECIDED`/`TASK_ASSIGNED` to SQS after the database write; the worker processes batches and returns `batchItemFailures` so only failed messages retry; three failures → DLQ → alarm. |
| 8 | How does monitoring work? | Each request writes one JSON log line (method, path, status, duration, request ID). Logs Insights can query them. Alarms watch Lambda `Errors`, API `5xx` and DLQ depth and notify an SNS topic. |
| 9 | How is security maintained? | Secrets in SSM only; least-privilege IAM where roles can be created; TLS-only encrypted queues; IP-spoof-proof rate limiting; strict security headers and CORS; PII-free events; secret scanning and dependency audits in CI. |
| 10 | How is deployment automated? | `scripts/aws/deploy.sh`: pre-flight checks → tests → package → built-artifact smoke test → change-set review → `sam deploy` → health check. A manual GitHub workflow wraps the same script. |
| 11 | What was actually deployed? | **Nothing yet** — I could not verify the Academy budget and service list, and my rule is $0 until verified. Everything is implemented and tested locally, and the template is validated. (Update this answer if you deploy; show `docs/evidence/`.) |
| 12 | What is designed but not deployed? | All of the AWS stack today; plus CloudFront/S3 hosting, RDS/Aurora, DynamoDB rate limiting, X-Ray, Cognito and OIDC deployments, which are designed only. |
| 13 | Why avoid certain paid services? | RDS, NAT gateways, ALBs and EC2 charge by the hour even when idle; Secrets Manager charges per secret. None was necessary to demonstrate the concepts, and the credit budget is shared and limited. |
| 14 | How was cost controlled? | Serverless only; no free-tier assumptions; a per-resource estimate; throttling; dashboard off by default; 7-day log retention; a checklist and typed confirmation before deploy; a verified cleanup script; a test that fails if paid resource types appear in the template. |
| 15 | What would production add? | Managed PostgreSQL with RDS Proxy in a VPC, CloudFront + WAF + a custom domain, Cognito or refresh tokens, DynamoDB for distributed rate limits and idempotency, X-Ray, OIDC deploys with canary releases, and Secrets Manager rotation. |

## 4. Likely viva questions

**Q: What is a cold start and how big is yours?**
The first request on a new Lambda container must load the code and initialise. Here that
means fetching SSM parameters, importing Express and (in demo mode) seeding data. I measured
about 0.75 s locally, excluding Lambda's own runtime start-up; warm requests add about 1 ms
through the bridge.

**Q: Why not run Express directly in Lambda?**
Lambda does not receive HTTP connections — it receives JSON events. Something must translate
them. I wrote a dependency-free translator that uses a real loopback HTTP request, so the
app sees genuine HTTP.

**Q: Your demo database is in memory — isn't that useless?**
It is a deliberate cost decision for demonstrations, opt-in only via an explicit flag.
Production still refuses it. Seed IDs are deterministic so all containers agree on users and
tasks. For persistence the same stack takes a PostgreSQL URL from SSM. I am open about the
limitation: writes are not shared between concurrent containers.

**Q: At-least-once delivery means duplicates — how do you handle them?**
Each event has a UUID `id`. Today the worker's side-effect (an SNS summary) is harmless if
repeated. The designed next step is a DynamoDB idempotency table keyed by event ID.

**Q: Why SQS and SNS — isn't one enough?**
SQS gives durability, retries and a DLQ for a single consumer. SNS gives fan-out to many
subscribers (e-mail, other queues). Together they form a common serverless messaging pattern.

**Q: Why HTTP API rather than REST API?**
It is cheaper per request, has lower latency and supports the payload v2 format. I do not need
REST-API-only features such as usage plans or request validation models.

**Q: How do you stop someone running up your bill?**
Stage throttling, an upper bound enforced by template parameters, optional reserved
concurrency, alarms, and deleting the stack after evaluation. I estimated the worst case
(~$1.80/day at the full throttle).

**Q: What is least privilege, and do you achieve it?**
Granting only the actions a component needs on the specific resources it uses. My template
creates exactly that for normal accounts (tested: no wildcards). AWS Academy blocks role
creation, so there it must use the broad LabRole — an accepted, documented sandbox
limitation.

**Q: How do you know there are no secrets in the repository?**
A secret scanner runs in CI and before commits; I tested it by planting a fake AWS key, which
it caught. `.env` is git-ignored and only `.env.example` with placeholders is tracked.

**Q: Infrastructure as code — what is the benefit here?**
The whole environment is reviewable, version-controlled, linted in CI, reproducible in
minutes and deletable in one command, which is exactly what makes cost control reliable.

## 5. Trade-offs you can discuss

| Choice | Benefit | Cost |
|---|---|---|
| Lambda | No idle cost, no patching | Cold starts, 15-minute limit, per-container memory |
| Loopback bridge | No dependency, identical behaviour | ~1 ms overhead, small custom code to maintain |
| Ephemeral demo DB | $0 database | Not durable or shared |
| SSM over Secrets Manager | Free, encrypted | No automatic rotation |
| Synchronous writes + async events | Original behaviour preserved, async side-effects | Duplicate deliveries possible |
| HTTP API over REST API | Cheaper, simpler | Fewer features |
| Manual deploys | No surprise spend | Less automation |

## 6. Demonstration walkthrough (about 8 minutes)

**If not deployed (always possible):**

1. `npm test` → show 56 passing tests; point out the Lambda end-to-end suite.
2. `npm run package:lambda && npm run smoke:lambda` → the built artifact works like Lambda.
3. `npm run dev` → log in as `manager@demo.com` / `Demo@12345`; approve Rohan's leave; open
   Notifications/Audit as admin.
4. Open `infrastructure/template.yaml` → walk through the front door, Lambda, SQS/DLQ, worker,
   SNS, alarms, and the `LabRole`/least-privilege switch.
5. Show `docs/architecture.md` (diagram legend: implemented vs deployed vs future) and
   `docs/cost-analysis.md`.
6. Show the GitHub Actions run (CI jobs) and the manual-only deploy workflow with its
   confirmation phrase.

**If deployed (after the checklist):**

1. Open the HTTPS URL → `/health` → log in.
2. As the manager, approve a leave request.
3. CloudWatch Logs → worker log group → `domain_event_processed` for that event.
4. SQS console → messages sent/deleted graphs.
5. Lambda → Monitor tab; CloudWatch alarms in OK state.
6. Run `cleanup.sh` (or show that you will) and show the stack deleted.

## 7. Honesty checklist before the viva

- [ ] The service-matrix status column matches reality.
- [ ] Every "deployed" claim has a screenshot or log in `docs/evidence/`.
- [ ] You can say how much Academy credit was used (from the lab's budget panel).
