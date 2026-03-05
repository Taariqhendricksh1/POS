import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  PackagePlus,
  PackageX,
  Percent,
  Truck,
} from 'lucide-react';
import { orderApi, customerApi, productApi, settingsApi } from '../api';
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
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const productSearchTimer = useRef(null);
  // Email status
  const [emailStatus, setEmailStatus] = useState(null); // null=pending, true=sent, false=failed
  const [resending, setResending] = useState(false);
  // Quick add product
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductBarcode, setAddProductBarcode] = useState('');
  const [addProductName, setAddProductName] = useState('');
  const [addProductPrice, setAddProductPrice] = useState('');
  const [addProductStock, setAddProductStock] = useState('1');
  const [addProductShop, setAddProductShop] = useState('');
  const [addProductSku, setAddProductSku] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [shops, setShops] = useState([]);
  // Out of stock
  const [outOfStockProduct, setOutOfStockProduct] = useState(null);
  const [stockUpdateQty, setStockUpdateQty] = useState('1');
  const [updatingStock, setUpdatingStock] = useState(false);
  // Inline discount
  const [discountItemId, setDiscountItemId] = useState(null);
  const [discountValue, setDiscountValue] = useState('');
  const invoiceRef = useRef(null);
  // Shipping & Delivery
  const [shippingCost, setShippingCost] = useState('');
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryProvince, setDeliveryProvince] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [customerAddress, setCustomerAddress] = useState(null); // stored address from customer
  const [useCustomerAddress, setUseCustomerAddress] = useState(true);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const resumeHandled = useRef(false);

  // Load shops from settings
  useEffect(() => {
    settingsApi.getShops().then(res => setShops(res.data)).catch(() => {});
  }, []);

  // Resume a pending order from OrderHistory
  useEffect(() => {
    const resumeId = location.state?.resumeOrderId;
    if (!resumeId || resumeHandled.current) return;
    resumeHandled.current = true;
    // Clear the navigation state so a refresh doesn't re-trigger
    navigate(location.pathname, { replace: true, state: {} });
    (async () => {
      try {
        const res = await orderApi.getById(resumeId);
        const o = res.data;
        if (o.status !== 'Pending') {
          showToast('This order is no longer pending', 'error');
          return;
        }
        setOrder(o);
        setClientName(o.clientName || '');
        setClientEmail(o.clientEmail || '');
        setClientPhone(o.clientPhone || '');
        setSelectedCustomerId(o.customerId || null);
        if (o.shippingCost > 0) setShippingCost(String(o.shippingCost));
        if (o.deliveryRequired) {
          setDeliveryRequired(true);
          if (o.deliveryAddress) {
            setDeliveryStreet(o.deliveryAddress.street || '');
            setDeliveryCity(o.deliveryAddress.city || '');
            setDeliveryProvince(o.deliveryAddress.province || '');
            setDeliveryPostalCode(o.deliveryAddress.postalCode || '');
          }
        }
        setStep(STEPS.SCAN);
        showToast(`Resuming ${o.invoiceNumber}`, 'info');
      } catch {
        showToast('Failed to load order', 'error');
      }
    })();
  }, [location.state]);

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
    if (!order) return;
    try {
      const res = await orderApi.addItem(order.id, barcode);
      setOrder(res.data);
      setProductSearch('');
      setProductResults([]);
      setShowAddProduct(false);
      setOutOfStockProduct(null);
      showToast('Item added!', 'success');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errorCode === 'OUT_OF_STOCK') {
        setOutOfStockProduct(data.product);
        setStockUpdateQty('1');
        setShowAddProduct(false);
        showToast(`${data.product.name} is out of stock`, 'warning');
      } else {
        const msg = data?.message || 'Product not found';
        showToast(msg, 'error');
        setOutOfStockProduct(null);
        setAddProductBarcode(barcode);
        setShowAddProduct(true);
      }
      setProductSearch('');
      setProductResults([]);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomerId(customer.id);
    setClientName(`${customer.firstName} ${customer.lastName}`);
    setClientEmail(customer.email || '');
    setClientPhone(customer.cellNumber || '');
    setCustomerSearch('');
    setSearchResults([]);
    // Capture stored delivery address
    const addr = customer.deliveryAddress;
    if (addr && (addr.street || addr.city || addr.province || addr.postalCode)) {
      setCustomerAddress(addr);
      setDeliveryStreet(addr.street || '');
      setDeliveryCity(addr.city || '');
      setDeliveryProvince(addr.province || '');
      setDeliveryPostalCode(addr.postalCode || '');
      setUseCustomerAddress(true);
    } else {
      setCustomerAddress(null);
      setUseCustomerAddress(false);
    }
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
      setShowScanner(false);
      setStep(STEPS.SCAN);
      setEmailStatus(null);
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
        setShowAddProduct(false);
        setOutOfStockProduct(null);
      } catch (err) {
        const data = err.response?.data;
        if (data?.errorCode === 'OUT_OF_STOCK') {
          setOutOfStockProduct(data.product);
          setStockUpdateQty('1');
          setShowAddProduct(false);
          showToast(`${data.product.name} is out of stock`, 'warning');
        } else {
          const msg = data?.message || 'Product not found';
          showToast(msg, 'error');
          setOutOfStockProduct(null);
          setAddProductBarcode(barcode);
          setShowAddProduct(true);
        }
      }
    },
    [order, showToast]
  );

  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    if (!addProductBarcode && !addProductSku) {
      showToast('Either barcode or SKU is required', 'error');
      return;
    }
    setAddingProduct(true);
    try {
      await productApi.create({
        barcode: addProductBarcode,
        name: addProductName,
        sellingPrice: parseFloat(addProductPrice),
        quantityInStock: parseInt(addProductStock) || 1,
        category: '',
        shop: addProductShop,
        sku: addProductSku,
        costPrice: 0,
        description: '',
        reorderLevel: 0,
      });
      showToast(`${addProductName} added to inventory`, 'success');
      // Now add it to the order using barcode or SKU
      const identifier = addProductBarcode || addProductSku;
      try {
        const res = await orderApi.addItem(order.id, identifier);
        setOrder(res.data);
        showToast('Item added to order!', 'success');
      } catch {
        showToast('Product saved but could not add to order — try scanning again', 'warning');
      }
      setShowAddProduct(false);
      setAddProductBarcode('');
      setAddProductName('');
      setAddProductPrice('');
      setAddProductStock('1');
      setAddProductShop('');
      setAddProductSku('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create product';
      showToast(msg, 'error');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    if (!outOfStockProduct || !order) return;
    setUpdatingStock(true);
    try {
      const qty = parseInt(stockUpdateQty) || 1;
      await productApi.updateStock(outOfStockProduct.id, qty);
      showToast(`Stock updated for ${outOfStockProduct.name}`, 'success');
      // Now add it to the order
      try {
        const res = await orderApi.addItem(order.id, outOfStockProduct.barcode);
        setOrder(res.data);
        showToast('Item added to order!', 'success');
      } catch {
        showToast('Stock updated but could not add to order — try again', 'warning');
      }
      setOutOfStockProduct(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update stock';
      showToast(msg, 'error');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleApplyDiscount = async (productId) => {
    if (!order) return;
    const pct = parseFloat(discountValue);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast('Enter a valid discount between 0 and 100', 'error');
      return;
    }
    try {
      const res = await orderApi.updateItemDiscount(order.id, productId, pct);
      setOrder(res.data);
      setDiscountItemId(null);
      setDiscountValue('');
      showToast(pct > 0 ? `${pct}% discount applied` : 'Discount removed', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply discount';
      showToast(msg, 'error');
    }
  };

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
      // Save delivery info if required
      if (deliveryRequired) {
        await orderApi.setDeliveryInfo(
          order.id, true,
          deliveryStreet, deliveryCity, deliveryProvince, deliveryPostalCode
        );
      }
      const res = await orderApi.complete(order.id, paymentMethod);
      setOrder(res.data);
      setStep(STEPS.SUCCESS);
      setEmailStatus(null);
      showToast('Sale completed! Invoice sent.', 'success');
      pollEmailStatus(res.data.id);
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
    setProductSearch('');
    setProductResults([]);
    setEmailStatus(null);
    setShippingCost('');
    setDeliveryRequired(false);
    setDeliveryStreet('');
    setDeliveryCity('');
    setDeliveryProvince('');
    setDeliveryPostalCode('');
    setCustomerAddress(null);
    setUseCustomerAddress(true);
  };

  const pollEmailStatus = async (orderId) => {
    // Check email status after a few seconds
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await orderApi.getById(orderId);
        if (res.data.emailSent === true) { setEmailStatus(true); return; }
        if (res.data.emailSent === false) { setEmailStatus(false); return; }
      } catch { /* keep polling */ }
    }
    setEmailStatus(false); // Assume failed after 18s
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setResending(true);
    try {
      await orderApi.resendEmail(order.id);
      setEmailStatus(true);
      showToast('Invoice email sent!', 'success');
    } catch (err) {
      showToast('Failed to send email', 'error');
      setEmailStatus(false);
    } finally {
      setResending(false);
    }
  };

  // Helper: is start-sale enabled?
  const canStart =
    clientMode === CLIENT_MODES.EXISTING
      ? selectedCustomerId && clientName
      : clientMode === CLIENT_MODES.NEW
        ? newCustFirstName && newCustLastName && newCustEmail
        : clientName; // guest only needs name

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
                  <label>Email <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>(optional — leave blank for no-email sale)</span></label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com (optional)" />
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
                <><ShoppingCart size={18} /> Select Products</>
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
            <h1>Product Selection</h1>
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

        {/* Product Search */}
        <div style={{ marginBottom: 16 }}>
          <div className="search-bar">
            <Search />
            <input
              type="text"
              placeholder="Search product by name..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
            />
            {searchingProducts && (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>
          {productResults.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: 200, overflowY: 'auto', background: 'var(--card-bg, white)' }}>
              {productResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProductByBarcode(p.barcode)}
                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {p.barcode} • Stock: {p.stockQuantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>R{p.sellingPrice.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scan Product Button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${showScanner ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowScanner(!showScanner)}
            style={{ flex: 1 }}
          >
            <ScanLine size={18} /> {showScanner ? 'Hide Scanner' : 'Scan Product'}
          </button>
        </div>

        {/* Scanner (hidden by default) */}
        {showScanner && (
          <div style={{ marginBottom: 16 }}>
            <BarcodeScanner onScan={handleScanProduct} continuous />
          </div>
        )}

        {/* Out of Stock — Update Stock */}
        {outOfStockProduct && (
          <div className="card" style={{ padding: 16, marginBottom: 16, border: '2px solid var(--danger, #ef4444)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger, #ef4444)' }}>
                <PackageX size={16} /> Out of Stock
              </h3>
              <button onClick={() => setOutOfStockProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{outOfStockProduct.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Barcode: {outOfStockProduct.barcode}
                {outOfStockProduct.shop && <> • Shop: {outOfStockProduct.shop}</>}
              </div>
              <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: 4 }}>R{outOfStockProduct.sellingPrice.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--danger, #ef4444)', marginTop: 4 }}>Current stock: {outOfStockProduct.quantityInStock}</div>
            </div>
            <form onSubmit={handleStockUpdate}>
              <div className="input-group">
                <label>Add Stock Quantity *</label>
                <input type="number" min="1" value={stockUpdateQty} onChange={(e) => setStockUpdateQty(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn btn-success" disabled={updatingStock}>
                {updatingStock ? <><span className="spinner" /> Updating...</> : <><Plus size={16} /> Update Stock & Add to Order</>}
              </button>
            </form>
          </div>
        )}

        {/* Quick Add Product (shown when scan/search fails) */}
        {showAddProduct && (
          <div className="card" style={{ padding: 16, marginBottom: 16, border: '2px solid var(--warning, #f59e0b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PackagePlus size={16} /> Product Not Found — Add It
              </h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleQuickAddProduct}>
              <div className="input-group">
                <label>Barcode <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>(optional if SKU provided)</span></label>
                <input type="text" value={addProductBarcode} onChange={(e) => setAddProductBarcode(e.target.value)} />
              </div>
              <div className="input-group">
                <label>SKU {!addProductBarcode ? '*' : <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>(optional if barcode provided)</span>}</label>
                <input type="text" value={addProductSku} onChange={(e) => setAddProductSku(e.target.value)} placeholder="SKU code" required={!addProductBarcode} />
              </div>
              <div className="input-group">
                <label>Product Name *</label>
                <input type="text" value={addProductName} onChange={(e) => setAddProductName(e.target.value)} placeholder="Product name" required autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Selling Price (R) *</label>
                  <input type="number" step="0.01" min="0" value={addProductPrice} onChange={(e) => setAddProductPrice(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="input-group">
                  <label>Stock Qty</label>
                  <input type="number" min="1" value={addProductStock} onChange={(e) => setAddProductStock(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>Shop *</label>
                <select value={addProductShop} onChange={(e) => setAddProductShop(e.target.value)} required>
                  <option value="">Select shop...</option>
                  {shops.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-success" disabled={addingProduct}>
                {addingProduct ? <><span className="spinner" /> Saving...</> : <><PackagePlus size={16} /> Add Product & Add to Order</>}
              </button>
            </form>
          </div>
        )}

        {/* Order Items */}
        {order?.items?.length > 0 ? (
          <div className="card">
            <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              ORDER ITEMS ({order.items.length})
            </h3>

            {order.items.map((item) => (
              <div key={item.productId}>
                <div className="order-item">
                  <div className="item-info">
                    <div className="item-name">{item.productName}</div>
                    <div className="item-price">
                      {item.discountPercentage > 0 && (
                        <span style={{ textDecoration: 'line-through', marginRight: 4 }}>
                          R{item.unitPrice.toFixed(2)}
                        </span>
                      )}
                      R{item.effectivePrice.toFixed(2)} each
                      {item.discountPercentage > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--success, #16a34a)', marginLeft: 4 }}>
                          -{item.discountPercentage}%
                        </span>
                      )}
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
                  <div className="item-total">
                    R{item.lineTotal.toFixed(2)}
                    {/* Discount button — only if no product-level discount */}
                    {!item.isProductDiscount && (
                      <button
                        onClick={() => {
                          setDiscountItemId(discountItemId === item.productId ? null : item.productId);
                          setDiscountValue(item.discountPercentage > 0 ? String(item.discountPercentage) : '');
                        }}
                        title="Add discount"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', marginLeft: 4,
                          color: item.discountPercentage > 0 ? 'var(--success, #16a34a)' : 'var(--text-secondary)',
                        }}
                      >
                        <Percent size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Inline discount input */}
                {discountItemId === item.productId && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px 10px', background: 'var(--bg)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                    <Percent size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="Discount %"
                      autoFocus
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyDiscount(item.productId); if (e.key === 'Escape') { setDiscountItemId(null); setDiscountValue(''); } }}
                    />
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApplyDiscount(item.productId)}
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                    >
                      Apply
                    </button>
                    {item.discountPercentage > 0 && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={async () => {
                          try {
                            const res = await orderApi.updateItemDiscount(order.id, item.productId, 0);
                            setOrder(res.data);
                            setDiscountItemId(null);
                            setDiscountValue('');
                            showToast('Discount removed', 'success');
                          } catch { showToast('Failed to remove discount', 'error'); }
                        }}
                        style={{ width: 'auto', padding: '6px 10px', fontSize: 12, color: 'var(--danger)' }}
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => { setDiscountItemId(null); setDiscountValue(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
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

            {/* Shipping Cost */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <Truck size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, flex: 1 }}>Shipping</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 120 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>R</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  onBlur={async () => {
                    const cost = parseFloat(shippingCost) || 0;
                    try {
                      const res = await orderApi.setShippingCost(order.id, cost);
                      setOrder(res.data);
                    } catch { showToast('Failed to update shipping', 'error'); }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, textAlign: 'right' }}
                />
              </div>
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
            {order?.shippingCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>Shipping</span>
                <span>R{order.shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total" style={{ marginTop: 12 }}>
              <span>Total</span>
              <span>R{order?.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Section */}
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={deliveryRequired}
                onChange={(e) => setDeliveryRequired(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
              <Truck size={18} />
              Delivery Required
            </label>

            {deliveryRequired && (
              <div style={{ marginTop: 14 }}>
                {/* If customer has a stored address, show toggle */}
                {customerAddress && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={useCustomerAddress}
                        onChange={(e) => {
                          setUseCustomerAddress(e.target.checked);
                          if (e.target.checked) {
                            setDeliveryStreet(customerAddress.street || '');
                            setDeliveryCity(customerAddress.city || '');
                            setDeliveryProvince(customerAddress.province || '');
                            setDeliveryPostalCode(customerAddress.postalCode || '');
                          } else {
                            setDeliveryStreet('');
                            setDeliveryCity('');
                            setDeliveryProvince('');
                            setDeliveryPostalCode('');
                          }
                        }}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      Use customer's stored address
                    </label>
                    {useCustomerAddress && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, marginLeft: 26, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} />
                        {[customerAddress.street, customerAddress.city, customerAddress.province, customerAddress.postalCode].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Address fields — show if no customer address or not using it */}
                {(!customerAddress || !useCustomerAddress) && (
                  <div>
                    <div className="input-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12 }}>Street Address</label>
                      <input type="text" value={deliveryStreet} onChange={(e) => setDeliveryStreet(e.target.value)} placeholder="123 Main Street" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="input-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12 }}>City</label>
                        <input type="text" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} placeholder="Cape Town" />
                      </div>
                      <div className="input-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12 }}>Province</label>
                        <input type="text" value={deliveryProvince} onChange={(e) => setDeliveryProvince(e.target.value)} placeholder="Western Cape" />
                      </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>Postal Code</label>
                      <input type="text" value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value)} placeholder="8001" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Send size={14} />
            {clientEmail
              ? <>Invoice will be emailed to <strong>{clientEmail}</strong></>
              : <>No email — invoice will be shown on screen for screenshot</>
            }
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
    const hasEmail = !!clientEmail;
    return (
      <div>
        <div className="success-screen">
          <div className="success-icon">
            <CheckCircle2 />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Sale Complete!</h2>

          {/* Email status — only show if customer has email */}
          {hasEmail && emailStatus === null && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending invoice to {clientEmail}...
            </p>
          )}
          {hasEmail && emailStatus === true && (
            <p style={{ color: 'var(--success, #16a34a)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Send size={14} /> Invoice sent to {clientEmail}
            </p>
          )}
          {hasEmail && emailStatus === false && (
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                <AlertCircle size={14} /> Failed to send invoice to {clientEmail}
              </p>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleResendEmail}
                disabled={resending}
                style={{ width: 'auto', display: 'inline-flex' }}
              >
                {resending ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending...</> : <><Send size={14} /> Resend Invoice</>}
              </button>
            </div>
          )}

          {/* No-email notice */}
          {!hasEmail && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
              <AlertCircle size={14} /> No email — invoice sent to company email. Use screenshot below for WhatsApp.
            </p>
          )}

          {/* Invoice Preview for screenshot — always shown, especially useful for no-email sales */}
          <div ref={invoiceRef} style={{
            background: 'white', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 24px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>INVOICE</h3>
              <div style={{ display: 'inline-block', background: '#16c784', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 6 }}>PAID</div>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Invoice</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{order?.invoiceNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Client</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{clientName}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Payment</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{order?.paymentMethod}</div>
              </div>
            </div>
            <div style={{ padding: '12px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 10, textTransform: 'uppercase', color: '#888' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '8px 4px', fontSize: 10, textTransform: 'uppercase', color: '#888' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 10, textTransform: 'uppercase', color: '#888' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 10, textTransform: 'uppercase', color: '#888' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order?.items.map((item) => (
                    <tr key={item.productId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 4px' }}>{item.productName}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '8px 4px' }}>
                        {item.discountPercentage > 0
                          ? <><s style={{ color: '#999' }}>R{item.unitPrice.toFixed(2)}</s> R{item.effectivePrice.toFixed(2)}</>
                          : <>R{item.effectivePrice.toFixed(2)}</>
                        }
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600 }}>R{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>Subtotal</span><span>R{order?.subtotal.toFixed(2)}</span>
              </div>
              {order?.discountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--success, green)' }}>
                  <span>Discount</span><span>-R{order.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>VAT ({order?.taxRate}% incl.)</span><span>R{order?.taxAmount.toFixed(2)}</span>
              </div>
              {order?.shippingCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>Shipping</span><span>R{order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 18, fontWeight: 700, borderTop: '2px solid #1a1a2e', marginTop: 8 }}>
                <span>Total</span><span>R{order?.total.toFixed(2)}</span>
              </div>
            </div>
            {/* Delivery info */}
            {deliveryRequired && (
              <div style={{ padding: '12px 20px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Truck size={16} style={{ color: '#166534', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>Delivery Included</div>
                  <div style={{ fontSize: 12, color: '#333', marginTop: 2 }}>
                    {[deliveryStreet, deliveryCity, deliveryProvince, deliveryPostalCode].filter(Boolean).join(', ') || 'Address on file'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Screenshot button */}
          <button
            className="btn btn-outline"
            onClick={() => {
              if (invoiceRef.current) {
                // Use native share/screenshot where available, fallback to select content
                if (navigator.share) {
                  // Try to use canvas to create image for sharing
                  import('html2canvas').then(({ default: html2canvas }) => {
                    html2canvas(invoiceRef.current, { scale: 2, useCORS: true }).then(canvas => {
                      canvas.toBlob(blob => {
                        const file = new File([blob], `${order?.invoiceNumber || 'invoice'}.png`, { type: 'image/png' });
                        navigator.share({ files: [file], title: order?.invoiceNumber }).catch(() => {
                          // Fallback: download the image
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${order?.invoiceNumber || 'invoice'}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                      });
                    });
                  }).catch(() => {
                    showToast('Take a screenshot of the invoice above', 'info');
                  });
                } else {
                  // Desktop fallback: try html2canvas download
                  import('html2canvas').then(({ default: html2canvas }) => {
                    html2canvas(invoiceRef.current, { scale: 2, useCORS: true }).then(canvas => {
                      const url = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${order?.invoiceNumber || 'invoice'}.png`;
                      a.click();
                    });
                  }).catch(() => {
                    showToast('Take a screenshot of the invoice above', 'info');
                  });
                }
              }
            }}
            style={{ marginBottom: 12, width: '100%' }}
          >
            📸 Save Invoice Image
          </button>

          <button className="btn btn-primary" onClick={resetSale} style={{ width: '100%' }}>
            <ShoppingCart size={18} /> Start New Sale
          </button>
        </div>
      </div>
    );
  }

  return null;
}
