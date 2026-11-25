# Architecture decision records

Each record: context → decision → consequences.

## ADR-001 Serverless Lambda instead of EC2, Elastic Beanstalk or containers

**Context.** Zero personal spend and a small, credit-limited sandbox. The app is a stateless
Express API (all state is in PostgreSQL or, for demos, memory).
**Decision.** Run the unchanged Express app on AWS Lambda.
**Consequences.** + Scales to zero (no idle compute charge), no servers or patching, pay per
request. − Cold starts (≈0.75 s measured locally including demo seeding; ≈1 ms per warm request through the bridge); per-container memory state (see
ADR-004 and ADR-007).

## ADR-002 Dependency-free loopback bridge instead of `serverless-http`

**Decision.** Start Express on `127.0.0.1:<ephemeral>` once per container and replay each
payload-v2 event as a real HTTP request.
**Consequences.** + Zero new runtime dependencies; identical middleware behaviour locally
and in Lambda; one adapter for API Gateway and Function URLs; easy to unit-test. − About
1 ms extra per request; a socket per container.

## ADR-003 SSM Parameter Store SecureString instead of Secrets Manager or env vars

**Decision.** Store `JWT_SECRET` and optional `DATABASE_URL` as SecureStrings under
`/enterpriseos/<stage>/`, loaded at cold start.
**Consequences.** + No charge for standard parameters; encrypted with the AWS-managed key;
secrets never in templates, Git, CI logs or Lambda configuration. − No automatic rotation
(Secrets Manager's paid feature); rotating `JWT_SECRET` signs everyone out.

## ADR-004 No managed database; explicit ephemeral-demo mode

**Context.** RDS/Aurora have hourly charges, and connecting from Lambda requires a VPC,
which then needs a NAT gateway or VPC endpoints to reach SQS/SSM — all chargeable. The
original Neon database is out of bounds.
**Decision.** Default `DatabaseMode=ephemeral-demo` (synthetic data in each container's
memory, deterministic IDs). `DatabaseMode=postgresql` supports any non-production
PostgreSQL through SSM.
**Consequences.** + Zero database cost; full architecture demonstrable. − Writes are not
shared between concurrently running containers and are lost on cold start. Clearly
documented; production still refuses in-memory mode without the explicit flag.

## ADR-005 API Gateway HTTP API with a Lambda Function URL fallback

**Decision.** `FrontDoor` parameter: `HttpApi` (default) or `FunctionUrl`.
**Consequences.** + HTTP API costs less than a REST API and provides stage throttling and
access logs; the Function URL keeps the project deployable if API Gateway is not permitted
in the lab. − The Function URL has no throttling.

## ADR-006 Manual, confirmed deployments; OIDC designed but not used

**Context.** GitHub OIDC needs an IAM identity provider and role, which Learner Lab blocks.
**Decision.** CI never touches AWS. Deploy and cleanup workflows are `workflow_dispatch`
only, require a typed phrase and an `aws-academy` environment, and use short-lived lab
session credentials. An OIDC trust policy is provided for real accounts.
**Consequences.** + No surprise spend, no long-lived keys. − Session credentials must be
refreshed every lab session.

## ADR-007 Event-driven side-effects with SQS + Lambda + SNS

**Decision.** After the existing synchronous notification/audit writes, publish
`LEAVE_DECIDED` and `TASK_ASSIGNED` events to SQS; a worker validates them, logs them and
fans out PII-free summaries via SNS; failures retry and then go to a DLQ with an alarm.
**Consequences.** + Decouples slow integrations (e-mail, analytics) from user latency;
at-least-once delivery with partial-batch retries. − Duplicate deliveries are possible, so
consumers must be idempotent (event `id` is provided); a DynamoDB idempotency/rate-limit
table is the designed next step.

## ADR-008 SAM (CloudFormation transform) for infrastructure as code

**Decision.** One `template.yaml` using SAM only for function packaging; everything else is
plain CloudFormation.
**Consequences.** + Reproducible, reviewable and parameterised; `cfn-lint` in CI; one-command
deletion. SAM is preinstalled in CloudShell. − Requires an S3 artifact bucket (created by
`--resolve-s3`, removable by the cleanup script).

## ADR-009 Structured JSON logging over custom metrics

**Decision.** One JSON log line per request/event with request IDs; alarms use built-in
AWS/Lambda, AWS/SQS and AWS/ApiGateway metrics only.
**Consequences.** + Queryable with CloudWatch Logs Insights at no metric cost. − No custom
business metrics (designed: CloudWatch Embedded Metric Format).
