import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, badRequest } from '../utils/errors.js';
import { audit } from '../utils/audit.js';
import { dateRange, getPagination, nextDocumentNo, paginated, toNumber } from '../utils/helpers.js';

const router = Router();

const receiveSchema = z.object({
  documentNo: z.string().trim().max(50).optional().nullable(),
  supplier: z.string().trim().min(1, 'กรุณาระบุผู้ส่งมอบ').max(200),
  note: z.string().trim().max(500).optional().nullable(),
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
  updatePrice: z.boolean().optional().default(true),
  items: z
    .array(
      z.object({
        materialId: z.coerce.number().int().positive('กรุณาเลือกวัสดุ'),
        quantity: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็ม').positive('จำนวนรับเข้าต้องมากกว่า 0').max(1_000_000),
        unitPrice: z.coerce.number().min(0, 'ราคาต้องไม่ติดลบ').max(9_999_999_999),
      }),
    )
    .min(1, 'กรุณาเพิ่มวัสดุอย่างน้อย 1 รายการ')
    .max(100),
});

// ===== บันทึกรับเข้า: เพิ่มยอดคงเหลือและเก็บประวัติใน transaction เดียว =====
router.post(
  '/',
  authorize('ADMIN', 'WAREHOUSE'),
  validate(receiveSchema),
  asyncHandler(async (req, res) => {
    const { items, documentNo, supplier, note, receivedDate, updatePrice } = req.body;
    const ids = items.map((i) => i.materialId);
    if (new Set(ids).size !== ids.length) throw badRequest('มีวัสดุซ้ำกันในรายการรับเข้า');

    const date = new Date(`${receivedDate}T${new Date().toTimeString().slice(0, 8)}`);
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) throw badRequest('วันที่รับเข้าต้องไม่เป็นวันในอนาคต');

    const result = await prisma.$transaction(async (tx) => {
      const docNo = documentNo || (await nextDocumentNo(tx, 'RCV', 'stockTransaction', 'documentNo'));
      const created = [];
      for (const item of items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material || !material.isActive) throw badRequest(`ไม่พบวัสดุรหัส ${item.materialId}`);

        // increment แบบ atomic ในฐานข้อมูล ไม่คำนวณจากค่าที่อ่านมา
        const updated = await tx.material.update({
          where: { id: item.materialId },
          data: {
            quantity: { increment: item.quantity },
            ...(updatePrice ? { unitPrice: item.unitPrice } : {}),
          },
        });
        const t = await tx.stockTransaction.create({
          data: {
            materialId: item.materialId,
            type: 'IN',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            balanceAfter: updated.quantity,
            documentNo: docNo,
            supplier,
            note: note || null,
            transactionDate: date,
            createdById: req.user.id,
          },
        });
        created.push(t);
      }
      await audit(req, 'STOCK_IN', 'stock_transaction', docNo, { supplier, items }, tx);
      return { documentNo: docNo, count: created.length };
    });

    res.status(201).json({ message: `บันทึกรับเข้า ${result.count} รายการเรียบร้อย`, ...result });
  }),
);

// ===== ประวัติการรับเข้า =====
router.get(
  '/',
  authorize('ADMIN', 'WAREHOUSE', 'APPROVER'),
  asyncHandler(async (req, res) => {
    const { search, from, to, categoryId } = req.query;
    const where = { type: 'IN' };
    const range = dateRange(from, to);
    if (range) where.transactionDate = range;
    if (categoryId) where.material = { categoryId: Number(categoryId) };
    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { supplier: { contains: search } },
        { material: { name: { contains: search } } },
        { material: { code: { contains: search } } },
      ];
    }
    const p = getPagination(req.query);
    const [rows, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          material: { select: { code: true, name: true, unit: { select: { name: true } } } },
          createdBy: { select: { fullName: true } },
        },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip: p.skip,
        take: p.take,
      }),
      prisma.stockTransaction.count({ where }),
    ]);
    res.json(
      paginated(
        rows.map((r) => ({
          ...r,
          unitPrice: toNumber(r.unitPrice),
          totalPrice: r.quantity * toNumber(r.unitPrice),
        })),
        total,
        p,
      ),
    );
  }),
);

export default router;
