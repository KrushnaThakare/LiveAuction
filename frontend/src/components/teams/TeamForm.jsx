import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function TeamForm({ initialData, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: '',
    logoUrl: '',
    budget: 100000,
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Team name is required'); return; }
    if (!form.budget || form.budget <= 0) { toast.error('Budget must be positive'); return; }
    onSubmit({ ...form, budget: Number(form.budget) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Team Name *
        </label>
        <input
          className="input"
          placeholder="e.g. Mumbai Indians"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Logo URL
        </label>
        <input
          className="input"
          placeholder="https://..."
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Budget (₹) *
        </label>
        <input
          type="number"
          className="input"
          placeholder="100000"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          min="1000"
          step="1000"
          required
        />
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
