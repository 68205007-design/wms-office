import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/errors.js';
import { getPagination, paginated } from '../utils/helpers.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = { userId: req.user.id };
    if (req.query.unread === '1') where.isRead = false;
    const p = getPagination(req.query, 10, 50);
    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.json({ ...paginated(rows, total, p), unread });
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const unread = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ unread });
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'อ่านทั้งหมดแล้ว' });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } });
    res.json({ ok: true });
  }),
);

export default router;
