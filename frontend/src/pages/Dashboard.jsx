import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState, MaterialStatusBadge, PageHeader, PageLoader, RequisitionStatusBadge, StatCard } from '../components/ui';
import { fmtCompactMoney, fmtDate, fmtNumber } from '../utils/format';
import { can } from '../utils/permissions';

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(16,35,90,.12)', fontFamily: 'inherit' },
  labelStyle: { fontWeight: 600, color: '#0b1a45' },
};
const axis = { tick: { fontSize: 12, fill: '#64748b' }, axisLine: false, tickLine: false };

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-navy-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api
      .get('/dashboard')
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(errorMessage(e)));
  };
  useEffect(load, []);

  if (error)
    return (
      <div className="card">
        <EmptyState title="โหลดข้อมูลไม่สำเร็จ" description={error} action={<button className="btn-primary" onClick={load}>ลองใหม่</button>} />
      </div>
    );
  if (!data) return <PageLoader />;

  const { stats, monthly, categories, lowStock, recentRequisitions } = data;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="แดชบอร์ด"
        description={`${greet}, ${user.fullName} — ภาพรวมระบบคลังวัสดุ`}
        actions={
          <>
            <button className="btn-secondary" onClick={load}>
              <RefreshCw className="h-4 w-4" /> รีเฟรช
            </button>
            <Link to="/requisition/new" className="btn-primary">
              <ShoppingCart className="h-4 w-4" /> ขอเบิกวัสดุ
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="วัสดุทั้งหมด" value={stats.materialCount} suffix="รายการ" icon={Package} tone="blue" onClick={() => navigate('/materials')} delay={0} />
        <StatCard
          title="จำนวนคงเหลือทั้งหมด"
          value={stats.totalQuantity}
          suffix="หน่วย"
          icon={Boxes}
          tone="navy"
          hint={`มูลค่า ${fmtCompactMoney(stats.totalValue)} บาท`}
          delay={60}
        />
        <StatCard
          title="วัสดุใกล้หมด"
          value={stats.lowStockCount}
          suffix="รายการ"
          icon={AlertTriangle}
          tone="orange"
          hint={stats.outOfStockCount ? `หมดแล้ว ${stats.outOfStockCount} รายการ` : 'ไม่มีรายการที่หมด'}
          onClick={() => navigate('/materials?status=LOW')}
          delay={120}
        />
        <StatCard
          title="รายการรออนุมัติ"
          value={stats.pendingCount}
          suffix="คำขอ"
          icon={ClipboardCheck}
          tone="purple"
          onClick={() => navigate(can(user, 'approvals') ? '/approvals' : '/my-requests')}
          delay={180}
        />
        <StatCard title="รายการเบิกเดือนนี้" value={stats.monthlyRequisitions} suffix="คำขอ" icon={Truck} tone="green" delay={240} />
        <StatCard title="รายการรับเข้าเดือนนี้" value={stats.monthlyReceipts} suffix="รายการ" icon={PackagePlus} tone="cyan" delay={300} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="การเบิกวัสดุรายเดือน" subtitle="จำนวนหน่วยที่จ่ายออก 12 เดือนล่าสุด">
          <ResponsiveContainer>
            <AreaChart data={monthly} margin={{ left: -10, right: 8 }}>
              <defs>
                <linearGradient id="gIssue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} formatter={(v) => [fmtNumber(v), 'จำนวนเบิก']} />
              <Area type="monotone" dataKey="issued" stroke="#2563eb" strokeWidth={2.5} fill="url(#gIssue)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="การรับวัสดุรายเดือน" subtitle="จำนวนหน่วยที่รับเข้าคลัง 12 เดือนล่าสุด">
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v) => [fmtNumber(v), 'จำนวนรับเข้า']} />
              <Bar dataKey="received" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="เปรียบเทียบการเบิกและการรับ" subtitle="มูลค่า (บาท) รายเดือน">
          <ResponsiveContainer>
            <LineChart data={monthly} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} tickFormatter={fmtCompactMoney} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [`${fmtNumber(Math.round(v))} บาท`, n]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" name="มูลค่าเบิก" dataKey="issuedValue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              <Line type="monotone" name="มูลค่ารับเข้า" dataKey="receivedValue" stroke="#16a34a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ประเภทวัสดุ" subtitle="สัดส่วนจำนวนรายการวัสดุตามหมวดหมู่">
          <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
            <div className="h-56 w-full sm:h-full sm:w-1/2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categories} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="none">
                    {categories.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} รายการ`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 sm:w-1/2">
              {categories.map((c) => (
                <div key={c.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 truncate text-sm text-slate-700">{c.name}</span>
                  <span className="text-sm font-semibold text-navy-900">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-navy-900">วัสดุใกล้หมด</h3>
            </div>
            <Link to="/materials?status=LOW" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              ดูทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="ไม่มีวัสดุใกล้หมด" description="ทุกรายการมียอดคงเหลือเพียงพอ" icon={Package} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อวัสดุ</th>
                    <th className="text-right">คงเหลือ</th>
                    <th>หน่วย</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <p className="font-medium text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400">
                          {m.code} · ขั้นต่ำ {m.minQuantity}
                        </p>
                      </td>
                      <td className={`text-right font-semibold ${m.quantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{fmtNumber(m.quantity)}</td>
                      <td className="text-slate-500">{m.unit?.name}</td>
                      <td>
                        <MaterialStatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Truck className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-navy-900">รายการเบิกล่าสุด</h3>
            </div>
            <Link to={can(user, 'approvals') ? '/approvals' : '/my-requests'} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              ดูทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentRequisitions.length === 0 ? (
            <EmptyState title="ยังไม่มีรายการเบิก" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>เลขที่คำขอ</th>
                    <th>ผู้ขอเบิก</th>
                    <th className="hidden md:table-cell">หน่วยงาน</th>
                    <th className="text-center">รายการ</th>
                    <th>วันที่</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequisitions.map((r) => (
                    <tr key={r.id} className="cursor-pointer" onClick={() => navigate(`${can(user, 'approvals') ? '/approvals' : '/my-requests'}?id=${r.id}`)}>
                      <td className="font-medium text-blue-700">{r.requisitionNo}</td>
                      <td>{r.requesterName}</td>
                      <td className="hidden text-slate-500 md:table-cell">{r.department?.name}</td>
                      <td className="text-center">{r._count.items}</td>
                      <td className="whitespace-nowrap text-slate-500">{fmtDate(r.requestDate)}</td>
                      <td>
                        <RequisitionStatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
