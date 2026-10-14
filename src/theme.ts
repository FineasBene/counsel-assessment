export type Theme = 'light' | 'dark';
const THEME_KEY = 'counsel.theme';
// The theme is a per-browser preference, stored apart from workspace data
// so backups and the counsel.time.v1 format are unaffected.
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage unavailable: fall back to the system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
export function applyTheme(theme: Theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  if (!persist) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The theme still applies for this visit.
  }
}
