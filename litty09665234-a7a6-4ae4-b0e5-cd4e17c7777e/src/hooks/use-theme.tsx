import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeConfig } from '@/lib/themes';
import { theme as appTheme, darkModeColors, lightModeColors } from '@/theme';

const FONT_LINK_ID = 'poof-theme-font';
const THEME_MODE_KEY = 'lit-studio-theme-mode';

type ThemeMode = 'dark' | 'light';

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  return 'dark';
}

// Start font loading immediately at module load (before React mounts)
// This eliminates the flash of unstyled text (FOUT)
(() => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(FONT_LINK_ID);
  if (!existing && appTheme.font?.url) {
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = appTheme.font.url;
    document.head.appendChild(link);
  }
  if (appTheme.font?.family) {
    document.body.style.fontFamily = appTheme.font.family;
  }
})();

interface ThemeContextValue {
  /** The full theme config */
  themeConfig: ThemeConfig;
  /** Current display mode: 'dark' or 'light' */
  mode: ThemeMode;
  /** Switch between dark and light mode (persists to localStorage) */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between dark and light mode */
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyColorsToRoot(colors: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }
}

function applyFont(font: ThemeConfig['font']) {
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = font.url;
  document.body.style.fontFamily = font.family;
}

function applyRadius(radius: string) {
  document.documentElement.style.setProperty('--radius', radius);
}

function applyThemeConfig(config: ThemeConfig) {
  applyColorsToRoot(config.colors);
  applyFont(config.font);
  applyRadius(config.radius);
}

function buildThemeConfig(mode: ThemeMode): ThemeConfig {
  const colors = mode === 'light' ? lightModeColors : darkModeColors;
  return {
    name: mode === 'light' ? 'light' : 'dark',
    description: `Lit Studio ${mode} mode`,
    colors,
    font: appTheme.font,
    radius: appTheme.radius,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Apply theme to DOM and persist to localStorage whenever mode changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
    } catch { /* ignore */ }
    applyThemeConfig(buildThemeConfig(mode));
  }, [mode]);

  const resolvedConfig = useMemo<ThemeConfig>(
    () => buildThemeConfig(mode),
    [mode],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ themeConfig: resolvedConfig, mode, setMode, toggleMode }),
    [resolvedConfig, mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
