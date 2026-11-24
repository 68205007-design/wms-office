import * as XLSX from 'xlsx';
import { fmtMoney, fmtNumber } from './format';

/**
 * columns: [{ key, label, type?: 'number'|'currency', value?: (row)=>any }]
 */
function cellValue(col, row) {
  const v = col.value ? col.value(row) : row[col.key];
  return v ?? '';
}

export function exportExcel({ filename, sheetName = 'รายงาน', title, columns, rows, summary }) {
  const aoa = [];
  if (title) aoa.push([title], []);
  aoa.push(columns.map((c) => c.label));
  rows.forEach((r) => aoa.push(columns.map((c) => cellValue(c, r))));
  if (summary?.length) {
    aoa.push([]);
    summary.forEach((s) => aoa.push([s.label, s.value]));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(10, Math.min(40, c.label.length + 6)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function formatCell(col, row) {
  const v = cellValue(col, row);
  if (col.type === 'currency') return fmtMoney(v);
  if (col.type === 'number') return fmtNumber(v);
  return escapeHtml(v);
}

/**
 * Export PDF / พิมพ์ — เปิดหน้าพิมพ์ที่จัดรูปแบบแล้ว ให้เลือก "บันทึกเป็น PDF" ได้
 * (วิธีนี้แสดงภาษาไทยได้ถูกต้องเสมอ ต่างจาก library PDF ที่ต้องฝังฟอนต์)
 */
export function printReport({ title, subtitle, orgName, columns, rows, summary }) {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (!w) {
    alert('กรุณาอนุญาต pop-up เพื่อพิมพ์/บันทึก PDF');
    return;
  }
  const head = columns.map((c) => `<th class="${c.type ? 'r' : ''}">${escapeHtml(c.label)}</th>`).join('');
  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="c">${i + 1}</td>${columns
          .map((c) => `<td class="${c.type ? 'r' : ''}">${formatCell(c, r)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const sum = (summary || [])
    .map((s) => `<div class="s"><span>${escapeHtml(s.label)}</span><b>${s.type === 'currency' ? fmtMoney(s.value) : fmtNumber(s.value)}</b></div>`)
    .join('');
  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: 'Sarabun', sans-serif; color:#0f172a; font-size: 13px; }
  .hd { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e3a8a; padding-bottom:8px; margin-bottom:12px }
  h1 { font-size: 20px; margin: 0; color:#1e3a8a }
  .org { font-weight:600; font-size:14px } .sub { color:#475569; margin-top:2px }
  table { width:100%; border-collapse: collapse; }
  th { background:#1e3a8a; color:#fff; font-weight:600; padding:6px 8px; text-align:left; font-size:12px }
  td { border-bottom:1px solid #e2e8f0; padding:5px 8px }
  tr:nth-child(even) td { background:#f8fafc }
  .r { text-align:right } .c { text-align:center; color:#64748b }
  .sum { display:flex; gap:12px; margin-top:14px; flex-wrap:wrap }
  .s { border:1px solid #cbd5e1; border-radius:6px; padding:6px 12px } .s span { color:#475569; margin-right:8px }
  .ft { margin-top:18px; color:#64748b; font-size:11px; text-align:right }
  .bar { position:fixed; top:10px; right:10px } .bar button { font-family:inherit; padding:8px 16px; background:#1d4ed8; color:#fff; border:0; border-radius:8px; cursor:pointer }
  @media print { .bar { display:none } }
</style></head><body>
<div class="bar"><button onclick="window.print()">พิมพ์ / บันทึก PDF</button></div>
<div class="hd"><div><div class="org">${escapeHtml(orgName || '')}</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ''}</div>
<div class="sub">จำนวน ${fmtNumber(rows.length)} รายการ</div></div>
<table><thead><tr><th class="c">#</th>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length + 1}" class="c">ไม่มีข้อมูล</td></tr>`}</tbody></table>
<div class="sum">${sum}</div>
<div class="ft">พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</div>
<script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),300));</script>
</body></html>`);
  w.document.close();
}
