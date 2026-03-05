import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScanLine,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  Search,
  ArrowRightLeft,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  PackagePlus,
  Package,
} from 'lucide-react';
import { stockTransferApi, productApi } from '../api';
import { useToast } from '../hooks/useToast';
import BarcodeScanner from '../components/BarcodeScanner';

const STEPS = {
  RECIPIENT: 'recipient',
  ITEMS: 'items',
  SUCCESS: 'success',
};

export default function StockTransfer() {
  const [step, setStep] = useState(STEPS.RECIPIENT);
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [transfer, setTransfer] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const productSearchTimer = useRef(null);
  const { showToast } = useToast();

  // Debounced product search
  useEffect(() => {
    if (productSearch.trim().length < 2) {
      setProductResults([]);
      return;
    }
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await productApi.search(productSearch.trim());
        setProductResults(res.data);
      } catch {
        setProductResults([]);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);
    return () => clearTimeout(productSearchTimer.current);
  }, [productSearch]);

  const handleAddProductByBarcode = async (barcode) => {
    if (!transfer) return;
    try {
      const res = await stockTransferApi.addItem(transfer.id, barcode);
      setTransfer(res.data);
      setProductSearch('');
      setProductResults([]);
      showToast('Item added!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Product not found';
      showToast(msg, 'error');
      setProductSearch('');
      setProductResults([]);
    }
  };

  const handleStartTransfer = async (e) => {
    e.preventDefault();
    setStarting(true);
    setErrorMsg('');
    try {
      const res = await stockTransferApi.create(
        recipientCompany, recipientContact || null,
        recipientPhone || null, recipientEmail || null,
        notes || null
      );
      setTransfer(res.data);
      setStep(STEPS.ITEMS);
      showToast(`Transfer ${res.data.transferNumber} created`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create transfer';
      setErrorMsg(`Could not start transfer: ${msg}`);
      showToast('Failed to create transfer', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleScanProduct = useCallback(
    async (barcode) => {
      if (!transfer) return;
      try {
        const res = await stockTransferApi.addItem(transfer.id, barcode);
        setTransfer(res.data);
        showToast('Item added!', 'success');
      } catch (err) {
        const msg = err.response?.data?.message || 'Product not found';
        showToast(msg, 'error');
      }
    },
    [transfer, showToast]
  );

  const handleUpdateQty = async (productId, newQty) => {
    if (!transfer) return;
    try {
      if (newQty <= 0) {
        const res = await stockTransferApi.removeItem(transfer.id, productId);
        setTransfer(res.data);
      } else {
        const res = await stockTransferApi.updateItemQty(transfer.id, productId, newQty);
        setTransfer(res.data);
      }
    } catch {
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleComplete = async () => {
    if (!transfer || transfer.items.length === 0) {
      showToast('Add items before completing', 'error');
      return;
    }
    setProcessing(true);
    try {
      const res = await stockTransferApi.complete(transfer.id);
      setTransfer(res.data);
      setStep(STEPS.SUCCESS);
      showToast('Stock transfer completed!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete transfer';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    if (!window.confirm('Cancel this stock transfer?')) return;
    try {
      await stockTransferApi.cancel(transfer.id);
      resetTransfer();
      showToast('Transfer cancelled', 'info');
    } catch {
      showToast('Failed to cancel', 'error');
    }
  };

  const resetTransfer = () => {
    setStep(STEPS.RECIPIENT);
    setRecipientCompany('');
    setRecipientContact('');
    setRecipientPhone('');
    setRecipientEmail('');
    setNotes('');
    setTransfer(null);
    setProductSearch('');
    setProductResults([]);
  };

  // Step 1: Recipient Details
  if (step === STEPS.RECIPIENT) {
    return (
      <div>
        <div className="page-header">
          <h1>Stock Transfer</h1>
          <p>Transfer stock to another company</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleStartTransfer}>
            <div className="input-group">
              <label><Building2 size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Company Name *</label>
              <input
                type="text"
                value={recipientCompany}
                onChange={(e) => setRecipientCompany(e.target.value)}
                placeholder="Recipient company name"
                required
              />
            </div>
            <div className="input-group">
              <label><User size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Contact Person</label>
              <input
                type="text"
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                placeholder="Contact person name"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label><Phone size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Phone</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                />
              </div>
              <div className="input-group">
                <label><Mail size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="email@company.com"
                />
              </div>
            </div>
            <div className="input-group">
              <label><FileText size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer, special instructions, etc."
                rows={3}
                style={{ width: '100%', resize: 'vertical', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }}
              />
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={starting || !recipientCompany.trim()}>
              {starting ? (
                <><span className="spinner" /> Creating...</>
              ) : (
                <><ArrowRightLeft size={18} /> Select Products to Transfer</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Add Items
  if (step === STEPS.ITEMS) {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Select Products</h1>
            <p>
              {transfer?.transferNumber} &bull; To: {recipientCompany}
            </p>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleCancel}>
            <X size={16} /> Cancel
          </button>
        </div>

        {/* Barcode scanner toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn ${showScanner ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowScanner(!showScanner)}
            style={{ flex: 1, fontSize: 13 }}
          >
            <ScanLine size={16} /> {showScanner ? 'Hide Scanner' : 'Scan Barcode'}
          </button>
        </div>

        {showScanner && (
          <div style={{ marginBottom: 16 }}>
            <BarcodeScanner onScan={handleScanProduct} />
          </div>
        )}

        {/* Product search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search product by name, barcode, SKU..."
              style={{ paddingLeft: 36, width: '100%' }}
            />
            {searchingProducts && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              </div>
            )}
          </div>
          {productResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: 'var(--card-bg, white)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {productResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProductByBarcode(p.barcode)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {p.barcode}{p.shop ? ` • ${p.shop}` : ''} • Stock: {p.quantityInStock}
                    </div>
                  </div>
                  <Plus size={18} color="var(--primary)" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfer Items List */}
        {transfer?.items?.length > 0 && (
          <div className="order-items">
            {transfer.items.map((item) => (
              <div key={item.productId} className="order-item">
                <div className="order-item-info">
                  <span className="order-item-name">{item.productName}</span>
                  <span className="order-item-meta">
                    {item.barcode}{item.shop ? ` • ${item.shop}` : ''}
                  </span>
                </div>
                <div className="order-item-actions">
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                  <button className="qty-btn danger" onClick={() => handleUpdateQty(item.productId, 0)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {(!transfer?.items || transfer.items.length === 0) && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <Package size={48} />
            <h3>No items yet</h3>
            <p>Scan or search products to add items for transfer</p>
          </div>
        )}

        {/* Transfer Summary */}
        {transfer?.items?.length > 0 && (
          <div className="order-summary">
            <div className="summary-row">
              <span>Total Products</span>
              <span>{transfer.totalItems}</span>
            </div>
            <div className="summary-row total">
              <span>Total Units</span>
              <span>{transfer.totalQuantity}</span>
            </div>

            <button
              className="btn btn-success"
              onClick={handleComplete}
              disabled={processing}
              style={{ marginTop: 16 }}
            >
              {processing ? (
                <><span className="spinner" /> Processing...</>
              ) : (
                <><CheckCircle2 size={18} /> Complete Transfer</>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Success
  if (step === STEPS.SUCCESS) {
    return (
      <div>
        <div className="success-screen">
          <div className="success-icon">
            <CheckCircle2 />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Transfer Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Stock has been deducted from inventory
          </p>

          <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
            <div className="summary-row">
              <span>Transfer #</span>
              <span style={{ fontWeight: 600 }}>{transfer?.transferNumber}</span>
            </div>
            <div className="summary-row">
              <span>Recipient</span>
              <span>{recipientCompany}</span>
            </div>
            {recipientContact && (
              <div className="summary-row">
                <span>Contact</span>
                <span>{recipientContact}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Products</span>
              <span>{transfer?.totalItems}</span>
            </div>
            <div className="summary-row total">
              <span>Total Units</span>
              <span>{transfer?.totalQuantity}</span>
            </div>
            {transfer?.items?.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>ITEMS TRANSFERRED</div>
                {transfer.items.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                    <span>{item.productName}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
            {notes && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>NOTES</div>
                <div style={{ fontSize: 14 }}>{notes}</div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={resetTransfer}>
            <ArrowRightLeft size={18} /> New Transfer
          </button>
        </div>
      </div>
    );
  }

  return null;
}
