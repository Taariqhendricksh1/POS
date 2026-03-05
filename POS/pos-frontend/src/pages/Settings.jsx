import { useState, useEffect } from 'react';
import { settingsApi } from '../api';
import { useToast } from '../hooks/useToast';
import { Settings, Save, Building2, Banknote, FileText, Loader2, Store, Plus, X } from 'lucide-react';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newShop, setNewShop] = useState('');
  const [settings, setSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    defaultTaxRate: 15,
    currencySymbol: 'R',
    invoicePrefix: 'INV',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankBranchCode: '',
    bankAccountType: '',
    bankReference: '',
    shops: [],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsApi.get();
      setSettings({ ...data, shops: data.shops || [] });
    } catch (err) {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const addShop = () => {
    const name = newShop.trim();
    if (!name) return;
    if (settings.shops.includes(name)) {
      addToast('Shop already exists', 'error');
      return;
    }
    setSettings(prev => ({ ...prev, shops: [...prev.shops, name] }));
    setNewShop('');
  };

  const removeShop = (shop) => {
    setSettings(prev => ({ ...prev, shops: prev.shops.filter(s => s !== shop) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!settings.companyName?.trim()) {
      addToast('Company name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data } = await settingsApi.update(settings);
      setSettings({ ...data, shops: data.shops || [] });
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      addToast(err.response?.data || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  const fieldStyle = { marginBottom: 14 };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 5 };
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--border)',
    borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '16px 0 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Settings size={24} />
        <h2 style={{ margin: 0 }}>Settings</h2>
      </div>

      <form onSubmit={handleSave}>

        {/* Company Information */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Company Information</h3>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Company Name *</label>
            <input
              style={inputStyle}
              value={settings.companyName || ''}
              onChange={e => handleChange('companyName', e.target.value)}
              required
              placeholder="Your Company Name"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Company Address</label>
            <input
              style={inputStyle}
              value={settings.companyAddress || ''}
              onChange={e => handleChange('companyAddress', e.target.value)}
              placeholder="123 Main Street, City"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              value={settings.companyPhone || ''}
              onChange={e => handleChange('companyPhone', e.target.value)}
              placeholder="+27 21 000 0000"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={settings.companyEmail || ''}
              onChange={e => handleChange('companyEmail', e.target.value)}
              placeholder="info@company.co.za"
            />
          </div>
        </div>

        {/* Invoice & Tax */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Invoice & Tax</h3>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Invoice Prefix</label>
            <input
              style={inputStyle}
              value={settings.invoicePrefix || ''}
              onChange={e => handleChange('invoicePrefix', e.target.value)}
              placeholder="INV"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tax Rate (%)</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings.defaultTaxRate ?? ''}
              onChange={e => handleChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Currency Symbol</label>
            <input
              style={inputStyle}
              value={settings.currencySymbol || ''}
              onChange={e => handleChange('currencySymbol', e.target.value)}
              placeholder="R"
            />
          </div>
        </div>

        {/* Shops */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Store size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Shops</h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
            Manage your shop locations. These appear in shop dropdowns across the app.
          </p>

          <div style={fieldStyle}>
            <label style={labelStyle}>Add Shop</label>
            <input
              style={{ ...inputStyle, marginBottom: 8 }}
              value={newShop}
              onChange={e => setNewShop(e.target.value)}
              placeholder="Enter shop name..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addShop(); } }}
            />
            <button
              type="button"
              onClick={addShop}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14 }}
            >
              <Plus size={16} /> Add Shop
            </button>
          </div>

          {settings.shops.length === 0 ? (
            <p style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '12px 0' }}>No shops added yet.</p>
          ) : (
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Current Shops</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {settings.shops.map((shop, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'var(--background)', borderRadius: 8,
                    border: '1px solid var(--border)', fontSize: 14,
                  }}>
                    <span style={{ fontWeight: 500 }}>{shop}</span>
                    <button
                      type="button"
                      onClick={() => removeShop(shop)}
                      style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                        padding: 4, display: 'flex', alignItems: 'center',
                      }}
                      title="Remove shop"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Banknote size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Bank Details</h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
            These details will appear on EFT invoices and payment reminders.
          </p>

          <div style={fieldStyle}>
            <label style={labelStyle}>Bank Name</label>
            <input
              style={inputStyle}
              value={settings.bankName || ''}
              onChange={e => handleChange('bankName', e.target.value)}
              placeholder="FNB"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Account Name</label>
            <input
              style={inputStyle}
              value={settings.bankAccountName || ''}
              onChange={e => handleChange('bankAccountName', e.target.value)}
              placeholder="Your Business Name"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Account Number</label>
            <input
              style={inputStyle}
              value={settings.bankAccountNumber || ''}
              onChange={e => handleChange('bankAccountNumber', e.target.value)}
              placeholder="62000000000"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Branch Code</label>
            <input
              style={inputStyle}
              value={settings.bankBranchCode || ''}
              onChange={e => handleChange('bankBranchCode', e.target.value)}
              placeholder="250655"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Account Type</label>
            <select
              style={inputStyle}
              value={settings.bankAccountType || ''}
              onChange={e => handleChange('bankAccountType', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Cheque">Cheque</option>
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
              <option value="Transmission">Transmission</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Reference</label>
            <input
              style={inputStyle}
              value={settings.bankReference || ''}
              onChange={e => handleChange('bankReference', e.target.value)}
              placeholder="Invoice number"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ width: '100%', padding: '12px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
