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
} from 'lucide-react';
import { customerApi } from '../api';
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
      loadCustomers();
    } catch (err) {
      showToast('Failed to delete customer', 'error');
    }
  };

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
              onClick={() => handleEdit(customer)}
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
      {showForm && (
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
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="input-group">
                <label>Cell Number</label>
                <input
                  type="tel"
                  value={formData.cellNumber}
                  onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
                  placeholder="+27 82 123 4567"
                />
              </div>

              <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> Delivery Address
              </h3>

              <div className="input-group">
                <label>Street Address</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cape Town"
                  />
                </div>
                <div className="input-group">
                  <label>Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="Western Cape"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="8001"
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-success" style={{ flex: 2 }}>
                  {editing ? 'Update Customer' : 'Add Customer'}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => {
                      handleDelete(editing);
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
