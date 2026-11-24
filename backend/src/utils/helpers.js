import { config } from '../lib/config.js';

/** สถานะวัสดุ: OUT = หมด, LOW = ใกล้หมด, NORMAL = ปกติ */
export function materialStatus(quantity, minQuantity) {
  if (quantity <= 0) return 'OUT';
  if (quantity <= minQuantity) return 'LOW';
  return 'NORMAL';
}

export function toNumber(decimal) {
  if (decimal === null || decimal === undefined) return 0;
  return Number(decimal);
}

export function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${config.publicUrl}${path}`;
}

/** แปลงข้อมูลวัสดุสำหรับส่งออก API */
export function serializeMaterial(m) {
  if (!m) return m;
  return {
    ...m,
    unitPrice: toNumber(m.unitPrice),
    imageUrl: absoluteUrl(m.imageUrl),
    status: materialStatus(m.quantity, m.minQuantity),
    totalValue: m.quantity * toNumber(m.unitPrice),
  };
}

export function getPagination(query, defaultSize = 10, maxSize = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated(data, total, { page, pageSize }) {
  return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** รับ yyyy-mm-dd แล้วคืนช่วงเวลาตั้งแต่ต้นวันถึงสิ้นวัน */
export function dateRange(from, to) {
  const range = {};
  if (from) {
    const d = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (to) {
    const d = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  return Object.keys(range).length ? range : undefined;
}

export function ymd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ym(date) {
  return ymd(date).slice(0, 7);
}

export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** สร้างเลขที่เอกสาร เช่น REQ-202611-0001 (ภายใน transaction เพื่อลดโอกาสซ้ำ) */
export async function nextDocumentNo(tx, prefix, model, field) {
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const base = `${prefix}-${period}-`;
  const last = await tx[model].findFirst({
    where: { [field]: { startsWith: base } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });
  const seq = last ? parseInt(last[field].slice(base.length), 10) + 1 : 1;
  return `${base}${String(seq).padStart(4, '0')}`;
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '').slice(0, 64);
}
