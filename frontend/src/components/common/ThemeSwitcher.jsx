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
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary !px-3 !py-2 !gap-1.5"
        title="Change Theme"
      >
        <Palette size={16} />
        <span className="hidden sm:inline text-xs">Theme</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 p-2 rounded-xl shadow-2xl z-50 w-52"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {Object.entries(groups).map(([groupName, groupThemes]) => (
            <div key={groupName}>
              <p className="text-xs font-bold uppercase tracking-wide px-2 pt-2 pb-1"
                style={{ color: 'var(--color-text-secondary)' }}>
                {groupName}
              </p>
              {groupThemes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { changeTheme(theme.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    color: currentTheme === theme.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    backgroundColor: currentTheme === theme.id ? 'var(--color-surface-2)' : 'transparent',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  />
                  {theme.name}
                  {currentTheme === theme.id && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
