# Pre-deployment cost and safety checklist

Every item must be ticked **before** running `scripts/aws/deploy.sh` (or the manual GitHub
workflow). If any item cannot be ticked, do not deploy — the project remains *Implemented
Locally*, which is a valid outcome.

## Account and money

- [x] I am signed in to **AWS Academy** and using the **Cloud Developing 2.x Sandbox**, not a personal AWS account. *(verified 2026-11-25)*
- [ ] No payment method is attached and none will be added. Personal spend stays **₹0**.
- [ ] I recorded the remaining lab budget: `$______ of $______` (date: ________).
- [ ] Cap for this deployment = min(US$3, 5 % × remaining) = `$______`, and it is **> $0**.
- [ ] The estimate in `cost-analysis.md` (≈ $0.01–0.03 per session) is below that cap.
- [ ] I will run `scripts/aws/cleanup.sh` at the end of the session or right after the evaluation.

## Environment

- [ ] Region is **us-east-1** or **us-west-2** (the only regions the Sandbox allows — verified).
- [ ] I understand the Sandbox deletes all resources when the session timer reaches 0:00, and exceeding the budget disables the lab account.
- [ ] `preflight.sh` reports the caller as an AWS Academy lab role (`voclabs`).
- [x] The lab Readme lists Lambda, CloudFormation, SQS, SNS, CloudWatch, SSM and S3. *(verified 2026-11-25)*
- [x] API Gateway is listed → `FRONT_DOOR=HttpApi`. *(verified 2026-11-25)*
- [ ] `put-parameters.sh` succeeded (KMS is not on the service list, so SecureString creation must be proven in-session).
- [ ] `LabRole` exists (`aws iam get-role --role-name LabRole`).
- [ ] `JWT_SECRET` SecureString exists (`scripts/aws/put-parameters.sh`).

## Configuration

- [ ] `DatabaseMode=ephemeral-demo`, **or** a *non-production* PostgreSQL URL is stored in SSM.
      The original project's Neon database must **never** be used.
- [ ] `EnableDashboard=false` unless the dashboard budget is verified.
- [ ] Log retention ≤ 7 days.
- [ ] CI is green on the commit being deployed (tests, audit, cfn-lint, ShellCheck, secret scan).

## After deploying

- [ ] `/health` returns 200 and the login page loads over HTTPS.
- [ ] Evidence captured into `docs/evidence/` (screenshots with account IDs, ARNs and URLs redacted).
- [ ] Status rows in `aws-service-matrix.md` updated to *Implemented and Deployed* only for services with evidence.
- [ ] Lab budget re-checked after the session; consumption recorded in `cost-analysis.md`.
