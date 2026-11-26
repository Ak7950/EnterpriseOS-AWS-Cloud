# Evidence

Only genuine output from commands that were actually run is stored here. Nothing is simulated.

| File | What it shows | Captured |
|---|---|---|
| `test-run.txt` | Full `npm test` output: 56 tests, 56 passed | 2026-11-25, local |
| `npm-audit.txt` | `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities | 2026-11-25, local |
| `iac-and-script-lint.txt` | `cfn-lint` 1.61.0 and ShellCheck: no findings | 2026-11-25, local |
| `package-smoke-and-secret-scan.txt` | Lambda package build and smoke test; secret scan | 2026-11-25, local |
| `local-latency.txt` | Measured cold/warm latency of the Lambda handler (local) | 2026-11-25, local |

## AWS evidence

| File | What it shows | Captured |
|---|---|---|
| `aws-deployment-2026-11-26.txt` | Stack outputs, external `/health` checks, security headers, 401 on unauthenticated API, the two defects found and fixed during the first real deploy | 2026-11-26, AWS Academy sandbox, us-east-1 |
| `../../report/figures/aws-worker-log.png` | CloudWatch log of the worker Lambda started by SQS after a leave approval on the live site (account ID cropped out) | 2026-11-26 |

After a verified deployment, add screenshots or CLI output here as `aws-*.png` / `aws-*.txt`.
Redact the 12-digit account ID, ARNs, API IDs, Function URL IDs and any e-mail addresses
first. Then update the status column in `../aws-service-matrix.md`.
