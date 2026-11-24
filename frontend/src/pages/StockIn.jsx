import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, PackagePlus, Plus, Save, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import MaterialPicker from '../components/MaterialPicker';
import { EmptyState, Field, PageHeader, Pagination, SearchInput, Spinner, Tabs } from '../components/ui';
import { cleanParams, fmtDate, fmtMoney, fmtNumber, todayISO } from '../utils/format';
import useDebounce from '../utils/useDebounce';

const newLine = () => ({ key: Math.random().toString(36).slice(2), materialId: null, quantity: '', unitPrice: '' });

function ReceiveForm({ onSaved }) {
  const toast = useToast();
  const [materials, setMaterials] = useState([]);
  const [header, setHeader] = useState({ documentNo: '', supplier: '', receivedDate: todayISO(), note: '', updatePrice: true });
  const [lines, setLines] = useState([newLine()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const loadMaterials = () => api.get('/materials', { params: { all: 1 } }).then(({ data }) => setMaterials(data));
  useEffect(() => {
    loadMaterials();
  }, []);

  const updateLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!header.supplier.trim()) errs.supplier = 'กรุณาระบุผู้ส่งมอบ';
    if (!header.receivedDate) errs.receivedDate = 'กรุณาระบุวันที่รับเข้า';
    if (header.receivedDate > todayISO()) errs.receivedDate = 'วันที่รับเข้าต้องไม่เป็นวันในอนาคต';
    const valid = lines.filter((l) => l.materialId);
    if (!valid.length) errs.lines = 'กรุณาเลือกวัสดุอย่างน้อย 1 รายการ';
    for (const l of valid) {
      if (!(Number(l.quantity) > 0) || !Number.isInteger(Number(l.quantity))) errs.lines = 'จำนวนรับเข้าต้องเป็นจำนวนเต็มมากกว่า 0';
      if (l.unitPrice === '' || Number(l.unitPrice) < 0) errs.lines = 'กรุณาระบุราคาต่อหน่วยให้ถูกต้อง';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const { data } = await api.post('/stock-in', {
        ...header,
        documentNo: header.documentNo || null,
        items: valid.map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      });
      toast.success(`${data.message} (เลขที่ ${data.documentNo})`);
      setHeader({ documentNo: '', supplier: '', receivedDate: todayISO(), note: '', updatePrice: true });
      setLines([newLine()]);
      loadMaterials();
      onSaved?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="card p-5 xl:col-span-1">
        <h3 className="mb-4 font-semibold text-navy-900">ข้อมูลเอกสารรับเข้า</h3>
        <div className="space-y-4">
          <Field label="เลขที่เอกสาร" hint="เว้นว่างเพื่อให้ระบบออกเลขอัตโนมัติ (RCV-ปปปปดด-xxxx)">
            <input className="input" value={header.documentNo} onChange={(e) => setHeader({ ...header, documentNo: e.target.value })} placeholder="เช่น INV-2569/0123" />
          </Field>
          <Field label="ผู้ส่งมอบ" required error={errors.supplier}>
            <input className="input" value={header.supplier} onChange={(e) => setHeader({ ...header, supplier: e.target.value })} placeholder="ชื่อร้านค้า/บริษัท" />
          </Field>
          <Field label="วันที่รับเข้า" required error={errors.receivedDate}>
            <input type="date" max={todayISO()} className="input" value={header.receivedDate} onChange={(e) => setHeader({ ...header, receivedDate: e.target.value })} />
          </Field>
          <Field label="หมายเหตุ">
            <textarea rows={3} className="input" value={header.note} onChange={(e) => setHeader({ ...header, note: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" checked={header.updatePrice} onChange={(e) => setHeader({ ...header, updatePrice: e.target.checked })} />
            อัปเดตราคาต่อหน่วยของวัสดุเป็นราคาล่าสุด
          </label>
        </div>
      </div>

      <div className="card flex flex-col xl:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-navy-900">รายการวัสดุที่รับเข้า</h3>
          <button type="button" className="btn-secondary py-2" onClick={() => setLines((l) => [...l, newLine()])}>
            <Plus className="h-4 w-4" /> เพิ่มรายการ
          </button>
        </div>
        <div className="flex-1 space-y-3 p-5">
          {errors.lines && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.lines}</div>}
          {lines.map((l, i) => {
            const m = materials.find((x) => x.id === l.materialId);
            return (
              <div key={l.key} className="grid grid-cols-12 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 animate-fade-in">
                <div className="col-span-12 md:col-span-6">
                  <label className="label text-xs">วัสดุ #{i + 1}</label>
                  <MaterialPicker
                    materials={materials}
                    value={l.materialId}
                    excludeIds={lines.map((x) => x.materialId).filter(Boolean)}
                    onChange={(mat) => updateLine(l.key, { materialId: mat.id, unitPrice: l.unitPrice === '' ? mat.unitPrice : l.unitPrice })}
                  />
                  {m && (
                    <p className="mt-1 text-xs text-slate-500">
                      คงเหลือปัจจุบัน {fmtNumber(m.quantity)} {m.unit?.name} → หลังรับเข้า{' '}
                      <b className="text-emerald-600">{fmtNumber(m.quantity + (Number(l.quantity) || 0))}</b>
                    </p>
                  )}
                </div>
                <div className="col-span-5 md:col-span-2">
                  <label className="label text-xs">จำนวน {m && `(${m.unit?.name})`}</label>
                  <input type="number" min="1" step="1" className="input" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} />
                </div>
                <div className="col-span-5 md:col-span-3">
                  <label className="label text-xs">ราคาต่อหน่วย (บาท)</label>
                  <input type="number" min="0" step="0.01" className="input" value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })} />
                </div>
                <div className="col-span-2 flex justify-end md:col-span-1">
                  <button
                    type="button"
                    className="btn-icon hover:bg-red-50 hover:text-red-600"
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    title="ลบรายการ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:rounded-b-2xl">
          <p className="text-sm text-slate-600">
            มูลค่ารวม <span className="text-xl font-bold text-navy-900">{fmtMoney(total)}</span> บาท
          </p>
          <button className="btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึกรับเข้า
          </button>
        </div>
      </div>
    </form>
  );
}

function ReceiveHistory() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const search = useDebounce(filter.search);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/stock-in', { params: cleanParams({ page, pageSize: 15, search, from: filter.from, to: filter.to }) })
      .then(({ data }) => {
        setRows(data.data);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page, search, filter.from, filter.to]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [search, filter.from, filter.to]);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
        <SearchInput className="md:col-span-2" value={filter.search} onChange={(v) => setFilter({ ...filter, search: v })} placeholder="ค้นหาเลขเอกสาร ผู้ส่งมอบ วัสดุ..." />
        <input type="date" className="input" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
        <input type="date" className="input" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
      </div>
      {loading && !rows.length ? (
        <div className="flex justify-center py-14">
          <Spinner className="h-7 w-7" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="ไม่พบประวัติการรับเข้า" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>วันที่รับ</th>
                <th>เลขที่เอกสาร</th>
                <th>วัสดุ</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ราคา/หน่วย</th>
                <th className="text-right">รวม</th>
                <th>ผู้ส่งมอบ</th>
                <th>ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.transactionDate)}</td>
                  <td className="font-medium text-blue-700">{r.documentNo}</td>
                  <td>
                    <p className="font-medium">{r.material.name}</p>
                    <p className="text-xs text-slate-400">{r.material.code}</p>
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold text-emerald-600">
                    +{fmtNumber(r.quantity)} <span className="font-normal text-slate-400">{r.material.unit.name}</span>
                  </td>
                  <td className="text-right">{fmtMoney(r.unitPrice)}</td>
                  <td className="text-right font-medium">{fmtMoney(r.totalPrice)}</td>
                  <td className="text-slate-600">{r.supplier}</td>
                  <td className="whitespace-nowrap text-slate-500">
                    {r.createdBy.fullName}
                    {r.note && <span className="block max-w-[200px] truncate text-xs text-slate-400">{r.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={pagination} onChange={setPage} />
    </div>
  );
}

export default function StockIn() {
  const [tab, setTab] = useState('form');
  const [version, setVersion] = useState(0);
  return (
    <div>
      <PageHeader icon={PackagePlus} title="รับเข้าวัสดุ" description="บันทึกการรับวัสดุเข้าคลัง ระบบจะเพิ่มยอดคงเหลือให้อัตโนมัติ" />
      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key: 'form', label: 'บันทึกรับเข้า', icon: PackagePlus },
            { key: 'history', label: 'ประวัติการรับเข้า', icon: History },
          ]}
        />
      </div>
      {tab === 'form' ? <ReceiveForm onSaved={() => setVersion((v) => v + 1)} /> : <ReceiveHistory key={version} />}
    </div>
  );
}
