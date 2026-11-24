import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Eye, EyeOff, Loader2, Lock, PackageCheck, ShieldCheck, User, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';

// แสดงกล่องบัญชีทดสอบเฉพาะตอนพัฒนา หรือเมื่อกำหนด VITE_SHOW_DEMO=true
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';

const DEMO = [
  { role: 'ผู้ดูแลระบบ', u: 'admin', p: 'Admin@1234' },
  { role: 'เจ้าหน้าที่คลัง', u: 'warehouse', p: 'Store@1234' },
  { role: 'ผู้อนุมัติ', u: 'approver', p: 'Approve@1234' },
  { role: 'ผู้ใช้งานทั่วไป', u: 'user', p: 'User@1234' },
];

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'เข้าสู่ระบบไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* ฝั่งซ้าย: branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:28px_28px]" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/40">
            <Warehouse className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xl font-bold">WMS</p>
            <p className="text-sm text-blue-200/80">Office Warehouse Management System</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-bold leading-tight">
            ระบบเบิก-จ่าย
            <br />
            <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">วัสดุสำนักงาน</span>
          </h1>
          <p className="mt-4 text-blue-100/80">บริหารคลังวัสดุ ขอเบิก อนุมัติ และติดตามรายงานได้ครบในที่เดียว โปร่งใส ตรวจสอบได้ทุกขั้นตอน</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { icon: PackageCheck, t: 'จัดการคลัง', d: 'ติดตามยอดคงเหลือแบบเรียลไทม์' },
              { icon: ShieldCheck, t: 'อนุมัติปลอดภัย', d: 'ตัดสต็อกอัตโนมัติ ไม่ซ้ำซ้อน' },
              { icon: BarChart3, t: 'รายงานครบ', d: 'Export Excel / PDF ได้ทันที' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                <f.icon className="mb-3 h-6 w-6 text-blue-300" />
                <p className="text-sm font-semibold">{f.t}</p>
                <p className="mt-1 text-xs text-blue-100/60">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200/50">© {new Date().getFullYear() + 543} ระบบเบิก-จ่ายวัสดุสำนักงาน</p>
      </div>

      {/* ฝั่งขวา: ฟอร์ม */}
      <div className="flex w-full items-center justify-center bg-slate-50 p-6 lg:w-1/2">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-navy-700 text-white shadow-lg">
              <Warehouse className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold text-navy-900">ระบบเบิก-จ่ายวัสดุสำนักงาน</p>
              <p className="text-sm text-slate-500">Office WMS</p>
            </div>
          </div>

          <div className="card p-7 sm:p-8">
            <h2 className="text-2xl font-bold text-navy-900">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อใช้งาน</p>

            {(error || sessionMessage) && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || sessionMessage}</div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label">ชื่อผู้ใช้ (Username)</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input py-3 pl-10"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="กรอกชื่อผู้ใช้"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    className="input py-3 pl-10 pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                เข้าสู่ระบบ
              </button>
            </form>
          </div>

          {SHOW_DEMO && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">บัญชีทดสอบ (คลิกเพื่อกรอก)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.u}
                  type="button"
                  onClick={() => setForm({ username: d.u, password: d.p })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-xs font-medium text-slate-700">{d.role}</p>
                  <p className="text-[11px] text-slate-400">
                    {d.u} / {d.p}
                  </p>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
