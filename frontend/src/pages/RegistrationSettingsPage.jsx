import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { registrationApi } from '../api/registration';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  Settings, Plus, Trash2, Edit, GripVertical, ExternalLink,
  Copy, ToggleLeft, ToggleRight, Upload, ChevronDown, ChevronUp,
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'TEXT',           label: 'Text Input' },
  { value: 'NUMBER',         label: 'Number' },
  { value: 'TEXTAREA',       label: 'Long Text' },
  { value: 'DROPDOWN',       label: 'Dropdown' },
  { value: 'MULTI_SELECT',   label: 'Multi-select' },
  { value: 'CHECKBOX_GROUP', label: 'Checkbox Group' },
  { value: 'RADIO',          label: 'Radio Buttons' },
  { value: 'FILE_UPLOAD',    label: 'File / Image Upload (from player)' },
  { value: 'PHONE',          label: 'Phone Number' },
  { value: 'EMAIL',          label: 'Email' },
  { value: 'STATIC_IMAGE',   label: '🖼 Static Image (QR / Banner / Instructions)' },
];

const PLAYER_FIELD_MAPS = [
  { value: '', label: 'None' },
  { value: 'name', label: 'Player Name' },
  { value: 'role', label: 'Player Role' },
  { value: 'basePrice', label: 'Base Price' },
  { value: 'photo', label: 'Player Photo' },
];

