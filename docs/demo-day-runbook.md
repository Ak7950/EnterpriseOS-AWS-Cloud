# Demo-day runbook (lab evaluation, 8:00 am, Room L011)

Target: AWS Academy **Cloud Developing → Sandbox** (budget $40, cap $2, session ≈ 3 h, everything
deleted when the session ends). Expected cost of this whole run: **≈ $0.01–0.03 of Academy credit, ₹0
personal.** Bring the laptop charged, with `dist/enterpriseos-aws-cloudshell.zip` on the Desktop.

## 7:00 – start the lab (5 min)

1. awsacademy.instructure.com → **AWS Academy Cloud Developing → Modules → Sandbox → Sandbox**.
2. **▶ Start Lab** → wait for the **green dot** (1–3 min) → click **AWS** (console opens in a new tab).
3. Top-right region: **N. Virginia (us-east-1)**.
4. Open **CloudShell** (terminal icon, top bar or bottom-left).

## 7:05 – upload and prepare (5 min)

CloudShell keeps your home folder between lab sessions, so always start from a clean copy. The repo is
public, so the simplest way is to clone it (no zip upload needed):

```bash
cd ~ && rm -rf EnterpriseOS-AWS-Cloud enterpriseos-aws-cloudshell.zip && git clone https://github.com/Ak7950/EnterpriseOS-AWS-Cloud.git
```

(Alternative: **Actions → Upload file** → `enterpriseos-aws-cloudshell.zip`, then unzip.) Then, one at a time:

```bash
export AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1
```

```bash
cd ~/EnterpriseOS-AWS-Cloud && npm ci --no-audit --no-fund
```

```bash
STAGE=dev bash scripts/aws/put-parameters.sh
```

If (and only if) that last command says **"Could not store … as a SecureString"**, the sandbox is
blocking encrypted parameters. For this throwaway demo key only, run:

```bash
ALLOW_PLAINTEXT_DEMO_SECRET=yes STAGE=dev bash scripts/aws/put-parameters.sh
```

## 7:12 – pre-flight and deploy (10–12 min)

```bash
CONFIRM_COST_CHECKLIST=yes STAGE=dev bash scripts/aws/preflight.sh
```

Every line should say PASS (INFO lines are fine). Then:

```bash
CONFIRM_COST_CHECKLIST=yes STAGE=dev FRONT_DOOR=HttpApi bash scripts/aws/deploy.sh
```

- Type **`deploy`** when asked.
- SAM shows the change set (about 25 resources: functions, API, queues, topics, alarms, log groups) →
  answer **`y`**.
- It ends by printing the **Application URL** and calling `/health`. Copy the URL.

## 7:25 – check it and capture evidence (10 min)

1. Open the URL → sign in as `manager@demo.com` / `Demo@12345` (synthetic demo data).
2. **Leave center → Approve** Rohan's request.
3. Console → **CloudWatch → Log groups → `/aws/lambda/enterpriseos-dev-worker`** → newest stream →
   find `domain_event_processed` (the event made it through SQS to the worker).
4. Screenshots (crop out the 12-digit account ID): the live app with the URL bar, the CloudFormation
   stack (**CREATE_COMPLETE**), the Lambda functions list, the worker log line, the SQS queue monitoring tab.
5. Keep the lab alive during the evaluation: click **Start Lab** again if the timer gets low.

## During the evaluation (3-minute demo)

1. Show the architecture diagram (`submission/2-System-Architecture.pdf`).
2. Open the live HTTPS link, sign in as the manager, approve a leave.
3. Show the worker's CloudWatch log line for that approval → "event-driven processing works".
4. Show CloudFormation → Resources (everything created from one template).
5. If asked about cost: the Academy budget panel ("Used $0.0x of $40").

## After the evaluation – clean up (3 min)

```bash
STAGE=dev DELETE_PARAMETERS=yes DELETE_SAM_BUCKET=yes bash scripts/aws/cleanup.sh
```

Type the stack name when asked; it ends with "Cleanup verified". (The sandbox would delete everything at
the end of the session anyway; this makes it immediate and verified.)

## If something goes wrong

| Symptom | Fix |
|---|---|
| `npm test` fails inside `deploy.sh` (older Node in CloudShell) | Tests already pass locally and in CI: rerun with `SKIP_TESTS=yes` added in front |
| `sam: command not found` | `pip3 install --user aws-sam-cli` then `export PATH=$HOME/.local/bin:$PATH` |
| API Gateway access denied | Rerun deploy with `FRONT_DOOR=FunctionUrl` |
| `/health` 503 after deploy | `JWT_SECRET` missing: rerun `put-parameters.sh`, then call the URL again |
| Stack in `ROLLBACK_COMPLETE` | Run `cleanup.sh`, then deploy again |
| Lab session ended | Everything was deleted: Start Lab again and repeat from 7:05 (≈ 15 min) |
| AWS completely unavailable | Local demo: `npm run dev` → http://localhost:4000, then show `infrastructure/template.yaml`, the 56 passing tests (`npm test`) and the GitHub Actions runs |
