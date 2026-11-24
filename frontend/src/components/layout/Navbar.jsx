import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  CircleX,
  ClipboardList,
  KeyRound,
  LogOut,
  Menu,
  PackageX,
  UserCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, timeAgo } from '../../utils/format';
import ChangePasswordModal from './ChangePasswordModal';

const NOTI_ICON = {
  LOW_STOCK: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-600' },
  OUT_OF_STOCK: { icon: PackageX, cls: 'bg-red-50 text-red-600' },
  NEW_REQUEST: { icon: ClipboardList, cls: 'bg-violet-50 text-violet-600' },
  PENDING_APPROVAL: { icon: ClipboardList, cls: 'bg-violet-50 text-violet-600' },
  REQUEST_APPROVED: { icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-600' },
  REQUEST_REJECTED: { icon: CircleX, cls: 'bg-red-50 text-red-600' },
  SYSTEM: { icon: Bell, cls: 'bg-blue-50 text-blue-600' },
};

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  const load = async () => {
    try {
      const { data } = await api.get('/notifications', { params: { pageSize: 8 } });
      setItems(data.data);
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener('wms:refresh-notifications', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('wms:refresh-notifications', onFocus);
    };
  }, []);

  const openItem = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-icon relative h-10 w-10" aria-label="การแจ้งเตือน">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-navy-900">การแจ้งเตือน</p>
              <p className="text-xs text-slate-500">ยังไม่ได้อ่าน {unread} รายการ</p>
            </div>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                <CheckCheck className="h-4 w-4" /> อ่านทั้งหมด
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">ไม่มีการแจ้งเตือน</p>}
            {items.map((n) => {
              const s = NOTI_ICON[n.type] || NOTI_ICON.SYSTEM;
              const Icon = s.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${n.isRead ? '' : 'bg-blue-50/40'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </span>
                    <span className="line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-slate-50">
            ดูทั้งหมด
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onMenu, title }) {
  const { user, logout, settings } = useAuth();
  const [menu, setMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setMenu(false));

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onMenu} className="btn-icon lg:hidden" aria-label="เปิดเมนู">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy-900 sm:text-base">{settings['org.name'] || title}</p>
          <p className="hidden text-xs text-slate-500 sm:block">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <NotificationBell />
        <div className="relative" ref={ref}>
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-navy-700 text-sm font-semibold text-white">
              {user?.fullName?.charAt(0)}
            </span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-[160px] truncate text-sm font-medium text-slate-800">{user?.fullName}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABELS[user?.role]}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
          </button>
          {menu && (
            <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lift animate-scale-in">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate font-medium text-slate-800">{user?.fullName}</p>
                <p className="truncate text-xs text-slate-500">
                  @{user?.username} · {user?.department?.name || '-'}
                </p>
              </div>
              <Link to="/settings?tab=profile" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <UserCircle className="h-4 w-4" /> ข้อมูลส่วนตัว
              </Link>
              <button
                onClick={() => {
                  setMenu(false);
                  setPwOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <KeyRound className="h-4 w-4" /> เปลี่ยนรหัสผ่าน
              </button>
              <button onClick={logout} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" /> ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}
