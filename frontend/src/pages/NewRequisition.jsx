import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Minus, Package, Plus, Send, ShoppingCart, Trash2 } from 'lucide-react';
import api, { errorMessage, imageSrc } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MaterialPicker from '../components/MaterialPicker';
import { refreshBadges } from '../components/layout/Layout';
import { ConfirmDialog, EmptyState, Field, MaterialStatusBadge, PageHeader } from '../components/ui';
import { fmtMoney, fmtNumber, todayISO } from '../utils/format';

export default function NewRequisition() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [header, setHeader] = useState({
    departmentId: user.departmentId || '',
    requesterName: user.fullName,
    requestDate: todayISO(),
    purpose: '',
  });
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/materials', { params: { all: 1 } }).then(({ data }) => setMaterials(data));
    api.get('/departments').then(({ data }) => setDepartments(data));
  }, []);

  const stockOf = (id) => materials.find((m) => m.id === id)?.quantity ?? 0;

  const addItem = () => {
    if (!picked) return toast.error('กรุณาเลือกวัสดุ');
    const q = Number(qty);
    if (!Number.isInteger(q) || q <= 0) return toast.error('จำนวนต้องเป็นจำนวนเต็มมากกว่า 0');
    const existing = cart.find((c) => c.material.id === picked.id);
    const newQty = (existing?.quantity || 0) + q;
    if (newQty > picked.quantity) return toast.error(`${picked.name} คงเหลือเพียง ${fmtNumber(picked.quantity)} ${picked.unit?.name}`);
    if (existing) setCart(cart.map((c) => (c.material.id === picked.id ? { ...c, quantity: newQty } : c)));
    else setCart([...cart, { material: picked, quantity: q }]);
    setPicked(null);
    setQty(1);
  };

  const changeQty = (id, q) => setCart((c) => c.map((x) => (x.material.id === id ? { ...x, quantity: Math.max(1, q) } : x)));

  const overItems = cart.filter((c) => c.quantity > stockOf(c.material.id));
  const totalValue = cart.reduce((s, c) => s + c.quantity * c.material.unitPrice, 0);

  const validate = () => {
    const errs = {};
    if (!header.departmentId) errs.departmentId = 'กรุณาเลือกหน่วยงาน';
    if (!header.requesterName.trim()) errs.requesterName = 'กรุณาระบุผู้ขอเบิก';
    if (header.purpose.trim().length < 3) errs.purpose = 'กรุณาระบุเหตุผลในการเบิก';
    if (!header.requestDate) errs.requestDate = 'กรุณาระบุวันที่';
    if (!cart.length) errs.cart = 'กรุณาเพิ่มวัสดุอย่างน้อย 1 รายการ';
    if (overItems.length) errs.cart = 'มีรายการที่ขอเบิกเกินยอดคงเหลือ';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/requisitions', {
        ...header,
        departmentId: Number(header.departmentId),
        items: cart.map((c) => ({ materialId: c.material.id, quantity: c.quantity })),
      });
      toast.success(`ส่งคำขอเบิก ${data.requisitionNo} เรียบร้อย — สถานะ: รออนุมัติ`);
      refreshBadges();
      navigate(`/my-requests?id=${data.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirm(false);
      api.get('/materials', { params: { all: 1 } }).then(({ data }) => setMaterials(data));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader icon={ShoppingCart} title="ขอเบิกวัสดุ" description="เลือกวัสดุที่ต้องการ ระบุจำนวน แล้วส่งคำขอเพื่อรอการอนุมัติ" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-navy-900">ข้อมูลผู้ขอเบิก</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ผู้ขอเบิก" required error={errors.requesterName}>
                <input className="input" value={header.requesterName} onChange={(e) => setHeader({ ...header, requesterName: e.target.value })} />
              </Field>
              <Field label="หน่วยงาน" required error={errors.departmentId}>
                <select className="input" value={header.departmentId} onChange={(e) => setHeader({ ...header, departmentId: e.target.value })}>
                  <option value="">-- เลือกหน่วยงาน --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="วันที่ขอเบิก" required error={errors.requestDate}>
                <input type="date" className="input" value={header.requestDate} onChange={(e) => setHeader({ ...header, requestDate: e.target.value })} />
              </Field>
              <Field label="เหตุผลในการเบิก" required error={errors.purpose} className="sm:col-span-2">
                <textarea rows={2} className="input" value={header.purpose} onChange={(e) => setHeader({ ...header, purpose: e.target.value })} placeholder="เช่น ใช้ในการปฏิบัติงานประจำเดือน" />
              </Field>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-navy-900">เลือกวัสดุ</h3>
            <div className="grid grid-cols-12 items-end gap-3">
              <div className="col-span-12 md:col-span-7">
                <MaterialPicker materials={materials} value={picked?.id} onChange={setPicked} disableOut />
              </div>
              <div className="col-span-7 md:col-span-3">
                <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                  <button type="button" className="btn-icon" onClick={() => setQty((q) => Math.max(1, Number(q) - 1))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <input type="number" min="1" className="w-full border-0 bg-transparent py-2 text-center text-sm outline-none" value={qty} onChange={(e) => setQty(e.target.value)} />
                  <button type="button" className="btn-icon" onClick={() => setQty((q) => Number(q) + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button type="button" className="btn-primary col-span-5 md:col-span-2" onClick={addItem}>
                <Plus className="h-4 w-4" /> เพิ่ม
              </button>
            </div>
            {picked && (
              <p className="mt-2 text-sm text-slate-500">
                คงเหลือ <b className="text-navy-900">{fmtNumber(picked.quantity)}</b> {picked.unit?.name}
              </p>
            )}
          </div>
        </div>

        <div className="card flex flex-col xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-navy-900">รายการที่เลือก</h3>
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">{cart.length} รายการ</span>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto p-3">
            {errors.cart && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {errors.cart}
              </div>
            )}
            {cart.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="ยังไม่มีรายการ" description="เลือกวัสดุและกด “เพิ่ม”" />
            ) : (
              <div className="space-y-2">
                {cart.map((c) => {
                  const stock = stockOf(c.material.id);
                  const over = c.quantity > stock;
                  return (
                    <div key={c.material.id} className={`rounded-xl border p-3 transition animate-fade-in ${over ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-blue-200'}`}>
                      <div className="flex gap-3">
                        {c.material.imageUrl ? (
                          <img src={imageSrc(c.material.imageUrl)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Package className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{c.material.name}</p>
                          <p className="text-xs text-slate-400">
                            {c.material.code} · คงเหลือ {fmtNumber(stock)}
                          </p>
                          <MaterialStatusBadge status={c.material.status} />
                        </div>
                        <button className="btn-icon h-8 w-8 hover:bg-red-50 hover:text-red-600" onClick={() => setCart(cart.filter((x) => x.material.id !== c.material.id))} title="ลบออก">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                          <button className="px-2 py-1 text-slate-500 hover:text-slate-800" onClick={() => changeQty(c.material.id, c.quantity - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            className="w-14 border-0 bg-transparent text-center text-sm outline-none"
                            value={c.quantity}
                            onChange={(e) => changeQty(c.material.id, Number(e.target.value) || 1)}
                          />
                          <button className="px-2 py-1 text-slate-500 hover:text-slate-800" onClick={() => changeQty(c.material.id, c.quantity + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">{c.material.unit?.name}</span>
                      </div>
                      {over && <p className="mt-1 text-xs font-medium text-red-600">เกินยอดคงเหลือ ({fmtNumber(stock)})</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:rounded-b-2xl">
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-slate-500">มูลค่าประมาณการ</span>
              <span className="font-semibold text-navy-900">{fmtMoney(totalValue)} บาท</span>
            </div>
            <button className="btn-primary w-full py-3" disabled={!cart.length} onClick={() => validate() && setConfirm(true)}>
              <Send className="h-4 w-4" /> ส่งคำขอเบิก
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={submit}
        loading={saving}
        danger={false}
        title="ยืนยันการส่งคำขอเบิก"
        message={`ส่งคำขอเบิกวัสดุ ${cart.length} รายการ (รวม ${fmtNumber(cart.reduce((s, c) => s + c.quantity, 0))} หน่วย) เพื่อรอการอนุมัติ?`}
        confirmText={saving ? 'กำลังส่ง...' : 'ส่งคำขอ'}
      />
    </div>
  );
}
