import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import api from '../api/client';
import { refreshBadges } from '../components/layout/Layout';
import { EmptyState, PageHeader, Pagination, Spinner } from '../components/ui';
import { fmtDate, timeAgo } from '../utils/format';

export default function Notifications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api.get('/notifications', { params: { page, pageSize: 15, unread: unreadOnly ? 1 : undefined } }).then(({ data }) => {
      setRows(data.data);
      setPagination(data.pagination);
    });
  }, [page, unreadOnly]);
  useEffect(() => {
    load();
  }, [load]);

  const open = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`);
    refreshBadges();
    if (n.link) navigate(n.link);
    else load();
  };
  const remove = async (n) => {
    await api.delete(`/notifications/${n.id}`);
    refreshBadges();
    load();
  };
  const readAll = async () => {
    await api.patch('/notifications/read-all');
    refreshBadges();
    load();
  };

  return (
    <div>
      <PageHeader
        icon={Bell}
        title="การแจ้งเตือน"
        description="การแจ้งเตือนทั้งหมดของคุณ"
        actions={
          <>
            <button className={unreadOnly ? 'btn-primary' : 'btn-secondary'} onClick={() => { setUnreadOnly((u) => !u); setPage(1); }}>
              เฉพาะที่ยังไม่อ่าน
            </button>
            <button className="btn-secondary" onClick={readAll}>
              <CheckCheck className="h-4 w-4" /> อ่านทั้งหมด
            </button>
          </>
        }
      />
      <div className="card overflow-hidden">
        {!rows ? (
          <div className="flex justify-center py-14">
            <Spinner className="h-7 w-7" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Bell} title="ไม่มีการแจ้งเตือน" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((n) => (
              <li key={n.id} className={`group flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50 ${n.isRead ? '' : 'bg-blue-50/40'}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? 'bg-slate-200' : 'bg-blue-600'}`} />
                <button className="min-w-0 flex-1 text-left" onClick={() => open(n)}>
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400" title={fmtDate(n.createdAt, true)}>
                    {timeAgo(n.createdAt)}
                  </p>
                </button>
                <button className="btn-icon opacity-0 transition group-hover:opacity-100 hover:text-red-600" onClick={() => remove(n)} title="ลบ">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination pagination={pagination} onChange={setPage} />
      </div>
    </div>
  );
}
