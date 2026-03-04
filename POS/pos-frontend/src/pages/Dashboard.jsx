import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  XCircle,
  ArrowRight,
  Store,
  ChevronDown,
} from 'lucide-react';
import { productApi } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedShop]);

  const loadShops = async () => {
    try {
      const res = await productApi.getShops();
      setShops(res.data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const shopParam = selectedShop || undefined;
      const [statsRes, lowStockRes] = await Promise.all([
        productApi.getDashboard(shopParam),
        productApi.getLowStock(shopParam),
      ]);
      setStats(statsRes.data);
      setLowStock(lowStockRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Store overview</p>
      </div>

      {/* Shop Filter */}
      {shops.length > 0 && (
        <div className="shop-filter" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="var(--primary)" />
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="shop-select"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop} value={shop}>{shop}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/inventory')}>
          <div className="stat-label">
            <Package size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Products
          </div>
          <div className="stat-value">{stats?.totalProducts ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <TrendingUp size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Stock Value
          </div>
          <div className="stat-value success">R{(stats?.totalStockValue ?? 0).toLocaleString()}</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/inventory')}>
          <div className="stat-label">
            <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Low Stock
          </div>
          <div className="stat-value danger">{stats?.lowStockCount ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <XCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Out of Stock
          </div>
          <div className="stat-value danger">{stats?.outOfStockCount ?? 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => navigate('/sale')} style={{ flex: 1 }}>
          <ShoppingCart size={18} /> New Sale
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/inventory')} style={{ flex: 1 }}>
          <Package size={18} /> Inventory
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color="var(--warning)" />
            Low Stock Alerts
          </h3>
          {lowStock.slice(0, 5).map((product) => (
            <div
              key={product.id}
              className="product-item"
              onClick={() => navigate('/inventory')}
            >
              <div className="product-icon">
                <Package size={20} color="var(--text-secondary)" />
              </div>
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-meta">
                  {product.barcode}
                  {product.shop && <> • <Store size={11} style={{ verticalAlign: -1 }} /> {product.shop}</>}
                </div>
              </div>
              <div>
                <span className={`badge ${product.quantityInStock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                  {product.quantityInStock === 0 ? 'Out of stock' : `${product.quantityInStock} left`}
                </span>
              </div>
            </div>
          ))}
          {lowStock.length > 5 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/inventory')}
              style={{ marginTop: 8 }}
            >
              View all {lowStock.length} items <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
