import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  ScanLine,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Store,
  CheckCircle,
} from 'lucide-react';
import { productApi } from '../api';
import { useToast } from '../hooks/useToast';
import BarcodeScanner from '../components/BarcodeScanner';

const emptyProduct = {
  barcode: '',
  name: '',
  description: '',
  category: '',
  shop: '',
  costPrice: '',
  sellingPrice: '',
  discountPercentage: '0',
  quantityInStock: '',
  reorderLevel: '10',
  sku: '',
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [tab, setTab] = useState('all'); // 'all', 'lowStock'
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
    loadShops();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, search, tab, selectedShop]);

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll();
      setProducts(res.data);
    } catch (err) {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const res = await productApi.getShops();
      setShops(res.data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (selectedShop) {
      filtered = filtered.filter((p) => p.shop === selectedShop);
    }

    if (tab === 'lowStock') {
      filtered = filtered.filter(
        (p) => p.isActive && p.quantityInStock <= p.reorderLevel
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleScanForAdd = (barcode) => {
    // Guard: if form is already showing, ignore duplicate scan events
    if (showForm) return;

    // Show green confirmation with scanned barcode
    setScannedBarcode(barcode);

    // Brief delay so user sees the confirmation, then open form
    setTimeout(() => {
      setShowScanner(false);
      setScannedBarcode('');
      setFormData({ ...emptyProduct, barcode });
      setEditingProduct(null);
      setShowForm(true);

      // Check if product exists already
      productApi
        .getByBarcode(barcode)
        .then((res) => {
          showToast('Product already exists - editing', 'info');
          setEditingProduct(res.data);
          setFormData({
            barcode: res.data.barcode,
            name: res.data.name,
            description: res.data.description,
            category: res.data.category,
          shop: res.data.shop || '',
          costPrice: String(res.data.costPrice),
          sellingPrice: String(res.data.sellingPrice),
          discountPercentage: String(res.data.discountPercentage),
          quantityInStock: String(res.data.quantityInStock),
          reorderLevel: String(res.data.reorderLevel),
          sku: res.data.sku,
        });
      })
      .catch(() => {
        // Product doesn't exist, that's fine
      });
    }, 1200);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      category: product.category,
      shop: product.shop || '',
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      discountPercentage: String(product.discountPercentage),
      quantityInStock: String(product.quantityInStock),
      reorderLevel: String(product.reorderLevel),
      sku: product.sku,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      discountPercentage: parseFloat(formData.discountPercentage) || 0,
      quantityInStock: parseInt(formData.quantityInStock) || 0,
      reorderLevel: parseInt(formData.reorderLevel) || 10,
    };

    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, payload);
        showToast('Product updated!', 'success');
      } else {
        await productApi.create(payload);
        showToast('Product added!', 'success');
      }
      setShowForm(false);
      setFormData(emptyProduct);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Deactivate "${product.name}"?`)) return;
    try {
      await productApi.delete(product.id);
      showToast('Product deactivated', 'success');
      loadProducts();
    } catch (err) {
      showToast('Failed to delete product', 'error');
    }
  };

  const getStockBadge = (product) => {
    if (product.quantityInStock === 0) return 'badge-danger';
    if (product.quantityInStock <= product.reorderLevel) return 'badge-warning';
    return 'badge-success';
  };

  const getStockLabel = (product) => {
    if (product.quantityInStock === 0) return 'Out of stock';
    if (product.quantityInStock <= product.reorderLevel) return `${product.quantityInStock} left`;
    return `${product.quantityInStock} in stock`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <p>Manage your products</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          All Products
        </button>
        <button className={tab === 'lowStock' ? 'active' : ''} onClick={() => setTab('lowStock')}>
          <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Low Stock
        </button>
      </div>

      {/* Shop Filter */}
      {shops.length > 0 && (
        <div className="shop-filter" style={{ marginBottom: 12 }}>
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

      {/* Search */}
      <div className="search-bar">
        <Search />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => { setScannerKey(k => k + 1); setShowScanner(true); }}
          style={{ flex: 1 }}
        >
          <ScanLine size={18} /> Scan to Add
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            setFormData(emptyProduct);
            setEditingProduct(null);
            setShowForm(true);
          }}
          style={{ flex: 1 }}
        >
          <Plus size={18} /> Manual Add
        </button>
      </div>

      {/* Scanner (inline, same as NewSale) */}
      {showScanner && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <BarcodeScanner
            key={scannerKey}
            onScan={handleScanForAdd}
            onClose={() => setShowScanner(false)}
          />

          {/* Green barcode confirmation overlay */}
          {scannedBarcode && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(16, 185, 129, 0.92)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              gap: 8,
            }}>
              <CheckCircle size={40} color="white" />
              <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Barcode Scanned!</div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', fontSize: 16, letterSpacing: 1 }}>
                {scannedBarcode}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h3>{search ? 'No matches found' : 'No products yet'}</h3>
          <p>{search ? 'Try a different search' : 'Scan a barcode to add your first product'}</p>
        </div>
      ) : (
        filteredProducts.map((product) => (
          <div key={product.id} className="product-item" onClick={() => handleEdit(product)}>
            <div className="product-icon">
              <Package size={20} color="var(--text-secondary)" />
            </div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
              <div className="product-meta">
                {product.barcode} • {product.category || 'No category'}
                {product.shop && <> • <Store size={11} style={{ verticalAlign: -1 }} /> {product.shop}</>}
              </div>
            </div>
            <div>
              <div className="product-price">
                {product.discountPercentage > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'line-through', marginRight: 4 }}>
                    R{product.sellingPrice.toFixed(2)}
                  </span>
                )}
                R{product.effectivePrice.toFixed(2)}
              </div>
              <div className="product-stock">
                <span className={`badge ${getStockBadge(product)}`}>{getStockLabel(product)}</span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Barcode *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Barcode number"
                  required
                  readOnly={!!editingProduct}
                  style={editingProduct ? { opacity: 0.6 } : {}}
                />
              </div>

              <div className="input-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                  required
                />
              </div>

              <div className="input-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Electronics"
                  />
                </div>
                <div className="input-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU code"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Shop *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.shop}
                    onChange={(e) => setFormData({ ...formData, shop: e.target.value })}
                    placeholder="e.g. Main Store, Warehouse..."
                    list="shop-suggestions"
                    required
                  />
                  <datalist id="shop-suggestions">
                    {shops.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Cost Price (R) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Selling Price (R) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="input-group">
                  <label>Qty in Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantityInStock}
                    onChange={(e) => setFormData({ ...formData, quantityInStock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  placeholder="10"
                />
              </div>

              {formData.costPrice && formData.sellingPrice && (
                <div className="card" style={{ background: 'var(--bg)', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Profit Margin</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {(() => {
                      const cost = parseFloat(formData.costPrice) || 0;
                      const sell = parseFloat(formData.sellingPrice) || 0;
                      const disc = parseFloat(formData.discountPercentage) || 0;
                      const effective = disc > 0 ? sell * (1 - disc / 100) : sell;
                      const margin = effective > 0 ? ((effective - cost) / effective * 100) : 0;
                      return `${margin.toFixed(1)}%`;
                    })()}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-success" style={{ flex: 2 }}>
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => {
                      handleDelete(editingProduct);
                      setShowForm(false);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
