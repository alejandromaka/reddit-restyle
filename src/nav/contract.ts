/* Your communities: what you subscribe to (people you follow too), from
   reddit's /subreddits/mine/subscriber.json, as you: a Listing of t5 things,
   100 a page. Favorites first, then A–Z, as reddit's own menu has them. */

import { fetchJson } from '../core/http';

// The parts of a t5 (subreddit) we use, as reddit sends them
interface RedditSubreddit {
  display_name: string;            // soccer; u_someone for a person
  display_name_prefixed: string;   // r/soccer; u/someone
  url: string;                     // /r/soccer/; /user/someone/
  community_icon: string;          // '' when none (raw_json=1: unescaped)
  icon_img: string;                // the older icon; '' when none
  user_has_favorited: boolean | null;
}
interface RedditSubreddits {
  kind: 'Listing';
  data: { after: string | null; children: { kind: string; data: RedditSubreddit }[] };
}

export interface Community {
  name: string;          // soccer
  label: string;         // r/soccer
  path: string;          // /r/soccer/
  icon: string | null;
  favorite: boolean;
}

// A subreddit's icon: the newer one, else the older, else none
export const iconOf = (subreddit: { community_icon?: string; icon_img?: string }) => subreddit.community_icon || subreddit.icon_img || null;

export function readCommunities(pages: RedditSubreddits[]): Community[] {
  return pages
    .flatMap(({ data }) => data.children)
    .filter(({ kind }) => kind === 't5')
    .map(({ data }) => ({
      name: data.display_name,
      label: data.display_name_prefixed,
      path: data.url,
      icon: iconOf(data),
      favorite: Boolean(data.user_has_favorited),
    }))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export const communitiesUrl = (after?: string) => `/subreddits/mine/subscriber.json?limit=100&raw_json=1${after ? `&after=${after}` : ''}`;

export async function fetchCommunities() {
  const pages: RedditSubreddits[] = [];
  let after: string | undefined;
  do {
    const page = await fetchJson<RedditSubreddits>(communitiesUrl(after));
    pages.push(page);
    after = page.data.after ?? undefined;
  } while (after);
  return readCommunities(pages);
}
