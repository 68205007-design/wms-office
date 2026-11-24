import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `ไม่พบ API: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'ข้อมูลไม่ถูกต้อง',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `อัปโหลดไฟล์ไม่สำเร็จ: ${err.message}` });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
      return res.status(409).json({ message: `ข้อมูลซ้ำกับที่มีอยู่แล้ว (${target || 'unique'})` });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ message: 'ไม่สามารถดำเนินการได้ เนื่องจากข้อมูลถูกใช้งานอยู่ในส่วนอื่น' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'ไม่พบข้อมูล' });
    }
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'รูปแบบ JSON ไม่ถูกต้อง' });
  }
  console.error('[error]', err);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
}
