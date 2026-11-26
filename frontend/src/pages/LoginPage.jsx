import { useState } from "react";
import {
  ArrowDownToLine, ArrowRight, Boxes, CalendarDays, ClipboardCheck,
  Clock3, Eye, EyeOff, KeyRound, LockKeyhole, Mail, PackageCheck, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import Notice from "../components/Notice.jsx";
import { COLLEGE_LOGO, COLLEGE_NAME, SYSTEM_NAME } from "../branding.js";

const SYSTEM_VERSION = "1.0.0";
const WAREHOUSE_BACKGROUND = new URL(`${import.meta.env.BASE_URL}branding/warehouse-login-background.png`, document.baseURI).href;

const workflows = [
  { icon: ArrowDownToLine, title: "รับเข้า", description: "บันทึกการรับวัสดุและเพิ่มยอดคงเหลือ" },
  { icon: ClipboardCheck, title: "เบิก–อนุมัติ", description: "ส่งคำขอเบิกและติดตามผลอนุมัติ" },
  { icon: PackageCheck, title: "จ่าย–รายงาน", description: "ตัดสต็อกและตรวจสอบรายงานย้อนหลัง" }
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const timeLabel = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

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

  return (
    <main className="min-h-screen bg-[#F0F5FB] text-[#122743]">
      <div className="min-h-screen lg:grid lg:min-h-screen lg:grid-cols-[1.4fr_1fr] lg:grid-rows-[minmax(660px,1fr)_52px]">
        <section className="relative isolate flex min-h-[590px] flex-col overflow-hidden bg-[#08234D] px-6 py-7 text-white sm:px-10 sm:py-9 lg:row-start-1 lg:min-h-0 lg:px-12 lg:py-10 xl:px-16">
          <img aria-hidden="true" src={WAREHOUSE_BACKGROUND} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#071A38]/90 via-[#0A3470]/78 to-[#061A36]/58" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#061830]/75 to-transparent" />
          <div aria-hidden="true" className="absolute -left-36 top-28 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <img
              src={COLLEGE_LOGO}
              alt={`ตรา${COLLEGE_NAME}`}
              className="h-[68px] w-[68px] shrink-0 rounded-full bg-white object-contain p-1.5 shadow-xl shadow-black/20 ring-1 ring-white/80 sm:h-[76px] sm:w-[76px]"
            />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-7 text-white sm:text-xl">{COLLEGE_NAME}</p>
              <p className="mt-0.5 text-xs tracking-wide text-blue-100/80">ระบบบริหารจัดการคลังวัสดุสำนักงาน</p>
            </div>
          </div>

          <div className="relative z-10 my-10 max-w-2xl lg:my-auto lg:py-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.08] px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur-sm">
              <Boxes size={15} />
              <span>ระบบคลังวัสดุสำนักงาน</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl xl:text-6xl">ยินดีต้อนรับ</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/90 sm:text-lg">
              เข้าสู่ระบบเบิก–จ่ายวัสดุสำนักงาน พร้อมติดตามการทำงานได้ในที่เดียว
            </p>
          </div>

          <div className="relative z-10 grid gap-3">
            {workflows.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sky-100 shadow-sm shadow-black/10">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 text-xs leading-5 text-blue-100/85">
                  <span className="font-bold text-white">{title}</span>
                  <span className="mx-1.5 text-blue-200/60">·</span>
                  <span>{description}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="relative z-10 mt-6 hidden items-center gap-2 text-xs text-blue-100/70 lg:flex">
            <ShieldCheck size={15} />
            <span>ข้อมูลการเบิกจ่ายตรวจสอบย้อนหลังได้</span>
          </div>
        </section>

        <section className="relative flex min-h-[590px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#F8FBFF_0%,#EDF4FC_100%)] px-5 py-12 sm:px-8 lg:row-start-1 lg:min-h-0 lg:px-10 xl:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
          <div className="absolute right-5 top-5 hidden items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-slate-500 shadow-sm sm:flex xl:right-8">
            <CalendarDays size={13} className="text-blue-600" />
            <span>{dateLabel}</span>
            <span className="text-slate-300">·</span>
            <Clock3 size={12} className="text-blue-600" />
            <span>{timeLabel}</span>
          </div>

          <div className="relative w-full max-w-[540px]">
            <div className="overflow-hidden rounded-[26px] border border-blue-100/80 bg-white shadow-[0_28px_80px_-36px_rgba(13,50,94,.32)]">
              <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-[#123B82]" />
              <div className="p-6 sm:p-9">
                <div className="mb-7">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,.12)]" />
                    <span>ยินดีต้อนรับ</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-[#112C50] sm:text-[34px]">เข้าสู่ระบบ</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    กรอกข้อมูลบัญชีเพื่อเข้าใช้งาน{SYSTEM_NAME}
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                  <Notice message={error} />

                  <div>
                    <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</label>
                    <div className="flex h-[54px] items-center gap-3 rounded-xl border border-slate-200 bg-[#F8FAFD] px-3.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/80">
                      <Mail size={18} aria-hidden="true" className="shrink-0 text-blue-600" />
                      <input
                        id="login-email"
                        required
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={Boolean(error)}
                        className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="กรอกอีเมลของคุณ"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <LockKeyhole size={13} aria-hidden="true" />
                        ปลอดภัย
                      </span>
                    </div>
                    <div className="flex h-[54px] items-center gap-3 rounded-xl border border-slate-200 bg-[#F8FAFD] px-3.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/80">
                      <KeyRound size={18} aria-hidden="true" className="shrink-0 text-blue-600" />
                      <input
                        id="login-password"
                        required
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        aria-invalid={Boolean(error)}
                        className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="กรอกรหัสผ่าน"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="group flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0879C9] via-[#075BBB] to-[#123B82] px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />กำลังเข้าสู่ระบบ...</>
                      : <>เข้าสู่ระบบ<ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>}
                  </button>
                </form>

                <div className="mt-6 flex items-start gap-2.5 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p>การเข้าสู่ระบบได้รับการปกป้องด้วยการยืนยันตัวตน</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">หากไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อผู้ดูแลระบบ</p>
          </div>
        </section>

        <footer className="flex flex-col gap-1.5 bg-[#071B37] px-6 py-4 text-xs text-blue-100/75 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:col-span-2 lg:row-start-2 lg:h-[52px] lg:px-12">
          <p className="font-medium text-white">{COLLEGE_NAME}<span className="mx-2 text-blue-300/50">|</span>{SYSTEM_NAME} (WMS)</p>
          <p>เวอร์ชัน {SYSTEM_VERSION}<span className="mx-2 text-blue-300/50">·</span>© {new Date().getFullYear()} {COLLEGE_NAME}</p>
        </footer>
      </div>
    </main>
  );
}
