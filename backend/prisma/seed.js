/**
 * ข้อมูลเริ่มต้นสำหรับทดสอบระบบ
 * - ล้างข้อมูลเดิมทั้งหมดแล้วสร้างใหม่ (ใช้สำหรับทดสอบ/สาธิต)
 * - จำลองการรับเข้าและการเบิกย้อนหลัง 12 เดือน ผ่านลำดับเหตุการณ์จริง
 *   ทำให้ยอดคงเหลือ = ยอดรับเข้า - ยอดจ่าย ถูกต้องตรงกับประวัติ
 *
 * รัน: npm run db:seed   (ถ้าเป็น production ต้องใส่ --force)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

process.env.TZ = process.env.TZ || 'Asia/Bangkok';
const prisma = new PrismaClient();

// PRNG แบบกำหนด seed เพื่อให้ข้อมูลเหมือนเดิมทุกครั้ง
let s = 20261124;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const USERS = [
  { username: 'admin', password: 'Admin@1234', fullName: 'สมชาย ผู้ดูแลระบบ', role: 'ADMIN', dept: 'ADM', position: 'นักวิชาการคอมพิวเตอร์' },
  { username: 'warehouse', password: 'Store@1234', fullName: 'สมหญิง รักษ์คลัง', role: 'WAREHOUSE', dept: 'FIN', position: 'เจ้าพนักงานพัสดุ' },
  { username: 'approver', password: 'Approve@1234', fullName: 'ประเสริฐ อนุมัติการ', role: 'APPROVER', dept: 'ADM', position: 'หัวหน้าสำนักงาน' },
  { username: 'user', password: 'User@1234', fullName: 'วิภาวดี ใจดี', role: 'USER', dept: 'HR', position: 'เจ้าพนักงานธุรการ' },
  { username: 'user2', password: 'User@1234', fullName: 'ธนพล ขยันยิ่ง', role: 'USER', dept: 'IT', position: 'นักวิชาการคอมพิวเตอร์' },
  { username: 'user3', password: 'User@1234', fullName: 'กมลชนก ศรีสุข', role: 'USER', dept: 'PLN', position: 'นักวิเคราะห์นโยบายและแผน' },
];

const DEPARTMENTS = [
  ['ADM', 'สำนักงานผู้อำนวยการ'],
  ['FIN', 'ฝ่ายการเงินและพัสดุ'],
  ['HR', 'ฝ่ายบริหารงานบุคคล'],
  ['IT', 'ฝ่ายเทคโนโลยีสารสนเทศ'],
  ['PLN', 'ฝ่ายนโยบายและแผน'],
  ['GEN', 'ฝ่ายบริหารงานทั่วไป'],
];

const CATEGORIES = [
  ['เครื่องเขียน', 'ปากกา ดินสอ ยางลบ และอุปกรณ์การเขียน', '#2563eb'],
  ['กระดาษและแฟ้ม', 'กระดาษพิมพ์ แฟ้มเอกสาร ซองจดหมาย', '#16a34a'],
  ['อุปกรณ์คอมพิวเตอร์', 'หมึกพิมพ์ เมาส์ แฟลชไดรฟ์', '#9333ea'],
  ['อุปกรณ์สำนักงาน', 'แม็กซ์ เทป กรรไกร ที่เจาะกระดาษ', '#f59e0b'],
  ['วัสดุทำความสะอาด', 'น้ำยาทำความสะอาด กระดาษชำระ', '#06b6d4'],
];

const UNITS = ['ด้าม', 'แท่ง', 'ก้อน', 'รีม', 'แฟ้ม', 'กล่อง', 'ซอง', 'ตลับ', 'ชิ้น', 'ม้วน', 'อัน', 'ขวด', 'แพ็ค', 'เล่ม'];

// [code, name, category index, unit, price, min, monthly usage]
const MATERIALS = [
  ['ST-001', 'ปากกาลูกลื่น สีน้ำเงิน 0.5 มม.', 0, 'ด้าม', 6, 50, 60],
  ['ST-002', 'ปากกาลูกลื่น สีแดง 0.5 มม.', 0, 'ด้าม', 6, 30, 25],
  ['ST-003', 'ดินสอดำ 2B', 0, 'แท่ง', 5, 30, 20],
  ['ST-004', 'ยางลบดินสอ', 0, 'ก้อน', 8, 20, 12],
  ['ST-005', 'ปากกาเน้นข้อความ สีเหลือง', 0, 'ด้าม', 18, 20, 15],
  ['ST-006', 'ปากกาเคมี 2 หัว สีดำ', 0, 'ด้าม', 15, 20, 14],
  ['ST-007', 'น้ำยาลบคำผิด แบบปากกา', 0, 'ด้าม', 35, 15, 10],
  ['ST-008', 'ไม้บรรทัดเหล็ก 12 นิ้ว', 0, 'อัน', 25, 5, 2],
  ['PP-001', 'กระดาษ A4 80 แกรม', 1, 'รีม', 125, 40, 45],
  ['PP-002', 'กระดาษ A3 80 แกรม', 1, 'รีม', 260, 5, 3],
  ['PP-003', 'แฟ้มเจาะ 2 ห่วง สันกว้าง 3 นิ้ว', 1, 'แฟ้ม', 75, 20, 12],
  ['PP-004', 'แฟ้มซองพลาสติก A4', 1, 'ซอง', 12, 50, 40],
  ['PP-005', 'ซองจดหมายสีน้ำตาล A4', 1, 'ซอง', 4, 100, 80],
  ['PP-006', 'กระดาษโน้ตกาว 3x3 นิ้ว', 1, 'แพ็ค', 35, 20, 18],
  ['PP-007', 'สมุดบันทึกปกแข็ง', 1, 'เล่ม', 45, 10, 6],
  ['IT-001', 'ตลับหมึกเลเซอร์ HP 85A', 2, 'ตลับ', 1850, 4, 3],
  ['IT-002', 'หมึกเติม Epson สีดำ', 2, 'ขวด', 280, 6, 4],
  ['IT-003', 'เมาส์ USB', 2, 'ชิ้น', 250, 5, 2],
  ['IT-004', 'แฟลชไดรฟ์ 64 GB', 2, 'ชิ้น', 220, 5, 2],
  ['IT-005', 'ถ่าน AA (แพ็ค 4 ก้อน)', 2, 'แพ็ค', 95, 10, 6],
  ['OF-001', 'ลวดเย็บกระดาษ เบอร์ 10', 3, 'กล่อง', 10, 30, 20],
  ['OF-002', 'เครื่องเย็บกระดาษ เบอร์ 10', 3, 'อัน', 95, 5, 2],
  ['OF-003', 'เทปใส 3/4 นิ้ว', 3, 'ม้วน', 15, 20, 15],
  ['OF-004', 'คลิปหนีบกระดาษ 2 ขา', 3, 'กล่อง', 30, 15, 10],
  ['OF-005', 'กรรไกร 8 นิ้ว', 3, 'อัน', 65, 5, 2],
  ['OF-006', 'กาวแท่ง 21 กรัม', 3, 'แท่ง', 39, 15, 10],
  ['CL-001', 'กระดาษชำระม้วนใหญ่', 4, 'ม้วน', 85, 20, 18],
  ['CL-002', 'น้ำยาล้างจาน 500 มล.', 4, 'ขวด', 45, 10, 6],
  ['CL-003', 'ถุงขยะดำ 30x40 นิ้ว', 4, 'แพ็ค', 55, 10, 8],
  ['CL-004', 'น้ำยาเช็ดกระจก', 4, 'ขวด', 65, 5, 3],
];

const SUPPLIERS = ['บริษัท ออฟฟิศเมท จำกัด', 'ห้างหุ้นส่วน ไทยเครื่องเขียน', 'บริษัท ไอที ซัพพลาย จำกัด', 'ร้านพัฒนาพาณิชย์'];
const PURPOSES = [
  'ใช้ในการปฏิบัติงานประจำเดือน',
  'เตรียมเอกสารประกอบการประชุม',
  'จัดทำรายงานประจำไตรมาส',
  'ใช้สำหรับโครงการอบรมบุคลากร',
  'ทดแทนวัสดุที่หมดอายุการใช้งาน',
  'จัดเตรียมเอกสารรับการตรวจประเมิน',
];

async function main() {
  const force = process.argv.includes('--force');
  if (process.env.NODE_ENV === 'production' && !force) {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log('มีข้อมูลอยู่แล้วใน production — ข้ามการ seed (ใช้ --force เพื่อบังคับ)');
      return;
    }
  }

  console.log('• ล้างข้อมูลเดิม...');
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.stockTransaction.deleteMany(),
    prisma.requisitionItem.deleteMany(),
    prisma.requisition.deleteMany(),
    prisma.material.deleteMany(),
    prisma.category.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
    prisma.setting.deleteMany(),
  ]);

  console.log('• สร้างหน่วยงาน หมวดหมู่ หน่วยนับ...');
  const depts = {};
  for (const [code, name] of DEPARTMENTS) depts[code] = await prisma.department.create({ data: { code, name } });
  const cats = [];
  for (const [name, description, color] of CATEGORIES) cats.push(await prisma.category.create({ data: { name, description, color } }));
  const units = {};
  for (const name of UNITS) units[name] = await prisma.unit.create({ data: { name } });

  console.log('• สร้างผู้ใช้งาน...');
  const users = {};
  for (const u of USERS) {
    users[u.username] = await prisma.user.create({
      data: {
        username: u.username,
        passwordHash: await bcrypt.hash(u.password, 10),
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        email: `${u.username}@office.example`,
        departmentId: depts[u.dept].id,
      },
    });
  }

  await prisma.setting.createMany({
    data: [
      { key: 'org.name', value: JSON.stringify('สำนักงานบริหารกลาง') },
      { key: 'org.shortName', value: JSON.stringify('WMS') },
      { key: 'org.address', value: JSON.stringify('99 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพฯ 10210') },
      { key: 'org.phone', value: JSON.stringify('02-123-4567') },
      { key: 'org.email', value: JSON.stringify('supply@office.example') },
      { key: 'stock.defaultMinQuantity', value: '10' },
    ],
  });

  console.log('• สร้างวัสดุ...');
  const mats = [];
  for (const [code, name, ci, unit, price, min, usage] of MATERIALS) {
    const m = await prisma.material.create({
      data: {
        code,
        name,
        categoryId: cats[ci].id,
        unitId: units[unit].id,
        unitPrice: price,
        minQuantity: min,
        quantity: 0,
        description: `${name} สำหรับใช้งานภายในสำนักงาน`,
        createdById: users.warehouse.id,
        createdAt: new Date(Date.now() - 400 * 86400000),
      },
    });
    mats.push({ ...m, price, min, usage, qty: 0 });
  }

  console.log('• จำลองประวัติรับเข้า/เบิกจ่าย 12 เดือน...');
  const requesters = [users.user, users.user2, users.user3, users.warehouse];
  const now = new Date();
  let rcvSeq = 0;
  const reqSeqByMonth = {};

  for (let mi = 11; mi >= 0; mi--) {
    const base = new Date(now.getFullYear(), now.getMonth() - mi, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const lastDay = mi === 0 ? Math.max(1, now.getDate() - 1) : daysInMonth;

    // --- รับเข้าต้นเดือน ---
    const rcvDate = new Date(base.getFullYear(), base.getMonth(), Math.min(3, lastDay), 9, 30);
    rcvSeq += 1;
    const rcvNo = `RCV-${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, '0')}-${String(rcvSeq).padStart(4, '0')}`;
    const supplier = pick(SUPPLIERS);
    for (const m of mats) {
      // เดือนล่าสุดจงใจไม่เติมบางรายการ เพื่อให้มีวัสดุใกล้หมด/หมด
      if (mi === 0 && ['IT-001', 'ST-001', 'PP-001', 'CL-001', 'OF-003', 'IT-004'].includes(m.code)) continue;
      if (m.qty > m.usage * 2 && rand() < 0.6) continue;
      const q = Math.max(m.min, Math.round(m.usage * (1.1 + rand() * 0.6)));
      m.qty += q;
      await prisma.stockTransaction.create({
        data: {
          materialId: m.id,
          type: 'IN',
          quantity: q,
          unitPrice: m.price,
          balanceAfter: m.qty,
          documentNo: rcvNo,
          supplier,
          note: 'รับเข้าตามใบส่งของ',
          transactionDate: rcvDate,
          createdById: users.warehouse.id,
          createdAt: rcvDate,
        },
      });
    }

    // --- คำขอเบิกระหว่างเดือน ---
    const reqCount = mi === 0 ? 7 : randInt(6, 10);
    for (let r = 0; r < reqCount; r++) {
      const day = Math.min(lastDay, randInt(4, daysInMonth));
      const reqDate = new Date(base.getFullYear(), base.getMonth(), day, randInt(8, 15), randInt(0, 59));
      const requester = pick(requesters);
      const key = `${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, '0')}`;
      reqSeqByMonth[key] = (reqSeqByMonth[key] || 0) + 1;
      const reqNo = `REQ-${key}-${String(reqSeqByMonth[key]).padStart(4, '0')}`;

      const chosen = [...mats].sort(() => rand() - 0.5).slice(0, randInt(1, 4));
      const items = chosen.map((m) => ({ m, quantity: Math.max(1, Math.round(m.usage / randInt(3, 6))) }));

      // สถานะ: เดือนปัจจุบันมีรออนุมัติ, เดือนก่อนส่วนใหญ่อนุมัติแล้ว
      let status = 'APPROVED';
      if (mi === 0 && r >= reqCount - 4) status = 'PENDING';
      else if (rand() < 0.08) status = 'REJECTED';
      if (status === 'APPROVED' && items.some((i) => i.quantity > i.m.qty)) status = 'REJECTED';

      const approvedAt =
        status === 'PENDING' ? null : new Date(Math.min(Date.now() - 60000, reqDate.getTime() + randInt(1, 20) * 3600000));
      const requisition = await prisma.requisition.create({
        data: {
          requisitionNo: reqNo,
          requesterId: requester.id,
          requesterName: requester.fullName,
          departmentId: requester.departmentId,
          purpose: pick(PURPOSES),
          requestDate: reqDate,
          status,
          approverId: status === 'PENDING' ? null : users.approver.id,
          approvedAt,
          rejectReason: status === 'REJECTED' ? 'จำนวนที่ขอเกินความจำเป็น กรุณาปรับลดและยื่นใหม่' : null,
          stockDeducted: status === 'APPROVED',
          createdAt: reqDate,
          items: {
            create: items.map((i) => ({ materialId: i.m.id, quantity: i.quantity, unitPrice: i.m.price })),
          },
        },
      });

      if (status === 'APPROVED') {
        for (const i of items) {
          i.m.qty -= i.quantity;
          await prisma.stockTransaction.create({
            data: {
              materialId: i.m.id,
              type: 'OUT',
              quantity: i.quantity,
              unitPrice: i.m.price,
              balanceAfter: i.m.qty,
              documentNo: reqNo,
              note: `จ่ายตามคำขอเบิก ${reqNo}`,
              transactionDate: approvedAt,
              requisitionId: requisition.id,
              createdById: users.approver.id,
              createdAt: approvedAt,
            },
          });
        }
      }
    }
  }

  // ทำให้มีวัสดุ "หมด" อย่างน้อย 1 รายการเพื่อทดสอบสถานะ
  const outItem = mats.find((m) => m.code === 'IT-004');
  if (outItem && outItem.qty > 0) {
    const q = outItem.qty;
    outItem.qty = 0;
    await prisma.stockTransaction.create({
      data: {
        materialId: outItem.id,
        type: 'ADJUST',
        quantity: -q,
        unitPrice: outItem.price,
        balanceAfter: 0,
        note: 'ปรับปรุงยอดจากการตรวจนับ (ชำรุด)',
        transactionDate: new Date(now.getTime() - 2 * 86400000),
        createdById: users.warehouse.id,
      },
    });
  }

  // บันทึกยอดคงเหลือสุดท้าย (ตรงกับผลรวมของประวัติ)
  for (const m of mats) {
    await prisma.material.update({ where: { id: m.id }, data: { quantity: m.qty } });
  }

  console.log('• สร้างการแจ้งเตือน...');
  const pending = await prisma.requisition.findMany({ where: { status: 'PENDING' } });
  const low = mats.filter((m) => m.qty <= m.min);
  const notis = [];
  for (const u of [users.admin, users.approver]) {
    for (const p of pending) {
      notis.push({ userId: u.id, type: 'NEW_REQUEST', title: 'มีคำขอเบิกใหม่รออนุมัติ', message: `${p.requisitionNo} โดย ${p.requesterName}`, link: `/approvals?id=${p.id}` });
    }
  }
  for (const u of [users.admin, users.warehouse]) {
    for (const m of low) {
      notis.push({
        userId: u.id,
        type: m.qty <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        title: m.qty <= 0 ? 'วัสดุหมดคลัง' : 'วัสดุใกล้หมด',
        message: m.qty <= 0 ? `${m.name} (${m.code}) หมดแล้ว กรุณาจัดหาเพิ่ม` : `${m.name} (${m.code}) เหลือ ${m.qty} ต่ำกว่าขั้นต่ำ ${m.min}`,
        link: `/materials?highlight=${m.id}`,
      });
    }
  }
  const lastApproved = await prisma.requisition.findFirst({ where: { status: 'APPROVED', requesterId: users.user.id }, orderBy: { id: 'desc' } });
  if (lastApproved) {
    notis.push({ userId: users.user.id, type: 'REQUEST_APPROVED', title: 'คำขอเบิกได้รับการอนุมัติ', message: `${lastApproved.requisitionNo} ได้รับการอนุมัติแล้ว`, link: `/history?id=${lastApproved.id}` });
  }
  if (notis.length) await prisma.notification.createMany({ data: notis });

  const counts = {
    users: await prisma.user.count(),
    materials: await prisma.material.count(),
    transactions: await prisma.stockTransaction.count(),
    requisitions: await prisma.requisition.count(),
    lowStock: low.length,
  };
  console.log('✓ Seed สำเร็จ', counts);
  console.log('\nบัญชีทดสอบ:');
  for (const u of USERS.slice(0, 4)) console.log(`  ${u.role.padEnd(10)} ${u.username.padEnd(10)} / ${u.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
