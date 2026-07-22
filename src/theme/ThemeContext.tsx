import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { dawn, vigil, type Theme } from './tokens';
import { useAppStore } from '../state/appStore';

const ThemeContext = createContext<Theme>(dawn);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.themePref);
  const theme = useMemo<Theme>(() => {
    if (pref === 'dawn') return dawn;
    if (pref === 'vigil') return vigil;
    return system === 'dark' ? vigil : dawn;
  }, [pref, system]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
