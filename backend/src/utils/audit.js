import prisma from '../lib/prisma.js';
import { clientIp } from './helpers.js';

/**
 * บันทึก Audit Log
 * @param {object} req  express request (ใช้ user + ip)
 * @param {string} action  CREATE | UPDATE | DELETE | LOGIN | APPROVE | ...
 * @param {string} entity  ชื่อข้อมูล เช่น material, requisition
 * @param {string|number} entityId
 * @param {object} detail  ข้อมูลเพิ่มเติม
 * @param {object} tx  prisma transaction client (ถ้ามี)
 */
export async function audit(req, action, entity, entityId, detail, tx = prisma) {
  try {
    await tx.auditLog.create({
      data: {
        userId: req?.user?.id ?? null,
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        detail: detail ?? undefined,
        ipAddress: req ? clientIp(req) : null,
      },
    });
  } catch (err) {
    // ถ้าอยู่ใน transaction ให้ error ส่งต่อเพื่อ rollback, ถ้าไม่ใช่ก็แค่ log
    if (tx !== prisma) throw err;
    console.error('[audit] failed', err.message);
  }
}
