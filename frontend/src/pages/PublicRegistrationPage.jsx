import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { registrationApi } from '../api/registration';
import { tournamentApi } from '../api/tournaments';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { CheckCircle, ExternalLink, Upload } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '');

export default function PublicRegistrationPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [tRes, fRes] = await Promise.all([
          tournamentApi.getById(tournamentId),
          registrationApi.getForm(tournamentId),
        ]);
        const t = tRes.data.data;
        setTournament(t);
        setSections(fRes.data.data || []);
      } catch (e) {
        toast.error('Failed to load registration form');
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  const allFields = sections.flatMap(s => s.fields);

  const setValue = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const handleFile = (key, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [key]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    for (const field of allFields) {
      if (field.type === 'STATIC_IMAGE') continue;
      if (field.required) {
        const v = values[field.fieldKey];
        if (field.type === 'FILE_UPLOAD') {
          if (!files[field.fieldKey]) errs[field.fieldKey] = 'This field is required';
        } else if (!v || (Array.isArray(v) && v.length === 0) || String(v).trim() === '') {
          errs[field.fieldKey] = 'This field is required';
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fill in all required fields'); return; }

    setSubmitting(true);
    try {
      const photoField = allFields.find(f => f.mapsToPlayerField === 'photo' && f.type === 'FILE_UPLOAD');
      const photo = photoField ? files[photoField.fieldKey] : null;

      const nameField = allFields.find(f => f.mapsToPlayerField === 'name');
      const mobileField = allFields.find(f => f.type === 'PHONE');
      const playerName = nameField ? values[nameField.fieldKey] : null;
      const mobile = mobileField ? values[mobileField.fieldKey] : null;

      await registrationApi.submit(tournamentId, values, playerName, mobile, photo);
      setSubmitted(true);
    } catch (err) {
      // interceptor handles toast
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
      <LoadingSpinner size="lg" text="Loading registration form…" />
    </div>
  );

  if (!tournament?.registrationEnabled) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
      <div className="text-center p-8" style={{ color: '#f1f5f9' }}>
        <h2 className="text-2xl font-bold mb-2">Registration Closed</h2>
        <p style={{ color: '#94a3b8' }}>Registration is currently not open for {tournament?.name}.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <SuccessPage
      message={tournament.registrationMessage || 'Registration submitted successfully!'}
      redirectLink={tournament.registrationRedirectLink}
    />
  );

  const bannerSrc = tournament.bannerUrl
    ? (tournament.bannerUrl.startsWith('/api') ? API_ORIGIN + tournament.bannerUrl : tournament.bannerUrl)
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>
      {/* Banner */}
      {bannerSrc && (
        <div className="w-full h-48 overflow-hidden">
          <img src={bannerSrc} alt="Tournament Banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black" style={{ color: '#3b82f6' }}>{tournament.name}</h1>
          <p className="text-lg mt-1" style={{ color: '#94a3b8' }}>Player Registration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map(section => (
            <div key={section.id} className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              {/* Section Header */}
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #334155', backgroundColor: '#263347' }}>
                <h2 className="font-bold text-lg">{section.title}</h2>
                {section.description && (
                  <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{section.description}</p>
                )}
              </div>

              {/* Fields */}
              <div className="px-6 py-5 space-y-4">
                {section.fields.map(field => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.fieldKey]}
                    filePreview={previews[field.fieldKey]}
                    error={errors[field.fieldKey]}
                    onChange={val => setValue(field.fieldKey, val)}
                    onFile={file => handleFile(field.fieldKey, file)}
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all"
            style={{ backgroundColor: '#3b82f6', color: 'white' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Submitting…
              </span>
            ) : 'Submit Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, filePreview, error, onChange, onFile }) {
  const labelStyle = { color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' };
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    backgroundColor: '#263347', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
    color: '#f1f5f9', outline: 'none', fontSize: '0.9rem',
  };
  const opts = field.options || [];

  return (
      <div>
      {field.type !== 'STATIC_IMAGE' && (
        <label style={labelStyle}>
          {field.label}
          {field.required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
      )}
      {field.type === 'STATIC_IMAGE' && field.label && (
        <p style={{ ...labelStyle, marginBottom: '8px' }}>{field.label}</p>
      )}

      <div className="mt-1.5">
        {field.type === 'TEXTAREA' && (
          <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={e => onChange(e.target.value)} />
        )}

        {(field.type === 'TEXT' || field.type === 'NUMBER' || field.type === 'PHONE' || field.type === 'EMAIL') && (
          <input
            type={field.type === 'NUMBER' ? 'number' : field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            style={inputStyle}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={e => onChange(e.target.value)} />
        )}

        {field.type === 'DROPDOWN' && (
          <select style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Select…</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {field.type === 'RADIO' && (
          <div className="space-y-2 mt-1">
            {opts.map(o => (
              <label key={o} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name={field.fieldKey} value={o}
                  checked={value === o} onChange={() => onChange(o)}
                  style={{ accentColor: '#3b82f6' }} />
                <span style={{ color: '#f1f5f9' }}>{o}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'CHECKBOX_GROUP' && (
          <div className="space-y-2 mt-1">
            {opts.map(o => {
              const arr = value || [];
              return (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={arr.includes(o)}
                    style={{ accentColor: '#3b82f6' }}
                    onChange={e => onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o))} />
                  <span style={{ color: '#f1f5f9' }}>{o}</span>
                </label>
              );
            })}
          </div>
        )}

        {field.type === 'MULTI_SELECT' && (
          <select multiple style={{ ...inputStyle, height: '120px' }}
            value={value || []}
            onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {field.type === 'FILE_UPLOAD' && (
          <div>
            {filePreview && (
              <img src={filePreview} alt="Preview"
                className="w-32 h-32 object-cover rounded-xl mb-2" />
            )}
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm font-medium"
              style={{ backgroundColor: '#334155', color: '#f1f5f9', border: `1px solid ${error ? '#ef4444' : '#475569'}` }}>
              <Upload size={16} />
              {filePreview ? 'Change Photo' : field.placeholder || 'Upload File'}
              <input type="file" className="hidden" accept="image/*"
                onChange={e => onFile(e.target.files?.[0])} />
            </label>
          </div>
        )}

        {field.type === 'STATIC_IMAGE' && field.defaultValue && (
          <div className="rounded-2xl overflow-hidden">
            <img
              src={field.defaultValue}
              alt={field.label}
              className="w-full max-w-xs mx-auto block rounded-2xl"
              style={{ border: '1px solid #334155' }}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

function SuccessPage({ message, redirectLink }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
          <CheckCircle size={40} style={{ color: '#10b981' }} />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: '#f1f5f9' }}>Registration Submitted!</h1>
        <p className="text-lg mb-8" style={{ color: '#94a3b8' }}>{message}</p>
        {redirectLink && (
          <a href={redirectLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white"
            style={{ backgroundColor: '#25D366' }}>
            <ExternalLink size={18} />
            Join WhatsApp Group
          </a>
        )}
      </div>
    </div>
  );
}
