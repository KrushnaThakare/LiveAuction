import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

export default function TeamForm({ initialData, logoFile, onLogoChange, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ name: '', budget: 100000 });
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (initialData) {
      setForm({ name: initialData.name || '', budget: initialData.budget || 100000 });
      // Show existing logo as preview
      const existing = initialData.logoUrl || '';
      setLogoPreview(existing
        ? (existing.startsWith('/api') ? API_ORIGIN + existing : existing)
        : null);
    }
  }, [initialData]);

  const handleLogoChange = (file) => {
    if (!file) return;
    onLogoChange?.(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Team name is required'); return; }
    if (!form.budget || form.budget <= 0) { toast.error('Budget must be positive'); return; }
    onSubmit({ name: form.name, budget: Number(form.budget) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Logo upload */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Team Logo
        </label>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{form.name?.[0]?.toUpperCase() || 'T'}</span>
            )}
          </div>
          <label className="btn-secondary cursor-pointer text-sm">
            <Upload size={14} />
            {logoFile ? logoFile.name : 'Upload Logo'}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => handleLogoChange(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Team Name *
        </label>
        <input className="input" placeholder="e.g. Mumbai Indians"
          value={form.name} required
          onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Budget (₹) *
        </label>
        <input type="number" className="input" placeholder="100000"
          value={form.budget} min="1000" step="1000" required
          onChange={e => setForm({ ...form, budget: e.target.value })} />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Team' : 'Create Team')}
        </button>
      </div>
    </form>
  );
}
