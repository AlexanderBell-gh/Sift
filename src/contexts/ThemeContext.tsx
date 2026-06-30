import { createContext, useState, useEffect, type ReactNode } from 'react';

export interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('sift_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('sift_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  function toggle() {
    setIsDark(prev => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
