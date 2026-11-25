# Cost analysis

## 1. Rules this project follows

* **Personal spending limit: ₹0.** No card, no billing instrument, no paid plan, no account
  upgrade. Only an AWS Academy sandbox may ever be used.
* **Academy credit cap:** the lower of **US$3** or **5 %** of the *currently available* lab
  budget. If the budget, isolation or service access cannot be verified, the cap is
  **US$0** — which is the current state (see
  [`aws-academy-environment-audit.md`](aws-academy-environment-audit.md)).
* Free-tier eligibility is **not** treated as "free": the estimates below assume **no free
  tier**, because Academy accounts may not receive it.

**Spend to date: US$0.00 personal, US$0.00 Academy credits** — no AWS API call was made.

## 2. Unit prices used (us-east-1)

| Item | Price | Source / status |
|---|---|---|
| Lambda requests | $0.20 per 1M | aws.amazon.com/lambda/pricing — checked 2026-11-25 |
| Lambda duration (x86) | $0.0000166667 per GB-second | same |
| API Gateway HTTP API | $1.00 per 1M requests (first 300M) | aws.amazon.com/api-gateway/pricing — checked |
| SSM Parameter Store, standard | No additional charge (standard throughput) | aws.amazon.com/systems-manager/pricing — checked |
| CloudWatch Logs ingestion | $0.50 per GB | aws.amazon.com/cloudwatch/pricing — checked |
| CloudWatch alarm (standard) | $0.10 per alarm metric per month | same — checked |
| CloudWatch dashboard | billed per dashboard-month above 3 free | price not rendered; **re-check** (disabled by default) |
| SQS standard requests | ≈ $0.40 per 1M (64 KB chunks) | price not rendered on 2026-11-25; **re-check** |
| SNS publishes / e-mail | first 1M publishes and 1,000 e-mails per month are in the always-free tier | re-check |
| S3 standard storage | ≈ $0.023 per GB-month | re-check |

## 3. Resource-level assessment

| Resource | Config | Pricing model | Expected demo usage | Recurring while idle? | Cleanup |
|---|---|---|---|---|---|
| `…-api` Lambda | 512 MB, 20 s timeout, Node 24 | per request + GB-s | 2,000 req × ~0.1 s × 0.5 GB ≈ 100 GB-s → **$0.002** | No | stack delete |
| `…-worker` Lambda | 256 MB, 30 s | per request + GB-s | ≤200 events → **<$0.001** | No | stack delete |
| HTTP API + stage | throttle 10 rps / burst 20 | per request | 2,000 req → **$0.002** | No | stack delete |
| Function URL (alt.) | AuthType NONE | none (Lambda only) | — | No | stack delete |
| SQS queue + DLQ | SSE-SQS, 4-day / 14-day retention | per request | event sends + **continuous Lambda long-polling** ≈ 20–40k requests/day → **≈ $0.01/day** | **Yes, while the stack exists** | stack delete |
| SNS topics (2) | no subscriptions unless `AlertEmail` | per publish / delivery | ≤200 publishes → **≈ $0** | No | stack delete |
| CloudWatch log groups (3) | 7-day retention | per GB ingested + stored | < 20 MB → **<$0.01** | storage only, tiny | stack delete (+ leftover check) |
| CloudWatch alarms (4) | 5-min period | per alarm-month, pro-rated | **≈ $0.013/day** | **Yes** | stack delete |
| CloudWatch dashboard | `EnableDashboard=false` | per dashboard-month | $0 (off) | Yes if enabled | stack delete |
| SSM SecureStrings (1–2) | standard tier, `aws/ssm` key | no charge | $0 | No | `DELETE_PARAMETERS=yes` |
| S3 SAM artifact bucket | versioned, ~6 MB per deploy | per GB-month + requests | **<$0.001** | storage only, tiny | `DELETE_SAM_BUCKET=yes` |

Intentionally **absent** (verified by `test/infrastructure.test.js`): NAT gateway, load
balancer, EC2, Elastic IP, VPC endpoints, RDS/Aurora, Route 53 hosted zone, Secrets
Manager, customer-managed KMS keys.

## 4. Totals

| Scenario | Estimate | Within US$3 cap? |
|---|---|---|
| One 4-hour demo session, then cleanup | **≈ $0.01–0.03** | Yes |
| Stack left deployed but idle for 30 days | **≈ $0.70** (alarms ≈ $0.40 + SQS polling ≈ $0.30) | Yes, but wasteful — clean up |
| Abuse: someone hammers the public URL at the full throttle (10 rps) for 24 h | 864k requests ≈ $0.86 (API GW) + ≈ $0.90 (Lambda) ≈ **$1.80/day** | Only for ~1 day → **delete the stack after the evaluation** |

The abuse case is the main financial risk of any public endpoint. Mitigations: API Gateway
throttling (rate/burst parameters, max 100 rps enforced by the template), optional
`ApiReservedConcurrency`, CloudWatch alarms, short-lived stacks, and the cleanup script.
The Function URL front door has **no** request throttling, so prefer `HttpApi` when it is
permitted.

## 5. Why paid services were avoided

| Avoided | Typical charge | Replaced by |
|---|---|---|
| RDS/Aurora PostgreSQL | hourly instance + storage, plus networking for Lambda | ephemeral-demo mode; any existing PostgreSQL via SSM (ADR-004) |
| NAT gateway / VPC endpoints | hourly + per GB | Lambda outside a VPC |
| Application Load Balancer | hourly + LCU | API Gateway HTTP API / Function URL |
| EC2 / Elastic Beanstalk | hourly | Lambda (scale to zero) |
| Secrets Manager | per secret per month | Parameter Store SecureString (no charge) |
| CloudFront + Route 53 | per request / hosted zone per month | AWS-provided HTTPS endpoint |

## 6. Pre-deployment gate

Deployment is allowed only after **every** box in
[`pre-deployment-checklist.md`](pre-deployment-checklist.md) is ticked. `deploy.sh` refuses
to run without `CONFIRM_COST_CHECKLIST=yes`, and the GitHub workflow requires a typed phrase.
