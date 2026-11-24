export const ROLE_LABELS = {
  ADMIN: 'ผู้ดูแลระบบ',
  WAREHOUSE: 'เจ้าหน้าที่คลัง',
  USER: 'ผู้ใช้งานทั่วไป',
  APPROVER: 'ผู้อนุมัติ',
};

export const MATERIAL_STATUS = {
  NORMAL: { label: 'ปกติ', tone: 'green' },
  LOW: { label: 'ใกล้หมด', tone: 'orange' },
  OUT: { label: 'หมด', tone: 'red' },
};

export const REQ_STATUS = {
  PENDING: { label: 'รออนุมัติ', tone: 'purple' },
  APPROVED: { label: 'อนุมัติแล้ว', tone: 'green' },
  REJECTED: { label: 'ไม่อนุมัติ', tone: 'red' },
  CANCELLED: { label: 'ยกเลิก', tone: 'slate' },
};

const nf = new Intl.NumberFormat('th-TH');
const cf = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNumber = (n) => nf.format(Number(n) || 0);
export const fmtMoney = (n) => cf.format(Number(n) || 0);
export const fmtCompactMoney = (n) =>
  new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);

export function fmtDate(d, withTime = false) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return fmtDate(d);
}

/** yyyy-mm-dd ตามเวลาเครื่อง */
export function todayISO(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function cleanParams(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}
