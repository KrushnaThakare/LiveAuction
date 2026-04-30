import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  { id: 'midnight-blue', name: 'Midnight Blue', primary: '#3b82f6' },
  { id: 'emerald-night', name: 'Emerald Night', primary: '#10b981' },
  { id: 'royal-gold', name: 'Royal Gold', primary: '#f59e0b' },
  { id: 'crimson-fire', name: 'Crimson Fire', primary: '#ef4444' },
  { id: 'ocean-breeze', name: 'Ocean Breeze', primary: '#0ea5e9' },
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
