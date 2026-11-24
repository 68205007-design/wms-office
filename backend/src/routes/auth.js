import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, badRequest, unauthorized } from '../utils/errors.js';
import { audit } from '../utils/audit.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที' },
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้').max(50),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(100),
});

export const passwordRule = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(100)
  .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษ')
  .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลข');

const userPublicSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  position: true,
  role: true,
  departmentId: true,
  department: { select: { id: true, name: true, code: true } },
  lastLoginAt: true,
};

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    // เปรียบเทียบ hash เสมอเพื่อลด timing attack
    const ok = await bcrypt.compare(password, user?.passwordHash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    if (!user || !ok) {
      await audit(req, 'LOGIN_FAILED', 'auth', null, { username });
      throw unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (!user.isActive) throw unauthorized('บัญชีนี้ถูกระงับการใช้งาน');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    req.user = user;
    await audit(req, 'LOGIN', 'auth', user.id);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: userPublicSelect });
    res.json({ token: signToken(user), user: profile });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await prisma.user.findUnique({ where: { id: req.user.id }, select: userPublicSelect });
    res.json(profile);
  }),
);

/** ออกจากระบบ: เพิ่ม tokenVersion ทำให้ token เดิมใช้ไม่ได้ทุกอุปกรณ์ */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
    await audit(req, 'LOGOUT', 'auth', req.user.id);
    res.json({ message: 'ออกจากระบบเรียบร้อย' });
  }),
);

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: passwordRule,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม',
    path: ['newPassword'],
  });

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!ok) throw badRequest('รหัสผ่านปัจจุบันไม่ถูกต้อง');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(req.body.newPassword, 10),
        tokenVersion: { increment: 1 },
      },
    });
    await audit(req, 'CHANGE_PASSWORD', 'user', user.id);
    // ออก token ใหม่ให้ผู้ใช้คนปัจจุบัน (session อื่นจะหมดอายุ)
    res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อย', token: signToken(updated) });
  }),
);

export default router;
