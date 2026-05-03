import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, Key, ShieldCheck, Eye, Crown } from 'lucide-react';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin',     icon: Crown,        color: '#f59e0b', desc: 'Full access — create tournaments, form builder, manage users' },
  { value: 'OPERATOR',    label: 'Operator',         icon: ShieldCheck,  color: '#3b82f6', desc: 'Run auction, manage teams/players, view registrations' },
  { value: 'VIEWER',      label: 'Viewer (Broadcast)', icon: Eye,        color: '#10b981', desc: 'Read-only: live auction, teams, sold/unsold players' },
];

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]));

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [createForm, setCreateForm] = useState({ username: '', password: '', displayName: '', role: 'OPERATOR' });
  const [editForm, setEditForm]     = useState({ displayName: '', role: 'OPERATOR', active: true });
  const [newPwd, setNewPwd]         = useState('');
  const [saving, setSaving]         = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listUsers();
      setUsers(res.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.displayName) {
      toast.error('All fields are required'); return;
    }
    setSaving(true);
    try {
      await authApi.createUser(createForm);
      toast.success('User created');
      setShowCreate(false);
      setCreateForm({ username: '', password: '', displayName: '', role: 'OPERATOR' });
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateUser(selected.id, editForm);
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
    if (!confirm(`Delete user "${user.displayName}"? They will lose all access immediately.`)) return;
    await authApi.deleteUser(user.id);
    toast.success('User deleted');
    fetchUsers();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            User Management
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Super Admin only — create and manage access accounts
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
            const roleInfo = ROLE_MAP[user.role] || ROLE_MAP.VIEWER;
            return (
              <div key={user.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: roleInfo.color + '22', color: roleInfo.color }}>
                  {user.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {user.displayName}
                    {!user.active && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
                        Disabled
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    @{user.username}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: roleInfo.color + '22', color: roleInfo.color }}>
                  {roleInfo.label}
                </span>
                <div className="flex gap-1">
                  <button title="Edit" onClick={() => { setSelected(user); setEditForm({ displayName: user.displayName, role: user.role, active: user.active }); setShowEdit(true); }}
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

      {/* Create user modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Display Name *</label>
              <input className="input" value={createForm.displayName}
                onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. RCB Operator" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Username *</label>
              <input className="input" value={createForm.username}
                onChange={e => setCreateForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                placeholder="rcb_operator" />
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

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit — ${selected?.displayName}`}>
        <form onSubmit={handleEdit} className="space-y-4">
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
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Password reset modal */}
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
