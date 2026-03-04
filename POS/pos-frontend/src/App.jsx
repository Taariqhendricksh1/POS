import { Routes, Route, NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, History, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import NewSale from './pages/NewSale';
import OrderHistory from './pages/OrderHistory';
import Customers from './pages/Customers';
import Toast from './components/Toast';
import { ToastProvider } from './hooks/useToast';

export default function App() {
  return (
    <ToastProvider>
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sale" element={<NewSale />} />
          <Route path="/orders" element={<OrderHistory />} />
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
      </nav>

      <Toast />
    </ToastProvider>
  );
}
