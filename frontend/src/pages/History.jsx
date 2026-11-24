import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, FileClock, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, PageHeader, Pagination, RequisitionStatusBadge, SearchInput, Spinner } from '../components/ui';
import { RequisitionDetailModal } from '../components/RequisitionViews';
import { REQ_STATUS, cleanParams, fmtDate, fmtNumber } from '../utils/format';
import { exportExcel, printReport } from '../utils/export';
import useDebounce from '../utils/useDebounce';

const COLUMNS = [
  { key: 'date', label: 'วันที่', value: (r) => fmtDate(r.requisition.requestDate) },
  { key: 'doc', label: 'เลขที่เอกสาร', value: (r) => r.requisition.requisitionNo },
  { key: 'code', label: 'รหัสวัสดุ', value: (r) => r.material.code },
  { key: 'name', label: 'ชื่อวัสดุ', value: (r) => r.material.name },
  { key: 'quantity', label: 'จำนวน', type: 'number' },
  { key: 'unit', label: 'หน่วย', value: (r) => r.material.unit.name },
  { key: 'requester', label: 'ผู้ขอเบิก', value: (r) => r.requisition.requesterName },
  { key: 'approver', label: 'ผู้อนุมัติ', value: (r) => r.requisition.approver?.fullName || '-' },
  { key: 'dept', label: 'หน่วยงาน', value: (r) => r.requisition.department.name },
  { key: 'status', label: 'สถานะ', value: (r) => REQ_STATUS[r.requisition.status].label },
];

export default function History() {
  const { user, settings } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const isUser = user.role === 'USER';
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ search: '', from: '', to: '', requesterId: '', categoryId: '', status: '' });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(params.get('id') ? Number(params.get('id')) : null);
  const search = useDebounce(f.search);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
    if (!isUser) api.get('/users', { params: { all: 1 } }).then(({ data }) => setUsers(data)).catch(() => {});
  }, [isUser]);

  const query = useCallback(
    (extra = {}) => cleanParams({ search, from: f.from, to: f.to, requesterId: f.requesterId, categoryId: f.categoryId, status: f.status, ...extra }),
    [search, f.from, f.to, f.requesterId, f.categoryId, f.status],
  );

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/requisitions/items', { params: query({ page, pageSize: 15 }) })
      .then(({ data }) => {
        setRows(data.data);
        setPagination(data.pagination);
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [query]);

  const doExport = async (type) => {
    setExporting(type);
    try {
      const { data } = await api.get('/requisitions/items', { params: query({ page: 1, pageSize: 10000, export: 1 }) });
      const subtitle = [f.from && `ตั้งแต่ ${fmtDate(f.from)}`, f.to && `ถึง ${fmtDate(f.to)}`].filter(Boolean).join(' ') || 'ทุกช่วงเวลา';
      const summary = [{ label: 'จำนวนรวม', value: data.data.reduce((s, r) => s + r.quantity, 0), type: 'number' }];
      if (type === 'excel') {
        exportExcel({ filename: `ประวัติการเบิกจ่าย_${new Date().toISOString().slice(0, 10)}`, title: 'ประวัติการเบิก-จ่ายวัสดุ', columns: COLUMNS, rows: data.data, summary });
      } else {
        printReport({ title: 'ประวัติการเบิก-จ่ายวัสดุ', subtitle, orgName: settings['org.name'], columns: COLUMNS, rows: data.data, summary });
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting('');
    }
  };

  const close = () => {
    setOpenId(null);
    if (params.get('id')) {
      params.delete('id');
      setParams(params, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader
        icon={FileClock}
        title="ประวัติการเบิก-จ่าย"
        description={isUser ? 'ประวัติการเบิกวัสดุของคุณ' : 'ประวัติการเบิกวัสดุทั้งหมดในระบบ แยกตามรายการวัสดุ'}
        actions={
          <>
            <button className="btn-secondary" onClick={() => doExport('excel')} disabled={!!exporting}>
              {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />} Export Excel
            </button>
            <button className="btn-secondary" onClick={() => doExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />} Export PDF
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <SearchInput className="lg:col-span-2" value={f.search} onChange={(v) => setF({ ...f, search: v })} placeholder="ค้นหาเลขเอกสาร วัสดุ ผู้เบิก..." />
          <input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="ตั้งแต่วันที่" />
          <input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="ถึงวันที่" />
          {!isUser && (
            <select className="input" value={f.requesterId} onChange={(e) => setF({ ...f, requesterId: e.target.value })}>
              <option value="">ผู้เบิกทั้งหมด</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          )}
          <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">ทุกสถานะ</option>
            {Object.entries(REQ_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {loading && !rows.length ? (
          <div className="flex justify-center py-14">
            <Spinner className="h-7 w-7" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={FileClock} title="ไม่พบประวัติ" description="ลองปรับเงื่อนไขการค้นหา" />
        ) : (
          <div className={`table-wrap ${loading ? 'opacity-60' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เลขที่เอกสาร</th>
                  <th>ชื่อวัสดุ</th>
                  <th className="text-right">จำนวน</th>
                  <th className="hidden md:table-cell">ผู้ขอเบิก</th>
                  <th className="hidden lg:table-cell">ผู้อนุมัติ</th>
                  <th className="hidden xl:table-cell">หน่วยงาน</th>
                  <th>สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{fmtDate(r.requisition.requestDate)}</td>
                    <td className="whitespace-nowrap font-medium text-blue-700">{r.requisition.requisitionNo}</td>
                    <td>
                      <p className="font-medium">{r.material.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.material.code} · {r.material.category.name}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold">
                      {fmtNumber(r.quantity)} <span className="font-normal text-slate-400">{r.material.unit.name}</span>
                    </td>
                    <td className="hidden md:table-cell">{r.requisition.requesterName}</td>
                    <td className="hidden text-slate-500 lg:table-cell">{r.requisition.approver?.fullName || '-'}</td>
                    <td className="hidden text-slate-500 xl:table-cell">{r.requisition.department.name}</td>
                    <td>
                      <RequisitionStatusBadge status={r.requisition.status} />
                    </td>
                    <td>
                      <button className="btn-icon hover:text-blue-600" title="ดูรายละเอียด" onClick={() => setOpenId(r.requisition.id)}>
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onChange={setPage} />
      </div>
      <RequisitionDetailModal id={openId} onClose={close} onChanged={load} />
    </div>
  );
}
