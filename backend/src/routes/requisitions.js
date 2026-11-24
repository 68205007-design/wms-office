import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { audit } from '../utils/audit.js';
import { dateRange, getPagination, nextDocumentNo, paginated, toNumber } from '../utils/helpers.js';
import { notifyNewRequisition, notifyRequisitionResult, notifyStockLevel } from '../utils/notify.js';

const router = Router();
const APPROVER_ROLES = ['ADMIN', 'APPROVER'];
const canSeeAll = (user) => ['ADMIN', 'APPROVER', 'WAREHOUSE'].includes(user.role);

const detailInclude = {
  requester: { select: { id: true, fullName: true, username: true } },
  approver: { select: { id: true, fullName: true } },
  department: { select: { id: true, name: true, code: true } },
  items: {
    include: {
      material: {
        select: {
          id: true,
          code: true,
          name: true,
          quantity: true,
          imageUrl: true,
          unit: { select: { name: true } },
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  },
};

function serialize(r) {
  const items = (r.items || []).map((i) => ({
    ...i,
    unitPrice: toNumber(i.unitPrice),
    totalPrice: i.quantity * toNumber(i.unitPrice),
  }));
  return {
    ...r,
    items,
    itemCount: items.length,
    totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    totalValue: items.reduce((s, i) => s + i.totalPrice, 0),
  };
}

function buildWhere(req) {
  const { status, from, to, search, requesterId, departmentId, categoryId, mine } = req.query;
  const where = {};
  if (!canSeeAll(req.user) || mine === '1') where.requesterId = req.user.id;
  else if (requesterId) where.requesterId = Number(requesterId);
  if (status) where.status = status;
  if (departmentId) where.departmentId = Number(departmentId);
  const range = dateRange(from, to);
  if (range) where.requestDate = range;
  if (categoryId) where.items = { some: { material: { categoryId: Number(categoryId) } } };
  if (search) {
    where.OR = [
      { requisitionNo: { contains: search } },
      { requesterName: { contains: search } },
      { purpose: { contains: search } },
      { items: { some: { material: { name: { contains: search } } } } },
    ];
  }
  return where;
}

// ===== รายการคำขอเบิก =====
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = buildWhere(req);
    const p = getPagination(req.query);
    const [rows, total, counts] = await Promise.all([
      prisma.requisition.findMany({
        where,
        include: detailInclude,
        orderBy: [{ requestDate: 'desc' }, { id: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      prisma.requisition.count({ where }),
      prisma.requisition.groupBy({
        by: ['status'],
        where: canSeeAll(req.user) && req.query.mine !== '1' ? {} : { requesterId: req.user.id },
        _count: true,
      }),
    ]);
    const summary = Object.fromEntries(counts.map((c) => [c.status, c._count]));
    res.json({ ...paginated(rows.map(serialize), total, p), summary });
  }),
);

// ===== ประวัติการเบิก-จ่ายรายรายการวัสดุ (ใช้ในหน้าประวัติ + export) =====
router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const reqWhere = buildWhere(req);
    const where = { requisition: reqWhere };
    if (req.query.categoryId) {
      delete reqWhere.items;
      where.material = { categoryId: Number(req.query.categoryId) };
    }
    const p = getPagination(req.query, 15, req.query.export === '1' ? 10000 : 100);
    const [rows, total] = await Promise.all([
      prisma.requisitionItem.findMany({
        where,
        include: {
          material: {
            select: { code: true, name: true, unit: { select: { name: true } }, category: { select: { name: true } } },
          },
          requisition: {
            select: {
              id: true,
              requisitionNo: true,
              requestDate: true,
              requesterName: true,
              status: true,
              approvedAt: true,
              purpose: true,
              department: { select: { name: true } },
              approver: { select: { fullName: true } },
            },
          },
        },
        orderBy: [{ requisition: { requestDate: 'desc' } }, { id: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      prisma.requisitionItem.count({ where }),
    ]);
    res.json(
      paginated(
        rows.map((r) => ({ ...r, unitPrice: toNumber(r.unitPrice), totalPrice: r.quantity * toNumber(r.unitPrice) })),
        total,
        p,
      ),
    );
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await prisma.requisition.findUnique({ where: { id: Number(req.params.id) }, include: detailInclude });
    if (!r) throw notFound('ไม่พบคำขอเบิก');
    if (!canSeeAll(req.user) && r.requesterId !== req.user.id) throw forbidden();
    res.json(serialize(r));
  }),
);

// ===== สร้างคำขอเบิก =====
const createSchema = z.object({
  departmentId: z.coerce.number().int().positive('กรุณาเลือกหน่วยงาน'),
  requesterName: z.string().trim().min(1, 'กรุณาระบุผู้ขอเบิก').max(150),
  purpose: z.string().trim().min(3, 'กรุณาระบุเหตุผลในการเบิก (อย่างน้อย 3 ตัวอักษร)').max(500),
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
  items: z
    .array(
      z.object({
        materialId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็ม').positive('จำนวนต้องมากกว่า 0').max(1_000_000),
        note: z.string().trim().max(255).optional().nullable(),
      }),
    )
    .min(1, 'กรุณาเลือกวัสดุอย่างน้อย 1 รายการ')
    .max(50, 'เบิกได้สูงสุด 50 รายการต่อคำขอ'),
});

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { items, departmentId, requesterName, purpose, requestDate } = req.body;
    const ids = items.map((i) => i.materialId);
    if (new Set(ids).size !== ids.length) throw badRequest('มีวัสดุซ้ำกันในคำขอ กรุณารวมเป็นรายการเดียว');

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw badRequest('ไม่พบหน่วยงาน');

    const materials = await prisma.material.findMany({ where: { id: { in: ids }, isActive: true } });
    const byId = new Map(materials.map((m) => [m.id, m]));
    const errors = [];
    for (const item of items) {
      const m = byId.get(item.materialId);
      if (!m) errors.push({ materialId: item.materialId, message: 'ไม่พบวัสดุ' });
      else if (item.quantity > m.quantity)
        errors.push({ materialId: m.id, message: `${m.name} คงเหลือ ${m.quantity} ไม่พอสำหรับการเบิก ${item.quantity}` });
    }
    if (errors.length) throw badRequest('จำนวนที่ขอเบิกเกินยอดคงเหลือ', errors);

    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const requisitionNo = await nextDocumentNo(tx, 'REQ', 'requisition', 'requisitionNo');
      const r = await tx.requisition.create({
        data: {
          requisitionNo,
          requesterId: req.user.id,
          requesterName,
          departmentId,
          purpose,
          requestDate: new Date(`${requestDate}T${now.toTimeString().slice(0, 8)}`),
          status: 'PENDING',
          items: {
            create: items.map((i) => ({
              materialId: i.materialId,
              quantity: i.quantity,
              note: i.note || null,
              unitPrice: byId.get(i.materialId).unitPrice,
            })),
          },
        },
        include: detailInclude,
      });
      await audit(req, 'CREATE', 'requisition', r.id, { requisitionNo, items }, tx);
      await notifyNewRequisition(r, tx);
      return r;
    });
    res.status(201).json(serialize(created));
  }),
);

