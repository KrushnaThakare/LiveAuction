import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ username: '', password: '' });
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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--gradient-hero, linear-gradient(160deg,#060d1a,#0a1530,#0d1f3c))' }}>

      {/* ── Ambient glow blobs ── */}
      <div className="glow-blob" style={{
        width: 500, height: 500,
        background: 'var(--color-primary)',
        top: '-10%', left: '-10%',
        opacity: 0.08,
      }} />
      <div className="glow-blob" style={{
        width: 400, height: 400,
        background: 'var(--color-secondary)',
        bottom: '-8%', right: '-8%',
        opacity: 0.07,
        animationDelay: '3s',
      }} />

      {/* ── Cricket silhouette pattern ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%23ffffff' fill-opacity='0.025'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* ── Floodlight rays ── */}
      {['-30deg', '0deg', '30deg'].map((rot, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          top: 0,
          left: `${20 + i * 30}%`,
          width: 2,
          height: '60vh',
          background: `linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)`,
          transform: `rotate(${rot})`,
          transformOrigin: 'top center',
        }} />
      ))}

      {/* ── Login card ── */}
      <div className="w-full max-w-sm animate-scale-in relative z-10">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
            style={{
              background: 'var(--gradient-primary)',
              boxShadow: '0 0 32px var(--color-primary-glow)',
            }}>
            <span className="text-white font-black text-2xl">CA</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Cricket Auction
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Premium Auction Platform
          </p>
          {/* Accent line */}
          <div className="mx-auto mt-3" style={{
            width: 48, height: 3, borderRadius: 999,
            background: 'var(--gradient-primary)',
          }} />
        </div>

        {/* Glass card */}
        <form onSubmit={handleSubmit}
          className="glass-strong rounded-3xl p-8 space-y-5"
          style={{ boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.06)' }}>

          <div>
            <label className="text-label block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Username
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-label block mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm font-bold tracking-wide mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Signing in…
              </span>
            ) : '🏏 Sign In to Dashboard'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
          Contact your administrator for access
        </p>
      </div>
    </div>
  );
}
