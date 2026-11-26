# Cost analysis

## 1. Rules this project follows

Three separate questions, answered separately:

1. **Personal expenditure: ₹0.** The deployment runs only in the AWS Academy Cloud Developing
   sandbox, which uses lab credit and has no payment method of ours attached. `preflight.sh`
   refuses any other AWS identity unless `ALLOW_NON_ACADEMY_ACCOUNT=yes` is set deliberately.
2. **Our self-imposed Academy-credit threshold: US$2.00**, i.e. min(US$3, 5 % of the recorded
   $40 budget, read on 25 Nov 2026). This is **our own rule, not an AWS-enforced limit** — AWS
   does not stop the stack at $2. It is kept by short sessions, throttling, alarms and cleanup.
3. **Actual Academy usage:** two short sessions on 26–27 Nov 2026, estimated ≈ US$0.02–0.06. The
   lab's budget panel lags 8–12 hours; confirm the final figure there.

Estimates assume **no free tier** (Academy accounts may not receive it). Where AWS lists an
always-free allowance (SNS), the estimate still prices usage as if it were billed.

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
| SNS publishes | ≈ $0.50 per 1M publishes (AWS also lists an always-free allowance, not relied on here) | re-check |
| S3 standard storage | ≈ $0.023 per GB-month | re-check |

## 3. Resource-level assessment

| Resource | Config | Pricing model | Expected demo usage | Recurring while idle? | Cleanup |
|---|---|---|---|---|---|
| `…-api` Lambda | 512 MB, 10 s timeout, Node 24 | per request + GB-s | 2,000 req × ~0.1 s × 0.5 GB ≈ 100 GB-s → **$0.002** | No | stack delete |
| `…-worker` Lambda | 256 MB, 30 s, at most 2 concurrent copies | per request + GB-s | ≤200 events → **<$0.001** | No | stack delete |
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

| Scenario | Estimate | Notes |
|---|---|---|
| **Normal demo:** one ~3-hour session, then cleanup | **≈ $0.01–0.03** | What we actually expect |
| Stack left idle (outside the sandbox) for 30 days | **≈ $0.70** | Alarms ≈ $0.40 + SQS polling ≈ $0.30; in the sandbox the session deletes it first |
| **Abuse, realistic:** full throttle (10 rps) for 24 h at ~0.1–0.3 s per request | **≈ $1.80–3.20/day** | Modelled scenario, *not* a hard limit |
| **Abuse, theoretical ceiling:** 10 rps where every request runs the full 10 s timeout | ≈ $72/day | Not reachable with this app (requests finish in milliseconds; failed logins are rejected before hashing after 5 attempts per IP) |

**What bounds the risk in practice:** the API Gateway throttle (10 rps / burst 20, max 100 enforced
by the template), the 10 s API timeout, at most 2 concurrent worker copies (`ScalingConfig`), CloudWatch
alarms, and — in the AWS Academy sandbox — the session itself, which deletes every resource after about
3 hours, so even the theoretical case is limited to one session. We also run `cleanup.sh` right after
each evaluation. API reserved concurrency (`ApiReservedConcurrency`) is available but left off by default
because the sandbox requires at least 10 unreserved executions. The Function URL fallback has **no**
throttling, so `HttpApi` is the default.

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
