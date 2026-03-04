import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, ShieldOff, Users, Mail, Lock, User, Eye, EyeOff, X, Key } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [adding, setAdding] = useState(false);
  // Change password
  const [currentPw, setCurrentPw] = useState('');
  const [changePw, setChangePw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const { user: currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await authApi.createUser(newEmail, newName, newPassword, 'User');
      showToast('User created', 'success');
      setShowAdd(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      loadUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await authApi.deleteUser(userId);
      showToast('User deleted', 'success');
      loadUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot delete this user';
      showToast(msg, 'error');
    }
  };

  const handleToggle = async (userId) => {
    try {
      await authApi.toggleUser(userId);
      showToast('User status updated', 'success');
      loadUsers();
    } catch (err) {
      showToast('Cannot modify this user', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changePw !== confirmPw) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (changePw.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setChangingPw(true);
    try {
      await authApi.changePassword(currentPw, changePw);
      showToast('Password changed successfully', 'success');
      setShowChangePassword(false);
      setCurrentPw('');
      setChangePw('');
      setConfirmPw('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setChangingPw(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <h1>Access Denied</h1>
          <p>You don't have permission to manage users</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Add and remove application users</p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ flex: 1 }}>
          <UserPlus size={18} /> Add User
        </button>
        <button className="btn btn-outline" onClick={() => setShowChangePassword(true)} style={{ flex: 1 }}>
          <Key size={18} /> Change My Password
        </button>
      </div>

      {/* Add User Form */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Add New User</h3>
            <button className="modal-close" onClick={() => setShowAdd(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleAddUser}>
            <div className="input-group">
              <label><User size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="input-group">
              <label><Mail size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="input-group">
              <label><Lock size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-success" disabled={adding}>
              {adding ? <><span className="spinner" /> Creating...</> : <><UserPlus size={16} /> Create User</>}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Form */}
      {showChangePassword && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Change My Password</h3>
            <button className="modal-close" onClick={() => setShowChangePassword(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleChangePassword}>
            <div className="input-group">
              <label>Current Password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>New Password</label>
              <input type="password" value={changePw} onChange={(e) => setChangePw(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changingPw}>
              {changingPw ? <><span className="spinner" /> Updating...</> : <><Lock size={16} /> Update Password</>}
            </button>
          </form>
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No users</h3>
          <p>Add users to give them access</p>
        </div>
      ) : (
        users.map((u) => (
          <div key={u.id} className="product-item">
            <div className="product-icon" style={{
              background: u.role === 'Admin' ? 'var(--primary)' : u.isActive ? 'var(--success)' : 'var(--danger)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
            }}>
              {u.role === 'Admin' ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div className="product-info">
              <div className="product-name">
                {u.name}
                {u.id === currentUser?.id && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>(you)</span>}
              </div>
              <div className="product-meta">
                {u.email} • {u.role}
                {!u.isActive && <span style={{ color: 'var(--danger)', marginLeft: 4 }}> • Disabled</span>}
              </div>
              <div className="product-meta" style={{ fontSize: 11 }}>
                Last login: {formatDate(u.lastLoginAt)}
              </div>
            </div>
            {u.role !== 'Admin' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className={`btn btn-sm ${u.isActive ? 'btn-outline' : 'btn-success'}`}
                  onClick={() => handleToggle(u.id)}
                  title={u.isActive ? 'Disable' : 'Enable'}
                  style={{ width: 'auto', padding: '6px 10px' }}
                >
                  {u.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(u.id)}
                  title="Delete"
                  style={{ width: 'auto', padding: '6px 10px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
