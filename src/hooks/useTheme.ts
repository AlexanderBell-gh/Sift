import { useContext } from 'react';
import { ThemeContext } from '../contexts/theme-context';
import type { ThemeContextType } from '../contexts/theme-context';

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
