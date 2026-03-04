import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useToast } from '../hooks/useToast';

export default function ChangePassword() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPw.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      showToast('Password changed successfully', 'success');
      navigate(-1);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1>Change Password</h1>
            <p>Update your account password</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div className="input-group">
            <label>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={changing}>
            {changing ? <><span className="spinner" /> Updating...</> : <><Lock size={16} /> Update Password</>}
          </button>
        </form>
      </div>
    </div>
  );
}
