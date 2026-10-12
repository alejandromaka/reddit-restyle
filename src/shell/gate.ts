/* Falling back to reddit's own page */

// showStock reloads this page once as reddit's own; the next visit is ours again
const SKIP_KEY = 'reddit-restyle:stock';

export function skipThisLoad() {
  if (sessionStorage.getItem(SKIP_KEY) !== location.pathname) return false;
  sessionStorage.removeItem(SKIP_KEY);
  return true;
}

export function showStock() {
  sessionStorage.setItem(SKIP_KEY, location.pathname);
  location.reload();
}

// Ours can't show this page: reddit's instead
export function bail(reason: string) {
  console.warn(`Reddit Restyle: showing stock reddit (${reason})`);
  showStock();
}
