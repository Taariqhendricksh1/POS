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
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  Building2,
  BarChart3,
  Receipt,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { productApi, orderApi } from '../api';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  // Sales summary
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(formatDate(new Date()));
  const [dateTo, setDateTo] = useState(formatDate(new Date()));
  const navigate = useNavigate();

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedShop]);

  useEffect(() => {
    loadSalesSummary();
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

  const loadSalesSummary = async (from, to) => {
    setSalesLoading(true);
    try {
      const fromParam = (from || dateFrom) + 'T00:00:00Z';
      const toParam = (to || dateTo) + 'T23:59:59Z';
      const shopParam = selectedShop || undefined;
      const res = await orderApi.getSalesSummary(fromParam, toParam, shopParam);
      setSalesSummary(res.data);
    } catch (err) {
      console.error('Sales summary load error:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  const handleDateChange = (newFrom, newTo) => {
    setDateFrom(newFrom);
    setDateTo(newTo);
    loadSalesSummary(newFrom, newTo);
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

      {/* Sales Summary */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={16} color="var(--primary)" />
          Sales Summary
        </h3>

        {/* Date Range Picker */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateChange(e.target.value, dateTo)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  minWidth: 0,
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, flexShrink: 0 }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  minWidth: 0,
                }}
              />
            </div>
          </div>
          {/* Quick date presets */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Today', fn: () => { const d = formatDate(new Date()); handleDateChange(d, d); } },
              { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = formatDate(d); handleDateChange(s, s); } },
              { label: 'This Week', fn: () => { const now = new Date(); const day = now.getDay(); const start = new Date(now); start.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); handleDateChange(formatDate(start), formatDate(now)); } },
              { label: 'This Month', fn: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); handleDateChange(formatDate(start), formatDate(now)); } },
              { label: 'Last 30 Days', fn: () => { const now = new Date(); const start = new Date(); start.setDate(now.getDate() - 30); handleDateChange(formatDate(start), formatDate(now)); } },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={preset.fn}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  background: 'var(--bg)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sales Stats */}
        {salesLoading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
          </div>
        ) : salesSummary ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  <DollarSign size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Total Sales
                </div>
                <div className="stat-value success">R{salesSummary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Receipt size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Orders
                </div>
                <div className="stat-value">{salesSummary.totalOrders}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <ShoppingCart size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Items Sold
                </div>
                <div className="stat-value">{salesSummary.totalItems}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <TrendingUp size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Avg Order
                </div>
                <div className="stat-value">R{salesSummary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Payment Breakdown & Details */}
            {salesSummary.totalOrders > 0 && (
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>Payment Breakdown</h4>
                {Object.entries(salesSummary.paymentBreakdown).map(([method, amount]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      {method === 'Cash' && <Banknote size={16} color="var(--success, #16a34a)" />}
                      {method === 'Card' && <CreditCard size={16} color="var(--primary)" />}
                      {method === 'EFT' && <Building2 size={16} color="var(--warning, #f59e0b)" />}
                      {method !== 'Cash' && method !== 'Card' && method !== 'EFT' && <DollarSign size={16} />}
                      {method}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>R{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {salesSummary.totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>Total Discounts</span>
                    <span>-R{salesSummary.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>VAT (incl.)</span>
                  <span>R{salesSummary.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* EFT Payment Status */}
            {(salesSummary.eftOutstandingCount > 0 || salesSummary.eftReceivedCount > 0) && (
              <div className="card" style={{ padding: 16, marginTop: 12 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} /> EFT Payment Status
                </h4>
                {salesSummary.eftOutstandingCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#92400e' }}>
                      <Clock size={16} />
                      <span><strong>{salesSummary.eftOutstandingCount}</strong> Outstanding</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                      R{salesSummary.eftOutstandingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {salesSummary.eftReceivedCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#dcfce7', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#166534' }}>
                      <CheckCircle2 size={16} />
                      <span><strong>{salesSummary.eftReceivedCount}</strong> Received</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>
                      R{salesSummary.eftReceivedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {salesSummary.totalOrders === 0 && (
              <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Receipt size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No completed sales for this period</p>
              </div>
            )}
          </>
        ) : null}
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
              <div className="product-icon" style={{ overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }}
                  />
                ) : (
                  <Package size={20} color="var(--text-secondary)" />
                )}
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
