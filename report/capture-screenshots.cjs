// Captures EnterpriseOS UI screenshots for the report (local run, synthetic demo data only).
// Usage: NODE_PATH=<dir with puppeteer-core> node report/capture-screenshots.cjs
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'figures');
const PORT = 4610;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEMO_PASSWORD = 'Demo@12345'; // synthetic seed account from server/seed.js

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, PORT: String(PORT), NODE_ENV: 'development', JWT_SECRET: 'screenshot-only-secret-with-at-least-32-chars', DATABASE_URL: '' },
    stdio: 'ignore'
  });
  try {
    for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch {} await sleep(250); }
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

    async function signIn(email) {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#login');
      await page.type('#login input[name=email]', email);
      await page.type('#login input[name=password]', DEMO_PASSWORD);
      await Promise.all([page.waitForSelector('.shell'), page.click('#login button[type=submit], #login button')]);
      await sleep(600);
    }
    async function shot(hash, file) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await sleep(900);
      await page.screenshot({ path: path.join(OUT, file) });
      console.log('captured', file);
    }

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT, 'ui-login.png') });
    console.log('captured ui-login.png');
    await signIn('manager@demo.com');
    await shot('dashboard', 'ui-dashboard.png');
    await shot('kanban', 'ui-kanban.png');
    await shot('leaves', 'ui-leaves.png');
    // Approve the pending leave request, then show the result as the admin.
    const approved = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, a')].find(e => e.textContent.trim() === 'Approve');
      if (b) b.click();
      return Boolean(b);
    });
    console.log('approved pending leave:', approved);
    await sleep(1200);
    await signIn('admin@demo.com');
    await shot('attendance', 'ui-attendance.png');
    await shot('audit', 'ui-audit.png');
    await browser.close();
  } finally {
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
