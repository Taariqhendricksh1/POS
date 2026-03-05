import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  XCircle,
  ArrowRight,
  ArrowRightLeft,
  Store,
  ChevronDown,
  ChevronUp,
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
import { productApi, orderApi, settingsApi, stockTransferApi } from '../api';
import { ShopContext } from '../App';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetDates(preset) {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const d = formatDate(now);
      return [d, d];
    }
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const s = formatDate(d);
      return [s, s];
    }
    case 'this_week': {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return [formatDate(start), formatDate(now)];
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [formatDate(start), formatDate(now)];
    }
    case 'last_30': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return [formatDate(start), formatDate(now)];
    }
    case '6_months': {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      return [formatDate(start), formatDate(now)];
    }
    case '1_year': {
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      return [formatDate(start), formatDate(now)];
    }
    case 'all_time': {
      return ['2000-01-01', formatDate(now)];
    }
    default:
      return [formatDate(now), formatDate(now)];
  }
}

function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'var(--card-bg, white)', border: '1px solid var(--border)',
          borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer', fontSize: 15, fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div style={{
          border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 10px 10px', padding: 16, background: 'var(--card-bg, white)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { setShopName } = useContext(ShopContext);
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  // Sales summary
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [transferSummary, setTransferSummary] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [datePreset, setDatePreset] = useState('today');
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
    loadTransferSummary();
  }, [selectedShop]);

  const loadShops = async () => {
    try {
      const res = await settingsApi.getShops();
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

  const loadTransferSummary = async (from, to) => {
    setTransferLoading(true);
    try {
      const fromParam = (from || dateFrom) + 'T00:00:00Z';
      const toParam = (to || dateTo) + 'T23:59:59Z';
      const res = await stockTransferApi.getSummary(fromParam, toParam);
      setTransferSummary(res.data);
    } catch (err) {
      console.error('Transfer summary load error:', err);
    } finally {
      setTransferLoading(false);
    }
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const [from, to] = getPresetDates(preset);
      setDateFrom(from);
      setDateTo(to);
      loadSalesSummary(from, to);
      loadTransferSummary(from, to);
    }
  };

  const handleDateChange = (newFrom, newTo) => {
    setDateFrom(newFrom);
    setDateTo(newTo);
    setDatePreset('custom');
    loadSalesSummary(newFrom, newTo);
    loadTransferSummary(newFrom, newTo);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Quick Actions — top */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn btn-primary" onClick={() => navigate('/sale')} style={{ flex: 1 }}>
          <ShoppingCart size={18} /> New Sale
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/inventory')} style={{ flex: 1 }}>
          <Package size={18} /> Inventory
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <button className="btn btn-outline" onClick={() => navigate('/stock-transfer')} style={{ width: '100%' }}>
          <ArrowRightLeft size={18} /> Transfer Stock
        </button>
      </div>

      {/* Shop Filter */}
      {shops.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="var(--primary)" />
            <select
              value={selectedShop}
              onChange={(e) => { setSelectedShop(e.target.value); setShopName(e.target.value); }}
              className="shop-select"
              style={{ flex: 1 }}
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop} value={shop}>{shop}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Date Range — preset dropdown + custom inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Calendar size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
        <select
          value={datePreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          style={{
            padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 6px)',
            fontSize: 13, background: 'var(--bg)', color: 'var(--text)', flex: 1, minWidth: 0,
          }}
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {datePreset === 'custom' && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
              style={{
                padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 6px)',
                fontSize: 13, background: 'var(--bg)', color: 'var(--text)', flex: 1, minWidth: 0,
              }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, flexShrink: 0 }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
              style={{
                padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm, 6px)',
                fontSize: 13, background: 'var(--bg)', color: 'var(--text)', flex: 1, minWidth: 0,
              }}
            />
          </>
        )}
      </div>

      {/* === ACCORDION: Shop Overview === */}
      <Accordion
        title="Shop Overview"
        icon={<Store size={16} color="var(--primary)" />}
        defaultOpen
      >
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

        {/* Low Stock Alerts */}
        {lowStock.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="var(--warning)" />
              Low Stock Alerts
            </h4>
            {lowStock.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="product-item"
                onClick={() => navigate('/inventory')}
              >
                <div className="product-icon" style={{ overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
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
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/inventory')} style={{ marginTop: 8 }}>
                View all {lowStock.length} items <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </Accordion>

      {/* === ACCORDION: Sales Summary === */}
      <Accordion
        title="Sales Summary"
        icon={<BarChart3 size={16} color="var(--primary)" />}
        defaultOpen
      >
        {salesLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
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

            {/* Payment Breakdown */}
            {salesSummary.totalOrders > 0 && (
              <div style={{ marginTop: 14 }}>
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

            {salesSummary.totalOrders === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                <Receipt size={28} style={{ marginBottom: 6, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No completed sales for this period</p>
              </div>
            )}
          </>
        ) : null}
      </Accordion>

      {/* === ACCORDION: Pending Transactions === */}
      <Accordion
        title="Pending Transactions"
        icon={<Clock size={16} color="var(--warning, #f59e0b)" />}
        defaultOpen={false}
      >
        {salesLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
          </div>
        ) : salesSummary && (salesSummary.eftOutstandingCount > 0 || salesSummary.eftReceivedCount > 0) ? (
          <div>
            <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> EFT Payment Status
            </h4>
            {salesSummary.eftOutstandingCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef3c7', borderRadius: 8, marginBottom: 8 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#dcfce7', borderRadius: 8 }}>
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
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={28} style={{ marginBottom: 6, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No pending EFT transactions for this period</p>
          </div>
        )}
      </Accordion>

      {/* === ACCORDION: Stock Transfers === */}
      <Accordion
        title="Stock Transfers"
        icon={<ArrowRightLeft size={16} color="var(--primary)" />}
        defaultOpen={false}
      >
        {transferLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
          </div>
        ) : transferSummary && transferSummary.totalTransfers > 0 ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  <ArrowRightLeft size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Transfers
                </div>
                <div className="stat-value">{transferSummary.totalTransfers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Package size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Units Moved
                </div>
                <div className="stat-value">{transferSummary.totalUnits}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <DollarSign size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Cost Value
                </div>
                <div className="stat-value">R{transferSummary.totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <DollarSign size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Retail Value
                </div>
                <div className="stat-value">R{transferSummary.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Recipient Breakdown */}
            {transferSummary.byRecipient?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>By Recipient</h4>
                {transferSummary.byRecipient.map((r) => (
                  <div key={r.company} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.company}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {r.transferCount} transfer{r.transferCount !== 1 ? 's' : ''} &bull; {r.totalUnits} units
                      </div>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      R{r.totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
            <ArrowRightLeft size={28} style={{ marginBottom: 6, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No stock transfers for this period</p>
          </div>
        )}
      </Accordion>
    </div>
  );
}
