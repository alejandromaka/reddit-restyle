/* Pages we don't draw yet: reddit's own, on www. Old reddit's scripts and CSS
   never load (Reddit Blocker.user.js), so its own pages can't work here. */

const BOUNCED_KEY = 'reddit-restyle:www';

// Once per page and visit: an account set to open old reddit by default has www
// send it straight back, and then the page stays as it comes
export function toWww() {
  const { pathname, search, hash } = location;
  if (sessionStorage.getItem(BOUNCED_KEY) === pathname) return sessionStorage.removeItem(BOUNCED_KEY);
  sessionStorage.setItem(BOUNCED_KEY, pathname);
  location.replace(`https://www.reddit.com${pathname}${search}${hash}`);
}
