import { useState } from "react";
import {
  ArrowDownToLine, ArrowRight, Boxes, ClipboardCheck, Eye, EyeOff,
  KeyRound, LockKeyhole, Mail, PackageCheck, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import Notice from "../components/Notice.jsx";
import { COLLEGE_LOGO, COLLEGE_NAME, SYSTEM_NAME } from "../branding.js";

const SYSTEM_VERSION = "1.0.0";

const workflows = [
  { icon: ArrowDownToLine, title: "รับเข้า", description: "บันทึกวัสดุและตรวจสอบยอดคงเหลือ" },
  { icon: ClipboardCheck, title: "เบิก–อนุมัติ", description: "ส่งคำขอและติดตามสถานะการอนุมัติ" },
  { icon: PackageCheck, title: "จ่าย–รายงาน", description: "จ่ายวัสดุและตรวจสอบรายงานย้อนหลัง" }
];

function WarehouseIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 900 760"
    >
      <defs>
        <linearGradient id="warehouse-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0A2450" stopOpacity=".08" />
          <stop offset=".42" stopColor="#0A2450" stopOpacity=".36" />
          <stop offset="1" stopColor="#061A36" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id="warehouse-box" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#A9D7FF" stopOpacity=".58" />
          <stop offset="1" stopColor="#4599E6" stopOpacity=".24" />
        </linearGradient>
        <pattern id="warehouse-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" fill="#DBEEFF" fillOpacity=".22" r="1.2" />
        </pattern>
      </defs>
      <rect fill="url(#warehouse-dots)" height="760" width="900" />
      <g fill="none" stroke="#C9E6FF" strokeOpacity=".34">
        <path d="M365 52v622M500 52v622M635 52v622M770 52v622" strokeWidth="9" />
        <path d="M335 196h470M335 355h470M335 514h470M335 673h470" strokeWidth="12" />
        <path d="M335 210h470M335 369h470M335 528h470M335 687h470" strokeOpacity=".16" strokeWidth="3" />
      </g>
      <g fill="url(#warehouse-box)" stroke="#D6ECFF" strokeOpacity=".58" strokeWidth="2">
        <rect height="82" rx="4" width="90" x="389" y="106" />
        <rect height="92" rx="4" width="112" x="522" y="96" />
        <rect height="76" rx="4" width="92" x="672" y="120" />
        <rect height="92" rx="4" width="104" x="373" y="259" />
        <rect height="78" rx="4" width="88" x="523" y="277" />
        <rect height="94" rx="4" width="108" x="671" y="257" />
        <rect height="76" rx="4" width="86" x="394" y="420" />
        <rect height="94" rx="4" width="110" x="526" y="402" />
        <rect height="78" rx="4" width="92" x="676" y="419" />
        <rect height="88" rx="4" width="112" x="379" y="573" />
        <rect height="72" rx="4" width="88" x="535" y="590" />
        <rect height="92" rx="4" width="108" x="678" y="570" />
      </g>
      <g fill="none" stroke="#E4F3FF" strokeOpacity=".48" strokeWidth="2">
        <path d="M434 106v82M578 96v92M718 120v76M425 259v92M567 277v76M725 257v92M437 420v76M580 402v92M722 419v76M435 573v88M579 590v72M732 570v92" />
        <path d="M396 129h75M531 124h92M377 285h96M528 298h78M676 285h98M398 444h77M531 428h98M682 445h80M385 599h98M541 615h74M685 596h94" strokeOpacity=".56" />
      </g>
      <path d="M270 708h590" fill="none" stroke="#C9E6FF" strokeOpacity=".32" strokeWidth="3" />
      <rect fill="url(#warehouse-fade)" height="760" width="900" />
    </svg>
  );
}

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

  return (
    <main className="min-h-screen bg-[#F0F5FB] text-[#122743]">
      <div className="min-h-screen lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_.92fr] lg:grid-rows-[minmax(660px,1fr)_52px]">
        <section className="relative isolate flex min-h-[590px] flex-col overflow-hidden bg-[#08234D] px-6 py-7 text-white sm:px-10 sm:py-9 lg:row-start-1 lg:min-h-0 lg:px-12 lg:py-10 xl:px-16">
          <WarehouseIllustration />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#071A38]/95 via-[#0A3470]/85 to-[#087BB5]/45" />
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

          <div className="relative z-10 grid gap-2.5 sm:grid-cols-3">
            {workflows.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="flex items-center gap-3 rounded-xl border border-white/15 bg-[#061A36]/35 px-3.5 py-3 backdrop-blur-sm sm:block sm:min-h-[120px] sm:p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-300/25 to-blue-400/10 text-sky-100 ring-1 ring-white/15 sm:mb-3">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-blue-100/75">{description}</span>
                </span>
                <span className="sr-only">ขั้นตอนที่ {index + 1}</span>
              </div>
            ))}
          </div>
          <div className="relative z-10 mt-6 hidden items-center gap-2 text-xs text-blue-100/70 lg:flex">
            <ShieldCheck size={15} />
            <span>ข้อมูลการเบิกจ่ายตรวจสอบย้อนหลังได้</span>
          </div>
        </section>

        <section className="relative flex min-h-[590px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#F8FBFF_0%,#EDF4FC_100%)] px-5 py-12 sm:px-8 lg:row-start-1 lg:min-h-0 lg:px-10 xl:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />

          <div className="relative w-full max-w-[440px]">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-700">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <LockKeyhole size={14} />
              </span>
              <span>พื้นที่สำหรับผู้ใช้งาน</span>
            </div>
            <div className="overflow-hidden rounded-[26px] border border-blue-100/80 bg-white shadow-[0_28px_80px_-36px_rgba(13,50,94,.32)]">
              <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-[#123B82]" />
              <div className="p-6 sm:p-9">
                <div className="mb-7">
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
