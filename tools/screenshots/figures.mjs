// สร้างภาพประกอบรายงาน: แผนภาพ โค้ดจริงจากโปรเจกต์ และภาพหน้าเว็บจริงบน GitHub
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import hljs from 'highlight.js';

const root = path.resolve('../..');
const out = path.resolve('out'); fs.mkdirSync(out, { recursive: true });
const fontDir = path.join(root, 'node_modules/@fontsource/sarabun/files');
const font = (w) => 'file://' + path.join(fontDir, fs.readdirSync(fontDir).find((f) => f.includes(`thai-${w}-normal.woff2`)));
const fontLatin = (w) => 'file://' + path.join(fontDir, fs.readdirSync(fontDir).find((f) => f.includes(`latin-${w}-normal.woff2`)));
const css = `
@font-face{font-family:S;font-weight:400;src:url(${font(400)})}@font-face{font-family:S;font-weight:700;src:url(${font(700)})}
@font-face{font-family:S;font-weight:400;src:url(${fontLatin(400)});unicode-range:U+0000-00FF}@font-face{font-family:S;font-weight:700;src:url(${fontLatin(700)});unicode-range:U+0000-00FF}
*{box-sizing:border-box}body{margin:0;font-family:S,sans-serif;background:#fff;color:#2B211C}
.wrap{padding:36px;display:inline-block}
.box{border:2px solid #8E2A22;border-radius:14px;padding:12px 18px;background:#FBF3F1;font-size:20px;text-align:center;min-width:240px}
.gold{border-color:#C8963E;background:#FCF8EE}.green{border-color:#16A36A;background:#ECFDF5}.red{border-color:#DC2626;background:#FEF2F2}
.dia{border:2px solid #C8963E;background:#FCF8EE;transform:rotate(45deg);width:150px;height:150px;display:grid;place-items:center;margin:18px auto}
.dia span{transform:rotate(-45deg);font-size:19px;font-weight:700;text-align:center}
.arrow{font-size:28px;color:#8E2A22;text-align:center;line-height:1.2}
.lbl{font-size:16px;color:#7D7266}
h3{margin:0 0 6px;font-size:18px}
`;
const browser = await chromium.launch();
const shoot = async (name, html, opts = {}) => {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: opts.width || 1200, height: 600 } });
  await page.setContent(`<html><head><meta charset="utf-8"><style>${css}${opts.css || ''}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$(opts.selector || '.wrap');
  await el.screenshot({ path: path.join(out, name + '.png') });
  await page.close(); console.log('fig', name);
};

// 1) แผนภาพขั้นตอนการทำงาน
const B = (t, c = '') => `<div class="box ${c}">${t}</div>`;
const A = (l = '') => `<div class="arrow">↓${l ? `<div class="lbl">${l}</div>` : ''}</div>`;
await shoot('f01-flow', `<div class="wrap" style="width:1100px">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
<div>
<div style="text-align:center;font-weight:700;font-size:22px;margin-bottom:10px">การเบิกวัสดุ</div>
${B('ผู้ใช้เข้าสู่ระบบ', 'gold')}${A()}${B('สร้างใบขอเบิก<br><span class="lbl">เลือกแผนก วัสดุ จำนวน</span>')}${A()}${B('ระบบแจ้งเตือนผู้อนุมัติ')}${A()}
<div class="dia"><span>ผู้อนุมัติ<br>พิจารณา</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div>${A('อนุมัติ')}${B('เจ้าหน้าที่คลังจ่ายวัสดุ', 'green')}${A()}${B('ระบบตัดสต็อกอัตโนมัติ', 'green')}</div>
<div>${A('ไม่อนุมัติ')}${B('แจ้งผู้ขอพร้อมเหตุผล', 'red')}</div>
</div></div>
<div>
<div style="text-align:center;font-weight:700;font-size:22px;margin-bottom:10px">การรับเข้าและแจ้งเตือน</div>
${B('เจ้าหน้าที่คลังเข้าสู่ระบบ', 'gold')}${A()}${B('บันทึกรับวัสดุจากผู้จำหน่าย')}${A()}${B('ระบบเพิ่มยอดคงเหลือ')}${A()}
<div class="dia"><span>คงเหลือ ≤<br>ขั้นต่ำ?</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div>${A('ใช่')}${B('แจ้งเตือนวัสดุใกล้หมด', 'red')}</div>
<div>${A('ไม่ใช่')}${B('แสดงสถานะปกติ', 'green')}</div>
</div>${A()}${B('บันทึกประวัติ และออกรายงาน Excel / PDF', 'gold')}
</div></div></div>`);

// 2) โครงสร้างฐานข้อมูล
const TABLES = {
  'users (ผู้ใช้งาน)': ['id', 'name', 'email', 'passwordHash', 'roleId → roles', 'departmentId → departments', 'active'],
  'products (วัสดุ)': ['id', 'sku', 'name', 'categoryId → categories', 'unitCatalogId → units', 'costPrice', 'stockQuantity', 'minimumStock', 'imageUrl'],
  'requisitions (ใบขอเบิก)': ['id', 'requestNumber', 'requesterId → users', 'departmentId → departments', 'purpose', 'status', 'decisionNote', 'decidedById → users'],
  'requisition_items (รายการเบิก)': ['id', 'requisitionId → requisitions', 'productId → products', 'quantity'],
  'stock_movements (เคลื่อนไหวสต็อก)': ['id', 'type (รับเข้า/จ่ายออก)', 'productId → products', 'quantity', 'supplierId → suppliers', 'requisitionItemId', 'createdById → users'],
  'notifications (แจ้งเตือน)': ['id', 'userId → users', 'requisitionId', 'type', 'title', 'readAt'],
  'categories / units / departments / suppliers': ['ข้อมูลพื้นฐาน:', 'หมวดหมู่ หน่วยนับ', 'แผนก ผู้จำหน่าย'],
  'roles / audit_logs': ['บทบาทผู้ใช้ 5 ระดับ', 'ประวัติการใช้งานระบบ']
};
await shoot('f02-database', `<div class="wrap" style="width:1150px"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${Object.entries(TABLES).map(([t, cols]) => `
<div style="border:2px solid #8E2A22;border-radius:10px;overflow:hidden"><div style="background:#7A231B;color:#fff;font-weight:700;padding:8px 10px;font-size:16px">${t}</div>
<div style="padding:8px 10px;font-size:15px;line-height:1.7">${cols.map((c) => c.includes('→') ? `<div><b style="color:#A97A2C">${c}</b></div>` : `<div>${c === 'id' ? '<b>🔑 id</b>' : c}</div>`).join('')}</div></div>`).join('')}</div>
<p class="lbl" style="margin:14px 0 0">สีทอง = คอลัมน์ที่เชื่อมไปยังตารางอื่น (→ ชื่อตาราง) · ฐานข้อมูลทั้งหมด 12 ตาราง เก็บเป็นแผ่นงานใน Google Sheets</p></div>`);

// 3) โครงสร้างไฟล์โปรเจกต์
const files = execSync('git ls-files', { cwd: root }).toString().split('\n').filter(Boolean)
  .filter((f) => !/^(tools|backend\/prisma\/migrations|frontend\/public)\//.test(f) && !/\.(png|jpg|svg|ico|bat|lock)$/.test(f) && !f.includes('package-lock'));
const tree = {};
files.forEach((f) => { const parts = f.split('/').slice(0, 4); let n = tree; parts.forEach((p) => { n[p] = n[p] || {}; n = n[p]; }); });
const render = (n, pre = '') => Object.keys(n).sort((a, b) => (Object.keys(n[b]).length > 0) - (Object.keys(n[a]).length > 0) || a.localeCompare(b)).map((k, i, arr) => {
  const last = i === arr.length - 1, dir = Object.keys(n[k]).length > 0;
  return `${pre}${last ? '└── ' : '├── '}${dir ? `<b style="color:#E5C07B">${k}/</b>` : k}\n` + (dir ? render(n[k], pre + (last ? '    ' : '│   ')) : '');
}).join('');
const treeText = render(tree).split('\n');
const half = Math.ceil(treeText.length / 2);
await shoot('f03-project', `<div class="wrap" style="background:#1E1B19;color:#EDE6DD;border-radius:12px;font-family:monospace;font-size:14px">
<div style="color:#A79C8E;margin-bottom:10px;font-family:S">โฟลเดอร์โปรเจกต์ WMS-PROJECT</div><div style="display:flex;gap:40px"><pre style="margin:0">${treeText.slice(0, half).join('\n')}</pre><pre style="margin:0">${treeText.slice(half).join('\n')}</pre></div></div>`, { width: 1400 });

// 4) โค้ดจริงจากโปรเจกต์
const code = (name, file, from, to, lang, title) => {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n').slice(from - 1, to);
  const html = hljs.highlight(lines.join('\n'), { language: lang }).value.split('\n');
  return shoot(name, `<div class="wrap" style="background:#1E1B19;border-radius:12px;padding:0;overflow:hidden">
<div style="background:#2B211C;color:#E5C07B;padding:10px 18px;font-size:15px">${file} <span style="color:#A79C8E">— ${title}</span></div>
<table style="font-family:monospace;font-size:14px;line-height:1.55;color:#EDE6DD;padding:14px 18px;border-spacing:0">${html.map((l, i) => `<tr><td style="color:#7D7266;text-align:right;padding-right:16px;user-select:none">${from + i}</td><td style="white-space:pre">${l || ' '}</td></tr>`).join('')}</table></div>`,
  { width: 1500, css: `.hljs-keyword,.hljs-built_in{color:#E5A07B}.hljs-string{color:#A8D88A}.hljs-comment{color:#8C8073;font-style:italic}.hljs-number,.hljs-literal{color:#D9AA57}.hljs-title,.hljs-title.function_{color:#F2C46D}.hljs-attr,.hljs-property{color:#9CC9E0}.hljs-tag,.hljs-name{color:#E57B6E}` });
};
await code('f04-code-routes', 'frontend/src/App.jsx', 28, 52, 'javascript', 'กำหนดหน้าต่าง ๆ ของเว็บไซต์ (React)');
await code('f05-code-fulfill', 'apps-script/Code.gs', 956, 987, 'javascript', 'จ่ายวัสดุและตัดสต็อกอัตโนมัติ (Google Apps Script)');
await code('f06-code-connect', 'frontend/src/services/api.js', 49, 66, 'javascript', 'ส่งข้อมูลจากหน้าเว็บไปยัง Google Apps Script');
await code('f07-code-tables', 'apps-script/Code.gs', 73, 89, 'javascript', 'กำหนดตาราง (แผ่นงาน) ในฐานข้อมูล');

// 5) ข้อมูลในแผ่นงาน (ข้อมูลตัวอย่างจากระบบทดสอบ)
const token = fs.readFileSync('admin-token.txt', 'utf8').trim();
const res = await fetch('http://localhost:8787/', { method: 'POST', body: JSON.stringify({ method: 'GET', path: '/products', query: { limit: 20 }, token }) }).then((r) => r.json());
const cols = [['id', 'id'], ['sku', 'sku'], ['name', 'name'], ['categoryId', 'categoryId'], ['costPrice', 'costPrice'], ['stockQuantity', 'stockQuantity'], ['minimumStock', 'minimumStock']];
const rows = res.body.data.sort((a, b) => a.id - b.id);
await shoot('f08-sheet', `<div class="wrap" style="padding:0;border:1px solid #D2C8BA">
<table style="border-collapse:collapse;font-size:15px">
<tr style="background:#F3EFE9;color:#5E554C"><td style="border:1px solid #D2C8BA;width:44px"></td>${cols.map((c, i) => `<td style="border:1px solid #D2C8BA;text-align:center;padding:4px">${String.fromCharCode(65 + i)}</td>`).join('')}</tr>
<tr><td style="border:1px solid #D2C8BA;background:#F3EFE9;text-align:center;color:#5E554C">1</td>${cols.map(([h]) => `<td style="border:1px solid #D2C8BA;padding:5px 10px;font-weight:700;background:#F7ECD0">${h}</td>`).join('')}</tr>
${rows.map((r, i) => `<tr><td style="border:1px solid #D2C8BA;background:#F3EFE9;text-align:center;color:#5E554C">${i + 2}</td>${cols.map(([, k]) => `<td style="border:1px solid #D2C8BA;padding:5px 10px">${r[k]}</td>`).join('')}</tr>`).join('')}
</table>
<div style="display:flex;gap:2px;background:#F3EFE9;padding:6px 10px;font-size:13px;border-top:1px solid #D2C8BA">${['roles', 'users', 'categories', 'suppliers', 'departments', 'units', 'products', 'requisitions', 'requisition_items', 'notifications', 'stock_movements', 'audit_logs'].map((s) => `<span style="padding:4px 10px;border-radius:4px 4px 0 0;${s === 'products' ? 'background:#fff;color:#8E2A22;font-weight:700' : 'color:#5E554C'}">${s}</span>`).join('')}</div></div>`, { width: 1400 });

// 6) ภาพหน้าเว็บจริงบนอินเทอร์เน็ต
const web = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'th-TH' });
for (const [name, url] of [
  ['w01-github-repo', 'https://github.com/68205007-design/wms-office'],
  ['w02-github-actions', 'https://github.com/68205007-design/wms-office/actions/workflows/pages.yml'],
  ['w03-live-site', 'https://68205007-design.github.io/wms-office/']
]) {
  try { await web.goto(url, { waitUntil: 'networkidle', timeout: 45000 }); await web.waitForTimeout(2500); await web.screenshot({ path: path.join(out, name + '.png') }); console.log('web', name); }
  catch (e) { console.log('web fail', name, e.message); }
}
await browser.close();
