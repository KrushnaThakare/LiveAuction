import { useState } from 'react';
import { tournamentApi } from '../../api/tournaments';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { DEFAULT_PLAYER_ROLES, FOOTBALL_PLAYER_ROLES, roleConfigToLines, roleLinesToConfig } from '../../utils/formatters';

export default function TournamentForm({ onSuccess, onCancel }) {
  const [form, setForm]         = useState({
    name: '',
    auctionDisplayName: '',
    sport: 'CRICKET',
    description: '',
    roleLines: roleConfigToLines(DEFAULT_PLAYER_ROLES),
  });
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
      const res = await tournamentApi.create({
        name: form.name,
        auctionDisplayName: form.auctionDisplayName,
        sport: form.sport,
        description: form.description,
        playerRoles: roleLinesToConfig(form.roleLines),
      });
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

  const applySport = (sport) => {
    setForm(current => ({
      ...current,
      sport,
      roleLines: roleConfigToLines(sport === 'FOOTBALL' ? FOOTBALL_PLAYER_ROLES : DEFAULT_PLAYER_ROLES),
    }));
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

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Auction Display Name
        </label>
        <input
          className="input"
          placeholder="e.g. Royal Champions Trophy Auction Live"
          value={form.auctionDisplayName}
          onChange={(e) => setForm({ ...form, auctionDisplayName: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Sport
        </label>
        <select className="input" value={form.sport} onChange={(e) => applySport(e.target.value)}>
          <option value="CRICKET">Cricket</option>
          <option value="FOOTBALL">Football</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Player Roles
        </label>
        <textarea
          className="input font-mono text-xs"
          rows={4}
          value={form.roleLines}
          onChange={(e) => setForm({ ...form, roleLines: e.target.value, sport: 'CUSTOM' })}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          One per line: KEY|Label|Short Label|Color
        </p>
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
