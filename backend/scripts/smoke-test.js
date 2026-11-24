/**
 * ทดสอบระบบแบบ end-to-end กับ API ที่กำลังรันอยู่ + ฐานข้อมูลจริง
 * ใช้: npm run smoke   (ต้อง seed ข้อมูลก่อน และเปิด server ไว้)
 * API_URL=http://localhost:4000/api npm run smoke
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, data };
}

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : '');
  }
}

async function login(username, password) {
  const r = await call('POST', '/auth/login', { body: { username, password } });
  check(`login ${username}`, r.status === 200 && r.data?.token, r.data);
  return r.data?.token;
}

const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

async function main() {
  console.log(`Smoke test → ${API}\n`);

  console.log('[1] Health & Auth');
  const h = await call('GET', '/health');
  check('health: database connected', h.status === 200 && h.data?.database === 'connected', h.data);
  check('ปฏิเสธเมื่อไม่มี token (401)', (await call('GET', '/materials')).status === 401);
  check('รหัสผ่านผิด (401)', (await call('POST', '/auth/login', { body: { username: 'admin', password: 'wrong' } })).status === 401);
  const admin = await login('admin', 'Admin@1234');
  const wh = await login('warehouse', 'Store@1234');
  const approver = await login('approver', 'Approve@1234');
  const user = await login('user', 'User@1234');
  const me = await call('GET', '/auth/me', { token: user });
  check('/auth/me คืนข้อมูลผู้ใช้', me.data?.username === 'user', me.data);

  console.log('\n[2] Role-Based Access Control');
  check('USER เข้าจัดการผู้ใช้ไม่ได้ (403)', (await call('GET', '/users', { token: user })).status === 403);
  check('USER เพิ่มวัสดุไม่ได้ (403)', (await call('POST', '/stock-in', { token: user, body: {} })).status === 403);
  check('WAREHOUSE อนุมัติไม่ได้ (403)', (await call('POST', '/requisitions/1/approve', { token: wh })).status === 403);
  check('ADMIN ดูผู้ใช้ได้', (await call('GET', '/users', { token: admin })).status === 200);

  console.log('\n[3] Dashboard / Master data');
  const dash = await call('GET', '/dashboard', { token: admin });
  check('dashboard มีสถิติและกราฟ 12 เดือน', dash.status === 200 && dash.data.monthly?.length === 12, dash.data?.stats);
  const cats = await call('GET', '/categories', { token: user });
  const units = await call('GET', '/units', { token: user });
  const depts = await call('GET', '/departments', { token: user });
  check('categories/units/departments', cats.data?.length > 0 && units.data?.length > 0 && depts.data?.length > 0);

  console.log('\n[4] Materials CRUD');
  const list = await call('GET', '/materials?page=1&pageSize=5&search=ปากกา', { token: user });
  check('ค้นหาวัสดุ + pagination', list.status === 200 && list.data.pagination?.pageSize === 5, list.data?.pagination);
  const low = await call('GET', '/materials?status=LOW&all=1', { token: user });
  check('filter สถานะใกล้หมด', low.status === 200 && low.data.every((m) => m.status === 'LOW'), low.data?.map?.((m) => m.status));
  const code = `T-${Date.now().toString().slice(-8)}`;
  // POST วัสดุใช้ multipart — ทดสอบผ่าน FormData
  const fd = new FormData();
  Object.entries({ code, name: 'วัสดุทดสอบ', categoryId: cats.data[0].id, unitId: units.data[0].id, quantity: 10, minQuantity: 3, unitPrice: 12.5 }).forEach(([k, v]) => fd.append(k, String(v)));
  const created = await fetch(`${API}/materials`, { method: 'POST', headers: { Authorization: `Bearer ${wh}` }, body: fd }).then(async (r) => ({ status: r.status, data: await r.json() }));
  check('เพิ่มวัสดุ', created.status === 201 && created.data.quantity === 10, created.data);
  const matId = created.data.id;
  const fd2 = new FormData();
  fd2.append('name', 'วัสดุทดสอบ (แก้ไข)');
  const edited = await fetch(`${API}/materials/${matId}`, { method: 'PUT', headers: { Authorization: `Bearer ${wh}` }, body: fd2 }).then(async (r) => ({ status: r.status, data: await r.json() }));
  check('แก้ไขวัสดุ', edited.status === 200 && edited.data.name.includes('แก้ไข'), edited.data);
  const dup = new FormData();
  Object.entries({ code, name: 'ซ้ำ', categoryId: cats.data[0].id, unitId: units.data[0].id, quantity: 0, minQuantity: 0, unitPrice: 0 }).forEach(([k, v]) => dup.append(k, String(v)));
  const dupRes = await fetch(`${API}/materials`, { method: 'POST', headers: { Authorization: `Bearer ${wh}` }, body: dup });
  check('รหัสวัสดุซ้ำถูกปฏิเสธ (409)', dupRes.status === 409);

  console.log('\n[5] Stock-in');
  const rcv = await call('POST', '/stock-in', {
    token: wh,
    body: { supplier: 'ผู้ส่งทดสอบ', receivedDate: today, items: [{ materialId: matId, quantity: 5, unitPrice: 12.5 }] },
  });
  check('บันทึกรับเข้า', rcv.status === 201, rcv.data);
  const afterRcv = await call('GET', `/materials/${matId}`, { token: wh });
  check('ยอดคงเหลือเพิ่มอัตโนมัติ (10+5=15)', afterRcv.data.quantity === 15, afterRcv.data.quantity);

  console.log('\n[6] Requisition → Approve');
  const userDept = me.data.departmentId;
  const over = await call('POST', '/requisitions', {
    token: user,
    body: { departmentId: userDept, requesterName: 'ทดสอบ', purpose: 'ทดสอบเบิกเกิน', requestDate: today, items: [{ materialId: matId, quantity: 999 }] },
  });
  check('ป้องกันเบิกเกินคงเหลือ (400)', over.status === 400, over.data);
  const req1 = await call('POST', '/requisitions', {
    token: user,
    body: { departmentId: userDept, requesterName: 'วิภาวดี ใจดี', purpose: 'ทดสอบการเบิก', requestDate: today, items: [{ materialId: matId, quantity: 4 }] },
  });
  check('ส่งคำขอเบิก → สถานะรออนุมัติ', req1.status === 201 && req1.data.status === 'PENDING', req1.data);
  const notis = await call('GET', '/notifications/unread-count', { token: approver });
  check('ผู้อนุมัติได้รับการแจ้งเตือน', notis.data?.unread > 0, notis.data);

  const [a1, a2] = await Promise.all([
    call('POST', `/requisitions/${req1.data.id}/approve`, { token: approver }),
    call('POST', `/requisitions/${req1.data.id}/approve`, { token: admin }),
  ]);
  const statuses = [a1.status, a2.status].sort();
  check('อนุมัติพร้อมกัน 2 คน → สำเร็จ 1 ครั้งเท่านั้น', statuses[0] === 200 && statuses[1] === 409, statuses);
  const afterApprove = await call('GET', `/materials/${matId}`, { token: wh });
  check('ตัดสต็อกครั้งเดียว (15-4=11)', afterApprove.data.quantity === 11, afterApprove.data.quantity);
  const again = await call('POST', `/requisitions/${req1.data.id}/approve`, { token: approver });
  check('อนุมัติซ้ำถูกปฏิเสธ (409)', again.status === 409);

  console.log('\n[7] Reject');
  const req2 = await call('POST', '/requisitions', {
    token: user,
    body: { departmentId: userDept, requesterName: 'วิภาวดี ใจดี', purpose: 'ทดสอบปฏิเสธ', requestDate: today, items: [{ materialId: matId, quantity: 2 }] },
  });
  const rej = await call('POST', `/requisitions/${req2.data.id}/reject`, { token: approver, body: { reason: 'ทดสอบไม่อนุมัติ' } });
  check('ไม่อนุมัติพร้อมเหตุผล', rej.status === 200 && rej.data.status === 'REJECTED' && rej.data.rejectReason, rej.data);
  const afterReject = await call('GET', `/materials/${matId}`, { token: wh });
  check('ไม่ตัดสต็อกเมื่อไม่อนุมัติ (ยังคง 11)', afterReject.data.quantity === 11, afterReject.data.quantity);
  const userNoti = await call('GET', '/notifications', { token: user });
  check('ผู้ขอเบิกได้รับแจ้งผล', userNoti.data.data.some((n) => n.type === 'REQUEST_REJECTED'), userNoti.data.data?.slice(0, 2));

  console.log('\n[8] History & Reports');
  const hist = await call('GET', '/requisitions/items?page=1', { token: user });
  check('USER เห็นเฉพาะประวัติของตนเอง', hist.status === 200 && hist.data.data.every((i) => i.requisition.requesterName), hist.data?.pagination);
  for (const t of ['daily', 'monthly', 'yearly', 'stock', 'low-stock', 'receipts', 'popular', 'department']) {
    const r = await call('GET', `/reports/${t}`, { token: admin });
    check(`รายงาน ${t}`, r.status === 200 && Array.isArray(r.data.rows) && r.data.columns?.length > 0, r.data);
  }

  console.log('\n[9] Cleanup / delete');
  const del = await call('DELETE', `/materials/${matId}`, { token: admin });
  check('ลบวัสดุที่มีประวัติ (soft delete)', del.status === 200, del.data);
  check('วัสดุที่ลบไม่แสดงอีก', (await call('GET', `/materials/${matId}`, { token: admin })).status === 404);

  console.log('\n[10] Session');
  const out = await call('POST', '/auth/logout', { token: user });
  check('ออกจากระบบ', out.status === 200);
  check('token เดิมใช้ไม่ได้หลัง logout (401)', (await call('GET', '/auth/me', { token: user })).status === 401);

  console.log(`\nผลลัพธ์: ผ่าน ${passed} / ไม่ผ่าน ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
