import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, conflict, notFound } from '../utils/errors.js';
import { audit } from '../utils/audit.js';

/**
 * สร้าง CRUD router สำหรับข้อมูลหลัก (หมวดหมู่ / หน่วยนับ / หน่วยงาน)
 * - ทุกคนที่ล็อกอินอ่านได้
 * - แก้ไขได้ตาม role ที่กำหนด
 * - ลบไม่ได้ถ้ามีข้อมูลอ้างอิงอยู่
 */
function crudRouter({ model, entity, schema, orderBy, countRelation, manageRoles, label }) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const rows = await prisma[model].findMany({
        orderBy,
        include: countRelation ? { _count: { select: { [countRelation]: true } } } : undefined,
      });
      res.json(rows);
    }),
  );

  router.post(
    '/',
    authorize(...manageRoles),
    validate(schema),
    asyncHandler(async (req, res) => {
      const row = await prisma[model].create({ data: req.body });
      await audit(req, 'CREATE', entity, row.id, req.body);
      res.status(201).json(row);
    }),
  );

  router.put(
    '/:id',
    authorize(...manageRoles),
    validate(schema.partial()),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const exists = await prisma[model].findUnique({ where: { id } });
      if (!exists) throw notFound(`ไม่พบ${label}`);
      const row = await prisma[model].update({ where: { id }, data: req.body });
      await audit(req, 'UPDATE', entity, id, req.body);
      res.json(row);
    }),
  );

  router.delete(
    '/:id',
    authorize(...manageRoles),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const row = await prisma[model].findUnique({
        where: { id },
        include: countRelation ? { _count: { select: { [countRelation]: true } } } : undefined,
      });
      if (!row) throw notFound(`ไม่พบ${label}`);
      if (countRelation && row._count[countRelation] > 0) {
        throw conflict(`ไม่สามารถลบ${label}นี้ได้ เนื่องจากมีข้อมูลใช้งานอยู่ ${row._count[countRelation]} รายการ`);
      }
      await prisma[model].delete({ where: { id } });
      await audit(req, 'DELETE', entity, id, { name: row.name });
      res.json({ message: `ลบ${label}เรียบร้อย` });
    }),
  );

  return router;
}

const text = (max, msg) => z.string().trim().min(1, msg).max(max);
const optText = (max) => z.string().trim().max(max).optional().nullable();

export const categoriesRouter = crudRouter({
  model: 'category',
  entity: 'category',
  label: 'หมวดหมู่',
  schema: z.object({
    name: text(100, 'กรุณากรอกชื่อหมวดหมู่'),
    description: optText(255),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'รูปแบบสีไม่ถูกต้อง')
      .optional()
      .nullable(),
  }),
  orderBy: { name: 'asc' },
  countRelation: 'materials',
  manageRoles: ['ADMIN', 'WAREHOUSE'],
});

export const unitsRouter = crudRouter({
  model: 'unit',
  entity: 'unit',
  label: 'หน่วยนับ',
  schema: z.object({ name: text(50, 'กรุณากรอกชื่อหน่วยนับ') }),
  orderBy: { name: 'asc' },
  countRelation: 'materials',
  manageRoles: ['ADMIN', 'WAREHOUSE'],
});

export const departmentsRouter = crudRouter({
  model: 'department',
  entity: 'department',
  label: 'หน่วยงาน',
  schema: z.object({
    code: text(20, 'กรุณากรอกรหัสหน่วยงาน'),
    name: text(150, 'กรุณากรอกชื่อหน่วยงาน'),
    description: optText(255),
  }),
  orderBy: { code: 'asc' },
  countRelation: 'requisitions',
  manageRoles: ['ADMIN'],
});
