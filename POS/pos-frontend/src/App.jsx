import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, History, Users, LogOut, Shield } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import NewSale from './pages/NewSale';
import OrderHistory from './pages/OrderHistory';
import Customers from './pages/Customers';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UserManagement from './pages/UserManagement';
import Toast from './components/Toast';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider, useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <>
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sale" element={<NewSale />} />
          <Route path="/orders" element={<OrderHistory />} />
          {isAdmin && <Route path="/users" element={<UserManagement />} />}
        </Routes>
      </div>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <BarChart3 />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inventory">
          <Package />
          <span>Inventory</span>
        </NavLink>
        <NavLink to="/customers">
          <Users />
          <span>Customers</span>
        </NavLink>
        <NavLink to="/sale">
          <ShoppingCart />
          <span>New Sale</span>
        </NavLink>
        <NavLink to="/orders">
          <History />
          <span>Orders</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/users">
            <Shield />
            <span>Users</span>
          </NavLink>
        )}
        <a onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut />
          <span>Logout</span>
        </a>
      </nav>

      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
