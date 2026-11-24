import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCircle2, ClipboardList, Eye, Loader2, Printer, XCircle } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { refreshBadges } from './layout/Layout';
import { ConfirmDialog, EmptyState, Field, Modal, Pagination, RequisitionStatusBadge, SearchInput, Spinner } from './ui';
import { REQ_STATUS, cleanParams, fmtDate, fmtMoney, fmtNumber } from '../utils/format';
import { printReport } from '../utils/export';
import useDebounce from '../utils/useDebounce';

export function RequisitionDetailModal({ id, onClose, onChanged, mode = 'view' }) {
  const { user, settings } = useAuth();
  const toast = useToast();
  const [r, setR] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setR(null);
    api
      .get(`/requisitions/${id}`)
      .then(({ data }) => setR(data))
      .catch((e) => {
        toast.error(errorMessage(e));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    load();
    setRejecting(false);
    setReason('');
  }, [load]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      const { data } = await fn();
      toast.success(msg);
      if (data?.id) setR(data);
      else load();
      setRejecting(false);
      setConfirmApprove(false);
      setConfirmCancel(false);
      refreshBadges();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirmApprove(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const canDecide = mode === 'approve' && r?.status === 'PENDING' && (r.requesterId !== user.id || user.role === 'ADMIN');
  const canCancel = r?.status === 'PENDING' && (r.requesterId === user.id || user.role === 'ADMIN');
  const insufficient = r?.items.filter((i) => i.quantity > i.material.quantity) || [];

  const print = () =>
    printReport({
      title: `ใบเบิกวัสดุ เลขที่ ${r.requisitionNo}`,
      subtitle: `ผู้ขอเบิก ${r.requesterName} · ${r.department.name} · วันที่ ${fmtDate(r.requestDate)} · สถานะ ${REQ_STATUS[r.status].label}${r.approver ? ` · ผู้อนุมัติ ${r.approver.fullName}` : ''}`,
      orgName: settings['org.name'],
      columns: [
        { key: 'code', label: 'รหัส', value: (i) => i.material.code },
        { key: 'name', label: 'รายการ', value: (i) => i.material.name },
        { key: 'quantity', label: 'จำนวน', type: 'number' },
        { key: 'unit', label: 'หน่วย', value: (i) => i.material.unit.name },
        { key: 'unitPrice', label: 'ราคา/หน่วย', type: 'currency' },
        { key: 'totalPrice', label: 'รวม', type: 'currency' },
      ],
      rows: r.items,
      summary: [{ label: 'มูลค่ารวม', value: r.totalValue, type: 'currency' }],
    });

  return (
    <>
      <Modal
        open={!!id}
        onClose={onClose}
        title={r ? `คำขอเบิก ${r.requisitionNo}` : 'รายละเอียดคำขอเบิก'}
        subtitle={r ? `ยื่นเมื่อ ${fmtDate(r.createdAt, true)}` : ''}
        size="lg"
        footer={
          r && (
            <>
              <button className="btn-ghost mr-auto" onClick={print}>
                <Printer className="h-4 w-4" /> พิมพ์
              </button>
              {canCancel && mode !== 'approve' && (
                <button className="btn-secondary text-red-600" onClick={() => setConfirmCancel(true)}>
                  <Ban className="h-4 w-4" /> ยกเลิกคำขอ
                </button>
              )}
              {canDecide && !rejecting && (
                <>
                  <button className="btn-secondary border-red-200 text-red-600 hover:bg-red-50" onClick={() => setRejecting(true)}>
                    <XCircle className="h-4 w-4" /> ไม่อนุมัติ
                  </button>
                  <button className="btn-success" onClick={() => setConfirmApprove(true)} disabled={insufficient.length > 0}>
                    <CheckCircle2 className="h-4 w-4" /> อนุมัติ
                  </button>
                </>
              )}
              {canDecide && rejecting && (
                <>
                  <button className="btn-secondary" onClick={() => setRejecting(false)} disabled={busy}>
                    ย้อนกลับ
                  </button>
                  <button
                    className="btn-danger"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => act(() => api.post(`/requisitions/${r.id}/reject`, { reason }), 'บันทึกการไม่อนุมัติเรียบร้อย')}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} ยืนยันไม่อนุมัติ
                  </button>
                </>
              )}
            </>
          )
        }
      >
        {!r ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['สถานะ', <RequisitionStatusBadge key="s" status={r.status} />],
                ['ผู้ขอเบิก', r.requesterName],
                ['หน่วยงาน', r.department.name],
                ['วันที่ขอเบิก', fmtDate(r.requestDate)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{k}</p>
                  <div className="mt-0.5 font-medium text-navy-900">{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm">
              <span className="text-slate-500">เหตุผลในการเบิก: </span>
              {r.purpose}
            </div>
            {r.status !== 'PENDING' && r.approver && (
              <div
                className={`rounded-xl border p-3 text-sm ${r.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
              >
                {r.status === 'APPROVED' ? 'อนุมัติโดย' : 'ไม่อนุมัติโดย'} <b>{r.approver.fullName}</b> เมื่อ {fmtDate(r.approvedAt, true)}
                {r.rejectReason && (
                  <p className="mt-1">
                    <b>เหตุผล:</b> {r.rejectReason}
                  </p>
                )}
              </div>
            )}
            {canDecide && insufficient.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ยอดคงเหลือไม่พอสำหรับ: {insufficient.map((i) => i.material.name).join(', ')} — ไม่สามารถอนุมัติได้ (สามารถไม่อนุมัติพร้อมระบุเหตุผล)
              </div>
            )}
            <div className="table-wrap rounded-xl border border-slate-200">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>วัสดุ</th>
                    <th className="text-right">จำนวนขอเบิก</th>
                    {r.status === 'PENDING' && <th className="text-right">คงเหลือในคลัง</th>}
                    <th className="text-right">ราคา/หน่วย</th>
                    <th className="text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((i, idx) => (
                    <tr key={i.id}>
                      <td className="text-slate-400">{idx + 1}</td>
                      <td>
                        <p className="font-medium">{i.material.name}</p>
                        <p className="text-xs text-slate-400">
                          {i.material.code} · {i.material.category.name}
                        </p>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold">
                        {fmtNumber(i.quantity)} <span className="font-normal text-slate-400">{i.material.unit.name}</span>
                      </td>
                      {r.status === 'PENDING' && (
                        <td className={`text-right ${i.quantity > i.material.quantity ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{fmtNumber(i.material.quantity)}</td>
                      )}
                      <td className="text-right">{fmtMoney(i.unitPrice)}</td>
                      <td className="text-right font-medium">{fmtMoney(i.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={r.status === 'PENDING' ? 5 : 4} className="px-4 py-3 text-right font-medium text-slate-600">
                      มูลค่ารวม
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-navy-900">{fmtMoney(r.totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {rejecting && (
              <Field label="เหตุผลที่ไม่อนุมัติ" required hint="ผู้ขอเบิกจะได้รับแจ้งเหตุผลนี้">
                <textarea autoFocus rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุเหตุผล..." />
              </Field>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={() => act(() => api.post(`/requisitions/${r.id}/approve`), 'อนุมัติและตัดสต็อกเรียบร้อย')}
        loading={busy}
        danger={false}
        title="ยืนยันการอนุมัติ"
        message={`อนุมัติคำขอ ${r?.requisitionNo} ระบบจะตัดยอดวัสดุ ${r?.itemCount} รายการออกจากคลังทันที`}
        confirmText="อนุมัติ"
      />
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => act(() => api.post(`/requisitions/${r.id}/cancel`), 'ยกเลิกคำขอเรียบร้อย')}
        loading={busy}
        title="ยกเลิกคำขอเบิก"
        message={`ต้องการยกเลิกคำขอ ${r?.requisitionNo} ใช่หรือไม่?`}
        confirmText="ยกเลิกคำขอ"
      />
    </>
  );
}

const STATUS_TABS = [
  ['', 'ทั้งหมด'],
  ['PENDING', 'รออนุมัติ'],
  ['APPROVED', 'อนุมัติแล้ว'],
  ['REJECTED', 'ไม่อนุมัติ'],
  ['CANCELLED', 'ยกเลิก'],
];

export function RequisitionList({ mode = 'mine', defaultStatus = '' }) {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(defaultStatus);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(params.get('id') ? Number(params.get('id')) : null);
  const q = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/requisitions', { params: cleanParams({ page, pageSize: 10, status, search: q, from, to, mine: mode === 'mine' ? 1 : '' }) })
      .then(({ data }) => {
        setRows(data.data);
        setPagination(data.pagination);
        setSummary(data.summary || {});
      })
      .finally(() => setLoading(false));
  }, [page, status, q, from, to, mode]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [status, q, from, to]);

  const close = () => {
    setOpenId(null);
    if (params.get('id')) {
      params.delete('id');
      setParams(params, { replace: true });
    }
  };

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['PENDING', 'รออนุมัติ', 'from-violet-500 to-purple-600'],
          ['APPROVED', 'อนุมัติแล้ว', 'from-emerald-500 to-emerald-600'],
          ['REJECTED', 'ไม่อนุมัติ', 'from-rose-500 to-red-600'],
          ['CANCELLED', 'ยกเลิก', 'from-slate-400 to-slate-500'],
        ].map(([k, l, g]) => (
          <button
            key={k}
            onClick={() => setStatus(status === k ? '' : k)}
            className={`card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift ${status === k ? 'ring-2 ring-blue-500' : ''}`}
          >
            <span className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${g}`} />
            <span>
              <span className="block text-xs text-slate-500">{l}</span>
              <span className="text-2xl font-bold text-navy-900">{fmtNumber(summary[k] || 0)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div className="scroll-thin flex gap-1 overflow-x-auto">
            {STATUS_TABS.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatus(v)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <SearchInput className="md:col-span-2" value={search} onChange={setSearch} placeholder="ค้นหาเลขที่คำขอ ผู้ขอเบิก วัสดุ..." />
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} title="ตั้งแต่วันที่" />
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} title="ถึงวันที่" />
          </div>
        </div>
        {loading && !rows.length ? (
          <div className="flex justify-center py-14">
            <Spinner className="h-7 w-7" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="ไม่พบคำขอเบิก" />
        ) : (
          <div className={`table-wrap ${loading ? 'opacity-60' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>เลขที่คำขอ</th>
                  <th>ผู้ขอเบิก</th>
                  <th className="hidden md:table-cell">หน่วยงาน</th>
                  <th className="hidden lg:table-cell">รายการวัสดุ</th>
                  <th className="text-right">จำนวน</th>
                  <th>วันที่ขอ</th>
                  <th>สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <td className="whitespace-nowrap font-medium text-blue-700">{r.requisitionNo}</td>
                    <td>{r.requesterName}</td>
                    <td className="hidden text-slate-500 md:table-cell">{r.department.name}</td>
                    <td className="hidden max-w-xs lg:table-cell">
                      <p className="truncate text-slate-600">{r.items.map((i) => i.material.name).join(', ')}</p>
                      <p className="text-xs text-slate-400">{r.itemCount} รายการ</p>
                    </td>
                    <td className="text-right font-medium">{fmtNumber(r.totalQuantity)}</td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(r.requestDate)}</td>
                    <td>
                      <RequisitionStatusBadge status={r.status} />
                    </td>
                    <td className="text-right">
                      <span className="btn-icon">
                        <Eye className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onChange={setPage} />
      </div>
      <RequisitionDetailModal id={openId} onClose={close} onChanged={load} mode={mode === 'approve' ? 'approve' : 'view'} />
    </>
  );
}
