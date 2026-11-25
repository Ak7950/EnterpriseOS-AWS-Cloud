# Reference IAM policies

These JSON documents are the **least-privilege policies for a normal AWS account**.
`${Region}`, `${AccountId}` and `${Stage}` are placeholders, not CloudFormation syntax.

| File | Used by | Status |
|---|---|---|
| `api-function-policy.json` | API Lambda execution role | Created by `template.yaml` when `LambdaRoleArn` is empty |
| `worker-function-policy.json` | Event-worker Lambda execution role | Created by `template.yaml` when `LambdaRoleArn` is empty |
| `github-oidc-trust-policy.json` | GitHub Actions deploy role (OIDC, no stored keys) | **Designed / not deployed** — AWS Academy cannot create IAM roles or OIDC identity providers |

In AWS Academy Learner Lab, IAM role creation is blocked, so both functions run as the
pre-created `LabRole`. That role is broader than these policies; this is a documented,
accepted sandbox limitation (see `docs/security.md`).

Logging permissions omit `logs:CreateLogGroup` on purpose: the template creates each log
group itself with a retention period, so functions never create unbounded log groups.
