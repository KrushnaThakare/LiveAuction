import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Key, ShieldCheck, Eye, Crown, Upload, Building2 } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin',        icon: Crown,       color: '#f59e0b', desc: 'Full access — create tournaments, form builder, manage users' },
  { value: 'OPERATOR',    label: 'Operator',            icon: Building2,   color: '#3b82f6', desc: 'Run auction, manage teams/players, view registrations. Gets own branded header.' },
  { value: 'VIEWER',      label: 'Viewer (Broadcast)',  icon: Eye,         color: '#10b981', desc: 'Read-only: live auction, teams, sold/unsold — no editing' },
];
const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]));

function resolveLogoUrl(url) {
  if (!url) return null;
  return url.startsWith('/api') ? API_ORIGIN + url : url;
}

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [newPwd, setNewPwd]         = useState('');

  const [createForm, setCreateForm] = useState({
    username: '', password: '', displayName: '', role: 'OPERATOR', appName: '',
  });
  const [createLogoFile, setCreateLogoFile]   = useState(null);
  const [createLogoPreview, setCreateLogoPreview] = useState(null);

  const [editForm, setEditForm] = useState({
    displayName: '', role: 'OPERATOR', active: true, appName: '',
  });
  const [editLogoFile, setEditLogoFile]     = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listUsers();
      setUsers(res.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── Create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.displayName) {
      toast.error('Username, password and display name are required');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.createUser(createForm);
      const userId = res.data.data?.id;
      if (createLogoFile && userId) {
        await authApi.uploadUserLogo(userId, createLogoFile);
      }
      toast.success('User created');
      setShowCreate(false);
      setCreateForm({ username: '', password: '', displayName: '', role: 'OPERATOR', appName: '' });
      setCreateLogoFile(null);
      setCreateLogoPreview(null);
      fetchUsers();
    } finally { setSaving(false); }
  };

  /* ── Edit ── */
  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateUser(selected.id, editForm);
      if (editLogoFile) {
        await authApi.uploadUserLogo(selected.id, editLogoFile);
      }
      toast.success('User updated');
      setShowEdit(false);
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleResetPwd = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await authApi.resetPwd(selected.id, newPwd);
      toast.success('Password reset');
      setShowPwd(false);
      setNewPwd('');
    } finally { setSaving(false); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.displayName}"? They lose all access immediately.`)) return;
    await authApi.deleteUser(user.id);
    toast.success('User deleted');
    fetchUsers();
  };

  const openEdit = (user) => {
    setSelected(user);
    setEditForm({ displayName: user.displayName, role: user.role, active: user.active, appName: user.appName || '' });
    setEditLogoFile(null);
    setEditLogoPreview(resolveLogoUrl(user.appLogoUrl));
    setShowEdit(true);
  };

  const handleLogoChange = (file, setFile, setPreview) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>User Management</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Create accounts for operators and broadcasters. Operators get a white-label branded header.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Create User
        </button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ROLES.map(r => (
          <div key={r.value} className="card text-sm">
            <div className="flex items-center gap-2 mb-1">
              <r.icon size={15} style={{ color: r.color }} />
              <span className="font-bold" style={{ color: r.color }}>{r.label}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      ) : (
        <div className="space-y-2">
          {users.map(user => {
            const ri = ROLE_MAP[user.role] || ROLE_MAP.VIEWER;
            const logoSrc = resolveLogoUrl(user.appLogoUrl);
            return (
              <div key={user.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

                {/* Avatar / logo */}
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: ri.color + '22', color: ri.color }}>
                  {logoSrc
                    ? <img src={logoSrc} alt={user.displayName} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    : user.displayName?.[0]?.toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {user.displayName}
                    </p>
                    {!user.active && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
                        Disabled
                      </span>
                    )}
                    {user.appName && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(59,130,246,0.3)' }}>
                        {user.appName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>@{user.username}</p>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                  style={{ backgroundColor: ri.color + '22', color: ri.color }}>
                  {ri.label}
                </span>

                <div className="flex gap-1 flex-shrink-0">
                  <button title="Edit" onClick={() => openEdit(user)}
                    className="p-1.5 rounded-lg hover:bg-white/10"><Edit size={14} style={{ color: 'var(--color-primary)' }} /></button>
                  <button title="Reset password" onClick={() => { setSelected(user); setNewPwd(''); setShowPwd(true); }}
                    className="p-1.5 rounded-lg hover:bg-white/10"><Key size={14} style={{ color: 'var(--color-warning)' }} /></button>
                  <button title="Delete" onClick={() => handleDelete(user)}
                    className="p-1.5 rounded-lg hover:bg-white/10"><Trash2 size={14} style={{ color: 'var(--color-danger)' }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">

          {/* Brand section */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
              White-label Branding (shown in app header)
            </p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Brand / App Name
              </label>
              <input className="input" value={createForm.appName}
                placeholder="e.g. Live Vision Cricket Tracker"
                onChange={e => setCreateForm(f => ({ ...f, appName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Brand Logo
              </label>
              <div className="flex items-center gap-3">
                {createLogoPreview ? (
                  <img src={createLogoPreview} alt="Logo" className="h-10 w-auto rounded-lg object-contain max-w-24" />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Building2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                )}
                <label className="btn-secondary cursor-pointer text-xs">
                  <Upload size={13} /> Upload Logo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleLogoChange(e.target.files?.[0], setCreateLogoFile, setCreateLogoPreview)} />
                </label>
                {createLogoFile && <span className="text-xs" style={{ color: 'var(--color-success)' }}>✓ {createLogoFile.name}</span>}
              </div>
            </div>
          </div>

          {/* Account details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Display Name *</label>
              <input className="input" value={createForm.displayName}
                onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. Live Vision" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Username *</label>
              <input className="input" value={createForm.username}
                onChange={e => setCreateForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                placeholder="livevision" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Password *</label>
            <input className="input" type="password" value={createForm.password}
              onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Access Role *</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ backgroundColor: createForm.role === r.value ? r.color + '18' : 'var(--color-surface-2)',
                           border: `1px solid ${createForm.role === r.value ? r.color : 'var(--color-border)'}` }}>
                  <input type="radio" name="role" value={r.value} checked={createForm.role === r.value}
                    onChange={() => setCreateForm(f => ({ ...f, role: r.value }))} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit — ${selected?.displayName}`} size="lg">
        <form onSubmit={handleEdit} className="space-y-4">

          {/* Branding */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
              White-label Branding
            </p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Brand / App Name</label>
              <input className="input" value={editForm.appName}
                placeholder="e.g. Live Vision Cricket Tracker"
                onChange={e => setEditForm(f => ({ ...f, appName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Brand Logo</label>
              <div className="flex items-center gap-3">
                {editLogoPreview ? (
                  <img src={editLogoPreview} alt="Logo" className="h-10 w-auto rounded-lg object-contain max-w-24" />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Building2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                )}
                <label className="btn-secondary cursor-pointer text-xs">
                  <Upload size={13} /> Change Logo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleLogoChange(e.target.files?.[0], setEditLogoFile, setEditLogoPreview)} />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Display Name</label>
            <input className="input" value={editForm.displayName}
              onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Role</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                  style={{ backgroundColor: editForm.role === r.value ? r.color + '18' : 'var(--color-surface-2)',
                           border: `1px solid ${editForm.role === r.value ? r.color : 'var(--color-border)'}` }}>
                  <input type="radio" name="editRole" value={r.value} checked={editForm.role === r.value}
                    onChange={() => setEditForm(f => ({ ...f, role: r.value }))} />
                  <span className="text-sm font-semibold" style={{ color: r.color }}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={editForm.active}
              onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="active" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Account Active</label>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal isOpen={showPwd} onClose={() => setShowPwd(false)} title={`Reset Password — ${selected?.displayName}`}>
        <form onSubmit={handleResetPwd} className="space-y-4">
          <input className="input" type="password" value={newPwd}
            onChange={e => setNewPwd(e.target.value)} placeholder="New password (min 6 chars)" />
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setShowPwd(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
