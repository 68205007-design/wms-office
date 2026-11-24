import prisma from '../lib/prisma.js';
import { getSettings } from './settings.js';

async function userIdsByRoles(roles, client) {
  const users = await client.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function createMany(userIds, data, client) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await client.notification.createMany({ data: ids.map((userId) => ({ userId, ...data })) });
}

/** แจ้งเตือนวัสดุใกล้หมด/หมด ไปยัง Admin และเจ้าหน้าที่คลัง (เฉพาะเมื่อสถานะเพิ่งเปลี่ยน) */
export async function notifyStockLevel(material, previousQty, client = prisma) {
  const settings = await getSettings(client);
  const { quantity, minQuantity, name, code, id } = material;
  const wasOut = previousQty <= 0;
  const wasLow = previousQty <= minQuantity;
  let data = null;

  if (quantity <= 0 && !wasOut && settings['notify.outOfStock']) {
    data = {
      type: 'OUT_OF_STOCK',
      title: 'วัสดุหมดคลัง',
      message: `${name} (${code}) หมดแล้ว กรุณาจัดหาเพิ่ม`,
      link: `/materials?highlight=${id}`,
    };
  } else if (quantity > 0 && quantity <= minQuantity && !wasLow && settings['notify.lowStock']) {
    data = {
      type: 'LOW_STOCK',
      title: 'วัสดุใกล้หมด',
      message: `${name} (${code}) เหลือ ${quantity} ต่ำกว่าขั้นต่ำ ${minQuantity}`,
      link: `/materials?highlight=${id}`,
    };
  }
  if (!data) return;
  const ids = await userIdsByRoles(['ADMIN', 'WAREHOUSE'], client);
  await createMany(ids, data, client);
}

export async function notifyNewRequisition(requisition, client = prisma) {
  const settings = await getSettings(client);
  if (!settings['notify.newRequest']) return;
  const ids = await userIdsByRoles(['ADMIN', 'APPROVER'], client);
  await createMany(
    ids,
    {
      type: 'NEW_REQUEST',
      title: 'มีคำขอเบิกใหม่รออนุมัติ',
      message: `${requisition.requisitionNo} โดย ${requisition.requesterName}`,
      link: `/approvals?id=${requisition.id}`,
    },
    client,
  );
  // แจ้งเจ้าหน้าที่คลังว่ามีรายการรออนุมัติ (เพื่อเตรียมของ)
  const whIds = await userIdsByRoles(['WAREHOUSE'], client);
  await createMany(
    whIds,
    {
      type: 'PENDING_APPROVAL',
      title: 'มีรายการเบิกรออนุมัติ',
      message: `${requisition.requisitionNo} กำลังรอการอนุมัติ`,
      link: `/history?id=${requisition.id}`,
    },
    client,
  );
}

export async function notifyRequisitionResult(requisition, client = prisma) {
  const settings = await getSettings(client);
  if (!settings['notify.requestResult']) return;
  const approved = requisition.status === 'APPROVED';
  await createMany(
    [requisition.requesterId],
    {
      type: approved ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      title: approved ? 'คำขอเบิกได้รับการอนุมัติ' : 'คำขอเบิกไม่ได้รับการอนุมัติ',
      message: approved
        ? `${requisition.requisitionNo} ได้รับการอนุมัติแล้ว สามารถรับวัสดุได้ที่คลัง`
        : `${requisition.requisitionNo} ถูกปฏิเสธ: ${requisition.rejectReason || '-'}`,
      link: `/history?id=${requisition.id}`,
    },
    client,
  );
}
