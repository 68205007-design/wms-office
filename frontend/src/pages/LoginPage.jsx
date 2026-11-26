import { useState } from "react";
import {
  ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole,
  Mail, PackageCheck, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import Notice from "../components/Notice.jsx";
import { COLLEGE_LOGO, COLLEGE_NAME } from "../branding.js";

const shelfBoxes = [
  "left-5 top-6 h-10 w-12 bg-blue-300/90",
  "left-[4.5rem] top-5 h-11 w-14 bg-sky-200/90",
  "left-[8.5rem] top-7 h-9 w-12 bg-indigo-300/90",
  "left-[12rem] top-5 h-11 w-14 bg-blue-200/90",
  "left-8 top-[5.2rem] h-11 w-14 bg-indigo-200/90",
  "left-[6.5rem] top-[5.4rem] h-9 w-12 bg-blue-200/90",
  "left-[10rem] top-[5.1rem] h-11 w-14 bg-sky-300/90",
  "left-[14rem] top-[5.4rem] h-9 w-12 bg-indigo-300/90"
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-[#FAF6EF] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,.92fr)]">
    <section className="relative hidden min-h-screen flex-col overflow-hidden bg-gradient-to-br from-[#7A231B] via-[#5E1814] to-[#3A0E0C] px-10 py-9 text-white lg:flex xl:px-14 xl:py-11">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-40 h-[540px] w-[540px] rounded-full border border-white/[.08]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-[380px] w-[380px] rounded-full border border-white/[.08]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-36 h-[460px] w-[460px] rounded-full bg-gold-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:radial-gradient(circle_at_1px_1px,#F7ECD0_1px,transparent_0)] [background-size:22px_22px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />

      <div className="relative flex items-center gap-3">
        
        <img src={COLLEGE_LOGO} alt={COLLEGE_NAME} className="h-16 w-16 shrink-0 rounded-full border border-white/60 bg-white object-contain p-0.5 shadow-lg shadow-black/10" />
        <div>
          
          <p className="text-xl font-bold text-white">{COLLEGE_NAME}</p>
        </div>
      </div>

      <div className="relative mt-14 max-w-xl xl:mt-[4.5rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-white/[.07] px-3 py-1.5 text-[11px] font-medium tracking-wide text-gold-100">
          <Sparkles size={14} className="text-sky-300" /> 
        </span>
        <h1 className="mt-6 text-[clamp(2.5rem,4vw,3.8rem)] font-bold leading-[1.2] tracking-tight">
          ยินดีต้อนรับ<br />
          <span className="text-[#E5C07B]"></span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-7 text-gold-50/80">
          
        </p>
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-8 pt-10">
        <div className="grid gap-3 text-[12px] text-gold-100/80">
          {[["รับเข้า", "บันทึกการรับวัสดุจากผู้จำหน่าย"], ["เบิก‑อนุมัติ", "ขอเบิกตามแผนก ผ่านการอนุมัติ"], ["จ่าย‑รายงาน", "ตัดสต็อกอัตโนมัติ ตรวจสอบย้อนหลังได้"]].map(([title, text], index) =>
            <div key={title} className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-gold-300/40 bg-gold-300/10 text-[12px] font-bold text-gold-200">{index + 1}</span>
              <span><b className="font-semibold text-white">{title}</b> · {text}</span>
            </div>)}
        </div>
        <div aria-hidden="true" className="relative hidden shrink-0 xl:block">
          <div className="absolute inset-0 -m-6 rounded-full bg-gold-400/20 blur-2xl" />
          <div className="relative grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 p-[6px] shadow-2xl shadow-black/30">
            <div className="grid h-full w-full place-items-center rounded-full bg-[#FBF6EC] p-3">
              <img src={COLLEGE_LOGO} alt="" className="h-full w-full rounded-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-gold-100/60">
        <span>{COLLEGE_NAME}</span>
        <span className="flex items-center gap-1.5"><Check size={12} /> ปลอดภัย · ตรวจสอบได้</span>
      </div>
    </section>

    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-50 lg:hidden" />
      <div className="relative w-full max-w-[430px]">
        <div className="mb-10 flex min-w-0 items-center gap-2 lg:hidden">
          
          <img src={COLLEGE_LOGO} alt={COLLEGE_NAME} className="h-16 w-16 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200" />
          <div className="min-w-0"><p className="mt-0.5 text-sm font-semibold text-blue-700">{COLLEGE_NAME}</p></div>
        </div>

        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> ยินดีต้อนรับ</span>
          <h2 className="mt-2 text-[32px] font-bold tracking-tight text-[#6B1A17]">เข้าสู่ระบบ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">กรอกข้อมูลบัญชีเพื่อเข้าใช้งานระบบเบิก‑จ่ายวัสดุสำนักงาน</p>
        </div>

        <form onSubmit={submit} className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(107,26,23,.35)] border-t-4 border-t-gold-500 sm:p-7">
          <Notice message={error} />

          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</label>
          <div className="mb-5 flex h-[50px] items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FCFAF6] px-3.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
            <Mail size={18} className="shrink-0 text-slate-400" />
            <input id="login-email" required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="กรอกอีเมลของคุณ" />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"><LockKeyhole size={12} /> ปลอดภัย</span>
          </div>
          <div className="mb-6 flex h-[50px] items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FCFAF6] px-3.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
            <KeyRound size={18} className="shrink-0 text-slate-400" />
            <input id="login-password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="กรอกรหัสผ่าน" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button type="submit" disabled={busy} className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#6B1A17] px-4 text-sm font-semibold text-white shadow-lg shadow-[#6B1A17]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#7D221D] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70">
            {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />กำลังเข้าสู่ระบบ...</> : <>เข้าสู่ระบบ<ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>}
          </button>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">บัญชีเริ่มต้นตั้งค่าผ่านคำสั่ง seed ของผู้ดูแลระบบ</p>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-600" /> การเข้าสู่ระบบได้รับการปกป้องด้วยการยืนยันตัวตน</div>
      </div>
    </section>
  </main>;
}
