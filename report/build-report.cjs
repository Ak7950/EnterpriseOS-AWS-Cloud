// Builds report/EnterpriseOS-AWS-Report.pdf from report/report.html with headless Chrome.
// Two passes: the first finds the page each section starts on, the second fills the Index.
// Usage: NODE_PATH=<dir with puppeteer-core> node report/build-report.cjs <python-with-pypdf>
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML = path.join(__dirname, 'report.html');
const OUT = path.join(__dirname, 'EnterpriseOS-AWS-Report.pdf');
const PY = process.argv[2] || 'python3';

// index key -> text that appears at the start of that section (searched after the Index page)
const MARKERS = {
  abstract: 'is a multi-tenant workforce-management web application',
  intro: '2.1 Application Domain', 'intro-cloud': '2.3 Importance of Cloud', 'intro-problem': '2.4 Problem Statement',
  'intro-objectives': '2.5 Objectives', 'intro-scope': '2.6 Scope',
  method: '3.1 Approach', 'method-env': '3.2 Cloud Environment', 'method-arch': '3.3 Proposed System',
  'method-services': '3.4 AWS Service Selection', 'method-flow': '3.5 Request Flow', 'method-security': '3.6 Security Design',
  'method-iac': '3.7 Infrastructure', 'method-cost': '3.8 Cost Control', 'method-tools': '3.9 Tools',
  results: '4.1 Website', 'results-tests': '4.2 Testing', 'results-quality': '4.3 Security and Quality',
  'results-cost': '4.4 Performance', 'results-defects': '4.5 Defects', 'results-deploy': '4.6 Deployment Status',
  conclusion: '5.1 Conclusion', references: 'Enterprise Workforce Management System (EWMS)'
};

const pdfOptions = {
  path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;text-align:center;font-family:Times New Roman,serif;font-size:10px;color:#333"><span class="pageNumber"></span></div>',
};

function findPages() {
  const script = `
import sys, json, pypdf
r = pypdf.PdfReader(sys.argv[1]); markers = json.loads(sys.argv[2])
texts = [" ".join((p.extract_text() or "").split()) for p in r.pages]
out = {}
for key, m in markers.items():
    out[key] = next((i + 1 for i, t in enumerate(texts) if i >= 2 and m in t), None)
print(json.dumps({"pages": len(texts), "found": out}))`;
  return JSON.parse(execFileSync(PY, ['-I', '-c', script, OUT, JSON.stringify(MARKERS)], { encoding: 'utf8' }));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file://' + HTML, { waitUntil: 'networkidle0' });
  await page.pdf(pdfOptions);
  const { pages, found } = findPages();
  const missing = Object.entries(found).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error('Section markers not found: ' + missing.join(', '));
  await page.evaluate(map => {
    document.querySelectorAll('[data-page]').forEach(td => { td.textContent = map[td.dataset.page]; });
  }, found);
  await page.pdf(pdfOptions);
  const check = findPages();
  await browser.close();
  if (JSON.stringify(check.found) !== JSON.stringify(found)) throw new Error('Page numbers shifted between passes');
  console.log(`wrote ${OUT} (${pages} pages)`);
  console.log(found);
})().catch(e => { console.error(e); process.exit(1); });