export default function RegistrationSettingsPage() {
  const { activeTournament } = useTournament();
  const [settings, setSettings] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [editField, setEditField] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: '', description: '' });
  const [fieldForm, setFieldForm] = useState({
    fieldKey: '', label: '', type: 'TEXT', required: false,
    placeholder: '', defaultValue: '', options: '', mapsToPlayerField: '',
  });
  const [staticImageFile, setStaticImageFile] = useState(null);
  const [staticImagePreview, setStaticImagePreview] = useState(null);
  const [staticImageUploading, setStaticImageUploading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const registrationUrl = activeTournament
    ? `${window.location.origin}/register/${activeTournament.id}`
    : '';

  const fetchAll = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const [settingsRes, formRes] = await Promise.all([
        registrationApi.getSettings(activeTournament.id),
        registrationApi.getForm(activeTournament.id),
      ]);
      setSettings(settingsRes.data.data);
      setSections(formRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleRegistration = async () => {
    if (!activeTournament || !settings) return;
    const newVal = !settings.registrationEnabled;
    setSaving(true);
    try {
      await registrationApi.updateSettings(activeTournament.id, { registrationEnabled: newVal });
      setSettings(s => ({ ...s, registrationEnabled: newVal }));
      toast.success(newVal ? 'Registration opened!' : 'Registration closed');
    } finally { setSaving(false); }
  };

  const handleSaveSettings = async () => {
    if (!activeTournament) return;
    setSaving(true);
    try {
      if (bannerFile) {
        const bannerRes = await registrationApi.uploadBanner(activeTournament.id, bannerFile);
        setSettings(s => ({ ...s, bannerUrl: bannerRes.data.data }));
        setBannerFile(null);
      }
      await registrationApi.updateSettings(activeTournament.id, {
        registrationMessage: settings.registrationMessage,
        registrationRedirectLink: settings.registrationRedirectLink,
      });
      toast.success('Settings saved');
    } finally { setSaving(false); }
  };

  const openAddSection = () => {
    setEditSection(null);
    setSectionForm({ title: '', description: '' });
    setShowSectionModal(true);
  };

  const openEditSection = (sec) => {
    setEditSection(sec);
    setSectionForm({ title: sec.title, description: sec.description || '' });
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      if (editSection) {
        await registrationApi.updateSection(activeTournament.id, editSection.id, sectionForm);
      } else {
        await registrationApi.createSection(activeTournament.id, sectionForm);
      }
      setShowSectionModal(false);
      fetchAll();
    } finally { setSaving(false); }
  };

  const handleDeleteSection = async (secId) => {
    if (!confirm('Delete this section and all its fields?')) return;
    await registrationApi.deleteSection(activeTournament.id, secId);
    fetchAll();
  };

  const openAddField = (sectionId) => {
    setEditField(null);
    setTargetSectionId(sectionId);
    setFieldForm({ fieldKey: '', label: '', type: 'TEXT', required: false, placeholder: '', defaultValue: '', options: '', mapsToPlayerField: '' });
    setStaticImageFile(null);
    setStaticImagePreview(null);
    setShowFieldModal(true);
  };

  const openEditField = (field) => {
    setEditField(field);
    setTargetSectionId(field.sectionId);
    setFieldForm({
      fieldKey: field.fieldKey, label: field.label, type: field.type,
      required: field.required, placeholder: field.placeholder || '',
      defaultValue: field.defaultValue || '',
      options: (field.options || []).join('\n'),
      mapsToPlayerField: field.mapsToPlayerField || '',
    });
    setStaticImageFile(null);
    // If existing static image show it as preview
    const existingUrl = field.defaultValue || '';
    setStaticImagePreview(existingUrl ? (existingUrl.startsWith('/api') ? `${(import.meta.env.VITE_API_URL||'http://localhost:8080/api').replace('/api','')}${existingUrl}` : existingUrl) : null);
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    if (!fieldForm.label.trim()) { toast.error('Label required'); return; }
    if (!fieldForm.fieldKey.trim()) { toast.error('Field key required'); return; }
    if (fieldForm.type === 'STATIC_IMAGE' && !fieldForm.defaultValue && !staticImageFile) {
      toast.error('Please upload an image or enter a URL for the static image field');
      return;
    }

    setSaving(true);
    try {
      let finalDefaultValue = fieldForm.defaultValue;

      // If a file was chosen for STATIC_IMAGE, upload it first
      if (fieldForm.type === 'STATIC_IMAGE' && staticImageFile) {
        setStaticImageUploading(true);
        const uploadRes = await registrationApi.uploadStaticImage(activeTournament.id, staticImageFile);
        finalDefaultValue = uploadRes.data.data; // /api/uploads/... path
        setStaticImageUploading(false);
      }

      const optionsArr = fieldForm.options
        ? fieldForm.options.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        ...fieldForm,
        defaultValue: finalDefaultValue,
        options: optionsArr,
        sectionId: targetSectionId,
      };

      if (editField) {
        await registrationApi.updateField(activeTournament.id, editField.id, payload);
      } else {
        await registrationApi.addField(activeTournament.id, payload);
      }
      setShowFieldModal(false);
      setStaticImageFile(null);
      setStaticImagePreview(null);
      fetchAll();
    } finally {
      setSaving(false);
      setStaticImageUploading(false);
    }
  };

  const handleDeleteField = async (fid) => {
    if (!confirm('Delete this field?')) return;
    await registrationApi.deleteField(activeTournament.id, fid);
    fetchAll();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    toast.success('Registration link copied!');
  };

  if (!activeTournament) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
      Select a tournament first.
    </div>;
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '');
  const bannerSrc = settings?.bannerUrl
    ? (settings.bannerUrl.startsWith('/api') ? API_ORIGIN + settings.bannerUrl : settings.bannerUrl)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Registration Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activeTournament.name}</p>
        </div>
        <button
          onClick={handleToggleRegistration}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all`}
          style={{
            backgroundColor: settings?.registrationEnabled ? 'var(--color-success)' : 'var(--color-surface-2)',
            color: settings?.registrationEnabled ? 'white' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {settings?.registrationEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {settings?.registrationEnabled ? 'Registration Open' : 'Registration Closed'}
        </button>
      </div>

      {/* Registration Link */}
      {settings?.registrationEnabled && (
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Public Registration Link
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={registrationUrl} className="input flex-1 text-sm" />
            <button onClick={copyLink} className="btn-secondary !p-2"><Copy size={16} /></button>
            <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !p-2">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="card space-y-4">
        <h2 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>General Settings</h2>

        {/* Banner */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Tournament Banner
          </label>
          {bannerSrc && (
            <img src={bannerSrc} alt="Banner" className="w-full h-32 object-cover rounded-xl mb-2" />
          )}
          <label className="btn-secondary cursor-pointer">
            <Upload size={14} /> Upload Banner
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setBannerFile(e.target.files?.[0])} />
          </label>
          {bannerFile && <span className="ml-2 text-xs" style={{ color: 'var(--color-success)' }}>{bannerFile.name}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Success Message (shown after registration)
          </label>
          <textarea className="input resize-none" rows={3}
            placeholder="Thank you for registering! We will contact you soon."
            value={settings?.registrationMessage || ''}
            onChange={e => setSettings(s => ({ ...s, registrationMessage: e.target.value }))} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            WhatsApp / Redirect Link (optional)
          </label>
          <input className="input" placeholder="https://chat.whatsapp.com/..."
            value={settings?.registrationRedirectLink || ''}
            onChange={e => setSettings(s => ({ ...s, registrationRedirectLink: e.target.value }))} />
        </div>

        <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Form Builder */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Registration Form Fields</h2>
          <div className="flex gap-2">
            <button onClick={openAddSection} className="btn-secondary text-sm">
              <Plus size={14} /> Add Section
            </button>
            <button onClick={() => openAddField(null)} className="btn-primary text-sm">
              <Plus size={14} /> Add Field
            </button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            No sections yet. Add a section to start building your registration form.
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(sec => (
              <div key={sec.id} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}>
                {/* Section Header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCollapsedSections(c => ({ ...c, [sec.id]: !c[sec.id] }))}>
                      {collapsedSections[sec.id] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{sec.title}</p>
                      {sec.description && <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{sec.description}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                      {sec.fields.length} fields
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openAddField(sec.id)} className="btn-secondary !p-1.5 text-xs">
                      <Plus size={13} />
                    </button>
                    <button onClick={() => openEditSection(sec)} className="btn-secondary !p-1.5">
                      <Edit size={13} />
                    </button>
                    <button onClick={() => handleDeleteSection(sec.id)} className="!p-1.5 rounded-lg"
                      style={{ color: 'var(--color-danger)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                {!collapsedSections[sec.id] && (
                  <div className="p-3 space-y-2">
                    {sec.fields.length === 0 ? (
                      <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-secondary)' }}>
                        No fields. Click + to add.
                      </p>
                    ) : sec.fields.map(f => (
                      <FieldRow key={f.id} field={f}
                        onEdit={() => openEditField(f)}
                        onDelete={() => handleDeleteField(f.id)} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Unsectioned fields */}
            {sections.flatMap(s => s.fields).length === 0 && sections.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                No sections yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section Modal */}
      <Modal isOpen={showSectionModal} onClose={() => setShowSectionModal(false)}
        title={editSection ? 'Edit Section' : 'Add Section'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Section Title *
            </label>
            <input className="input" value={sectionForm.title}
              onChange={e => setSectionForm(s => ({ ...s, title: e.target.value }))}
              placeholder="e.g. Basic Info" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
            <input className="input" value={sectionForm.description}
              onChange={e => setSectionForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Optional description" />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setShowSectionModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveSection} disabled={saving}>
              {saving ? 'Saving…' : 'Save Section'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Field Modal */}
      <Modal isOpen={showFieldModal} onClose={() => setShowFieldModal(false)}
        title={editField ? 'Edit Field' : 'Add Field'} size="lg">
        <div className="space-y-3">
          {/* Label + Key always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {fieldForm.type === 'STATIC_IMAGE' ? 'Caption / Label' : 'Label *'}
              </label>
              <input className="input" value={fieldForm.label}
                onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))}
                placeholder={fieldForm.type === 'STATIC_IMAGE' ? 'e.g. Scan to Pay' : 'e.g. Player Name'} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Field Key *</label>
              <input className="input" value={fieldForm.fieldKey}
                onChange={e => setFieldForm(f => ({ ...f, fieldKey: e.target.value.replace(/\s+/g, '_').toLowerCase() }))}
                placeholder="scanner_image" />
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Field Type</label>
            <select className="input" value={fieldForm.type}
              onChange={e => { setFieldForm(f => ({ ...f, type: e.target.value })); setStaticImageFile(null); setStaticImagePreview(null); }}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* ── STATIC IMAGE: upload + URL ── */}
          {fieldForm.type === 'STATIC_IMAGE' ? (
            <div className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Image to display on the form
              </p>

              {/* Preview */}
              {staticImagePreview && (
                <img src={staticImagePreview} alt="Preview"
                  className="max-h-40 rounded-xl object-contain mx-auto block"
                  style={{ border: '1px solid var(--color-border)' }} />
              )}

              {/* Upload button */}
              <label className="btn-secondary cursor-pointer w-full justify-center">
                <Upload size={15} />
                {staticImageFile ? staticImageFile.name : 'Upload Image from Computer'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setStaticImageFile(file);
                    const reader = new FileReader();
                    reader.onload = ev => setStaticImagePreview(ev.target.result);
                    reader.readAsDataURL(file);
                    // Clear URL if user picks a file
                    setFieldForm(f => ({ ...f, defaultValue: '' }));
                  }} />
              </label>

              {/* OR divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>OR</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>

              {/* Public URL */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Paste a public image URL
                </label>
                <input className="input" value={fieldForm.defaultValue}
                  onChange={e => {
                    setFieldForm(f => ({ ...f, defaultValue: e.target.value }));
                    if (e.target.value) { setStaticImageFile(null); setStaticImagePreview(e.target.value); }
                    else setStaticImagePreview(null);
                  }}
                  placeholder="https://qr.example.com/my-scanner.png" />
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                This image is shown on the registration form for players to view. They cannot interact with it.
              </p>
            </div>
          ) : (
            /* ── Normal fields ── */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Maps to Auction Field</label>
                  <select className="input" value={fieldForm.mapsToPlayerField}
                    onChange={e => setFieldForm(f => ({ ...f, mapsToPlayerField: e.target.value }))}>
                    {PLAYER_FIELD_MAPS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Placeholder</label>
                  <input className="input" value={fieldForm.placeholder}
                    onChange={e => setFieldForm(f => ({ ...f, placeholder: e.target.value }))} />
                </div>
              </div>

              {['DROPDOWN','MULTI_SELECT','CHECKBOX_GROUP','RADIO'].includes(fieldForm.type) && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Options (one per line)
                  </label>
                  <textarea className="input resize-none" rows={4} value={fieldForm.options}
                    onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))}
                    placeholder={"Option 1\nOption 2\nOption 3"} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="req" checked={fieldForm.required}
                  onChange={e => setFieldForm(f => ({ ...f, required: e.target.checked }))} />
                <label htmlFor="req" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Required field</label>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowFieldModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveField}
              disabled={saving || staticImageUploading}>
              {staticImageUploading ? 'Uploading image…' : saving ? 'Saving…' : 'Save Field'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FieldRow({ field, onEdit, onDelete }) {
  const typeLabel = {
    TEXT: 'Text', NUMBER: 'Number', TEXTAREA: 'Long Text', DROPDOWN: 'Dropdown',
    MULTI_SELECT: 'Multi-select', CHECKBOX_GROUP: 'Checkbox', RADIO: 'Radio',
    FILE_UPLOAD: 'File Upload', PHONE: 'Phone', EMAIL: 'Email',
  }[field.type] || field.type;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <GripVertical size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{field.label}</span>
        {field.required && <span className="text-xs ml-1" style={{ color: 'var(--color-danger)' }}>*</span>}
        <span className="text-xs ml-2 px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
          {typeLabel}
        </span>
        {field.mapsToPlayerField && (
          <span className="text-xs ml-1 px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)' }}>
            → {field.mapsToPlayerField}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1 rounded-lg hover:bg-white/10"><Edit size={13} style={{ color: 'var(--color-primary)' }} /></button>
        <button onClick={onDelete} className="p-1 rounded-lg hover:bg-white/10"><Trash2 size={13} style={{ color: 'var(--color-danger)' }} /></button>
      </div>
    </div>
  );
}
