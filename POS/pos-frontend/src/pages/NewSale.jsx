import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScanLine,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  ShoppingCart,
  X,
  Send,
  AlertCircle,
  Search,
  User,
  UserPlus,
  Users,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { orderApi, customerApi } from '../api';
import { useToast } from '../hooks/useToast';
import BarcodeScanner from '../components/BarcodeScanner';

const STEPS = {
  CLIENT: 'client',
  SCAN: 'scan',
  PAYMENT: 'payment',
  SUCCESS: 'success',
};

const CLIENT_MODES = {
  EXISTING: 'existing',
  NEW: 'new',
  GUEST: 'guest',
};

export default function NewSale() {
  const [step, setStep] = useState(STEPS.CLIENT);
  const [clientMode, setClientMode] = useState(CLIENT_MODES.EXISTING);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);
  // New customer inline
  const [newCustFirstName, setNewCustFirstName] = useState('');
  const [newCustLastName, setNewCustLastName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [order, setOrder] = useState(null);
  const [showScanner, setShowScanner] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  // Debounced customer search
  useEffect(() => {
    if (clientMode !== CLIENT_MODES.EXISTING || customerSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await customerApi.search(customerSearch.trim());
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [customerSearch, clientMode]);

  const selectCustomer = (customer) => {
    setSelectedCustomerId(customer.id);
    setClientName(`${customer.firstName} ${customer.lastName}`);
    setClientEmail(customer.email || '');
    setClientPhone(customer.cellNumber || '');
    setCustomerSearch('');
    setSearchResults([]);
  };

  const handleStartSale = async (e) => {
    e.preventDefault();
    setStarting(true);
    setErrorMsg('');

    let customerId = null;
    let email = clientEmail;
    let name = clientName;
    let phone = clientPhone;

    // If creating a new customer inline, save them first
    if (clientMode === CLIENT_MODES.NEW) {
      try {
        const payload = {
          firstName: newCustFirstName,
          lastName: newCustLastName,
          email: newCustEmail,
          cellNumber: newCustPhone,
          deliveryAddress: { street: '', city: '', province: '', postalCode: '' },
        };
        const custRes = await customerApi.create(payload);
        customerId = custRes.data.id;
        email = newCustEmail;
        name = `${newCustFirstName} ${newCustLastName}`;
        phone = newCustPhone;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to create customer';
        setErrorMsg(msg);
        setStarting(false);
        return;
      }
    } else if (clientMode === CLIENT_MODES.EXISTING) {
      customerId = selectedCustomerId;
    }

    try {
      const res = await orderApi.create(email, name, customerId, phone);
      setOrder(res.data);
      setShowScanner(true);
      setStep(STEPS.SCAN);
      showToast(`Invoice ${res.data.invoiceNumber} created`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create order';
      setErrorMsg(`Could not start sale: ${msg}. Is the server running?`);
      showToast('Failed to create order', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleScanProduct = useCallback(
    async (barcode) => {
      if (!order) return;
      try {
        const res = await orderApi.addItem(order.id, barcode);
        setOrder(res.data);
        showToast('Item added!', 'success');
      } catch (err) {
        const msg = err.response?.data?.message || 'Product not found or out of stock';
        showToast(msg, 'error');
      }
    },
    [order, showToast]
  );

  const handleUpdateQty = async (productId, newQty) => {
    if (!order) return;
    try {
      if (newQty <= 0) {
        const res = await orderApi.removeItem(order.id, productId);
        setOrder(res.data);
      } else {
        const res = await orderApi.updateItemQty(order.id, productId, newQty);
        setOrder(res.data);
      }
    } catch (err) {
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleComplete = async () => {
    if (!order || order.items.length === 0) {
      showToast('Add items before completing', 'error');
      return;
    }
    setProcessing(true);
    try {
      const res = await orderApi.complete(order.id, paymentMethod);
      setOrder(res.data);
      setStep(STEPS.SUCCESS);
      showToast('Sale completed! Invoice sent.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete order';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm('Cancel this sale?')) return;
    try {
      await orderApi.cancel(order.id);
      resetSale();
      showToast('Sale cancelled', 'info');
    } catch (err) {
      showToast('Failed to cancel', 'error');
    }
  };

  const resetSale = () => {
    setStep(STEPS.CLIENT);
    setClientEmail('');
    setClientName('');
    setClientPhone('');
    setSelectedCustomerId(null);
    setCustomerSearch('');
    setSearchResults([]);
    setNewCustFirstName('');
    setNewCustLastName('');
    setNewCustEmail('');
    setNewCustPhone('');
    setClientMode(CLIENT_MODES.EXISTING);
    setOrder(null);
    setPaymentMethod('Cash');
  };

  // Helper: is start-sale enabled?
  const canStart =
    clientMode === CLIENT_MODES.EXISTING
      ? selectedCustomerId && clientName && clientEmail
      : clientMode === CLIENT_MODES.NEW
        ? newCustFirstName && newCustLastName && newCustEmail
        : clientName && clientEmail; // guest needs name + email

  // Step 1: Client Details
  if (step === STEPS.CLIENT) {
    return (
      <div>
        <div className="page-header">
          <h1>New Sale</h1>
          <p>Select or create a customer</p>
        </div>

        {/* Mode Tabs */}
        <div className="payment-toggle" style={{ marginBottom: 16 }}>
          <button
            className={clientMode === CLIENT_MODES.EXISTING ? 'active' : ''}
            onClick={() => setClientMode(CLIENT_MODES.EXISTING)}
          >
            <Users size={18} />
            Existing
          </button>
          <button
            className={clientMode === CLIENT_MODES.NEW ? 'active' : ''}
            onClick={() => setClientMode(CLIENT_MODES.NEW)}
          >
            <UserPlus size={18} />
            New
          </button>
          <button
            className={clientMode === CLIENT_MODES.GUEST ? 'active' : ''}
            onClick={() => setClientMode(CLIENT_MODES.GUEST)}
          >
            <User size={18} />
            Guest
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleStartSale}>
            {/* ---- EXISTING CUSTOMER ---- */}
            {clientMode === CLIENT_MODES.EXISTING && (
              <>
                <div className="input-group">
                  <label>Search Customer</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(null); }}
                      placeholder="Type name, email or phone..."
                    />
                    {searching && (
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      </div>
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {searchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{c.firstName} {c.lastName}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {c.email}{c.cellNumber ? ` • ${c.cellNumber}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected customer summary */}
                {selectedCustomerId && (
                  <div style={{ background: 'var(--success-bg, #dcfce7)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <User size={20} color="var(--success, #16a34a)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{clientName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {clientEmail}{clientPhone ? ` • ${clientPhone}` : ''}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSelectedCustomerId(null); setClientName(''); setClientEmail(''); setClientPhone(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ---- NEW CUSTOMER ---- */}
            {clientMode === CLIENT_MODES.NEW && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>First Name *</label>
                    <input type="text" value={newCustFirstName} onChange={(e) => setNewCustFirstName(e.target.value)} placeholder="John" required />
                  </div>
                  <div className="input-group">
                    <label>Last Name *</label>
                    <input type="text" value={newCustLastName} onChange={(e) => setNewCustLastName(e.target.value)} placeholder="Doe" required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Email *</label>
                  <input type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} placeholder="john@example.com" required />
                </div>
                <div className="input-group">
                  <label>Cell Number</label>
                  <input type="tel" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="+27 82 123 4567" />
                </div>
              </>
            )}

            {/* ---- GUEST SALE ---- */}
            {clientMode === CLIENT_MODES.GUEST && (
              <>
                <div className="input-group">
                  <label>Name *</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Walk-in Customer" required />
                </div>
                <div className="input-group">
                  <label>Email *</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" required />
                </div>
              </>
            )}

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={starting || !canStart}>
              {starting ? (
                <><span className="spinner" /> Connecting...</>
              ) : (
                <><ScanLine size={18} /> Start Scanning Products</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Scan Products
  if (step === STEPS.SCAN) {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Scan Items</h1>
            <p>
              {order?.invoiceNumber} •{' '}
              <span style={{ fontWeight: 500 }}>{clientName}</span>
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleCancel}
            style={{ width: 'auto', marginTop: 4 }}
          >
            Cancel
          </button>
        </div>

        {/* Scan Button */}
        <button
          className="btn btn-primary"
          onClick={() => setShowScanner(!showScanner)}
          style={{ marginBottom: 16 }}
        >
          <ScanLine size={18} /> {showScanner ? 'Hide Scanner' : 'Scan Product'}
        </button>

        {/* Scanner */}
        {showScanner && (
          <div style={{ marginBottom: 16 }}>
            <BarcodeScanner onScan={handleScanProduct} continuous />
          </div>
        )}

        {/* Order Items */}
        {order?.items?.length > 0 ? (
          <div className="card">
            <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              ORDER ITEMS ({order.items.length})
            </h3>

            {order.items.map((item) => (
              <div key={item.productId} className="order-item">
                <div className="item-info">
                  <div className="item-name">{item.productName}</div>
                  <div className="item-price">
                    {item.discountPercentage > 0 && (
                      <span style={{ textDecoration: 'line-through', marginRight: 4 }}>
                        R{item.unitPrice.toFixed(2)}
                      </span>
                    )}
                    R{item.effectivePrice.toFixed(2)} each
                  </div>
                </div>
                <div className="item-qty">
                  <button onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}>
                    {item.quantity === 1 ? <Trash2 size={14} color="var(--danger)" /> : <Minus size={14} />}
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className="item-total">R{item.lineTotal.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ScanLine size={48} />
            <h3>No items yet</h3>
            <p>Scan product barcodes to add items</p>
          </div>
        )}

        {/* Order Summary */}
        {order?.items?.length > 0 && (
          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>R{order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="summary-row discount">
                <span>Discount</span>
                <span>-R{order.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>VAT ({order.taxRate}% incl.)</span>
              <span>R{order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>R{order.total.toFixed(2)}</span>
            </div>

            <button
              className="btn btn-success"
              onClick={() => setStep(STEPS.PAYMENT)}
              style={{ marginTop: 16 }}
            >
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Payment
  if (step === STEPS.PAYMENT) {
    return (
      <div>
        <div className="page-header">
          <h1>Payment</h1>
          <p>{order?.invoiceNumber} • R{order?.total.toFixed(2)}</p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            PAYMENT METHOD
          </h3>

          <div className="payment-toggle">
            <button
              className={paymentMethod === 'Cash' ? 'active' : ''}
              onClick={() => setPaymentMethod('Cash')}
            >
              <Banknote size={24} />
              Cash
            </button>
            <button
              className={paymentMethod === 'Card' ? 'active' : ''}
              onClick={() => setPaymentMethod('Card')}
            >
              <CreditCard size={24} />
              Card
            </button>
            <button
              className={paymentMethod === 'EFT' ? 'active' : ''}
              onClick={() => setPaymentMethod('EFT')}
            >
              <Building2 size={24} />
              EFT
            </button>
          </div>

          {/* Order Summary */}
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>ORDER SUMMARY</div>
            {order?.items.map((item) => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                <span>{item.productName} x{item.quantity}</span>
                <span>R{item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-row total" style={{ marginTop: 12 }}>
              <span>Total</span>
              <span>R{order?.total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Send size={14} />
            Invoice will be emailed to <strong>{clientEmail}</strong>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline"
              onClick={() => setStep(STEPS.SCAN)}
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              className="btn btn-success"
              onClick={handleComplete}
              disabled={processing}
              style={{ flex: 2 }}
            >
              {processing ? (
                <>
                  <span className="spinner" /> Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Confirm Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Success
  if (step === STEPS.SUCCESS) {
    return (
      <div>
        <div className="success-screen">
          <div className="success-icon">
            <CheckCircle2 />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Sale Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Invoice {order?.invoiceNumber} has been sent to {clientEmail}
          </p>

          <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
            <div className="summary-row">
              <span>Invoice</span>
              <span style={{ fontWeight: 600 }}>{order?.invoiceNumber}</span>
            </div>
            <div className="summary-row">
              <span>Client</span>
              <span>{clientName}</span>
            </div>
            <div className="summary-row">
              <span>Items</span>
              <span>{order?.items.length}</span>
            </div>
            <div className="summary-row">
              <span>Payment</span>
              <span className="badge badge-info">{order?.paymentMethod}</span>
            </div>
            <div className="summary-row total">
              <span>Total Paid</span>
              <span>R{order?.total.toFixed(2)}</span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={resetSale}>
            <ShoppingCart size={18} /> Start New Sale
          </button>
        </div>
      </div>
    );
  }

  return null;
}
