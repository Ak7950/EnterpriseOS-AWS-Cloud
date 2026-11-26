// Builds the lab-submission PDFs/PNG in submission/ from submission/src/*.html.
// Styles and diagrams are taken from report/report.html so every document stays consistent.
// Usage: NODE_PATH=<dir with puppeteer-core> node submission/build-submission.cjs
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = path.join(__dirname, 'src');
const main = fs.readFileSync(path.join(__dirname, '..', 'report', 'report.html'), 'utf8');
const STYLE = main.match(/<style>([\s\S]*?)<\/style>/)[1];
const [ARCH, FLOW] = main.match(/<svg[\s\S]*?<\/svg>/g);
const status = JSON.parse(fs.readFileSync(path.join(SRC, 'deploy-status.json'), 'utf8'));

function render(name) {
  let html = fs.readFileSync(path.join(SRC, name), 'utf8')
    .replace('<!--STYLE-->', STYLE)
    .replace('<!--ARCH_SVG-->', ARCH)
    .replace('<!--FLOW_SVG-->', FLOW)
    .replace('<!--DEPLOY_STATUS-->', status.text)
    .replace('<!--DEPLOY_EVIDENCE-->', status.evidenceHtml || '');
  const tmp = path.join(SRC, `.${name}`);
  fs.writeFileSync(tmp, html);
  return tmp;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const footer = '<div style="width:100%;text-align:center;font-family:Times New Roman,serif;font-size:9px;color:#333"><span class="pageNumber"></span></div>';
  const jobs = [
    ['proposal.html', '1-Project-Proposal.pdf', {}],
    ['architecture.html', '2-System-Architecture.pdf', { landscape: true }],
    ['report-short.html', '5-Project-Report.pdf', {}],
    ['cheat-sheet.html', 'Demo-Cheat-Sheet.pdf', { landscape: true }],
  ];
  for (const [src, out, extra] of jobs) {
    const tmp = render(src);
    await page.goto('file://' + tmp, { waitUntil: 'networkidle0' });
    await page.pdf({ path: path.join(__dirname, out), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, ...extra });
    if (src === 'architecture.html') {
      await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
      const fig = await page.$('figure');
      await fig.screenshot({ path: path.join(__dirname, '2-System-Architecture.png') });
    }
    fs.unlinkSync(tmp);
    console.log('wrote', out);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
