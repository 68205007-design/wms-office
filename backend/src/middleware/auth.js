import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export const ROLES = {
  ADMIN: 'ADMIN',
  WAREHOUSE: 'WAREHOUSE',
  USER: 'USER',
  APPROVER: 'APPROVER',
};

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, tv: user.tokenVersion }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * ตรวจสอบ JWT และโหลดผู้ใช้จากฐานข้อมูลทุกครั้ง
 * - ผู้ใช้ถูกปิดใช้งาน -> ปฏิเสธ
 * - tokenVersion ไม่ตรง (ออกจากระบบ/เปลี่ยนรหัสผ่าน) -> session หมดอายุ
 * - role ใช้ค่าล่าสุดจากฐานข้อมูล ไม่เชื่อค่าใน token
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });
    if (!user || !user.isActive) throw unauthorized('บัญชีนี้ไม่สามารถใช้งานได้');
    if (user.tokenVersion !== payload.tv) throw unauthorized('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** อนุญาตเฉพาะ role ที่กำหนด */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
