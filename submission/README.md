# Lab submission (UCS531, Ms. Ishani Rana)

| # | LMS item | File |
|---|---|---|
| 1 | Project proposal (problem statement and objectives) | `1-Project-Proposal.pdf` |
| 2 | System architecture diagram | `2-System-Architecture.pdf` / `.png` |
| 3 | Cloud deployment with demonstration | Live in the lab (AWS Academy sandbox), evidence in `5-Project-Report.pdf` and `docs/evidence/` |
| 4 | Source code with README | This repository (`README.md` at the root) |
| 5 | Project report with screenshots (max 5 pages) | `5-Project-Report.pdf` |

`Demo-Cheat-Sheet.pdf` (3 pages, not for the LMS) maps every feature to how to show it live and where it is in the AWS console, with the 6-minute demo script, short viva answers, tomorrow's redeploy steps and cleanup.

The full report is `report/EnterpriseOS-AWS-Report.pdf` and the slides are
`presentation/EnterpriseOS-AWS-Presentation.pptx`.

Rebuild after editing `src/*.html` or `src/deploy-status.json`:

```bash
NODE_PATH=/path/to/node_modules node submission/build-submission.cjs
```
