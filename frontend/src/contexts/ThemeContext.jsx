import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  // Original 5
  { id: 'midnight-blue',  name: 'Midnight Blue',    primary: '#3b82f6', group: 'Classic' },
  { id: 'emerald-night',  name: 'Emerald Night',    primary: '#10b981', group: 'Classic' },
  { id: 'royal-gold',     name: 'Royal Gold',       primary: '#f59e0b', group: 'Classic' },
  { id: 'crimson-fire',   name: 'Crimson Fire',     primary: '#ef4444', group: 'Classic' },
  { id: 'ocean-breeze',   name: 'Ocean Breeze',     primary: '#0ea5e9', group: 'Classic' },
  // Premium Sports themes
  { id: 'ipl-neon',       name: '⚡ IPL Neon',       primary: '#7c3aed', group: 'Premium Sports' },
  { id: 'stadium-night',  name: '🏟 Stadium Night',   primary: '#14b8a6', group: 'Premium Sports' },
  { id: 'cricket-fire',   name: '🔥 Cricket Fire',    primary: '#f97316', group: 'Premium Sports' },
  { id: 'electric-blue',  name: '💎 Electric Blue',   primary: '#38bdf8', group: 'Premium Sports' },
  { id: 'dark-arena',     name: '🏆 Dark Arena',      primary: '#94a3b8', group: 'Premium Sports' },
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
