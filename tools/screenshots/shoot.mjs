import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.APP_URL || 'http://localhost:4173/';
const token = fs.readFileSync(new URL('./admin-token.txt', import.meta.url), 'utf8').trim();
fs.mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
const settle = async () => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500); };
await page.goto(base + '#/login'); await settle();
await page.screenshot({ path: 'out/01-login.png' });
await page.evaluate((t) => localStorage.setItem('wms-token', t), token);
const pages = [['', '02-dashboard'], ['products', '03-products'], ['requisitions', '04-requisitions'], ['approvals', '05-approvals'], ['stock-issue', '06-stock-issue'], ['stock-in', '07-stock-in'], ['notifications', '08-notifications'], ['reports', '09-reports'], ['users', '10-users'], ['audit-logs', '11-audit-logs'], ['categories', '12-categories']];
for (const [route, name] of pages) {
  await page.goto(base + '#/' + route); await settle();
  await page.screenshot({ path: `out/${name}.png` });
  console.log('shot', name);
}
// มือถือ
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'th-TH' });
await m.goto(base + '#/login'); await m.evaluate((t) => localStorage.setItem('wms-token', t), token);
await m.goto(base + '#/'); await m.waitForLoadState('networkidle'); await m.waitForTimeout(1500);
await m.screenshot({ path: 'out/13-mobile-dashboard.png' });
await browser.close();
