import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  ArrowLeft,
  Receipt,
  ShoppingCart,
  Calendar,
  CreditCard,
  Hash,
  Package,
} from 'lucide-react';
import { customerApi, orderApi } from '../api';
import { useToast } from '../hooks/useToast';

const emptyCustomer = {
  firstName: '',
  lastName: '',
  email: '',
  cellNumber: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyCustomer);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(customers);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        customers.filter(
          (c) =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.cellNumber.includes(q)
        )
      );
    }
  }, [customers, search]);

  const loadCustomers = async () => {
    try {
      const res = await customerApi.getAll();
      setCustomers(res.data);
    } catch (err) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditing(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      cellNumber: customer.cellNumber,
      street: customer.deliveryAddress?.street || '',
      city: customer.deliveryAddress?.city || '',
      province: customer.deliveryAddress?.province || '',
      postalCode: customer.deliveryAddress?.postalCode || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      cellNumber: formData.cellNumber,
      deliveryAddress: {
        street: formData.street,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
      },
    };

    try {
      if (editing) {
        await customerApi.update(editing.id, payload);
        showToast('Customer updated!', 'success');
      } else {
        await customerApi.create(payload);
        showToast('Customer added!', 'success');
      }
      setShowForm(false);
      setFormData(emptyCustomer);
      setEditing(null);
      loadCustomers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save customer';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete "${customer.firstName} ${customer.lastName}"?`)) return;
    try {
      await customerApi.delete(customer.id);
      showToast('Customer deleted', 'success');
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      loadCustomers();
    } catch (err) {
      showToast('Failed to delete customer', 'error');
    }
  };

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setOrdersLoading(true);
    try {
      const res = await orderApi.getCustomerOrders(customer.id);
      setOrderSummary(res.data);
    } catch (err) {
      showToast('Failed to load order history', 'error');
      setOrderSummary(null);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fmt = (v) => `R ${Number(v || 0).toFixed(2)}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  /* ──── Customer Detail View ──── */
  if (selectedCustomer) {
    const c = selectedCustomer;
    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => { setSelectedCustomer(null); setOrderSummary(null); }}
          className="btn"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}
        >
          <ArrowLeft size={18} /> Back to Customers
        </button>

        {/* Customer Header */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--primary-light)', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={28} color="var(--primary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{c.firstName} {c.lastName}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                {c.email && <span><Mail size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{c.email}</span>}
                {c.cellNumber && <span><Phone size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{c.cellNumber}</span>}
                {c.deliveryAddress?.city && <span><MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{[c.deliveryAddress.city, c.deliveryAddress.province].filter(Boolean).join(', ')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => handleEdit(c)}>
                <Edit3 size={14} /> Edit
              </button>
              <button className="btn btn-danger" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => handleDelete(c)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {ordersLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
          </div>
        ) : orderSummary ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Spend', value: fmt(orderSummary.totalSpend), icon: <CreditCard size={18} />, color: '#10b981' },
                { label: 'Total Orders', value: orderSummary.totalOrders, icon: <Receipt size={18} />, color: 'var(--primary)' },
                { label: 'Items Bought', value: orderSummary.totalItems, icon: <ShoppingCart size={18} />, color: '#f59e0b' },
                { label: 'First Order', value: fmtDate(orderSummary.firstOrderDate), icon: <Calendar size={18} />, color: '#8b5cf6' },
                { label: 'Last Order', value: fmtDate(orderSummary.lastOrderDate), icon: <Calendar size={18} />, color: '#ec4899' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ color: s.color, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Order History */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={16} />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Order History</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{orderSummary.totalOrders} order{orderSummary.totalOrders !== 1 ? 's' : ''}</span>
              </div>
              {orderSummary.orders && orderSummary.orders.length > 0 ? (
                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                  {orderSummary.orders.map((order, idx) => (
                    <div
                      key={order.id || idx}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < orderSummary.orders.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Hash size={13} color="var(--text-secondary)" />
                          {order.invoiceNumber || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {fmtDateTime(order.createdAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Package size={12} /> {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        {order.paymentMethod && (
                          <span style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: order.paymentMethod === 'Cash' ? '#dcfce7' : order.paymentMethod === 'Card' ? '#dbeafe' : '#fef3c7',
                            color: order.paymentMethod === 'Cash' ? '#166534' : order.paymentMethod === 'Card' ? '#1e40af' : '#92400e',
                          }}>
                            {order.paymentMethod}
                          </span>
                        )}
                        {order.shop && (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{order.shop}</span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 80, textAlign: 'right' }}>
                          {fmt(order.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ShoppingCart size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No orders yet</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
            No order data available
          </div>
        )}

        {/* Edit Form Modal (reused) */}
        {showForm && renderFormModal()}
      </div>
    );
  }

  /* ──── Form Modal ──── */
  function renderFormModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowForm(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
            <button className="modal-close" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>First Name *</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" required />
              </div>
              <div className="input-group">
                <label>Last Name *</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" required />
              </div>
            </div>

            <div className="input-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" required />
            </div>

            <div className="input-group">
              <label>Cell Number</label>
              <input type="tel" value={formData.cellNumber} onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })} placeholder="+27 82 123 4567" />
            </div>

            <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> Delivery Address
            </h3>

            <div className="input-group">
              <label>Street Address</label>
              <input type="text" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="123 Main Street" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cape Town" />
              </div>
              <div className="input-group">
                <label>Province</label>
                <input type="text" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })} placeholder="Western Cape" />
              </div>
            </div>

            <div className="input-group">
              <label>Postal Code</label>
              <input type="text" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} placeholder="8001" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-success" style={{ flex: 2 }}>
                {editing ? 'Update Customer' : 'Add Customer'}
              </button>
              {editing && (
                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => { handleDelete(editing); setShowForm(false); }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage your customer base</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Add button */}
      <button
        className="btn btn-primary"
        onClick={() => {
          setFormData(emptyCustomer);
          setEditing(null);
          setShowForm(true);
        }}
        style={{ marginBottom: 16 }}
      >
        <Plus size={18} /> Add Customer
      </button>

      {/* Customer List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>{search ? 'No matches found' : 'No customers yet'}</h3>
          <p>{search ? 'Try a different search' : 'Add your first customer'}</p>
        </div>
      ) : (
        filtered.map((customer) => (
          <div key={customer.id} className="product-item" style={{ alignItems: 'flex-start' }}>
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => handleViewCustomer(customer)}
            >
              <div
                className="product-icon"
                style={{
                  background: 'var(--primary-light)',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={20} color="var(--primary)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="product-name">
                  {customer.firstName} {customer.lastName}
                </div>
                <div className="product-meta" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {customer.email && (
                    <span><Mail size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{customer.email}</span>
                  )}
                  {customer.cellNumber && (
                    <span><Phone size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{customer.cellNumber}</span>
                  )}
                  {customer.deliveryAddress?.city && (
                    <span><MapPin size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{customer.deliveryAddress.city}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(customer); }}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--danger)' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      {/* Customer Form Modal */}
      {showForm && renderFormModal()}
    </div>
  );
}