// ===== อนุมัติ: ตัดสต็อกแบบ atomic ภายใน DB transaction =====
router.post(
  '/:id/approve',
  authorize(...APPROVER_ROLES),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.requisition.findUnique({ where: { id } });
    if (!existing) throw notFound('ไม่พบคำขอเบิก');
    if (existing.requesterId === req.user.id && req.user.role !== 'ADMIN') {
      throw forbidden('ไม่สามารถอนุมัติคำขอของตนเองได้');
    }

    const approved = await prisma.$transaction(
      async (tx) => {
        // 1) ล็อกสถานะ: เปลี่ยนจาก PENDING เท่านั้น -> ถ้ามีคนอนุมัติไปแล้ว count = 0 (กันอนุมัติ/ตัดสต็อกซ้ำ)
        const lock = await tx.requisition.updateMany({
          where: { id, status: 'PENDING', stockDeducted: false },
          data: { status: 'APPROVED', approverId: req.user.id, approvedAt: new Date(), stockDeducted: true },
        });
        if (lock.count === 0) throw conflict('คำขอนี้ถูกดำเนินการไปแล้ว ไม่สามารถอนุมัติซ้ำได้');

        const r = await tx.requisition.findUnique({ where: { id }, include: { items: { include: { material: true } } } });

        // 2) ตัดสต็อกทีละรายการ โดยมีเงื่อนไขว่าคงเหลือต้องพอ (ป้องกันยอดติดลบ)
        for (const item of r.items) {
          const dec = await tx.material.updateMany({
            where: { id: item.materialId, isActive: true, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (dec.count === 0) {
            throw badRequest(
              `${item.material.name} คงเหลือ ${item.material.quantity} ไม่พอสำหรับการเบิก ${item.quantity} — ไม่สามารถอนุมัติได้`,
            );
          }
          const m = await tx.material.findUnique({ where: { id: item.materialId } });
          // 3) บันทึกประวัติการจ่าย (unique requisition+material+type กันการบันทึกซ้ำอีกชั้น)
          await tx.stockTransaction.create({
            data: {
              materialId: item.materialId,
              type: 'OUT',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              balanceAfter: m.quantity,
              documentNo: r.requisitionNo,
              note: `จ่ายตามคำขอเบิก ${r.requisitionNo}`,
              transactionDate: new Date(),
              requisitionId: r.id,
              createdById: req.user.id,
            },
          });
          await notifyStockLevel(m, m.quantity + item.quantity, tx);
        }
        await audit(req, 'APPROVE', 'requisition', id, { requisitionNo: r.requisitionNo }, tx);
        await notifyRequisitionResult({ ...r, status: 'APPROVED' }, tx);
        return tx.requisition.findUnique({ where: { id }, include: detailInclude });
      },
      { timeout: 20000 },
    );
    res.json(serialize(approved));
  }),
);

// ===== ไม่อนุมัติ: ไม่ตัดสต็อก บันทึกเหตุผล แจ้งผู้ขอ =====
router.post(
  '/:id/reject',
  authorize(...APPROVER_ROLES),
  validate(z.object({ reason: z.string().trim().min(3, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ').max(500) })),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.requisition.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'REJECTED', approverId: req.user.id, approvedAt: new Date(), rejectReason: req.body.reason },
      });
      if (lock.count === 0) throw conflict('คำขอนี้ถูกดำเนินการไปแล้ว');
      const r = await tx.requisition.findUnique({ where: { id }, include: detailInclude });
      await audit(req, 'REJECT', 'requisition', id, { reason: req.body.reason }, tx);
      await notifyRequisitionResult(r, tx);
      return r;
    });
    res.json(serialize(result));
  }),
);

// ===== ผู้ขอยกเลิกคำขอ (เฉพาะสถานะรออนุมัติ) =====
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const r = await prisma.requisition.findUnique({ where: { id } });
    if (!r) throw notFound('ไม่พบคำขอเบิก');
    if (r.requesterId !== req.user.id && req.user.role !== 'ADMIN') throw forbidden();
    const lock = await prisma.requisition.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (lock.count === 0) throw conflict('ยกเลิกได้เฉพาะคำขอที่รออนุมัติ');
    await audit(req, 'CANCEL', 'requisition', id);
    res.json({ message: 'ยกเลิกคำขอเรียบร้อย' });
  }),
);

export default router;
