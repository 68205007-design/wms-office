import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  Building,
  Building2,
  FolderTree,
  History,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Save,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Trash2,
  UserCircle,
  Users,
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChangePasswordForm } from '../components/layout/ChangePasswordModal';
import { Badge, ConfirmDialog, EmptyState, Field, MaterialStatusBadge, Modal, PageHeader, Pagination, SearchInput, Spinner, Tabs, Toggle } from '../components/ui';
import { ROLE_LABELS, fmtDate, fmtNumber } from '../utils/format';
import { can } from '../utils/permissions';
import useDebounce from '../utils/useDebounce';

const ROLE_TONE = { ADMIN: 'red', WAREHOUSE: 'blue', APPROVER: 'purple', USER: 'slate' };

/* ---------------- ข้อมูลส่วนตัว ---------------- */
function ProfileTab() {
  const { user } = useAuth();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-navy-700 text-2xl font-bold text-white">{user.fullName.charAt(0)}</div>
          <div>
            <p className="text-lg font-bold text-navy-900">{user.fullName}</p>
            <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-slate-100 text-sm">
          {[
            ['ชื่อผู้ใช้', user.username],
            ['ตำแหน่ง', user.position || '-'],
            ['หน่วยงาน', user.department?.name || '-'],
            ['อีเมล', user.email || '-'],
            ['เบอร์โทร', user.phone || '-'],
            ['เข้าสู่ระบบล่าสุด', fmtDate(user.lastLoginAt, true)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="card p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy-900">
          <KeyRound className="h-5 w-5 text-blue-600" /> เปลี่ยนรหัสผ่าน
        </h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

/* ---------------- จัดการผู้ใช้งาน ---------------- */
const emptyUser = { username: '', password: '', fullName: '', email: '', phone: '', position: '', role: 'USER', departmentId: '', isActive: true };

function UsersTab() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [departments, setDepartments] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const q = useDebounce(search);

  const load = useCallback(() => {
    api.get('/users', { params: { page, pageSize: 10, search: q || undefined, role: role || undefined } }).then(({ data }) => {
      setRows(data.data);
      setPagination(data.pagination);
    });
  }, [page, q, role]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data));
  }, []);

  const open = (u) => {
    setEditing(u || 'new');
    setForm(u ? { ...emptyUser, ...u, password: '', email: u.email || '', phone: u.phone || '', position: u.position || '', departmentId: u.departmentId || '' } : emptyUser);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, departmentId: form.departmentId ? Number(form.departmentId) : null };
      if (editing === 'new') await api.post('/users', body);
      else {
        delete body.username;
        if (!body.password) delete body.password;
        await api.put(`/users/${editing.id}`, body);
      }
      toast.success('บันทึกผู้ใช้งานเรียบร้อย');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      const { data } = await api.delete(`/users/${deleting.id}`);
      toast.success(data.message);
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
        <SearchInput className="flex-1" value={search} onChange={setSearch} placeholder="ค้นหาชื่อหรือชื่อผู้ใช้..." />
        <select className="input md:w-48" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ทุกบทบาท</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={() => open(null)}>
          <Plus className="h-4 w-4" /> เพิ่มผู้ใช้งาน
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ผู้ใช้งาน</th>
              <th>บทบาท (Role)</th>
              <th className="hidden md:table-cell">หน่วยงาน</th>
              <th className="hidden lg:table-cell">เข้าระบบล่าสุด</th>
              <th>สถานะ</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">{u.fullName.charAt(0)}</span>
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-slate-400">
                        @{u.username} {u.position && `· ${u.position}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </td>
                <td className="hidden text-slate-500 md:table-cell">{u.department?.name || '-'}</td>
                <td className="hidden text-slate-500 lg:table-cell">{fmtDate(u.lastLoginAt, true)}</td>
                <td>{u.isActive ? <Badge tone="green">ใช้งาน</Badge> : <Badge tone="slate">ปิดใช้งาน</Badge>}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button className="btn-icon hover:text-amber-600" onClick={() => open(u)} title="แก้ไข">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== me.id && (
                      <button className="btn-icon hover:bg-red-50 hover:text-red-600" onClick={() => setDeleting(u)} title="ลบ">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onChange={setPage} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'เพิ่มผู้ใช้งาน' : 'แก้ไขผู้ใช้งาน'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              ยกเลิก
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อผู้ใช้ (Username)" required>
            <input className="input" value={form.username} onChange={set('username')} disabled={editing !== 'new'} />
          </Field>
          <Field label={editing === 'new' ? 'รหัสผ่าน' : 'รหัสผ่านใหม่'} required={editing === 'new'} hint={editing === 'new' ? 'อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข' : 'เว้นว่างหากไม่ต้องการเปลี่ยน'}>
            <input type="password" className="input" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="ชื่อ-สกุล" required>
            <input className="input" value={form.fullName} onChange={set('fullName')} />
          </Field>
          <Field label="ตำแหน่ง">
            <input className="input" value={form.position} onChange={set('position')} />
          </Field>
          <Field label="บทบาท (Role)" required>
            <select className="input" value={form.role} onChange={set('role')}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="หน่วยงาน">
            <select className="input" value={form.departmentId} onChange={set('departmentId')}>
              <option value="">-- ไม่ระบุ --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="อีเมล">
            <input type="email" className="input" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="เบอร์โทร">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          {editing !== 'new' && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.isActive} onChange={set('isActive')} /> เปิดใช้งานบัญชีนี้
            </label>
          )}
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
          <p className="mb-1 font-semibold text-slate-700">สิทธิ์ของแต่ละบทบาท</p>
          <p>• ผู้ดูแลระบบ: ใช้งานได้ทุกส่วน รวมถึงจัดการผู้ใช้และตั้งค่าระบบ</p>
          <p>• เจ้าหน้าที่คลัง: จัดการวัสดุ รับเข้า หมวดหมู่/หน่วยนับ ดูรายงาน</p>
          <p>• ผู้อนุมัติ: อนุมัติ/ไม่อนุมัติคำขอเบิก ดูประวัติและรายงาน</p>
          <p>• ผู้ใช้งานทั่วไป: ดูคลัง ขอเบิก และติดตามคำขอของตนเอง</p>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        title="ลบผู้ใช้งาน"
        message={`ต้องการลบ ${deleting?.fullName} ใช่หรือไม่? หากผู้ใช้นี้มีประวัติการทำรายการ ระบบจะปิดการใช้งานแทนการลบ`}
        confirmText="ลบ"
      />
    </div>
  );
}

/* ---------------- ข้อมูลหลัก (หมวดหมู่ / หน่วยนับ / หน่วยงาน) ---------------- */
function MasterDataTab({ endpoint, label, fields, countKey, countLabel, readOnly }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api.get(endpoint).then(({ data }) => setRows(data)), [endpoint]);
  useEffect(() => {
    load();
  }, [load]);

  const open = (row) => {
    setEditing(row || 'new');
    setForm(Object.fromEntries(fields.map((f) => [f.key, row?.[f.key] ?? f.default ?? ''])));
  };
  const save = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      if (editing === 'new') await api.post(endpoint, body);
      else await api.put(`${endpoint}/${editing.id}`, body);
      toast.success(`บันทึก${label}เรียบร้อย`);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const doDelete = async () => {
    try {
      await api.delete(`${endpoint}/${deleting.id}`);
      toast.success(`ลบ${label}เรียบร้อย`);
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(null);
    }
  };

  if (!rows)
    return (
      <div className="flex justify-center py-14">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">
          ทั้งหมด {rows.length} {label}
        </p>
        {!readOnly && (
          <button className="btn-primary" onClick={() => open(null)}>
            <Plus className="h-4 w-4" /> เพิ่ม{label}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={`ยังไม่มี${label}`} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th className="text-right">{countLabel}</th>
                {!readOnly && <th className="text-right">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {fields.map((f) => (
                    <td key={f.key}>
                      {f.type === 'color' ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 rounded" style={{ background: r[f.key] || '#94a3b8' }} />
                          {r[f.key] || '-'}
                        </span>
                      ) : (
                        r[f.key] || '-'
                      )}
                    </td>
                  ))}
                  <td className="text-right">{fmtNumber(r._count?.[countKey] || 0)}</td>
                  {!readOnly && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon hover:text-amber-600" onClick={() => open(r)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="btn-icon hover:bg-red-50 hover:text-red-600" onClick={() => setDeleting(r)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `เพิ่ม${label}` : `แก้ไข${label}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              ยกเลิก
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.type === 'color' ? (
                <div className="flex gap-2">
                  <input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200" value={form[f.key] || '#2563eb'} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  <input className="input" value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder="#2563eb" />
                </div>
              ) : (
                <input className="input" value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={doDelete} title={`ลบ${label}`} message={`ต้องการลบ "${deleting?.name}" ใช่หรือไม่?`} confirmText="ลบ" />
    </div>
  );
}

/* ---------------- ตั้งค่าจำนวนขั้นต่ำ ---------------- */
function MinQuantityTab() {
  const toast = useToast();
  const { settings, reloadSettings, user } = useAuth();
  const [rows, setRows] = useState(null);
  const [changes, setChanges] = useState({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [defaultMin, setDefaultMin] = useState(settings['stock.defaultMinQuantity'] ?? 10);

  const load = () => api.get('/materials', { params: { all: 1 } }).then(({ data }) => setRows(data));
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (rows || []).filter((m) => !search || m.name.includes(search) || m.code.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const save = async () => {
    const items = Object.entries(changes).map(([id, v]) => ({ id: Number(id), minQuantity: Number(v) }));
    if (items.some((i) => !Number.isInteger(i.minQuantity) || i.minQuantity < 0)) return toast.error('จำนวนขั้นต่ำต้องเป็นจำนวนเต็มไม่ติดลบ');
    setSaving(true);
    try {
      const { data } = await api.patch('/materials/min-quantity', { items });
      toast.success(data.message);
      setChanges({});
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const applyDefault = async () => {
    try {
      if (user.role === 'ADMIN') await api.put('/settings', { 'stock.defaultMinQuantity': Number(defaultMin) });
      const { data } = await api.post('/settings/apply-default-min', { onlyZero: true });
      toast.success(data.message);
      reloadSettings();
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (!rows)
    return (
      <div className="flex justify-center py-14">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <Field label="ค่าขั้นต่ำเริ่มต้นสำหรับวัสดุใหม่" className="md:w-64" hint={user.role !== 'ADMIN' ? 'เฉพาะผู้ดูแลระบบที่เปลี่ยนค่านี้ได้' : ''}>
          <input type="number" min="0" className="input" value={defaultMin} onChange={(e) => setDefaultMin(e.target.value)} disabled={user.role !== 'ADMIN'} />
        </Field>
        <button className="btn-secondary" onClick={applyDefault}>
          ใช้ค่าเริ่มต้นกับวัสดุที่ขั้นต่ำเป็น 0
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <SearchInput className="flex-1" value={search} onChange={setSearch} placeholder="ค้นหาวัสดุ..." />
          <button className="btn-primary" disabled={!Object.keys(changes).length || saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึก ({Object.keys(changes).length})
          </button>
        </div>
        <div className="table-wrap max-h-[560px] overflow-y-auto scroll-thin">
          <table className="table">
            <thead className="sticky top-0">
              <tr>
                <th>วัสดุ</th>
                <th className="text-right">คงเหลือ</th>
                <th className="w-40">จำนวนขั้นต่ำ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className={changes[m.id] !== undefined ? 'bg-amber-50/50' : ''}>
                  <td>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.code}</p>
                  </td>
                  <td className="text-right">
                    {fmtNumber(m.quantity)} <span className="text-slate-400">{m.unit?.name}</span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="input py-1.5"
                      value={changes[m.id] ?? m.minQuantity}
                      onChange={(e) => setChanges({ ...changes, [m.id]: e.target.value })}
                    />
                  </td>
                  <td>
                    <MaterialStatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- การแจ้งเตือน + ข้อมูลหน่วยงาน ---------------- */
function SystemSettingsTab({ section }) {
  const { settings, reloadSettings } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const save = async (keys) => {
    setSaving(true);
    try {
      await api.put('/settings', Object.fromEntries(keys.map((k) => [k, form[k]])));
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
      reloadSettings();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (section === 'notify') {
    const keys = ['notify.lowStock', 'notify.outOfStock', 'notify.newRequest', 'notify.requestResult'];
    const labels = {
      'notify.lowStock': ['แจ้งเตือนวัสดุใกล้หมด', 'แจ้งผู้ดูแลและเจ้าหน้าที่คลังเมื่อยอดคงเหลือต่ำกว่าขั้นต่ำ'],
      'notify.outOfStock': ['แจ้งเตือนวัสดุหมด', 'แจ้งเมื่อยอดคงเหลือเป็น 0'],
      'notify.newRequest': ['แจ้งเตือนคำขอเบิกใหม่ / รออนุมัติ', 'แจ้งผู้อนุมัติและเจ้าหน้าที่คลังเมื่อมีคำขอใหม่'],
      'notify.requestResult': ['แจ้งผลการอนุมัติ', 'แจ้งผู้ขอเบิกเมื่อคำขอได้รับอนุมัติหรือถูกปฏิเสธ'],
    };
    return (
      <div className="card max-w-3xl space-y-3 p-6">
        {keys.map((k) => (
          <Toggle key={k} checked={!!form[k]} onChange={(v) => setForm({ ...form, [k]: v })} label={labels[k][0]} description={labels[k][1]} />
        ))}
        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={() => save(keys)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
          </button>
        </div>
      </div>
    );
  }

  const keys = ['org.name', 'org.shortName', 'org.address', 'org.phone', 'org.email'];
  const labels = { 'org.name': 'ชื่อหน่วยงาน', 'org.shortName': 'ชื่อย่อระบบ', 'org.address': 'ที่อยู่', 'org.phone': 'โทรศัพท์', 'org.email': 'อีเมล' };
  return (
    <div className="card max-w-3xl p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {keys.map((k) => (
          <Field key={k} label={labels[k]} className={k === 'org.address' || k === 'org.name' ? 'sm:col-span-2' : ''} required={k === 'org.name'}>
            {k === 'org.address' ? (
              <textarea rows={2} className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ) : (
              <input className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            )}
          </Field>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">ชื่อหน่วยงานจะแสดงบนแถบด้านบนและหัวรายงานที่พิมพ์</p>
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={() => save(keys)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
        </button>
      </div>
    </div>
  );
}

/* ---------------- Audit Log ---------------- */
function AuditTab() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  useEffect(() => {
    api.get('/settings/audit-logs', { params: { page, search: q || undefined } }).then(({ data }) => {
      setRows(data.data);
      setPagination(data.pagination);
    });
  }, [page, q]);
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาการกระทำหรือผู้ใช้..." />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>การกระทำ</th>
              <th>ข้อมูล</th>
              <th className="hidden lg:table-cell">รายละเอียด</th>
              <th className="hidden md:table-cell">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-slate-500">{fmtDate(r.createdAt, true)}</td>
                <td>{r.user?.fullName || '-'}</td>
                <td>
                  <Badge tone={r.action.includes('DELETE') || r.action.includes('FAIL') || r.action === 'REJECT' ? 'red' : r.action === 'APPROVE' ? 'green' : 'blue'} dot={false}>
                    {r.action}
                  </Badge>
                </td>
                <td className="text-slate-600">
                  {r.entity}
                  {r.entityId && <span className="text-slate-400"> #{r.entityId}</span>}
                </td>
                <td className="hidden max-w-md truncate font-mono text-xs text-slate-400 lg:table-cell">{r.detail ? JSON.stringify(r.detail) : ''}</td>
                <td className="hidden text-xs text-slate-400 md:table-cell">{r.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onChange={setPage} />
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const manageMaster = can(user, 'manageMasterData');
  const admin = can(user, 'manageSystem');

  const tabs = [
    { key: 'profile', label: 'ข้อมูลส่วนตัว', icon: UserCircle, show: true },
    { key: 'users', label: 'จัดการผู้ใช้งาน', icon: Users, show: can(user, 'manageUsers') },
    { key: 'categories', label: 'หมวดหมู่วัสดุ', icon: FolderTree, show: manageMaster },
    { key: 'units', label: 'หน่วยนับ', icon: Ruler, show: manageMaster },
    { key: 'min', label: 'จำนวนขั้นต่ำ', icon: SlidersHorizontal, show: manageMaster },
    { key: 'departments', label: 'หน่วยงาน', icon: Building2, show: manageMaster },
    { key: 'notify', label: 'การแจ้งเตือน', icon: Bell, show: admin },
    { key: 'org', label: 'ข้อมูลหน่วยงาน', icon: Building, show: admin },
    { key: 'audit', label: 'Audit Log', icon: History, show: admin },
  ].filter((t) => t.show);

  const tab = tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : tabs[0].key;
  const setTab = (k) => setParams({ tab: k }, { replace: true });

  return (
    <div>
      <PageHeader icon={SettingsIcon} title="ตั้งค่าระบบ" description="จัดการผู้ใช้งาน ข้อมูลหลัก และการตั้งค่าต่าง ๆ ของระบบ" />
      <div className="mb-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
      <div className="animate-fade-in" key={tab}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'categories' && (
          <MasterDataTab
            endpoint="/categories"
            label="หมวดหมู่"
            countKey="materials"
            countLabel="จำนวนวัสดุ"
            fields={[
              { key: 'name', label: 'ชื่อหมวดหมู่', required: true },
              { key: 'description', label: 'คำอธิบาย' },
              { key: 'color', label: 'สี', type: 'color', default: '#2563eb' },
            ]}
          />
        )}
        {tab === 'units' && <MasterDataTab endpoint="/units" label="หน่วยนับ" countKey="materials" countLabel="จำนวนวัสดุ" fields={[{ key: 'name', label: 'ชื่อหน่วยนับ', required: true }]} />}
        {tab === 'min' && <MinQuantityTab />}
        {tab === 'departments' && (
          <MasterDataTab
            endpoint="/departments"
            label="หน่วยงาน"
            countKey="requisitions"
            countLabel="จำนวนคำขอเบิก"
            readOnly={!admin}
            fields={[
              { key: 'code', label: 'รหัส', required: true },
              { key: 'name', label: 'ชื่อหน่วยงาน', required: true },
              { key: 'description', label: 'รายละเอียด' },
            ]}
          />
        )}
        {tab === 'notify' && <SystemSettingsTab section="notify" />}
        {tab === 'org' && <SystemSettingsTab section="org" />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
