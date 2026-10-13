/* Light or dark: yours once you've chosen (this device remembers it), else
   your system's, following it as it changes. On <html> as data-theme, which
   the tokens follow (styles/tokens.css). */

const KEY = 'reddit-restyle:theme';
const SYSTEM = '(prefers-color-scheme: dark)';

const chosen = () => localStorage.getItem(KEY);  // 'dark', 'light', or null: not yet

export const isDark = () => document.documentElement.dataset.theme === 'dark';

function apply() {
  const dark = chosen() ? chosen() === 'dark' : matchMedia(SYSTEM).matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

// At document start, before anything's drawn
export function startTheme() {
  apply();
  matchMedia(SYSTEM).addEventListener('change', apply);
}

export function chooseTheme(dark: boolean) {
  localStorage.setItem(KEY, dark ? 'dark' : 'light');
  apply();
}
