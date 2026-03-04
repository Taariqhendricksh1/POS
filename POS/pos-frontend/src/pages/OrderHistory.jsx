import { useState, useEffect } from 'react';
import { History, Receipt, Search, CheckCircle2, Trash2, CreditCard, Banknote, Building2, X, Lock, Store } from 'lucide-react';
import { orderApi } from '../api';
import { useToast } from '../hooks/useToast';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [completing, setCompleting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await orderApi.getRecent(100);
      setOrders(res.data);
    } catch (err) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.invoiceNumber.toLowerCase().includes(q) ||
      o.clientName.toLowerCase().includes(q) ||
      o.clientEmail.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'Pending':
        return 'badge-warning';
      case 'Cancelled':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  const handleCompleteOrder = async (order) => {
    setCompleting(true);
    try {
      const res = await orderApi.complete(order.id, paymentMethod);
      showToast(`${order.invoiceNumber} marked as completed`, 'success');
      setShowCompleteConfirm(null);
      setSelectedOrder(null);
      setPaymentMethod('Cash');
      loadOrders();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete order';
      showToast(msg, 'error');
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Delete ${order.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await orderApi.delete(order.id);
      showToast(`${order.invoiceNumber} deleted`, 'success');
      setSelectedOrder(null);
      loadOrders();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete order';
      showToast(msg, 'error');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPending = (order) => order.status === 'Pending';
  const isCompleted = (order) => order.status === 'Completed';

  return (
    <div>
      <div className="page-header">
        <h1>Order History</h1>
        <p>View past transactions</p>
      </div>

      <div className="search-bar">
        <Search />
        <input
          type="text"
          placeholder="Search by invoice, name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <History size={48} />
          <h3>No orders yet</h3>
          <p>Completed sales will appear here</p>
        </div>
      ) : (
        filteredOrders.map((order) => (
          <div
            key={order.id}
            className="product-item"
            onClick={() => setSelectedOrder(order.id === selectedOrder?.id ? null : order)}
          >
            <div className="product-icon">
              <Receipt size={20} color="var(--text-secondary)" />
            </div>
            <div className="product-info">
              <div className="product-name">{order.invoiceNumber}</div>
              <div className="product-meta">
                {order.clientName} • {formatDate(order.createdAt)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="product-price">R{order.total.toFixed(2)}</div>
              <span className={`badge ${getStatusBadge(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => { setSelectedOrder(null); setShowCompleteConfirm(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2>{selectedOrder.invoiceNumber}</h2>
                {isCompleted(selectedOrder) && <Lock size={16} color="var(--text-secondary)" />}
              </div>
              <button className="modal-close" onClick={() => { setSelectedOrder(null); setShowCompleteConfirm(null); }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Client</span>
                <span>{selectedOrder.clientName}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                <span>{selectedOrder.clientEmail}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                <span>{formatDate(selectedOrder.completedAt || selectedOrder.createdAt)}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Payment</span>
                <span className="badge badge-info">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="summary-row">
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>ITEMS</h3>
            {selectedOrder.items.map((item, i) => (
              <div key={i} className="order-item">
                <div className="item-info">
                  <div className="item-name">{item.productName}</div>
                  <div className="item-price">
                    R{item.effectivePrice.toFixed(2)} × {item.quantity}
                    {item.shop && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Store size={10} style={{ verticalAlign: -1, marginRight: 2 }} />{item.shop}
                      </span>
                    )}
                  </div>
                </div>
                <div className="item-total">R{item.lineTotal.toFixed(2)}</div>
              </div>
            ))}

            <div className="order-summary" style={{ marginTop: 12, boxShadow: 'none', background: 'var(--bg)' }}>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>R{selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.discountTotal > 0 && (
                <div className="summary-row discount">
                  <span>Discount</span>
                  <span>-R{selectedOrder.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>VAT ({selectedOrder.taxRate}%)</span>
                <span>R{selectedOrder.taxAmount.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>R{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions for Pending orders */}
            {isPending(selectedOrder) && !showCompleteConfirm && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  className="btn btn-success"
                  onClick={() => setShowCompleteConfirm(selectedOrder)}
                  style={{ flex: 2 }}
                >
                  <CheckCircle2 size={16} /> Mark Completed
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  style={{ flex: 1 }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}

            {/* Complete confirmation with payment method */}
            {showCompleteConfirm && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Select Payment Method</h3>
                <div className="payment-toggle">
                  <button
                    className={paymentMethod === 'Cash' ? 'active' : ''}
                    onClick={() => setPaymentMethod('Cash')}
                  >
                    <Banknote size={20} /> Cash
                  </button>
                  <button
                    className={paymentMethod === 'Card' ? 'active' : ''}
                    onClick={() => setPaymentMethod('Card')}
                  >
                    <CreditCard size={20} /> Card
                  </button>
                  <button
                    className={paymentMethod === 'EFT' ? 'active' : ''}
                    onClick={() => setPaymentMethod('EFT')}
                  >
                    <Building2 size={20} /> EFT
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowCompleteConfirm(null)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleCompleteOrder(showCompleteConfirm)}
                    disabled={completing}
                    style={{ flex: 2 }}
                  >
                    {completing ? (
                      <><span className="spinner" /> Processing...</>
                    ) : (
                      <><CheckCircle2 size={16} /> Confirm & Complete</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Completed order lock indicator */}
            {isCompleted(selectedOrder) && (
              <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Lock size={14} /> This order is completed and can no longer be edited
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
