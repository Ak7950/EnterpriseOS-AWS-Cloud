# Cleanup guide

In the AWS Academy Cloud Developing Sandbox, all resources are permanently deleted when the
session timer reaches 0:00 (verified in the lab Readme). Still run the cleanup script at the
end of the demonstration: it stops charges immediately and *verifies* the deletion instead
of relying on the timer. In any other account, ending a session deletes nothing.

## One command (CloudShell, same region and stage)

```bash
STAGE=dev bash scripts/aws/cleanup.sh
```

The script asks you to type the stack name, deletes the CloudFormation stack (both Lambda
functions, the HTTP API or Function URL, both SQS queues, both SNS topics, alarms, the
optional dashboard, the IAM roles if created, and all three log groups), waits for
`DELETE_COMPLETE`, removes any log group that Lambda recreated, and then **verifies** that
no function, queue or stack remains.

Optional extras:

```bash
STAGE=dev DELETE_PARAMETERS=yes bash scripts/aws/cleanup.sh
```

* `DELETE_PARAMETERS=yes` — deletes `/enterpriseos/dev/*` SecureStrings.
* `DELETE_SAM_BUCKET=yes` — **not used by default.** It empties the versioned SAM artifact bucket and
  deletes the `aws-sam-cli-managed-default` stack, which other SAM projects in the same account and
  region may share. Use it only when you are sure the bucket belongs to EnterpriseOS alone. (In the
  Academy sandbox it is removed with everything else when the session ends.)
* What the script **verifies** afterwards: the stack is gone, both Lambda functions are gone, and no
  `enterpriseos-dev-events*` queue remains. Log groups are deleted explicitly.

## Manual verification (console)

1. CloudFormation → no `enterpriseos-dev` stack (check *Deleted* filter for `DELETE_COMPLETE`).
2. Lambda → no `enterpriseos-dev-*` functions.
3. SQS / SNS → no `enterpriseos-dev-*` queues or topics.
4. CloudWatch → Log groups → no `/aws/lambda/enterpriseos-dev-*`; Alarms → none.
5. Systems Manager → Parameter Store → `/enterpriseos/dev/` removed (if requested).
6. Learner Lab budget → note the final "Used $x" in `cost-analysis.md`.

## What is kept

The template, scripts, documentation and evidence stay in Git, so the identical stack can be
recreated in minutes with `deploy.sh`.
