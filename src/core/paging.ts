/* Pages, as old reddit's: a listing (a subreddit's, someone's) a page at a
   time, never one long list. Each page is its own address: the listing's,
   plus where the page starts (after= a post, or before= one) and count=,
   which numbers it. */

export const PAGE_SIZE = 25;  // old reddit's; asked for (limit=), so count= numbers pages right

// Which page an address is, by old reddit's count=: with after=, the posts before
// the page; with before=, the first post of the page after it, counting from 1
export function pageOf(search: string): number {
  const query = new URLSearchParams(search);
  const count = Number(query.get('count')) || 0;
  if (query.has('after')) return Math.floor(count / PAGE_SIZE) + 1;
  if (query.has('before')) return Math.max(1, Math.floor((count - 1) / PAGE_SIZE));
  return 1;
}

// A page's address, as old reddit's: the listing's (its sort, its span) plus where the page
// starts, after a post or before one; page 1: just the listing's
export type Start = { after: string } | { before: string };

export function pageUrl(path: string, search: string, page: number, start?: Start) {
  const query = new URLSearchParams(search);
  for (const name of ['count', 'after', 'before', 'limit']) query.delete(name);
  if (page > 1 && start) {
    if ('after' in start) {
      query.set('count', String((page - 1) * PAGE_SIZE));
      query.set('after', start.after);
    } else {
      query.set('count', String(page * PAGE_SIZE + 1));
      query.set('before', start.before);
    }
  }
  const rest = query.toString();
  return rest ? `${path}?${rest}` : path;
}
