# AWS service matrix

Status categories (exact definitions):

* **Implemented and Deployed** — actually provisioned and validated in AWS, with evidence.
* **Implemented Locally** — code, IaC and tests exist; AWS resources are not deployed.
* **Designed** — architecture and implementation approach documented; no code path.
* **Not Available** — blocked by AWS Academy permissions or by this project's cost rules.

As of 2026-11-25 **no service is *Implemented and Deployed***. See
[`aws-academy-environment-audit.md`](aws-academy-environment-audit.md) for why.

| AWS service | Purpose in EnterpriseOS | Implementation status | Cost risk (us-east-1) | Where |
|---|---|---|---|---|
| **AWS Lambda** (API) | Runs the unchanged Express app (UI + REST API) per request; scales to zero | Implemented Locally | Low — $0.20/M requests + $0.0000166667/GB-s; a demo session ≈ <$0.01 | `aws/lambda/api-handler.js`, `http-bridge.js` |
| **AWS Lambda** (worker) | Consumes domain events asynchronously | Implemented Locally | Low — invoked only when events exist | `aws/lambda/event-worker.js` |
| **Amazon API Gateway HTTP API** | Public HTTPS endpoint, stage throttling (10 rps / 20 burst), JSON access logs | Implemented Locally (availability in this lab **unverified**) | Low — $1.00/M requests | `template.yaml` `HttpApi*` |
| **Lambda Function URL** | Fallback HTTPS endpoint if API Gateway is not permitted | Implemented Locally | None beyond Lambda | `template.yaml` `ApiFunctionUrl*` |
| **Amazon SQS** (+ DLQ) | Durable buffer for `LEAVE_DECIDED` / `TASK_ASSIGNED` events; retries, dead-letter after 3 attempts | Implemented Locally | Low but **continuous**: Lambda's poller long-polls the queue while the stack exists (≈ tens of thousands of requests/day, cents per month) | `server/events.js`, `template.yaml` |
| **Amazon SNS** | Fan-out of PII-free notification summaries; alarm delivery to e-mail | Implemented Locally | Very low — publishes and up to 1,000 e-mails/month are inside the always-free allowance | `event-worker.js`, `template.yaml` |
| **CloudWatch Logs** | Structured JSON application and access logs, 7-day retention | Implemented Locally | Low — $0.50/GB ingested; demo ≪ 0.1 GB | `server/logger.js` |
| **CloudWatch Alarms** | Lambda errors, worker errors, DLQ not empty, HTTP 5xx | Implemented Locally | $0.10 per alarm-month, pro-rated (4 alarms ≈ $0.013/day) | `template.yaml` |
| **CloudWatch Dashboard** | Operations view (invocations, p95 latency, queue, error log query) | Implemented Locally, **off by default** | Billed per dashboard-month beyond the free allowance of 3 | `EnableDashboard=false` |
| **SSM Parameter Store** | SecureString storage for `JWT_SECRET`, optional `DATABASE_URL` | Implemented Locally | None — standard parameters have no additional charge | `config-loader.js`, `put-parameters.sh` |
| **AWS KMS** (AWS-managed `aws/ssm` key) | Encrypts SecureStrings | Implemented Locally (implicit) | No key charge for AWS-managed keys; per-request fees are negligible (one call per cold start) | — |
| **AWS IAM** | Least-privilege roles (normal accounts) / `LabRole` (Academy) | Implemented Locally | None | `template.yaml`, `infrastructure/iam/` |
| **AWS CloudFormation + SAM** | Reproducible, parameterised stack; one-command teardown | Implemented Locally (`cfn-lint` clean) | None | `infrastructure/template.yaml` |
| **Amazon S3** | SAM deployment-artifact bucket (`--resolve-s3`) | Implemented Locally (created on first deploy) | ≈ $0.0003/month for a 6 MB zip; delete with `DELETE_SAM_BUCKET=yes` | `deploy.sh`, `cleanup.sh` |
| **AWS CloudShell** | Credential-free deployment shell inside the lab | Designed (procedure documented) | None | `deployment-guide.md` |
| Amazon S3 static hosting + **CloudFront** | Serve `public/` from the edge | Designed | Reportedly blocked in current labs; adds origin split and CSP changes | `limitations-and-future-work.md` |
| **Amazon RDS / Aurora PostgreSQL** | Persistent shared database for `DatabaseMode=postgresql` | Designed | Hourly instance + storage; a VPC-attached Lambda would also need VPC endpoints or NAT | `architecture-decisions.md` ADR-004 |
| **Amazon DynamoDB** | Shared login rate-limit counters / idempotency keys across Lambda containers | Designed | On-demand is cheap but not needed for a demo | ADR-007 |
| **AWS X-Ray** | Distributed tracing of API → SQS → worker | Designed | Per-trace pricing | — |
| **AWS Secrets Manager** | Secret rotation | Not Available (cost rule: per-secret monthly charge; Parameter Store suffices) | Recurring | ADR-003 |
| **GitHub OIDC → IAM role** | Keyless CI/CD deploys | Not Available in AWS Academy (cannot create IAM roles/IdPs); trust policy designed | None | `infrastructure/iam/github-oidc-trust-policy.json` |
| NAT Gateway, ALB, EC2, Elastic IP, Route 53 hosted zone | — | Not Available (cost rule) — architecture avoids them entirely; enforced by a test | Hourly charges | `test/infrastructure.test.js` |

Every listed price was checked on the AWS public pricing pages on 2026-11-25 except the SQS
per-request rate and the dashboard rate, which those pages did not render; re-check both in
the AWS Pricing Calculator before deploying. AWS Academy accounts may not receive the
normal Free Tier, so the estimates in [`cost-analysis.md`](cost-analysis.md) assume **no**
free tier.
