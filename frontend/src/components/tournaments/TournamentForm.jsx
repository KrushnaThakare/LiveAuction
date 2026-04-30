import { useState } from 'react';
import { tournamentApi } from '../../api/tournaments';
import toast from 'react-hot-toast';

export default function TournamentForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Tournament name is required'); return; }
    setLoading(true);
    try {
      await tournamentApi.create(form);
      toast.success('Tournament created!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Tournament Name *
        </label>
        <input
          className="input"
          placeholder="e.g. IPL 2026"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Description
        </label>
        <textarea
          className="input resize-none"
          placeholder="Optional description..."
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </form>
  );
}
