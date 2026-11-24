import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../utils/errors.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated, serializeMaterial, toNumber } from '../utils/helpers.js';
import { notifyStockLevel } from '../utils/notify.js';
import { UPLOAD_DIR } from '../lib/paths.js';

const router = Router();

// ===== อัปโหลดรูปภาพ =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `mat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : badRequest('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WEBP, GIF'), ok);
  },
});

function removeImage(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.promises.unlink(file).catch(() => {});
}

const materialSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกรหัสวัสดุ')
    .max(30)
    .regex(/^[A-Za-z0-9\-_.]+$/, 'รหัสวัสดุใช้ได้เฉพาะ A-Z, 0-9, - _ .'),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อวัสดุ').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  categoryId: z.coerce.number().int().positive('กรุณาเลือกหมวดหมู่'),
  unitId: z.coerce.number().int().positive('กรุณาเลือกหน่วยนับ'),
  quantity: z.coerce.number().int('จำนวนต้องเป็นจำนวนเต็ม').min(0, 'จำนวนต้องไม่ติดลบ').max(10_000_000),
  minQuantity: z.coerce.number().int().min(0, 'จำนวนขั้นต่ำต้องไม่ติดลบ').max(10_000_000),
  unitPrice: z.coerce.number().min(0, 'ราคาต้องไม่ติดลบ').max(9_999_999_999),
  removeImage: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

const include = {
  category: { select: { id: true, name: true, color: true } },
  unit: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
};

function statusWhere(status) {
  const minRef = prisma.material.fields.minQuantity;
  if (status === 'OUT') return { quantity: { lte: 0 } };
  if (status === 'LOW') return { AND: [{ quantity: { gt: 0 } }, { quantity: { lte: minRef } }] };
  if (status === 'NORMAL') return { AND: [{ quantity: { gt: 0 } }, { quantity: { gt: minRef } }] };
  return {};
}

// ===== รายการวัสดุ: ค้นหา / filter / pagination =====
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, code, name, categoryId, status, all, sort = 'code', order = 'asc' } = req.query;
    const where = { isActive: true, ...statusWhere(status) };
    if (search) where.OR = [{ code: { contains: search } }, { name: { contains: search } }];
    if (code) where.code = { contains: code };
    if (name) where.name = { contains: name };
    if (categoryId) where.categoryId = Number(categoryId);

    const sortable = ['code', 'name', 'quantity', 'unitPrice', 'createdAt'];
    const orderBy = { [sortable.includes(sort) ? sort : 'code']: order === 'desc' ? 'desc' : 'asc' };

    // all=1 ใช้สำหรับ dropdown เลือกวัสดุ (ไม่แบ่งหน้า)
    if (all === '1') {
      const rows = await prisma.material.findMany({ where, include, orderBy });
      return res.json(rows.map(serializeMaterial));
    }
    const p = getPagination(req.query);
    const [rows, total] = await Promise.all([
      prisma.material.findMany({ where, include, orderBy, skip: p.skip, take: p.take }),
      prisma.material.count({ where }),
    ]);
    res.json(paginated(rows.map(serializeMaterial), total, p));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        ...include,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            createdBy: { select: { fullName: true } },
            requisition: { select: { requisitionNo: true } },
          },
        },
      },
    });
    if (!material || !material.isActive) throw notFound('ไม่พบวัสดุ');
    const result = serializeMaterial(material);
    result.transactions = material.transactions.map((t) => ({ ...t, unitPrice: toNumber(t.unitPrice) }));
    res.json(result);
  }),
);

// ===== เพิ่มวัสดุ =====
router.post(
  '/',
  authorize('ADMIN', 'WAREHOUSE'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const parsed = materialSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) removeImage(`/uploads/${req.file.filename}`);
      throw parsed.error;
    }
    const { removeImage: _ignore, ...data } = parsed.data;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const material = await prisma.$transaction(async (tx) => {
        const m = await tx.material.create({
          data: { ...data, imageUrl, createdById: req.user.id },
          include,
        });
        // ยอดยกมา -> บันทึกเป็นรายการปรับปรุงยอดเพื่อให้ประวัติสต็อกครบถ้วน
        if (data.quantity > 0) {
          await tx.stockTransaction.create({
            data: {
              materialId: m.id,
              type: 'ADJUST',
              quantity: data.quantity,
              unitPrice: data.unitPrice,
              balanceAfter: data.quantity,
              note: 'ยอดยกมาเมื่อเพิ่มวัสดุ',
              transactionDate: new Date(),
              createdById: req.user.id,
            },
          });
        }
        await audit(req, 'CREATE', 'material', m.id, { code: m.code, name: m.name }, tx);
        return m;
      });
      res.status(201).json(serializeMaterial(material));
    } catch (err) {
      if (imageUrl) removeImage(imageUrl);
      throw err;
    }
  }),
);

