import { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, History, Users, LogOut, Shield, UserCircle, Lock, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import NewSale from './pages/NewSale';
import OrderHistory from './pages/OrderHistory';
import Customers from './pages/Customers';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UserManagement from './pages/UserManagement';
import ChangePassword from './pages/ChangePassword';
import SettingsPage from './pages/Settings';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (!user) return null;

  return (
    <>
      {/* Top header with profile menu */}
      <div className="top-header">
        <div className="top-header-inner">
          <span className="top-header-title">POS</span>
          <div className="profile-menu" ref={menuRef}>
            <button className="profile-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Profile menu">
              <UserCircle size={28} />
            </button>
            {menuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-user">
                  <span>{user.email}</span>
                  {isAdmin && <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10 }}>Admin</span>}
                </div>
                {isAdmin && (
                  <a className="profile-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/users'); }}>
                    <Shield size={16} />
                    <span>Users</span>
                  </a>
                )}
                {isAdmin && (
                  <a className="profile-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </a>
                )}
                <a className="profile-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/change-password'); }}>
                  <Lock size={16} />
                  <span>Change Password</span>
                </a>
                <a className="profile-dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 56 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sale" element={<NewSale />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/change-password" element={<ChangePassword />} />
          {isAdmin && <Route path="/users" element={<UserManagement />} />}
          {isAdmin && <Route path="/settings" element={<SettingsPage />} />}
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
        <NavLink to="/sale">
          <ShoppingCart />
          <span>New Sale</span>
        </NavLink>
        <NavLink to="/orders">
          <History />
          <span>Orders</span>
        </NavLink>
        <NavLink to="/customers">
          <Users />
          <span>Customers</span>
        </NavLink>
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
