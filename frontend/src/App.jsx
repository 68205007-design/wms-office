import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { can } from './utils/permissions';
import Layout from './components/layout/Layout';
import { EmptyState, PageLoader } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import StockIn from './pages/StockIn';
import NewRequisition from './pages/NewRequisition';
import MyRequests from './pages/MyRequests';
import Approvals from './pages/Approvals';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

function Protected({ perm, children }) {
  const { user } = useAuth();
  if (perm && !can(user, perm)) {
    return (
      <div className="card">
        <EmptyState icon={ShieldAlert} title="ไม่มีสิทธิ์เข้าถึง" description="บัญชีของคุณไม่มีสิทธิ์ใช้งานหน้านี้ หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบ" />
      </div>
    );
  }
  return children;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Protected perm="dashboard"><Dashboard /></Protected>} />
        <Route path="materials" element={<Protected perm="materials"><Materials /></Protected>} />
        <Route path="stock-in" element={<Protected perm="stockIn"><StockIn /></Protected>} />
        <Route path="requisition/new" element={<Protected perm="requisition"><NewRequisition /></Protected>} />
        <Route path="my-requests" element={<Protected perm="myRequests"><MyRequests /></Protected>} />
        <Route path="approvals" element={<Protected perm="approvals"><Approvals /></Protected>} />
        <Route path="history" element={<Protected perm="history"><History /></Protected>} />
        <Route path="reports" element={<Protected perm="reports"><Reports /></Protected>} />
        <Route path="settings" element={<Protected perm="settings"><Settings /></Protected>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
