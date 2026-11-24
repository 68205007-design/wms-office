import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler, badRequest } from '../utils/errors.js';
import { THAI_MONTHS_SHORT, dateRange, materialStatus, toNumber, ym, ymd } from '../utils/helpers.js';

const router = Router();

const STATUS_TH = { NORMAL: 'ปกติ', LOW: 'ใกล้หมด', OUT: 'หมด' };

/**
 * รายงานทุกประเภทคืนค่าในรูปแบบเดียวกัน
 * { title, columns:[{key,label,type}], rows, chart:{type,xKey,series}, summary:[{label,value,type}] }
 * เพื่อให้ frontend แสดงตาราง/กราฟ/Export ได้ด้วย component เดียว
 */
function defaultRange(query, days) {
  const to = query.to || ymd(new Date());
  const from = query.from || ymd(new Date(Date.now() - days * 24 * 3600 * 1000));
  return { from, to, range: dateRange(from, to) };
}

async function outTransactions(query, days) {
  const { from, to, range } = defaultRange(query, days);
  const where = { type: 'OUT', transactionDate: range };
  const material = {};
  if (query.categoryId) material.categoryId = Number(query.categoryId);
  if (query.search) material.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
  if (Object.keys(material).length) where.material = material;
  if (query.departmentId) where.requisition = { departmentId: Number(query.departmentId) };
  const rows = await prisma.stockTransaction.findMany({
    where,
    include: {
      material: {
        select: { code: true, name: true, unit: { select: { name: true } }, category: { select: { name: true } } },
      },
      requisition: { select: { requisitionNo: true, department: { select: { name: true } } } },
    },
    orderBy: { transactionDate: 'asc' },
  });
  return { rows, from, to };
}

function groupBy(rows, keyFn, labelFn) {
  const map = new Map();
  for (const t of rows) {
    const key = keyFn(t.transactionDate);
    if (!map.has(key)) map.set(key, { key, label: labelFn(t.transactionDate), docs: new Set(), items: 0, quantity: 0, value: 0 });
    const g = map.get(key);
    g.docs.add(t.documentNo);
    g.items += 1;
    g.quantity += t.quantity;
    g.value += t.quantity * toNumber(t.unitPrice);
  }
  return [...map.values()].map(({ docs, ...g }) => ({ ...g, documents: docs.size }));
}

const periodColumns = (label) => [
  { key: 'label', label },
  { key: 'documents', label: 'จำนวนใบเบิก', type: 'number' },
  { key: 'items', label: 'จำนวนรายการ', type: 'number' },
  { key: 'quantity', label: 'จำนวนที่จ่าย', type: 'number' },
  { key: 'value', label: 'มูลค่า (บาท)', type: 'currency' },
];

function periodSummary(rows) {
  return [
    { label: 'ใบเบิกทั้งหมด', value: rows.reduce((s, r) => s + r.documents, 0), type: 'number' },
    { label: 'จำนวนจ่ายรวม', value: rows.reduce((s, r) => s + r.quantity, 0), type: 'number' },
    { label: 'มูลค่ารวม', value: rows.reduce((s, r) => s + r.value, 0), type: 'currency' },
  ];
}

