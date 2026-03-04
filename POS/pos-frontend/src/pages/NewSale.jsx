import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { orderApi } from '../api';
import { useToast } from '../hooks/useToast';
import BarcodeScanner from '../components/BarcodeScanner';

const STEPS = {
  CLIENT: 'client',
  SCAN: 'scan',
  PAYMENT: 'payment',
  SUCCESS: 'success',
};

export default function NewSale() {
  const [step, setStep] = useState(STEPS.CLIENT);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [order, setOrder] = useState(null);
  const [showScanner, setShowScanner] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  const handleStartSale = async (e) => {
    e.preventDefault();
    setStarting(true);
    setErrorMsg('');
    try {
      const res = await orderApi.create(clientEmail, clientName);
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
    setOrder(null);
    setPaymentMethod('Cash');
  };

  // Step 1: Client Details
  if (step === STEPS.CLIENT) {
    return (
      <div>
        <div className="page-header">
          <h1>New Sale</h1>
          <p>Enter client details to begin</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <ShoppingCart size={40} color="var(--accent)" />
          </div>

          <form onSubmit={handleStartSale}>
            <div className="input-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="input-group">
              <label>Client Email *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                required
              />
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={starting}>
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
