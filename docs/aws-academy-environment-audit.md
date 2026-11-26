# AWS Academy environment audit

**Audit date:** 2026-11-25 (portal re-checked after the student signed in, same day) ·
**Method:** read-only local inspection, the signed-in AWS Academy portal and the lab Readme
in a browser, and official AWS documentation. No lab session was started, no AWS resource
was created, and no AWS API was called.

Each finding is marked **Verified** (observed directly), **Documented** (stated in official
AWS material but not yet confirmed for *this* account), or **Unverified** (unknown).

## 1. Summary

| Question | Finding | Status |
|---|---|---|
| Which lab environment is available? | No separate *Learner Lab* course. Two courses: **AWS Academy Cloud Developing [182812]** and **AWS Academy Cloud Foundations [193288]**, each with a *Sandbox* module. The **Cloud Developing 2.x Sandbox** is the deployment target | **Verified** |
| Signed in to AWS Academy? | Yes (student signed in on the agent's browser pane) | **Verified** |
| Lab status | Not started at first check; started by the student later the same day → green indicator | **Verified** |
| Lab budget / credits remaining | **"Used $0 of $40"** in the running session (the figure lags 8–12 h, per the Readme) | **Verified** |
| Permitted Academy consumption | min(US$3, 5 % × $40 = $2.00) = **US$2.00** | **Derived** |
| What happens when the session ends | Readme: "This environment is NOT long-lived"; when the timer reaches 0:00, all data and resources created in the account are **permanently deleted** | **Verified** |
| What happens if the budget is exceeded | Readme: the lab account is **disabled** and all progress and resources are lost | **Verified** |
| Session length | Timer showed **02:57** right after start (≈ 3-hour sessions); choosing Start Lab again before 0:00 refreshes it | **Verified** |
| Regions | Sandbox Readme: "All service access is limited to the us-east-1 and us-west-2 Regions" | **Verified** |
| AWS CLI on this Mac | `aws` not installed; no `~/.aws` directory; no `AWS_*` environment variables | **Verified** |
| SAM CLI / Docker / GitHub CLI | Not installed | **Verified** |
| Temporary credentials | Learner Lab exposes short-lived credentials (access key, secret, **session token**) under *AWS Details*; none are present locally | **Documented** / none present (**Verified**) |
| GitHub OIDC for deployments | Sandbox Readme: cannot create IAM users, groups or roles (service-linked roles only), so an OIDC deploy role is impossible | **Verified** |

**Consequence:** service access and budget are verified. The permitted Academy credit
consumption is **US$2.00**; the estimated cost of one demonstration session is ≈ $0.01–0.03
(≈ 1–2 % of the cap). Deployment is therefore *allowed* once the in-session checks in
[`pre-deployment-checklist.md`](pre-deployment-checklist.md) pass (CloudShell pre-flight and
the KMS/SecureString test). **Update 26 Nov 2026:** both in-session checks passed (14/14 pre-flight, SecureString accepted) and the stack was deployed and verified — see `evidence/aws-deployment-2026-11-26.txt`.

## 2. Local machine inspection (verified)

| Check | Result |
|---|---|
| Project directory | `~/Desktop/EnterpriseOS-AWS-Cloud`, Git root, branch `main` |
| Git remote | `origin https://github.com/Ak7950/EnterpriseOS-AWS-Cloud.git` only — the original `EnterpriseOS` repo is **not** a remote |
| GitHub repo | On 25 Nov 2026 it was private (anonymous 404). **Addendum 27 Nov 2026:** made **public** by the owner for instructor review; anonymous access verified (HTTP 200) and CI runs visible |
| Original project on disk | No `~/Desktop/EnterpriseOS` directory present; nothing outside this repository was touched |
| Node.js / npm | v24.13.0 / 11.6.2 |
| AWS / SAM / Docker / gh CLIs | Not installed |

## 3. Service availability (2021 Learner Lab sheet — superseded by §3a for this account)

Source: *AWS Academy Learner Lab – Foundation Services* (AWS, ©2021; "restrictions are
subject to change"). The services this project needs:

| Service | Listed? | Documented restriction | Relevance |
|---|---|---|---|
| AWS Lambda | Yes | "Attach the existing LabRole to any function" | Core compute |
| Amazon API Gateway | **Not listed in this version** | — | Front door A; Function URL is the fallback |
| AWS CloudFormation | Yes | — | IaC (SAM is a CloudFormation transform) |
| Amazon SQS | Yes | — | Event queue + DLQ |
| Amazon SNS | Yes | — | Notification fan-out, alarm delivery |
| Amazon CloudWatch | Yes | — | Logs, alarms, optional dashboard |
| AWS Systems Manager | Yes | — | Parameter Store SecureStrings |
| AWS KMS | Yes | — | AWS-managed `aws/ssm` key decrypts SecureStrings |
| Amazon S3 | Yes | — | SAM deployment-artifact bucket |
| AWS IAM | Yes | "Extremely limited… You cannot create roles" (service-linked only); **LabRole** pre-created | Functions must run as LabRole |
| Amazon CloudFront | Yes (2021 list) | A 2026 community report says it is now blocked | Not used (designed only) |
| Amazon RDS / Aurora | Yes | micro-to-medium instances; no Multi-AZ | Not used — cost (designed only) |
| AWS Secrets Manager | Yes | — | Not used — per-secret monthly charge |
| Amazon DynamoDB | Yes | — | Not used — no genuine need yet |
| AWS CloudShell | Yes | — | **Recommended deploy environment** (AWS CLI + SAM preinstalled, no local credentials) |

The Cloud Developing 2.x Sandbox Readme (§3a) **does** list API Gateway, so `FRONT_DOOR=HttpApi`
is permitted for this account.

## 3a. Cloud Developing 2.x Sandbox — verified service list (read 2026-11-25)

Read from the lab's own Readme ("Service usage and other restrictions"; it says
restrictions are subject to change). It is newer than the 2021 sheet above and
**supersedes it** for this account.

| Needed by EnterpriseOS | Listed? | Restriction quoted / summarised |
|---|---|---|
| AWS Lambda | **Yes** | Attach the existing **LabRole** to functions that call other services |
| Amazon API Gateway | **Yes** | — → `FRONT_DOOR=HttpApi` is permitted |
| AWS CloudFormation | **Yes** | — |
| Amazon SQS | **Yes** | — |
| Amazon SNS | **Yes** | — |
| Amazon CloudWatch | **Yes** | — |
| AWS Systems Manager | **Yes** | LabRole / LabInstanceProfile pre-created |
| Amazon S3 | **Yes** | — |
| AWS CloudShell | **Yes** | Recommended by the Readme as an alternative terminal |
| AWS IAM | **Yes** | Cannot create users, groups or roles (service-linked roles only); **LabRole** pre-created — "permissions very similar to the permissions you have as a user in the console" |
| AWS KMS | **Not listed** | SecureStrings use the AWS-managed `aws/ssm` key through SSM. Whether this works must be confirmed by `put-parameters.sh` in a running session (see risk below) |
| Also listed (not used) | API Gateway, AppSync, Application/EC2 Auto Scaling, CloudFront, CloudTrail, Cognito, DynamoDB, ECR, Elastic Beanstalk, EBS (≤35 GB), EC2 (nano/micro/small; ≤9 instances), ELB, ElastiCache, EventBridge, RDS (nano–small, no Multi-AZ), Resource Groups, Secrets Manager, Step Functions, WAF, X-Ray | — |

**Design impacts**

1. **Auto-deletion at session end** means a deployment exists only for one lab session. Any
   demonstration must be deployed in the same session it is shown (about 10 minutes with
   `deploy.sh`). This also caps cost exposure: nothing can be left running indefinitely.
   `cleanup.sh` is still run at the end so that the deletion is verified rather than assumed.
2. **KMS risk.** If creating a SecureString fails with AccessDenied, do **not** fall back to
   a plain `String` for `JWT_SECRET`. Record the result and keep the deployment blocked, or
   accept the documented alternative of a `String` parameter only for a throw-away demo
   secret that is rotated with every session (a decision for the student, not the scripts).
3. **Budget lag** (8–12 h): the budget display under-reports recent use, so the cap check must
   use the cost estimate (≈ $0.01–0.03 per session) with a wide margin.

## 4. How to complete the audit (student actions — about 5 minutes)

These steps need your own login, which only you can do. They are all read-only.

1. ~~Sign in~~ — done (2026-11-25).
2. ~~Find the lab~~ — **AWS Academy Cloud Developing → Modules → Sandbox → Sandbox**.
3. Click **Start Lab** and wait for the green dot. Note the **remaining budget** (top bar,
   "Used $x of $y") and **session time remaining**. Record both in §5.
4. Open the lab's **Readme → Services / restrictions** and check that Lambda, **API Gateway**,
   SQS, SNS, CloudWatch, CloudFormation, SSM and S3 are listed.
5. Click **AWS** (green dot) → in the console open **CloudShell** (us-east-1) and run these
   **read-only** commands (they print no secrets):

   ```bash
   aws sts get-caller-identity --query Arn --output text | sed -E 's/[0-9]{12}/************/'
   ```

   ```bash
   aws iam get-role --role-name LabRole --query Role.RoleName --output text
   ```

   ```bash
   aws lambda list-functions --max-items 1 --query 'length(Functions)'
   ```

   ```bash
   aws apigatewayv2 get-apis --max-results 1 --query 'length(Items)'
   ```

6. Paste the outputs (they contain no secrets) back to the agent, or into §5.

## 5. Findings to be filled in after sign-in

| Item | Value | Date |
|---|---|---|
| Lab environment available | Yes — Cloud Developing 2.x Sandbox (no separate Learner Lab course) | 2026-11-25 |
| Budget (used / total) | $0 of $40 | 2026-11-25 |
| Permitted consumption = min(US$3, 5 % of remaining) | **US$2.00** | 2026-11-25 |
| Session end behaviour | All resources permanently deleted at 0:00 | 2026-11-25 |
| Session length | ≈ 3 h (timer 02:57 just after start) | 2026-11-25 |
| API Gateway permitted | Yes (Sandbox Readme) | 2026-11-25 |
| Lambda, CloudFormation, SQS, SNS, CloudWatch, SSM, S3, CloudShell permitted | Yes (Sandbox Readme) | 2026-11-25 |
| KMS listed | No — SecureString creation to be tested in session | 2026-11-25 |
| Caller identity is a `voclabs` assumed role | _pending (needs running session)_ | |

## 6. Sources

* AWS Academy Learner Lab – Foundation Services (official AWS PDF, mirrored by University of the Pacific): <https://cyberlab.pacific.edu/courses/comp175/resources/aws-academy/AWS_Academy_Learner_Lab-Foundational_Services.pdf>
* University of Michigan ITS, AWS Academy Learner Lab: <https://www.its.umich.edu/computing/virtualization-cloud/amazon-web-services/aws-academy-learner-lab>
* AWS Builder Center (community), "Teaching AI agent to work inside AWS Academy Learner Lab": <https://builder.aws.com/content/32E1EQtdsojEIqMZ4haf7CYLBuE/teaching-ai-agent-to-work-inside-aws-academy-learner-lab>
* Community deployment record noting CloudFront/OIDC blocks (unverified): <https://github.com/hackathon-fiap-soat/fiapx-docs/pull/14>
