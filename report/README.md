# Project report

`EnterpriseOS-AWS-Report.pdf` (A4, 20 pages) follows the required format:
Cover page → Index → Abstract → Introduction → Methodology → Results → Conclusion and Future Scope
(plus References). Layout matches the department's earlier reports (Times New Roman, centred
underlined chapter headings, cover with course, year, logo, roll numbers and "Submitted to").

| File | Purpose |
|---|---|
| `report.html` | Source of the report (edit text here) |
| `build-report.cjs` | Renders the PDF with headless Chrome; fills the Index page numbers automatically |
| `capture-screenshots.cjs` | Re-captures the UI screenshots in `figures/` from a local run with synthetic demo data |
| `figures/` | Screenshots and the institute logo used on the cover |

## Before submitting

Replace `[Course Code]` and `[Faculty Name]` on the cover (in `report.html`), then rebuild:

```bash
NODE_PATH=/path/to/node_modules node report/build-report.cjs /path/to/python-with-pypdf
```

After a verified AWS deployment, update Abstract, section 3.2, section 4.6 ("Deployment Status")
and add the redacted AWS screenshots as evidence.
