import { Link } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, Bell, BookOpen, ClipboardCheck,
  ClipboardPlus, Package, ChartNoAxesCombined, Settings
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";

const warehouseRoles = ["SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF"];
const steps = [
  {
    icon: Package,
    title: "1. เตรียมข้อมูลสินค้า",
    description: "ผู้ดูแลจัดเตรียมหมวดหมู่และหน่วยนับ จากนั้นผู้มีสิทธิ์เพิ่มสินค้าโดยระบุรหัส SKU ชื่อสินค้า ราคาทุน และจำนวนขั้นต่ำให้ครบ",
    link: "/products",
    linkText: "ไปหน้าสินค้า",
    roles: warehouseRoles
  },
  {
    icon: ArrowDownToLine,
    title: "2. บันทึกรับสินค้าเข้าคลัง",
    description: "เลือกสินค้า ใส่จำนวนและวันที่รับ แล้วบันทึก ระบบจะเพิ่มยอดคงเหลือให้อัตโนมัติ",
    link: "/stock-in",
    linkText: "ไปหน้ารับเข้าวัสดุ",
    roles: warehouseRoles
  },
  {
    icon: ClipboardPlus,
    title: "3. ส่งคำขอเบิกวัสดุ",
    description: "เลือกวัสดุและจำนวน ระบุเหตุผล แล้วส่งคำขอ จากนั้นติดตามสถานะได้ที่หน้าประวัติคำขอ",
    link: "/requisitions",
    linkText: "ไปหน้าเบิกวัสดุ"
  },
  {
    icon: ClipboardCheck,
    title: "4. พิจารณาคำขอ",
    description: "ผู้ดูแลตรวจสอบคำขอและเลือกอนุมัติหรือไม่อนุมัติ เมื่ออนุมัติแล้ว เจ้าหน้าที่คลังจึงดำเนินการจ่ายวัสดุ",
    link: "/approvals",
    linkText: "ไปหน้าอนุมัติคำขอ",
    roles: ["SUPER_ADMIN", "ADMIN"]
  },
  {
    icon: ArrowUpFromLine,
    title: "5. จ่ายวัสดุและตัดยอด",
    description: "เจ้าหน้าที่คลังเลือกคำขอที่อนุมัติแล้วและยืนยันการจ่าย ระบบจะตัดยอดคงเหลือและบันทึกประวัติให้อัตโนมัติ",
    link: "/stock-issue",
    linkText: "ไปหน้าจ่ายวัสดุ",
    roles: warehouseRoles
  },
  {
    icon: ChartNoAxesCombined,
    title: "6. ตรวจสอบรายงานและแจ้งเตือน",
    description: "ตรวจสอบยอดคงเหลือ รายการใกล้หมด และประวัติรับเข้า/เบิกออกได้จากหน้ารายงานและการแจ้งเตือน",
    link: "/reports",
    linkText: "ไปหน้ารายงาน"
  }
];

export default function UserGuidePage() {
  const { user } = useAuth();
  return <>
    <PageHeader title="คู่มือการใช้งาน" description="ขั้นตอนใช้งานระบบเบิก-จ่ายวัสดุสำนักงาน" />
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#F8EEDF] text-[#6B1A17] shadow-sm ring-1 ring-[#C8963E]"><BookOpen size={30} strokeWidth={2.2} /></span>
          <div>
            <h2 className="font-bold text-slate-900">เริ่มต้นใช้งาน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">เข้าสู่ระบบด้วยบัญชีที่ผู้ดูแลจัดเตรียมให้ แล้วเลือกเมนูจากแถบด้านซ้าย หน้าตาและโทนสีเหมือนกันทุกบัญชี ส่วนเมนูที่เห็นจะแตกต่างตามสิทธิ์การใช้งาน</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {steps.filter(({ roles }) => !roles || roles.includes(user.role)).map(({ icon: Icon, title, description, link, linkText }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={22} strokeWidth={2} /></span>
              <div>
                <h2 className="font-bold text-slate-800">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                <Link to={link} className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">{linkText} →</Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-900">ข้อควรทราบ</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-amber-900">
          <li>ยอดคงเหลือเปลี่ยนจากการบันทึกรับเข้าหรือจ่ายวัสดุเท่านั้น ไม่สามารถแก้ไขจำนวนคงเหลือจากหน้าสินค้าได้</li>
          <li>หากไม่พบเมนูหรือทำรายการไม่ได้ ให้ติดต่อผู้ดูแลระบบเพื่อตรวจสอบสิทธิ์การใช้งาน</li>
          <li>ออกจากระบบทุกครั้งเมื่อใช้งานบนอุปกรณ์ที่ใช้ร่วมกับผู้อื่น</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/notifications" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"><Bell size={16} />การแจ้งเตือน</Link>
        <Link to="/settings" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"><Settings size={16} />ตั้งค่าบัญชี</Link>
      </div>
    </div>
  </>;
}
