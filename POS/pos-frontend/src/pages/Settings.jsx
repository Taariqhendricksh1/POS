import { useState, useEffect } from 'react';
import { settingsApi } from '../api';
import { useToast } from '../hooks/useToast';
import { Settings, Save, Building2, Banknote, FileText, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsApi.get();
      setSettings(data);
    } catch (err) {
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
      setSettings(data);
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

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="form-label">Company Name *</label>
              <input
                className="form-input"
                value={settings.companyName || ''}
                onChange={e => handleChange('companyName', e.target.value)}
                required
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="form-label">Company Address</label>
              <input
                className="form-input"
                value={settings.companyAddress || ''}
                onChange={e => handleChange('companyAddress', e.target.value)}
                placeholder="123 Main Street, City"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={settings.companyPhone || ''}
                  onChange={e => handleChange('companyPhone', e.target.value)}
                  placeholder="+27 21 000 0000"
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={settings.companyEmail || ''}
                  onChange={e => handleChange('companyEmail', e.target.value)}
                  placeholder="info@company.co.za"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice & Tax */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Invoice & Tax</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Invoice Prefix</label>
              <input
                className="form-input"
                value={settings.invoicePrefix || ''}
                onChange={e => handleChange('invoicePrefix', e.target.value)}
                placeholder="INV"
              />
            </div>
            <div>
              <label className="form-label">Tax Rate (%)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.defaultTaxRate ?? ''}
                onChange={e => handleChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="form-label">Currency Symbol</label>
              <input
                className="form-input"
                value={settings.currencySymbol || ''}
                onChange={e => handleChange('currencySymbol', e.target.value)}
                placeholder="R"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Banknote size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Bank Details</h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
            These details will appear on EFT invoices and payment reminders.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Bank Name</label>
                <input
                  className="form-input"
                  value={settings.bankName || ''}
                  onChange={e => handleChange('bankName', e.target.value)}
                  placeholder="FNB"
                />
              </div>
              <div>
                <label className="form-label">Account Name</label>
                <input
                  className="form-input"
                  value={settings.bankAccountName || ''}
                  onChange={e => handleChange('bankAccountName', e.target.value)}
                  placeholder="Your Business Name"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Account Number</label>
                <input
                  className="form-input"
                  value={settings.bankAccountNumber || ''}
                  onChange={e => handleChange('bankAccountNumber', e.target.value)}
                  placeholder="62000000000"
                />
              </div>
              <div>
                <label className="form-label">Branch Code</label>
                <input
                  className="form-input"
                  value={settings.bankBranchCode || ''}
                  onChange={e => handleChange('bankBranchCode', e.target.value)}
                  placeholder="250655"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Account Type</label>
                <select
                  className="form-input"
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
              <div>
                <label className="form-label">Payment Reference</label>
                <input
                  className="form-input"
                  value={settings.bankReference || ''}
                  onChange={e => handleChange('bankReference', e.target.value)}
                  placeholder="Invoice number"
                />
              </div>
            </div>
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
