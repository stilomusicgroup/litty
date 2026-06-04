/**
 * Lit Studio — Canonical Design System
 * Background: #000000 | Card: #111111 | Card Elevated: #1a1a1a
 * Primary (interaction): #00FF41 | Neon (attention): #00FF41
 * Heading font: Archivo Black 900 | UI font: Inter 400/500/600
 */

const font = {
  url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap',
  family: "'Inter', sans-serif",
};

export const headingFont = "'Archivo Black', sans-serif";
export const bodyFont = "'Inter', sans-serif";
// Orbitron: use for numbers, stats, prices, tickers, ranks — the "exchange terminal" font
export const orbitronFont = "'Orbitron', sans-serif";
export const poppinsFont = headingFont;

// Strict color system — ONLY these colors
export const colors = {
  background: '#000000',
  card: '#111111',
  cardElevated: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderGreen: 'rgba(0, 255, 65, 0.3)',
  primary: '#00FF41',
  neon: '#00FF41',
  neonGlow: '0 0 20px rgba(0, 255, 65, 0.5)',
  neonDarkBg: 'rgba(0, 255, 65, 0.08)',
  textWhite: '#FFFFFF',
  textGray: '#888888',
  textDim: '#555555',
  red: '#FF3333',
  green: '#00FF41',
};

// shadcn-compatible HSL values
export const darkModeColors = {
  background: '0 0% 0%',           // #000000
  foreground: '0 0% 100%',          // #FFFFFF
  card: '0 0% 7%',                  // #111111
  'card-foreground': '0 0% 100%',
  popover: '0 0% 7%',
  'popover-foreground': '0 0% 100%',
  primary: '135 100% 50%',           // #00FF41
  'primary-foreground': '0 0% 0%',
  secondary: '0 0% 10%',            // #1a1a1a
  'secondary-foreground': '0 0% 100%',
  muted: '0 0% 53%',                // #888888
  'muted-foreground': '0 0% 33%',   // #555555
  accent: '135 100% 50%',
  'accent-foreground': '0 0% 0%',
  destructive: '0 100% 60%',        // #FF3333
  'destructive-foreground': '0 0% 100%',
  border: '0 0% 100% / 0.08',
  input: '0 0% 7%',
  ring: '135 100% 50%',
  link: '135 100% 50%',
  'link-hover': '135 100% 50%',
  button: '0 0% 10%',
  'button-foreground': '0 0% 100%',
  'button-border': '0 0% 100% / 0.12',
  'button-hover': '135 100% 50%',
  'button-hover-foreground': '0 0% 0%',
  'button-hover-border': '135 100% 50%',
  'button-ring': '135 100% 50%',
  'chart-1': '135 100% 50%',        // #00FF41
  'chart-2': '135 100% 50%',       // #00FF41
  'chart-3': '0 100% 60%',         // #FF3333
  'chart-4': '0 0% 100%',
  'chart-5': '0 0% 53%',
  'sidebar-background': '0 0% 0%',
  'sidebar-foreground': '0 0% 100%',
  'sidebar-primary': '135 100% 50%',
  'sidebar-primary-foreground': '0 0% 0%',
  'sidebar-accent': '0 0% 10%',
  'sidebar-accent-foreground': '0 0% 100%',
  'sidebar-border': '0 0% 100% / 0.08',
  'sidebar-ring': '135 100% 50%',
};

export const lightModeColors = { ...darkModeColors };

export const theme = {
  colors: darkModeColors,
  font,
  radius: '1rem',
};
