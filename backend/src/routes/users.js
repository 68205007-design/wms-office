import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, badRequest, notFound } from '../utils/errors.js';
import { audit } from '../utils/audit.js';
import { getPagination, paginated } from '../utils/helpers.js';
import { passwordRule } from './auth.js';

const router = Router();

const select = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  position: true,
  role: true,
  isActive: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  lastLoginAt: true,
  createdAt: true,
};

const roleEnum = z.enum(['ADMIN', 'WAREHOUSE', 'USER', 'APPROVER']);
const base = {
  fullName: z.string().trim().min(1, 'กรุณากรอกชื่อ-สกุล').max(150),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง').max(150).optional().or(z.literal('')).nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  position: z.string().trim().max(100).optional().nullable(),
  role: roleEnum,
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
};

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร')
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, . _ -'),
  password: passwordRule,
  ...base,
});

const updateSchema = z.object({ ...base, password: passwordRule.optional().or(z.literal('')) }).partial();

// รายชื่อผู้ใช้ (ADMIN) - APPROVER/WAREHOUSE ใช้สำหรับ filter ผู้เบิก
router.get(
  '/',
  authorize('ADMIN', 'WAREHOUSE', 'APPROVER'),
  asyncHandler(async (req, res) => {
    const { search, role, all } = req.query;
    const where = {};
    if (search) {
      where.OR = [{ username: { contains: search } }, { fullName: { contains: search } }];
    }
    if (role) where.role = role;
    if (all === '1') {
      const users = await prisma.user.findMany({
        where,
        select: { id: true, fullName: true, username: true, role: true },
        orderBy: { fullName: 'asc' },
      });
      return res.json(users);
    }
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้' });
    const p = getPagination(req.query);
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, select, skip: p.skip, take: p.take, orderBy: { id: 'asc' } }),
      prisma.user.count({ where }),
    ]);
    res.json(paginated(data, total, p));
  }),
);

router.post(
  '/',
  authorize('ADMIN'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { password, email, ...rest } = req.body;
    const user = await prisma.user.create({
      data: { ...rest, email: email || null, passwordHash: await bcrypt.hash(password, 10) },
      select,
    });
    await audit(req, 'CREATE', 'user', user.id, { username: user.username, role: user.role });
    res.status(201).json(user);
  }),
);

router.put(
  '/:id',
  authorize('ADMIN'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound('ไม่พบผู้ใช้งาน');
    const { password, email, ...rest } = req.body;

    if (id === req.user.id && (rest.role && rest.role !== 'ADMIN' || rest.isActive === false)) {
      throw badRequest('ไม่สามารถลดสิทธิ์หรือปิดใช้งานบัญชีของตัวเองได้');
    }
    const data = { ...rest };
    if (email !== undefined) data.email = email || null;
    const roleChanged = rest.role && rest.role !== existing.role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    // บังคับให้ login ใหม่เมื่อมีการเปลี่ยนรหัสผ่าน/สิทธิ์/ปิดบัญชี
    if (password || roleChanged || rest.isActive === false) data.tokenVersion = { increment: 1 };

    const user = await prisma.user.update({ where: { id }, data, select });
    await audit(req, 'UPDATE', 'user', id, { ...rest, passwordChanged: !!password });
    res.json(user);
  }),
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) throw badRequest('ไม่สามารถลบบัญชีของตัวเองได้');
    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { requisitions: true, transactions: true, approvals: true } } },
    });
    if (!user) throw notFound('ไม่พบผู้ใช้งาน');

    const used = user._count.requisitions + user._count.transactions + user._count.approvals;
    if (used > 0) {
      // มีประวัติในระบบ -> ปิดใช้งานแทนการลบ เพื่อรักษาความถูกต้องของประวัติ
      await prisma.user.update({ where: { id }, data: { isActive: false, tokenVersion: { increment: 1 } } });
      await audit(req, 'DEACTIVATE', 'user', id, { username: user.username });
      return res.json({ message: 'ผู้ใช้มีประวัติการทำรายการ จึงปิดการใช้งานแทนการลบ', deactivated: true });
    }
    await prisma.user.delete({ where: { id } });
    await audit(req, 'DELETE', 'user', id, { username: user.username });
    res.json({ message: 'ลบผู้ใช้งานเรียบร้อย' });
  }),
);

export default router;
