import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, ImageOff, ImagePlus, Loader2, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage, imageSrc } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, ConfirmDialog, EmptyState, Field, MaterialStatusBadge, Modal, PageHeader, Pagination, SearchInput, Spinner } from '../components/ui';
import { fmtDate, fmtMoney, fmtNumber } from '../utils/format';
import { can } from '../utils/permissions';
import useDebounce from '../utils/useDebounce';

function Thumb({ url, size = 'h-11 w-11' }) {
  const src = imageSrc(url);
  return src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-xl border border-slate-200 object-cover`} />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400`}>
      <Package className="h-5 w-5" />
    </div>
  );
}

const emptyForm = { code: '', name: '', description: '', categoryId: '', unitId: '', quantity: 0, minQuantity: 10, unitPrice: 0 };

function MaterialForm({ open, onClose, material, categories, units, onSaved, defaultMin }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFile(null);
    setRemoveImage(false);
    if (material) {
      setForm({
        code: material.code,
        name: material.name,
        description: material.description || '',
        categoryId: material.categoryId,
        unitId: material.unitId,
        quantity: material.quantity,
        minQuantity: material.minQuantity,
        unitPrice: material.unitPrice,
      });
      setPreview(imageSrc(material.imageUrl));
    } else {
      setForm({ ...emptyForm, minQuantity: defaultMin ?? 10 });
      setPreview(null);
    }
  }, [open, material, defaultMin]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) return toast.error('ไฟล์รูปภาพต้องไม่เกิน 3 MB');
    setFile(f);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.code.trim()) errs.code = 'กรุณากรอกรหัสวัสดุ';
    if (!form.name.trim()) errs.name = 'กรุณากรอกชื่อวัสดุ';
    if (!form.categoryId) errs.categoryId = 'กรุณาเลือกหมวดหมู่';
    if (!form.unitId) errs.unitId = 'กรุณาเลือกหน่วยนับ';
    if (Number(form.quantity) < 0 || !Number.isInteger(Number(form.quantity))) errs.quantity = 'ต้องเป็นจำนวนเต็มไม่ติดลบ';
    if (Number(form.minQuantity) < 0) errs.minQuantity = 'ต้องไม่ติดลบ';
    if (Number(form.unitPrice) < 0) errs.unitPrice = 'ต้องไม่ติดลบ';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
    if (file) fd.append('image', file);
    if (removeImage) fd.append('removeImage', 'true');
    setSaving(true);
    try {
      if (material) await api.put(`/materials/${material.id}`, fd);
      else await api.post('/materials', fd);
      toast.success(material ? 'บันทึกการแก้ไขเรียบร้อย' : 'เพิ่มวัสดุเรียบร้อย');
      onSaved();
      onClose();
    } catch (err) {
      const details = err.response?.data?.details;
      if (details?.length) setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={material ? 'แก้ไขข้อมูลวัสดุ' : 'เพิ่มวัสดุใหม่'}
      subtitle={material ? `${material.code} · ${material.name}` : 'กรอกรายละเอียดวัสดุที่จะเพิ่มเข้าคลัง'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
        <div>
          <label className="label">รูปภาพวัสดุ</label>
          <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-400 hover:bg-blue-50/50">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus className="mb-2 h-8 w-8" />
                <span className="text-xs">คลิกเพื่อเลือกรูป</span>
                <span className="text-[11px]">JPG, PNG, WEBP ≤ 3MB</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
          </label>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFile(null);
                setRemoveImage(true);
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <ImageOff className="h-3.5 w-3.5" /> ลบรูปภาพ
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="รหัสวัสดุ" required error={errors.code}>
            <input className="input" value={form.code} onChange={set('code')} placeholder="เช่น ST-001" />
          </Field>
          <Field label="ชื่อวัสดุ" required error={errors.name}>
            <input className="input" value={form.name} onChange={set('name')} placeholder="เช่น ปากกาลูกลื่น สีน้ำเงิน" />
          </Field>
          <Field label="หมวดหมู่" required error={errors.categoryId}>
            <select className="input" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="หน่วยนับ" required error={errors.unitId}>
            <select className="input" value={form.unitId} onChange={set('unitId')}>
              <option value="">-- เลือกหน่วยนับ --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="จำนวนคงเหลือ" required error={errors.quantity} hint={material ? 'การแก้ไขจะบันทึกเป็นรายการปรับปรุงยอด' : 'ยอดยกมา'}>
            <input type="number" min="0" step="1" className="input" value={form.quantity} onChange={set('quantity')} />
          </Field>
          <Field label="จำนวนขั้นต่ำ" required error={errors.minQuantity} hint="แจ้งเตือนเมื่อคงเหลือ ≤ ค่านี้">
            <input type="number" min="0" step="1" className="input" value={form.minQuantity} onChange={set('minQuantity')} />
          </Field>
          <Field label="ราคาต่อหน่วย (บาท)" required error={errors.unitPrice}>
            <input type="number" min="0" step="0.01" className="input" value={form.unitPrice} onChange={set('unitPrice')} />
          </Field>
          <Field label="รายละเอียด" className="sm:col-span-2">
            <textarea rows={3} className="input" value={form.description} onChange={set('description')} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

const TX_TYPE = { IN: { l: 'รับเข้า', t: 'green' }, OUT: { l: 'เบิกจ่าย', t: 'blue' }, ADJUST: { l: 'ปรับปรุงยอด', t: 'orange' } };

function MaterialDetail({ id, onClose }) {
  const [m, setM] = useState(null);
  useEffect(() => {
    if (!id) return;
    setM(null);
    api.get(`/materials/${id}`).then(({ data }) => setM(data)).catch(() => onClose());
  }, [id, onClose]);

  return (
    <Modal open={!!id} onClose={onClose} title="รายละเอียดวัสดุ" size="lg">
      {!m ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <Thumb url={m.imageUrl} size="h-36 w-36" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue" dot={false}>
                  {m.code}
                </Badge>
                <MaterialStatusBadge status={m.status} />
              </div>
              <h3 className="mt-2 text-xl font-bold text-navy-900">{m.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{m.description || 'ไม่มีรายละเอียด'}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['คงเหลือ', `${fmtNumber(m.quantity)} ${m.unit.name}`],
                  ['ขั้นต่ำ', `${fmtNumber(m.minQuantity)} ${m.unit.name}`],
                  ['ราคา/หน่วย', `${fmtMoney(m.unitPrice)} ฿`],
                  ['มูลค่าคงเหลือ', `${fmtMoney(m.totalValue)} ฿`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="font-semibold text-navy-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-3">
            <p>
              <span className="text-slate-500">หมวดหมู่:</span> {m.category.name}
            </p>
            <p>
              <span className="text-slate-500">วันที่เพิ่ม:</span> {fmtDate(m.createdAt)}
            </p>
            <p>
              <span className="text-slate-500">ผู้เพิ่มรายการ:</span> {m.createdBy?.fullName || '-'}
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-navy-900">ความเคลื่อนไหวล่าสุด</h4>
            {m.transactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีความเคลื่อนไหว</p>
            ) : (
              <div className="table-wrap rounded-xl border border-slate-200">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>ประเภท</th>
                      <th>เอกสาร</th>
                      <th className="text-right">จำนวน</th>
                      <th className="text-right">คงเหลือ</th>
                      <th>ผู้ทำรายการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap">{fmtDate(t.transactionDate, true)}</td>
                        <td>
                          <Badge tone={TX_TYPE[t.type].t}>{TX_TYPE[t.type].l}</Badge>
                        </td>
                        <td className="text-slate-500">{t.documentNo || '-'}</td>
                        <td className={`text-right font-medium ${t.type === 'OUT' || t.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {t.type === 'OUT' ? '-' : t.quantity > 0 ? '+' : ''}
                          {fmtNumber(t.quantity)}
                        </td>
                        <td className="text-right">{fmtNumber(t.balanceAfter)}</td>
                        <td className="text-slate-500">{t.createdBy?.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Materials() {
  const { user, settings } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const manage = can(user, 'manageMaterials');

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewId, setViewId] = useState(params.get('highlight') ? Number(params.get('highlight')) : null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const q = useDebounce(search, 350);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
    api.get('/units').then(({ data }) => setUnits(data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { page, pageSize, categoryId: categoryId || undefined, status: status || undefined };
      if (q) p[searchBy === 'all' ? 'search' : searchBy] = q;
      const { data } = await api.get('/materials', { params: p });
      setRows(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, categoryId, status, q, searchBy]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [q, categoryId, status, searchBy, pageSize]);

  const closeView = useCallback(() => {
    setViewId(null);
    if (params.get('highlight')) {
      params.delete('highlight');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/materials/${deleting.id}`);
      toast.success('ลบวัสดุเรียบร้อย');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon={Package}
        title="คลังวัสดุ"
        description="จัดการรายการวัสดุ ยอดคงเหลือ และข้อมูลวัสดุทั้งหมดในคลัง"
        actions={
          manage && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> เพิ่มวัสดุ
            </button>
          )
        }
      />

      <div className="card mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="flex gap-2 md:col-span-5">
            <select className="input w-36 shrink-0" value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              <option value="code">รหัสวัสดุ</option>
              <option value="name">ชื่อวัสดุ</option>
            </select>
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหารหัสหรือชื่อวัสดุ..." className="flex-1" />
          </div>
          <select className="input md:col-span-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 md:col-span-4">
            {[
              ['', 'ทั้งหมด'],
              ['NORMAL', 'ปกติ'],
              ['LOW', 'ใกล้หมด'],
              ['OUT', 'หมด'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatus(v)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${status === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !rows.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="ไม่พบวัสดุ" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" icon={Package} />
        ) : (
          <div className={`table-wrap transition ${loading ? 'opacity-60' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>วัสดุ</th>
                  <th className="hidden lg:table-cell">หมวดหมู่</th>
                  <th className="text-right">คงเหลือ</th>
                  <th className="hidden sm:table-cell">หน่วย</th>
                  <th className="hidden text-right md:table-cell">ราคา/หน่วย</th>
                  <th className="hidden xl:table-cell">วันที่เพิ่ม</th>
                  <th>สถานะ</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Thumb url={m.imageUrl} />
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-medium text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ background: m.category?.color || '#94a3b8' }} />
                        {m.category?.name}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`font-semibold ${m.status === 'OUT' ? 'text-red-600' : m.status === 'LOW' ? 'text-amber-600' : 'text-navy-900'}`}>
                        {fmtNumber(m.quantity)}
                      </span>
                      <span className="block text-[11px] text-slate-400">ขั้นต่ำ {fmtNumber(m.minQuantity)}</span>
                    </td>
                    <td className="hidden text-slate-500 sm:table-cell">{m.unit?.name}</td>
                    <td className="hidden text-right md:table-cell">{fmtMoney(m.unitPrice)}</td>
                    <td className="hidden whitespace-nowrap text-slate-500 xl:table-cell">
                      {fmtDate(m.createdAt)}
                      <span className="block text-[11px] text-slate-400">{m.createdBy?.fullName}</span>
                    </td>
                    <td>
                      <MaterialStatusBadge status={m.status} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon hover:text-blue-600" title="ดูรายละเอียด" onClick={() => setViewId(m.id)}>
                          <Eye className="h-4 w-4" />
                        </button>
                        {manage && (
                          <>
                            <button
                              className="btn-icon hover:text-amber-600"
                              title="แก้ไข"
                              onClick={() => {
                                setEditing(m);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button className="btn-icon hover:bg-red-50 hover:text-red-600" title="ลบ" onClick={() => setDeleting(m)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-1">
            <Pagination pagination={pagination} onChange={setPage} />
          </div>
          <div className="flex items-center gap-2 px-4 pb-3 text-sm text-slate-500 sm:pb-0">
            แสดง
            <select className="input w-20 py-1.5" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <MaterialForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        material={editing}
        categories={categories}
        units={units}
        onSaved={load}
        defaultMin={settings['stock.defaultMinQuantity']}
      />
      <MaterialDetail id={viewId} onClose={closeView} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        loading={deleteLoading}
        title="ยืนยันการลบวัสดุ"
        message={`ต้องการลบ "${deleting?.name}" (${deleting?.code}) ใช่หรือไม่? หากวัสดุนี้มีประวัติการเบิก-รับ ระบบจะเก็บประวัติไว้และซ่อนวัสดุออกจากคลัง`}
        confirmText="ลบวัสดุ"
      />
    </div>
  );
}
