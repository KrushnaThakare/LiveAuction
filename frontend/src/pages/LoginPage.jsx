import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      toast.error('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            CA
          </div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
            Cricket Auction
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          <div>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              Username
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-secondary)' }}>
          Contact your administrator for access
        </p>
      </div>
    </div>
  );
}
