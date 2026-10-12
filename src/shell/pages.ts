/* Pages this restyle owns, by path on old.reddit.com. Every other page stays
   reddit's own. The name becomes <html data-restyle="…">, which turns on the
   CSS. Each is drawn by us, hidden until it is (Shell.reveal). */

const SORTS = 'hot|new|rising|controversial|top';

export const PAGES = {
  // The front page, a subreddit (or several: r/pics+funny), each by sort
  listing: new RegExp(`^/(r/[\\w+]+/?)?((${SORTS})/?)?$`),
} as const;

export type PageName = keyof typeof PAGES;

export const pageOf = (path: string) => (Object.keys(PAGES) as PageName[]).find((name) => PAGES[name].test(path));
