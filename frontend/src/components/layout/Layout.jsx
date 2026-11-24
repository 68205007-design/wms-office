import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!can(user, 'approvals')) return undefined;
    const load = () =>
      api
        .get('/requisitions', { params: { status: 'PENDING', pageSize: 1 } })
        .then(({ data }) => setPending(data.pagination.total))
        .catch(() => {});
    load();
    window.addEventListener('wms:refresh-notifications', load);
    const t = setInterval(load, 60000);
    return () => {
      clearInterval(t);
      window.removeEventListener('wms:refresh-notifications', load);
    };
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} pendingCount={pending} />
      <div className="lg:pl-72">
        <Navbar onMenu={() => setOpen(true)} />
        <main key={location.pathname} className="mx-auto max-w-[1600px] p-4 animate-fade-in sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** เรียกหลังมีการเปลี่ยนแปลงที่กระทบการแจ้งเตือน/จำนวนรออนุมัติ */
export const refreshBadges = () => window.dispatchEvent(new Event('wms:refresh-notifications'));
