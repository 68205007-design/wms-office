import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';
import { ROLE_LABELS } from '../../utils/format';

export const NAV = [
  { group: 'ภาพรวม', items: [{ to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, perm: 'dashboard', end: true }] },
  {
    group: 'คลังวัสดุ',
    items: [
      { to: '/materials', label: 'คลังวัสดุ', icon: Package, perm: 'materials' },
      { to: '/stock-in', label: 'รับเข้าวัสดุ', icon: PackagePlus, perm: 'stockIn' },
    ],
  },
  {
    group: 'เบิก-จ่าย',
    items: [
      { to: '/requisition/new', label: 'ขอเบิกวัสดุ', icon: ShoppingCart, perm: 'requisition' },
      { to: '/my-requests', label: 'คำขอเบิกของฉัน', icon: ClipboardList, perm: 'myRequests' },
      { to: '/approvals', label: 'อนุมัติรายการ', icon: CheckSquare, perm: 'approvals', badge: 'pending' },
      { to: '/history', label: 'ประวัติการเบิก-จ่าย', icon: FileClock, perm: 'history' },
    ],
  },
  {
    group: 'ระบบ',
    items: [
      { to: '/reports', label: 'รายงาน', icon: BarChart3, perm: 'reports' },
      { to: '/settings', label: 'ตั้งค่าระบบ', icon: Settings, perm: 'settings' },
    ],
  },
];

export default function Sidebar({ open, onClose, pendingCount }) {
  const { user, logout, settings } = useAuth();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-navy-950/50 backdrop-blur-sm transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/40">
              <Warehouse className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight">{settings['org.shortName'] || 'WMS'}</p>
              <p className="text-xs text-blue-200/80">ระบบเบิก-จ่ายวัสดุสำนักงาน</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden" aria-label="ปิดเมนู">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV.map((section) => {
            const items = section.items.filter((i) => can(user, i.perm));
            if (!items.length) return null;
            return (
              <div key={section.group}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-200/50">{section.group}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/40'
                              : 'text-blue-100/75 hover:bg-white/[0.07] hover:text-white'
                          }`
                        }
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 transition group-hover:scale-110" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge === 'pending' && pendingCount > 0 && (
                          <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[11px] font-semibold text-white">{pendingCount}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 font-semibold">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-xs text-blue-200/70">{ROLE_LABELS[user?.role]}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-blue-200 transition hover:bg-red-500/20 hover:text-red-200" title="ออกจากระบบ">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
