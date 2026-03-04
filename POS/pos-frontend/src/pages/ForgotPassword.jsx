import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Send, CheckCircle2, Key } from 'lucide-react';
import { authApi } from '../api';

export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.requestReset(email);
      setMessage(res.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Key size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {step === 'done' ? 'Password Reset!' : 'Reset Password'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {step === 'request' && 'Enter your admin email to receive a reset code'}
            {step === 'reset' && 'Enter the code sent to your email'}
            {step === 'done' && 'Your password has been updated'}
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          {step === 'request' && (
            <form onSubmit={handleRequestReset}>
              <div className="input-group">
                <label><Mail size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Sending...</>
                ) : (
                  <><Send size={18} /> Send Reset Code</>
                )}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword}>
              {message && (
                <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  {message}
                </div>
              )}

              <div className="input-group">
                <label>Reset Code</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste the code from your email"
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label><Lock size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div className="input-group">
                <label><Lock size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Resetting...</>
                ) : (
                  <><Lock size={18} /> Reset Password</>
                )}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: 16 }} />
              <p style={{ marginBottom: 20, fontSize: 14 }}>You can now sign in with your new password.</p>
              <button className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
                Go to Login
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link
              to="/login"
              style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
