import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { audit } from '../utils/audit.js';
import { getSettings, saveSettings } from '../utils/settings.js';
import { getPagination, paginated } from '../utils/helpers.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await getSettings());
  }),
);

const schema = z
  .object({
    'org.name': z.string().trim().min(1).max(200),
    'org.shortName': z.string().trim().max(30),
    'org.address': z.string().trim().max(500),
    'org.phone': z.string().trim().max(50),
    'org.email': z.string().trim().max(150),
    'stock.defaultMinQuantity': z.coerce.number().int().min(0).max(1_000_000),
    'notify.lowStock': z.boolean(),
    'notify.outOfStock': z.boolean(),
    'notify.newRequest': z.boolean(),
    'notify.requestResult': z.boolean(),
  })
  .partial();

router.put(
  '/',
  authorize('ADMIN'),
  validate(schema),
  asyncHandler(async (req, res) => {
    const result = await saveSettings(req.body);
    await audit(req, 'UPDATE', 'settings', null, req.body);
    res.json(result);
  }),
);

/** ใช้ค่าขั้นต่ำเริ่มต้นกับวัสดุทุกรายการ (หรือเฉพาะรายการที่ขั้นต่ำเป็น 0) */
router.post(
  '/apply-default-min',
  authorize('ADMIN', 'WAREHOUSE'),
  validate(z.object({ onlyZero: z.boolean().default(true) })),
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    const value = Number(settings['stock.defaultMinQuantity']) || 0;
    const where = { isActive: true, ...(req.body.onlyZero ? { minQuantity: 0 } : {}) };
    const r = await prisma.material.updateMany({ where, data: { minQuantity: value } });
    await audit(req, 'APPLY_DEFAULT_MIN', 'material', null, { value, count: r.count });
    res.json({ message: `ปรับจำนวนขั้นต่ำเป็น ${value} จำนวน ${r.count} รายการ` });
  }),
);

router.get(
  '/audit-logs',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { search, entity } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (search) where.OR = [{ action: { contains: search } }, { user: { fullName: { contains: search } } }];
    const p = getPagination(req.query, 20);
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, username: true } } },
        orderBy: { id: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json(paginated(rows, total, p));
  }),
);

export default router;