// ===== แก้ไขวัสดุ =====
// หมายเหตุ: การแก้ไขจำนวนคงเหลือตรงนี้จะถูกบันทึกเป็นรายการ "ปรับปรุงยอด" (ADJUST)
router.put(
  '/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = materialSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      if (req.file) removeImage(`/uploads/${req.file.filename}`);
      throw parsed.error;
    }
    const { removeImage: removeFlag, ...data } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.material.findUnique({ where: { id } });
      if (!existing || !existing.isActive) throw notFound('ไม่พบวัสดุ');

      const update = { ...data };
      let oldImage = null;
      if (req.file) {
        update.imageUrl = `/uploads/${req.file.filename}`;
        oldImage = existing.imageUrl;
      } else if (removeFlag === true || removeFlag === 'true') {
        update.imageUrl = null;
        oldImage = existing.imageUrl;
      }

      const qtyChanged = data.quantity !== undefined && data.quantity !== existing.quantity;
      if (qtyChanged) {
        // ใช้ optimistic check ป้องกันการแก้ทับระหว่างมีการเบิก/รับพร้อมกัน
        const r = await tx.material.updateMany({
          where: { id, quantity: existing.quantity },
          data: { quantity: data.quantity },
        });
        if (r.count === 0) throw badRequest('ยอดคงเหลือถูกเปลี่ยนแปลงระหว่างแก้ไข กรุณาโหลดข้อมูลใหม่');
        delete update.quantity;
        await tx.stockTransaction.create({
          data: {
            materialId: id,
            type: 'ADJUST',
            quantity: data.quantity - existing.quantity,
            unitPrice: data.unitPrice ?? existing.unitPrice,
            balanceAfter: data.quantity,
            note: 'ปรับปรุงยอดจากการแก้ไขข้อมูลวัสดุ',
            transactionDate: new Date(),
            createdById: req.user.id,
          },
        });
      }
      const m = await tx.material.update({ where: { id }, data: update, include });
      await audit(req, 'UPDATE', 'material', id, { ...data, imageChanged: !!req.file }, tx);
      if (qtyChanged || data.minQuantity !== undefined) await notifyStockLevel(m, existing.quantity, tx);
      return { m, oldImage };
    });
    if (result.oldImage) removeImage(result.oldImage);
    res.json(serializeMaterial(result.m));
  }),
);

// ===== ตั้งค่าจำนวนขั้นต่ำหลายรายการพร้อมกัน =====
router.patch(
  '/min-quantity',
  authorize('ADMIN', 'WAREHOUSE'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      items: z
        .array(z.object({ id: z.number().int().positive(), minQuantity: z.number().int().min(0).max(10_000_000) }))
        .min(1)
        .max(500),
    });
    const { items } = schema.parse(req.body);
    await prisma.$transaction(
      items.map((i) => prisma.material.update({ where: { id: i.id }, data: { minQuantity: i.minQuantity } })),
    );
    await audit(req, 'UPDATE_MIN_QTY', 'material', null, { count: items.length });
    res.json({ message: `บันทึกจำนวนขั้นต่ำ ${items.length} รายการเรียบร้อย` });
  }),
);

// ===== ลบวัสดุ =====
router.delete(
  '/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const m = await prisma.material.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true, requisitionItems: true } } },
    });
    if (!m || !m.isActive) throw notFound('ไม่พบวัสดุ');

    const pending = await prisma.requisitionItem.count({
      where: { materialId: id, requisition: { status: 'PENDING' } },
    });
    if (pending > 0) throw badRequest(`ไม่สามารถลบได้ มีคำขอเบิกที่รออนุมัติอ้างถึงวัสดุนี้ ${pending} รายการ`);

    const hasHistory = m._count.transactions + m._count.requisitionItems > 0;
    if (hasHistory) {
      // เก็บประวัติไว้: ปิดการใช้งาน (soft delete) และปลดรหัสเพื่อให้นำรหัสไปใช้ใหม่ได้
      await prisma.material.update({
        where: { id },
        data: { isActive: false, code: `${m.code.slice(0, 18)}#DEL${id}` },
      });
    } else {
      await prisma.material.delete({ where: { id } });
      removeImage(m.imageUrl);
    }
    await audit(req, 'DELETE', 'material', id, { code: m.code, name: m.name, soft: hasHistory });
    res.json({ message: 'ลบวัสดุเรียบร้อย' });
  }),
);

export default router;
