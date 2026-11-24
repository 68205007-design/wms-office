// เซิร์ฟเวอร์ข้อมูลตัวอย่าง: รัน Code.gs จริงบนตัวจำลอง Apps Script เพื่อถ่ายภาพหน้าจอระบบ
const http = require('http');
const path = require('path');
const fs = require('fs');
const mock = require('./gas-mock.cjs');
mock.load(path.join(__dirname, '../../apps-script/Code.gs'));
const { context, logs } = mock;
const call = (method, p, { token, body, query } = {}) => {
  const r = JSON.parse(JSON.stringify(context.handle({ method, path: p, token, body, query })));
  if (r.status >= 400) console.error('seed error', method, p, JSON.stringify(r.body).slice(0, 200));
  return r.body;
};

context.setup();
const pw = logs.find((l) => l.includes('รหัสผ่าน:')).split('รหัสผ่าน: ')[1].trim();
const admin = call('POST', '/auth/login', { body: { email: 'admin@wms.local', password: pw } }).data.token;

const cats = Object.fromEntries(['เครื่องเขียน', 'กระดาษและแฟ้ม', 'อุปกรณ์คอมพิวเตอร์', 'วัสดุทำความสะอาด'].map((n) => [n, call('POST', '/categories', { token: admin, body: { name: n } }).data.id]));
const depts = Object.fromEntries(['งานบริหารทั่วไป', 'งานการเงิน', 'แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'แผนกวิชาการบัญชี'].map((n) => [n, call('POST', '/departments', { token: admin, body: { name: n } }).data.id]));
const sup = call('POST', '/suppliers', { token: admin, body: { name: 'ร้านชุมพรเครื่องเขียน', contactPerson: 'คุณสมศรี', phone: '077-000000', email: '' } }).data.id;
const sup2 = call('POST', '/suppliers', { token: admin, body: { name: 'บริษัท ออฟฟิศซัพพลาย จำกัด', contactPerson: 'คุณวิชัย', phone: '077-111111', email: '' } }).data.id;
const units = call('GET', '/units', { token: admin, query: { limit: 100 } }).data;
const unit = (i) => units[i % units.length].id;

const items = [
  ['P001', 'ปากกาลูกลื่น สีน้ำเงิน', 'เครื่องเขียน', 5, 8, 50],
  ['P002', 'ดินสอ 2B', 'เครื่องเขียน', 4, 6, 30],
  ['P003', 'ยางลบ', 'เครื่องเขียน', 3, 5, 20],
  ['P004', 'กระดาษ A4 80 แกรม', 'กระดาษและแฟ้ม', 115, 130, 20],
  ['P005', 'แฟ้มเอกสาร สันกว้าง', 'กระดาษและแฟ้ม', 45, 60, 10],
  ['P006', 'ซองน้ำตาล A4', 'กระดาษและแฟ้ม', 2, 3, 100],
  ['P007', 'หมึกพิมพ์ HP 682 สีดำ', 'อุปกรณ์คอมพิวเตอร์', 390, 450, 5],
  ['P008', 'เมาส์ USB', 'อุปกรณ์คอมพิวเตอร์', 150, 190, 5],
  ['P009', 'น้ำยาเช็ดกระจก', 'วัสดุทำความสะอาด', 45, 55, 6],
  ['P010', 'ถุงขยะ ขนาดใหญ่', 'วัสดุทำความสะอาด', 60, 75, 10]
];
const stockIn = [400, 120, 25, 60, 30, 300, 4, 12, 8, 30];
const prods = items.map(([sku, name, c, cost, price, min], i) => call('POST', '/products', { token: admin, body: { sku, name, categoryId: cats[c], unitCatalogId: unit(i), costPrice: cost, sellingPrice: price, minimumStock: min } }).data.id);
const now = Date.now();
prods.forEach((id, i) => {
  // แบ่งรับเข้าเป็นหลายเดือนเพื่อให้กราฟมีข้อมูล
  const parts = [0.4, 0.35, 0.25];
  parts.forEach((p, k) => {
    const q = Math.max(1, Math.round(stockIn[i] * p));
    call('POST', '/movements/in', { token: admin, body: { productId: id, quantity: q, unitCost: items[i][3], supplierId: k % 2 ? sup2 : sup, referenceKey: `seed-${i}-${k}-xxxxxxxx`, movementDate: new Date(now - (60 - k * 25) * 86400e3).toISOString(), note: 'รับเข้าตามใบสั่งซื้อ' } });
  });
});
const mk = (name, email, role, dept) => call('POST', '/users', { token: admin, body: { name, email, password: 'DemoPass123', role, departmentId: depts[dept] } });
mk('นางสาวกนกวรรณ ใจดี', 'kanokwan@demo.local', 'USER', 'งานการเงิน');
mk('นายธนากร ศรีสุข', 'thanakorn@demo.local', 'USER', 'แผนกวิชาคอมพิวเตอร์ธุรกิจ');
mk('นางพรทิพย์ มั่นคง', 'porntip@demo.local', 'WAREHOUSE_STAFF', 'งานบริหารทั่วไป');
mk('นายสมชาย รักงาน', 'somchai@demo.local', 'ADMIN', 'งานบริหารทั่วไป');
const tok = (e) => call('POST', '/auth/login', { body: { email: e, password: 'DemoPass123' } }).data.token;
const u1 = tok('kanokwan@demo.local'), u2 = tok('thanakorn@demo.local'), staff = tok('porntip@demo.local');
const req = (t, dept, purpose, list) => call('POST', '/requisitions', { token: t, body: { departmentId: depts[dept], purpose, items: list.map(([i, q]) => ({ productId: prods[i], quantity: q })) } }).data.id;
const r1 = req(u1, 'งานการเงิน', 'ใช้จัดทำเอกสารเบิกจ่ายประจำเดือน', [[3, 10], [4, 3], [0, 20]]);
const r2 = req(u2, 'แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'ใช้ในห้องปฏิบัติการคอมพิวเตอร์', [[6, 2], [7, 4]]);
const r3 = req(u1, 'งานการเงิน', 'เตรียมเอกสารประชุม', [[5, 50], [1, 10]]);
const r4 = req(u2, 'แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'ใช้ทำความสะอาดห้องเรียน', [[8, 2], [9, 5]]);
req(u1, 'งานการเงิน', 'ใช้งานในสำนักงาน', [[0, 10], [2, 5]]);
req(u2, 'แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'สำหรับกิจกรรมนักเรียน', [[3, 5], [1, 20]]);
call('PATCH', `/requisitions/${r1}/decision`, { token: admin, body: { decision: 'APPROVED' } });
call('PATCH', `/requisitions/${r2}/decision`, { token: admin, body: { decision: 'APPROVED' } });
call('PATCH', `/requisitions/${r3}/decision`, { token: admin, body: { decision: 'APPROVED' } });
call('PATCH', `/requisitions/${r4}/decision`, { token: admin, body: { decision: 'REJECTED', decisionNote: 'มีวัสดุในแผนกเพียงพอแล้ว' } });
call('POST', `/requisitions/${r1}/fulfill`, { token: staff });
call('POST', `/requisitions/${r2}/fulfill`, { token: staff });

fs.writeFileSync(path.join(__dirname, 'admin-token.txt'), admin);
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    const out = req.method === 'POST' ? context.doPost({ postData: { contents: data } }) : context.doGet({ parameter: {} });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(out.s);
  });
}).listen(8787, () => console.log('demo GAS server on :8787'));
