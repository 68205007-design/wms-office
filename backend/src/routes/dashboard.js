import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/errors.js';
import { THAI_MONTHS_SHORT, serializeMaterial, toNumber, ym } from '../utils/helpers.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const minRef = prisma.material.fields.minQuantity;
    const isUser = req.user.role === 'USER';
    const reqScope = isUser ? { requesterId: req.user.id } : {};

    const [
      materialCount,
      qtyAgg,
      lowStockCount,
      outOfStockCount,
      pendingCount,
      monthlyRequisitions,
      monthlyReceipts,
      transactions,
      categories,
      lowStock,
      recent,
      allMaterials,
    ] = await Promise.all([
      prisma.material.count({ where: { isActive: true } }),
      prisma.material.aggregate({ where: { isActive: true }, _sum: { quantity: true } }),
      prisma.material.count({ where: { isActive: true, quantity: { gt: 0, lte: minRef } } }),
      prisma.material.count({ where: { isActive: true, quantity: { lte: 0 } } }),
      prisma.requisition.count({ where: { status: 'PENDING', ...reqScope } }),
      prisma.requisition.count({ where: { requestDate: { gte: monthStart }, ...reqScope } }),
      prisma.stockTransaction.count({ where: { type: 'IN', transactionDate: { gte: monthStart } } }),
      prisma.stockTransaction.findMany({
        where: { type: { in: ['IN', 'OUT'] }, transactionDate: { gte: yearAgo } },
        select: { type: true, quantity: true, unitPrice: true, transactionDate: true },
      }),
      prisma.category.findMany({
        include: { materials: { where: { isActive: true }, select: { quantity: true, unitPrice: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.material.findMany({
        where: { isActive: true, quantity: { lte: minRef } },
        include: { unit: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: { quantity: 'asc' },
        take: 8,
      }),
      prisma.requisition.findMany({
        where: reqScope,
        include: {
          department: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.material.findMany({ where: { isActive: true }, select: { quantity: true, unitPrice: true } }),
    ]);

    // กราฟรายเดือน 12 เดือนล่าสุด
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: ym(d),
        label: `${THAI_MONTHS_SHORT[d.getMonth()]} ${String((d.getFullYear() + 543) % 100).padStart(2, '0')}`,
        issued: 0,
        received: 0,
        issuedValue: 0,
        receivedValue: 0,
      });
    }
    const monthMap = new Map(months.map((m) => [m.key, m]));
    for (const t of transactions) {
      const m = monthMap.get(ym(t.transactionDate));
      if (!m) continue;
      const value = t.quantity * toNumber(t.unitPrice);
      if (t.type === 'OUT') {
        m.issued += t.quantity;
        m.issuedValue += value;
      } else {
        m.received += t.quantity;
        m.receivedValue += value;
      }
    }

    const palette = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const categoryChart = categories
      .map((c, i) => ({
        name: c.name,
        color: c.color || palette[i % palette.length],
        count: c.materials.length,
        quantity: c.materials.reduce((s, m) => s + m.quantity, 0),
        value: c.materials.reduce((s, m) => s + m.quantity * toNumber(m.unitPrice), 0),
      }))
      .filter((c) => c.count > 0);

    res.json({
      stats: {
        materialCount,
        totalQuantity: qtyAgg._sum.quantity || 0,
        totalValue: allMaterials.reduce((s, m) => s + m.quantity * toNumber(m.unitPrice), 0),
        lowStockCount,
        outOfStockCount,
        pendingCount,
        monthlyRequisitions,
        monthlyReceipts,
      },
      monthly: months,
      categories: categoryChart,
      lowStock: lowStock.map(serializeMaterial),
      recentRequisitions: recent,
    });
  }),
);

export default router;
