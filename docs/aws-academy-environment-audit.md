# AWS Academy environment audit

**Audit date:** 2026-11-25 · **Method:** read-only local inspection, the AWS Academy portal
in a browser, and official AWS documentation. No AWS resource was created, and no AWS API
was called.

Each finding is marked **Verified** (observed directly), **Documented** (stated in official
AWS material but not yet confirmed for *this* account), or **Unverified** (unknown).

## 1. Summary

| Question | Finding | Status |
|---|---|---|
| Is a Learner Lab available to this student? | Not known. The student reports enrolment in *AWS Academy Cloud Foundations* and *Cloud Developing*. These courses ship guided labs; a separate *Learner Lab* course may or may not be assigned | **Unverified** |
| Signed in to AWS Academy? | The AWS Academy LMS login page (`awsacademy.com/vforcesite/LMS_Login`) was shown; no active session in the agent's browser | **Verified** |
| Lab budget / credits remaining | Not visible without signing in. University pages describe US$50–100 per student | **Unverified** |
| Session length | Learner Lab sessions are time-boxed (commonly 4 h) and credentials rotate each session | **Documented** (community/older AWS material) |
| Regions | "All service access is limited to the us-east-1 and us-west-2 Regions" (AWS Academy Learner Lab – Foundation Services) | **Documented** |
| AWS CLI on this Mac | `aws` not installed; no `~/.aws` directory; no `AWS_*` environment variables | **Verified** |
| SAM CLI / Docker / GitHub CLI | Not installed | **Verified** |
| Temporary credentials | Learner Lab exposes short-lived credentials (access key, secret, **session token**) under *AWS Details*; none are present locally | **Documented** / none present (**Verified**) |
| GitHub OIDC for deployments | IAM role and identity-provider creation are blocked in Learner Lab (see §3) | **Documented** |

**Consequence:** under the project's financial rule, the permitted Academy credit
consumption is **US$0 until the budget and service access are verified**. Nothing has been
deployed.

## 2. Local machine inspection (verified)

| Check | Result |
|---|---|
| Project directory | `~/Desktop/EnterpriseOS-AWS-Cloud`, Git root, branch `main` |
| Git remote | `origin https://github.com/Ak7950/EnterpriseOS-AWS-Cloud.git` only — the original `EnterpriseOS` repo is **not** a remote |
| GitHub repo | Exists; anonymous request returns 404 while the owner's stored credentials can read it → **private** |
| Original project on disk | No `~/Desktop/EnterpriseOS` directory present; nothing outside this repository was touched |
| Node.js / npm | v24.13.0 / 11.6.2 |
| AWS / SAM / Docker / gh CLIs | Not installed |

## 3. Service availability (official Learner Lab service list)

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

A newer Learner Lab variant ("Associate Services") is believed to include API Gateway; this
must be confirmed on the *Services* page inside the lab before choosing
`FRONT_DOOR=HttpApi`.

## 4. How to complete the audit (student actions — about 5 minutes)

These steps need your own login, which only you can do. They are all read-only.

1. Sign in at <https://www.awsacademy.com/vforcesite/LMS_Login> → *Student Login*.
2. Open the course that contains **Learner Lab** (Modules → *Launch AWS Academy Learner Lab*).
   If no course has it, record "No Learner Lab" here — the project then remains
   *Implemented Locally*, which is still a complete submission.
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
| Learner Lab course available | _pending_ | |
| Budget (used / total) | _pending_ | |
| Permitted consumption = min(US$3, 5 % of remaining) | _pending (currently US$0)_ | |
| Session time / auto-stop behaviour | _pending_ | |
| API Gateway permitted | _pending_ | |
| Caller identity is a `voclabs` assumed role | _pending_ | |

## 6. Sources

* AWS Academy Learner Lab – Foundation Services (official AWS PDF, mirrored by University of the Pacific): <https://cyberlab.pacific.edu/courses/comp175/resources/aws-academy/AWS_Academy_Learner_Lab-Foundational_Services.pdf>
* University of Michigan ITS, AWS Academy Learner Lab: <https://www.its.umich.edu/computing/virtualization-cloud/amazon-web-services/aws-academy-learner-lab>
* AWS Builder Center (community), "Teaching AI agent to work inside AWS Academy Learner Lab": <https://builder.aws.com/content/32E1EQtdsojEIqMZ4haf7CYLBuE/teaching-ai-agent-to-work-inside-aws-academy-learner-lab>
* Community deployment record noting CloudFront/OIDC blocks (unverified): <https://github.com/hackathon-fiap-soat/fiapx-docs/pull/14>
