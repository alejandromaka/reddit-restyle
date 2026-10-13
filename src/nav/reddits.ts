/* Reddit's own listings, in every page's strip and menu: the front page, Popular, All */

export const REDDITS = [
  { name: null, label: 'Home', path: '/', icon: 'home' },
  { name: 'popular', label: 'Popular', path: '/r/popular/', icon: 'popular' },
  { name: 'all', label: 'All', path: '/r/all/', icon: 'all' },
] as const;

// Whether a listing (a subreddit's name; null: the front page) is the one on screen
export const isHere = (name: string | null, current: string | null) =>
  name === null ? current === null : name.toLowerCase() === current?.toLowerCase();
