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

**None yet. No AWS resource has been deployed.**

After a verified deployment, add screenshots or CLI output here as `aws-*.png` / `aws-*.txt`.
Redact the 12-digit account ID, ARNs, API IDs, Function URL IDs and any e-mail addresses
first. Then update the status column in `../aws-service-matrix.md`.
