import { useState } from 'react';
import { tournamentApi } from '../../api/tournaments';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

export default function TournamentForm({ onSuccess, onCancel }) {
  const [form, setForm]         = useState({ name: '', description: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleLogoChange = (file) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Tournament name is required'); return; }
    setLoading(true);
    try {
      const res = await tournamentApi.create(form);
      const tournamentId = res.data.data?.id;

      // Upload logo after creating (need the ID)
      if (logoFile && tournamentId) {
        await tournamentApi.uploadLogo(tournamentId, logoFile);
      }

      toast.success('Tournament created!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Tournament Logo
        </label>
        <div className="flex items-center gap-4">
          {/* Preview circle */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{form.name?.[0]?.toUpperCase() || '🏆'}</span>
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

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Description
        </label>
        <textarea
          className="input resize-none"
          placeholder="Optional description..."
          rows={2}
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
