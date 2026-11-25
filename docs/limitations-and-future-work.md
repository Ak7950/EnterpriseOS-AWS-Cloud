# Limitations and future work

## Current limitations

| # | Limitation | Reason | Impact |
|---|---|---|---|
| 1 | **Nothing is deployed to AWS yet** | AWS Academy budget and service access could not be verified (sign-in required); cap is therefore US$0 | Project status is *Implemented Locally* |
| 2 | Ephemeral-demo data is per Lambda container and resets on cold start | No paid database (ADR-004) | Demo writes can "disappear" if a request lands on another container |
| 3 | Functions run as the broad `LabRole` in Academy | IAM role creation blocked | Least privilege only in normal accounts |
| 4 | No GitHub OIDC; manual short-lived credentials | IAM IdP creation blocked | Manual credential refresh per session |
| 5 | Login rate limit is per container | In-memory `Map` (pre-existing) | Limit is weaker when many containers run |
| 6 | Function URL mode is not throttled | Feature of Function URLs | Prefer HTTP API |
| 7 | Disallowed CORS origins get HTTP 500 instead of 403 | Pre-existing error handling | Cosmetic |
| 8 | Real PostgreSQL path not exercised in this environment | Docker/PostgreSQL not installed locally | Code path unchanged from the original |
| 9 | Cold start includes bcrypt seeding in demo mode (≈0.75 s measured locally, before Lambda runtime init) | Demo data creation | First request is slower |

## Future work for a production environment

1. **Managed PostgreSQL** — Amazon RDS for PostgreSQL or Aurora Serverless v2 in private
   subnets, Lambda in the VPC, **RDS Proxy** for connection pooling, VPC interface endpoints
   for SQS/SSM (or a NAT gateway), automated backups and point-in-time recovery, and a
   migration job in the pipeline.
2. **Edge delivery** — S3 (private, Origin Access Control) + CloudFront for `public/`, with
   `/api/*` routed to API Gateway under one domain; AWS WAF managed rules and rate-based
   rules; ACM certificate + Route 53 custom domain.
3. **Identity** — Amazon Cognito user pools (MFA, password policies) or keep JWTs and add
   refresh tokens with HttpOnly cookies.
4. **Distributed state** — DynamoDB table (on-demand, TTL) for login-attempt counters and
   event idempotency keys.
5. **Real notifications** — SES e-mail templates per tenant, using employee contact data
   looked up by the worker (never placed on the queue).
6. **Observability** — AWS X-Ray tracing across API → SQS → worker; CloudWatch Embedded
   Metric Format business metrics (leave approvals, task throughput); synthetic canaries.
7. **Delivery** — GitHub OIDC role (trust policy already in `infrastructure/iam/`),
   staged environments (dev → prod) with manual approval, change-set review, and automatic
   rollback on alarm (Lambda aliases + CodeDeploy traffic shifting).
8. **Security hardening** — Secrets Manager rotation for database credentials, AWS Config
   rules, CloudTrail organisation trail, GuardDuty, and 403 responses for CORS rejections.
9. **Resilience** — reserved concurrency per function, DLQ redrive tooling, multi-AZ
   database, documented RPO/RTO.
