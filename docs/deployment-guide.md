# Deployment guide

> Read [`pre-deployment-checklist.md`](pre-deployment-checklist.md) first. Do not deploy if
> any item cannot be ticked. **No step below requires a payment method.**

## Option 0 — Local (no AWS, always available)

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:4000> and sign in as `admin@demo.com` / `Demo@12345` (synthetic data).

To exercise the Lambda code path locally:

```bash
npm test
```

```bash
npm run package:lambda && npm run smoke:lambda
```

## Option 1 — AWS Academy Cloud Developing Sandbox via CloudShell (recommended)

> The Sandbox **permanently deletes every resource when its session timer reaches 0:00**.
> Deploy in the same session you demonstrate, and keep the timer refreshed (choose
> *Start Lab* again before it expires) during the evaluation.

CloudShell runs inside the lab, already has the AWS CLI and SAM CLI, and picks up the lab
credentials automatically, so **no access keys are copied anywhere**.

1. AWS Academy → **AWS Academy Cloud Developing → Modules → Sandbox → Sandbox** → **Start Lab** →
   note the budget and timer → wait for the green dot → click **AWS**.
2. Check the region selector says **N. Virginia (us-east-1)**.
3. Open **CloudShell** (terminal icon in the console's top bar).
4. Get the code. In CloudShell, either upload a zip of the repository (*Actions → Upload
   file*), or clone it with a fine-grained, read-only GitHub token entered at the prompt:

   ```bash
   git clone https://github.com/Ak7950/EnterpriseOS-AWS-Cloud.git && cd EnterpriseOS-AWS-Cloud
   ```

5. Install Node dependencies (CloudShell includes Node.js; v18+ works for packaging):

   ```bash
   npm ci
   ```

6. Create the JWT secret in Parameter Store (generated locally, never printed):

   ```bash
   STAGE=dev bash scripts/aws/put-parameters.sh
   ```

7. Run the read-only pre-flight:

   ```bash
   CONFIRM_COST_CHECKLIST=yes STAGE=dev bash scripts/aws/preflight.sh
   ```

8. Deploy. Use `FRONT_DOOR=FunctionUrl` if API Gateway is not permitted. The script runs the
   tests, builds and smoke-tests the package, shows the change set and asks you to type
   `deploy`:

   ```bash
   CONFIRM_COST_CHECKLIST=yes STAGE=dev FRONT_DOOR=HttpApi bash scripts/aws/deploy.sh
   ```

9. The script prints the application URL and calls `/health`. Open the URL and sign in with
   the demo account.

### Optional: a persistent PostgreSQL database

Only with a **new, non-production** PostgreSQL database (never the original project's Neon
database):

```bash
STAGE=dev SET_DATABASE_URL=yes bash scripts/aws/put-parameters.sh
```

Run the schema migration from a trusted terminal against that database (`npm run
db:migrate` with `DATABASE_URL` set in the shell only), then deploy with
`DATABASE_MODE=postgresql`.

## Option 2 — GitHub Actions (manual)

1. Repository → *Settings → Environments* → create `aws-academy`.
2. Add environment secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
   from the Learner Lab *AWS Details* panel. They expire with the lab session; delete them
   afterwards. (OIDC is the better design but is impossible in AWS Academy — ADR-006.)
3. Optional variable `AWS_REGION` (default `us-east-1`).
4. *Actions → Deploy to AWS (manual only) → Run workflow*, and type
   `I-COMPLETED-THE-COST-CHECKLIST`.
5. Create `JWT_SECRET` beforehand with `put-parameters.sh` (step 6 above) — the workflow
   does not create secrets.

## Verifying a deployment (evidence to capture)

```bash
curl -s "$APP_URL/health"
```

* Console → Lambda → `enterpriseos-dev-api` → *Monitor* (invocations).
* Approve the pending leave request as `manager@demo.com`, then CloudWatch → Log groups →
  `/aws/lambda/enterpriseos-dev-worker` → find `domain_event_processed`.
* SQS → `enterpriseos-dev-events` → *Monitoring* (messages sent/deleted).
* CloudFormation → stack → *Resources* tab.

Redact the 12-digit account ID, ARNs and API IDs in screenshots before committing them to
`docs/evidence/`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `AccessDenied` creating roles | `LabRole` was not detected; pass `LAMBDA_ROLE_ARN` explicitly |
| `ReservedConcurrentExecutions` error | Keep `ApiReservedConcurrency=0` (sandbox concurrency is limited) |
| `/health` returns 503 `SERVICE_UNAVAILABLE` | Missing `JWT_SECRET` in SSM — check the `cold_start_failed` log |
| Login returns 500 in the browser | Origin not allowed — check `CORS_INCLUDE_API_ORIGIN=true` and `ExtraCorsOrigins` |
| Credentials suddenly invalid | Learner Lab session ended — restart the lab (resources normally persist) |
