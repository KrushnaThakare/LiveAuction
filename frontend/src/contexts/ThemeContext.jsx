import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  // Original clean themes
  { id: 'midnight-blue',   name: 'Midnight Blue',    primary: '#3b82f6', group: 'Classic' },
  { id: 'emerald-night',   name: 'Emerald Night',    primary: '#10b981', group: 'Classic' },
  { id: 'royal-gold',      name: 'Royal Gold',       primary: '#f59e0b', group: 'Classic' },
  { id: 'crimson-fire',    name: 'Crimson Fire',     primary: '#ef4444', group: 'Classic' },
  { id: 'ocean-breeze',    name: 'Ocean Breeze',     primary: '#0ea5e9', group: 'Classic' },
  // Sporty textured themes
  { id: 'stadium',         name: '🏟 Stadium Lights', primary: '#f97316', group: 'Sporty' },
  { id: 'pitch-green',     name: '🏏 Pitch Green',    primary: '#16a34a', group: 'Sporty' },
  { id: 'trophy-gold',     name: '🏆 Trophy Gold',    primary: '#d97706', group: 'Sporty' },
  { id: 'carbon',          name: '⚡ Carbon Dark',    primary: '#6366f1', group: 'Sporty' },
  { id: 'midnight-steel',  name: '🔩 Midnight Steel', primary: '#38bdf8', group: 'Sporty' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(
    () => localStorage.getItem('cricket-theme') || 'midnight-blue'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('cricket-theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeId) => {
    setCurrentTheme(themeId);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
