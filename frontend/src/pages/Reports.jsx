import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  Calendar,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  PackagePlus,
  Printer,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, EmptyState, PageHeader, SearchInput, Spinner } from '../components/ui';
import { fmtCompactMoney, fmtDate, fmtMoney, fmtNumber, todayISO } from '../utils/format';
import { exportExcel, printReport } from '../utils/export';
import useDebounce from '../utils/useDebounce';

const REPORTS = [
  { key: 'daily', label: 'การเบิกรายวัน', icon: CalendarDays, range: true, days: 30 },
  { key: 'monthly', label: 'การเบิกรายเดือน', icon: CalendarRange, range: true, days: 365 },
  { key: 'yearly', label: 'การเบิกรายปี', icon: Calendar, range: true, days: 365 * 5 },
  { key: 'stock', label: 'วัสดุคงเหลือ', icon: PackageCheck, range: false },
  { key: 'low-stock', label: 'วัสดุใกล้หมด', icon: AlertTriangle, range: false },
  { key: 'receipts', label: 'การรับเข้าวัสดุ', icon: PackagePlus, range: true, days: 30 },
  { key: 'popular', label: 'วัสดุยอดนิยม', icon: TrendingUp, range: true, days: 365 },
  { key: 'department', label: 'การเบิกแยกหน่วยงาน', icon: Building2, range: true, days: 365 },
];

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#0b1a45', '#f97316'];
const STATUS_TONE = { ปกติ: 'green', ใกล้หมด: 'orange', หมด: 'red' };
const tooltip = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontFamily: 'inherit' } };
const axis = { tick: { fontSize: 12, fill: '#64748b' }, axisLine: false, tickLine: false };

function fmtCell(col, v) {
  if (col.type === 'currency') return fmtMoney(v);
  if (col.type === 'number') return fmtNumber(v);
  if (col.type === 'status') return <Badge tone={STATUS_TONE[v] || 'slate'}>{v}</Badge>;
  return v ?? '-';
}

function ReportChart({ chart, rows }) {
  const data = chart.data || rows;
  if (!data?.length) return <EmptyState title="ไม่มีข้อมูลสำหรับแสดงกราฟ" />;
  const fmt = (v) => (chart.series[0].key === 'value' ? fmtCompactMoney(v) : fmtNumber(v));
  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%" innerRadius="45%" paddingAngle={2} stroke="none" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltip} formatter={(v) => fmtNumber(Math.round(v))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chart.type === 'barH') {
    return (
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey={chart.xKey} width={170} {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: '#f1f5f9' }} formatter={(v) => fmtNumber(v)} />
          <Bar dataKey={chart.series[0].key} name={chart.series[0].label} fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey={chart.xKey} {...axis} />
        <YAxis {...axis} tickFormatter={fmt} />
        <Tooltip {...tooltip} cursor={{ fill: '#f1f5f9' }} formatter={(v) => fmtNumber(Math.round(v))} />
        {chart.series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {chart.series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i]} radius={[6, 6, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Reports() {
  const { settings } = useAuth();
  const toast = useToast();
  const [type, setType] = useState('monthly');
  const meta = REPORTS.find((r) => r.key === type);
  const [from, setFrom] = useState(todayISO(-365));
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const q = useDebounce(search, 400);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
  }, []);

  const selectType = (r) => {
    setType(r.key);
    if (r.range) {
      setFrom(todayISO(-r.days));
      setTo(todayISO());
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: q || undefined, categoryId: categoryId || undefined };
      if (meta.range) Object.assign(params, { from, to });
      const { data } = await api.get(`/reports/${type}`, { params });
      setReport(data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, from, to, q, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const subtitle = meta.range && report?.from ? `ช่วงวันที่ ${fmtDate(report.from)} – ${fmtDate(report.to)}` : `ข้อมูล ณ วันที่ ${fmtDate(new Date())}`;
  const exportArgs = () => ({
    title: report.title,
    subtitle,
    orgName: settings['org.name'],
    columns: report.columns.map((c) => ({ ...c, type: c.type === 'status' ? undefined : c.type })),
    rows: report.rows,
    summary: report.summary,
  });

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="รายงาน"
        description="รายงานสรุปการเบิก-จ่าย การรับเข้า และสถานะคลังวัสดุ"
        actions={
          report && (
            <>
              <button className="btn-secondary" onClick={() => exportExcel({ ...exportArgs(), filename: `${report.title}_${todayISO()}` })}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
              </button>
              <button className="btn-secondary" onClick={() => printReport(exportArgs())}>
                <FileText className="h-4 w-4 text-red-600" /> PDF
              </button>
              <button className="btn-primary" onClick={() => printReport(exportArgs())}>
                <Printer className="h-4 w-4" /> พิมพ์รายงาน
              </button>
            </>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const on = r.key === type;
          return (
            <button
              key={r.key}
              onClick={() => selectType(r)}
              className={`group flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${
                on ? 'border-transparent bg-gradient-to-br from-blue-600 to-navy-700 text-white shadow-lg shadow-blue-600/30' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-soft'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-white/15' : 'bg-blue-50 text-blue-600'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium leading-tight">{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card mb-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-12">
        <SearchInput className="md:col-span-4" value={search} onChange={setSearch} placeholder="ค้นหาวัสดุ (รหัส/ชื่อ)..." />
        <select className="input md:col-span-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {meta.range ? (
          <>
            <input type="date" className="input md:col-span-2" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input md:col-span-2" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : (
          <div className="flex items-center text-sm text-slate-400 md:col-span-4">รายงานนี้แสดงข้อมูล ณ ปัจจุบัน</div>
        )}
        <button className="btn-secondary md:col-span-1" onClick={load} title="รีเฟรช">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!report ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className={`space-y-5 transition ${loading ? 'opacity-60' : ''}`}>
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-bold text-navy-900">{report.title}</h2>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {report.summary.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-navy-900">
                  {s.type === 'currency' ? fmtMoney(s.value) : fmtNumber(s.value)} {s.type === 'currency' && <span className="text-sm font-medium text-slate-400">บาท</span>}
                </p>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-navy-900">กราฟ</h3>
            <div className="h-80">
              <ReportChart chart={report.chart} rows={report.rows} />
            </div>
          </div>
          <div className="card overflow-hidden">
            {report.rows.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" />
            ) : (
              <div className="table-wrap max-h-[600px] overflow-y-auto scroll-thin">
                <table className="table">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th>#</th>
                      {report.columns.map((c) => (
                        <th key={c.key} className={c.type === 'number' || c.type === 'currency' ? 'text-right' : ''}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="text-slate-400">{i + 1}</td>
                        {report.columns.map((c) => (
                          <td key={c.key} className={c.type === 'number' || c.type === 'currency' ? 'whitespace-nowrap text-right' : ''}>
                            {fmtCell(c, r[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
