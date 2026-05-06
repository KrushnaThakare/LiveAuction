import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Palette } from 'lucide-react';

export default function ThemeSwitcher() {
  const { currentTheme, changeTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const groups = {};
  themes.forEach(t => {
    const g = t.group || 'Classic';
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="btn-secondary !px-3 !py-2 !gap-1.5 !rounded-xl"
        title="Change Theme">
        <Palette size={15} />
        <span className="hidden sm:inline text-xs font-semibold">Theme</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl z-50 w-56 overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
          }}>
          <div className="p-2 max-h-80 overflow-y-auto">
            {Object.entries(groups).map(([groupName, groupThemes]) => (
              <div key={groupName}>
                <p className="text-label px-2 pt-2 pb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {groupName}
                </p>
                {groupThemes.map(theme => (
                  <button key={theme.id}
                    onClick={() => { changeTheme(theme.id); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-150"
                    style={{
                      color: currentTheme === theme.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      background: currentTheme === theme.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                    }}>
                    {/* Colour swatch */}
                    <span className="w-5 h-5 rounded-full flex-shrink-0 relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}88)`,
                        boxShadow: currentTheme === theme.id
                          ? `0 0 8px ${theme.primary}99`
                          : 'none',
                      }}>
                      {currentTheme === theme.id && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                      )}
                    </span>
                    <span className="font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