const thaiDate = (d) => `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;

const reports = {
  async daily(q) {
    const { rows, from, to } = await outTransactions(q, 30);
    const data = groupBy(rows, ymd, thaiDate);
    return {
      title: 'รายงานการเบิกวัสดุรายวัน',
      from,
      to,
      columns: periodColumns('วันที่'),
      rows: data,
      chart: { type: 'bar', xKey: 'label', series: [{ key: 'quantity', label: 'จำนวนที่จ่าย' }] },
      summary: periodSummary(data),
    };
  },

  async monthly(q) {
    const { rows, from, to } = await outTransactions(q, 365);
    const data = groupBy(rows, ym, (d) => `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`);
    return {
      title: 'รายงานการเบิกวัสดุรายเดือน',
      from,
      to,
      columns: periodColumns('เดือน'),
      rows: data,
      chart: {
        type: 'bar',
        xKey: 'label',
        series: [
          { key: 'quantity', label: 'จำนวนที่จ่าย' },
          { key: 'documents', label: 'จำนวนใบเบิก' },
        ],
      },
      summary: periodSummary(data),
    };
  },

  async yearly(q) {
    const { rows, from, to } = await outTransactions(q, 365 * 5);
    const data = groupBy(rows, (d) => String(d.getFullYear()), (d) => `พ.ศ. ${d.getFullYear() + 543}`);
    return {
      title: 'รายงานการเบิกวัสดุรายปี',
      from,
      to,
      columns: periodColumns('ปี'),
      rows: data,
      chart: { type: 'bar', xKey: 'label', series: [{ key: 'value', label: 'มูลค่า (บาท)' }] },
      summary: periodSummary(data),
    };
  },

  async stock(q, { lowOnly = false } = {}) {
    const where = { isActive: true };
    if (q.categoryId) where.categoryId = Number(q.categoryId);
    if (q.search) where.OR = [{ name: { contains: q.search } }, { code: { contains: q.search } }];
    if (lowOnly) where.quantity = { lte: prisma.material.fields.minQuantity };
    const materials = await prisma.material.findMany({
      where,
      include: { category: { select: { name: true } }, unit: { select: { name: true } } },
      orderBy: lowOnly ? { quantity: 'asc' } : { code: 'asc' },
    });
    const rows = materials.map((m) => {
      const status = materialStatus(m.quantity, m.minQuantity);
      return {
        code: m.code,
        name: m.name,
        category: m.category.name,
        quantity: m.quantity,
        minQuantity: m.minQuantity,
        shortage: Math.max(0, m.minQuantity - m.quantity),
        unit: m.unit.name,
        unitPrice: toNumber(m.unitPrice),
        value: m.quantity * toNumber(m.unitPrice),
        status,
        statusLabel: STATUS_TH[status],
      };
    });
    const byCategory = {};
    rows.forEach((r) => {
      byCategory[r.category] = (byCategory[r.category] || 0) + (lowOnly ? 1 : r.value);
    });
    return {
      title: lowOnly ? 'รายงานวัสดุใกล้หมด' : 'รายงานวัสดุคงเหลือ',
      columns: [
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อวัสดุ' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'quantity', label: 'คงเหลือ', type: 'number' },
        { key: 'minQuantity', label: 'ขั้นต่ำ', type: 'number' },
        ...(lowOnly ? [{ key: 'shortage', label: 'ขาด', type: 'number' }] : []),
        { key: 'unit', label: 'หน่วย' },
        ...(lowOnly ? [] : [{ key: 'unitPrice', label: 'ราคา/หน่วย', type: 'currency' }, { key: 'value', label: 'มูลค่า', type: 'currency' }]),
        { key: 'statusLabel', label: 'สถานะ', type: 'status' },
      ],
      rows,
      chart: {
        type: 'pie',
        xKey: 'name',
        series: [{ key: 'value', label: lowOnly ? 'จำนวนรายการ' : 'มูลค่าคงเหลือ' }],
        data: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      },
      summary: lowOnly
        ? [
            { label: 'รายการใกล้หมด', value: rows.filter((r) => r.status === 'LOW').length, type: 'number' },
            { label: 'รายการหมด', value: rows.filter((r) => r.status === 'OUT').length, type: 'number' },
          ]
        : [
            { label: 'จำนวนรายการ', value: rows.length, type: 'number' },
            { label: 'จำนวนคงเหลือรวม', value: rows.reduce((s, r) => s + r.quantity, 0), type: 'number' },
            { label: 'มูลค่าคงคลังรวม', value: rows.reduce((s, r) => s + r.value, 0), type: 'currency' },
          ],
    };
  },

  async 'low-stock'(q) {
    return reports.stock(q, { lowOnly: true });
  },

  async receipts(q) {
    const { from, to, range } = defaultRange(q, 30);
    const where = { type: 'IN', transactionDate: range };
    const material = {};
    if (q.categoryId) material.categoryId = Number(q.categoryId);
    if (q.search) material.OR = [{ name: { contains: q.search } }, { code: { contains: q.search } }];
    if (Object.keys(material).length) where.material = material;
    const tx = await prisma.stockTransaction.findMany({
      where,
      include: {
        material: { select: { code: true, name: true, unit: { select: { name: true } } } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { transactionDate: 'asc' },
    });
    const rows = tx.map((t) => ({
      date: thaiDate(t.transactionDate),
      documentNo: t.documentNo,
      code: t.material.code,
      name: t.material.name,
      quantity: t.quantity,
      unit: t.material.unit.name,
      unitPrice: toNumber(t.unitPrice),
      value: t.quantity * toNumber(t.unitPrice),
      supplier: t.supplier,
      by: t.createdBy.fullName,
    }));
    const daily = groupBy(tx, ymd, thaiDate);
    return {
      title: 'รายงานการรับเข้าวัสดุ',
      from,
      to,
      columns: [
        { key: 'date', label: 'วันที่' },
        { key: 'documentNo', label: 'เลขที่เอกสาร' },
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อวัสดุ' },
        { key: 'quantity', label: 'จำนวน', type: 'number' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'unitPrice', label: 'ราคา/หน่วย', type: 'currency' },
        { key: 'value', label: 'มูลค่า', type: 'currency' },
        { key: 'supplier', label: 'ผู้ส่งมอบ' },
        { key: 'by', label: 'ผู้รับ' },
      ],
      rows,
      chart: { type: 'bar', xKey: 'label', series: [{ key: 'quantity', label: 'จำนวนรับเข้า' }], data: daily },
      summary: [
        { label: 'รายการรับเข้า', value: rows.length, type: 'number' },
        { label: 'จำนวนรวม', value: rows.reduce((s, r) => s + r.quantity, 0), type: 'number' },
        { label: 'มูลค่ารวม', value: rows.reduce((s, r) => s + r.value, 0), type: 'currency' },
      ],
    };
  },

  async popular(q) {
    const { rows, from, to } = await outTransactions(q, 365);
    const map = new Map();
    for (const t of rows) {
      const k = t.material.code;
      if (!map.has(k))
        map.set(k, {
          code: k,
          name: t.material.name,
          category: t.material.category.name,
          unit: t.material.unit.name,
          times: 0,
          quantity: 0,
          value: 0,
        });
      const g = map.get(k);
      g.times += 1;
      g.quantity += t.quantity;
      g.value += t.quantity * toNumber(t.unitPrice);
    }
    const data = [...map.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, Number(q.limit) || 20)
      .map((r, i) => ({ rank: i + 1, ...r }));
    return {
      title: 'รายงานวัสดุยอดนิยม',
      from,
      to,
      columns: [
        { key: 'rank', label: 'อันดับ', type: 'number' },
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อวัสดุ' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'times', label: 'จำนวนครั้งที่เบิก', type: 'number' },
        { key: 'quantity', label: 'จำนวนที่เบิก', type: 'number' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'value', label: 'มูลค่า', type: 'currency' },
      ],
      rows: data,
      chart: { type: 'barH', xKey: 'name', series: [{ key: 'quantity', label: 'จำนวนที่เบิก' }], data: data.slice(0, 10) },
      summary: [{ label: 'จำนวนวัสดุที่ถูกเบิก', value: map.size, type: 'number' }],
    };
  },

  async department(q) {
    const { rows, from, to } = await outTransactions(q, 365);
    const map = new Map();
    for (const t of rows) {
      const name = t.requisition?.department?.name || 'ไม่ระบุ';
      if (!map.has(name)) map.set(name, { department: name, docs: new Set(), items: 0, quantity: 0, value: 0 });
      const g = map.get(name);
      g.docs.add(t.documentNo);
      g.items += 1;
      g.quantity += t.quantity;
      g.value += t.quantity * toNumber(t.unitPrice);
    }
    const data = [...map.values()]
      .map(({ docs, ...g }) => ({ ...g, documents: docs.size }))
      .sort((a, b) => b.value - a.value);
    return {
      title: 'รายงานการเบิกแยกตามหน่วยงาน',
      from,
      to,
      columns: [
        { key: 'department', label: 'หน่วยงาน' },
        { key: 'documents', label: 'จำนวนใบเบิก', type: 'number' },
        { key: 'items', label: 'จำนวนรายการ', type: 'number' },
        { key: 'quantity', label: 'จำนวนที่เบิก', type: 'number' },
        { key: 'value', label: 'มูลค่า (บาท)', type: 'currency' },
      ],
      rows: data,
      chart: { type: 'pie', xKey: 'department', series: [{ key: 'value', label: 'มูลค่า' }], data: data.map((d) => ({ name: d.department, value: d.value })) },
      summary: periodSummary(data),
    };
  },
};

router.get(
  '/:type',
  asyncHandler(async (req, res) => {
    const fn = reports[req.params.type];
    if (!fn || !Object.prototype.hasOwnProperty.call(reports, req.params.type)) throw badRequest('ไม่พบประเภทรายงาน');
    const result = await fn(req.query);
    result.generatedAt = new Date();
    res.json(result);
  }),
);

export default router;
