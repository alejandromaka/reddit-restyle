import { describe, expect, it } from 'vitest';
import type { Listing, Post } from '../src/pages/listing/contract';
import { initialState, kindOf, listingReducer } from '../src/pages/listing/reducer';

const post = (id: string): Post => ({
  id, title: id, subreddit: 'pics', subredditIcon: null, author: 'a', score: 1, vote: 0, comments: 0, created: 0, permalink: `/r/pics/comments/${id}/`,
  domain: 'self.pics', link: null, media: null, text: null, nsfw: false, spoiler: false, pinned: false, hidden: false, flair: null,
});
const listing = (ids: string[], after: string | null, before: string | null = null): Listing => ({ posts: ids.map(post), after, before });

describe('initialState', () => {
  it('reads the subreddit and sort from the path', () => {
    expect(initialState('/')).toMatchObject({ subreddit: null, kind: 'home', sort: 'best', status: 'loading', about: null, communities: { status: 'loading' }, me: { status: 'loading' } });
    expect(initialState('/r/pics').sort).toBe('hot');
    expect(initialState('/r/pics/')).toMatchObject({ kind: 'subreddit', about: { status: 'loading' }, time: null });
    expect(initialState('/r/pics/top/', '?t=week')).toMatchObject({ sort: 'top', time: 'week' });
    expect(initialState('/top/', '?t=nonsense').time).toBe('day');
    expect(initialState('/new/')).toMatchObject({ subreddit: null, sort: 'new' });
    expect(initialState('/r/pics')).toMatchObject({ subreddit: 'pics', sort: 'hot' });
    expect(initialState('/r/pics+funny/top/')).toMatchObject({ subreddit: 'pics+funny', sort: 'top' });
  });

  it('which page, from the address (old reddit’s count=); the address, for the pages’ links', () => {
    expect(initialState('/r/pics/')).toMatchObject({ page: 1, path: '/r/pics/', search: '' });
    expect(initialState('/r/pics/top/', '?t=week&count=50&after=t3_x')).toMatchObject({ page: 3, search: '?t=week&count=50&after=t3_x' });
  });
});

describe('kindOf', () => {
  it('the front page, reddit’s two, several subreddits, one', () => {
    expect([null, 'popular', 'All', 'pics+funny', 'pics'].map(kindOf)).toEqual(['home', 'popular', 'all', 'multi', 'subreddit']);
  });
});

describe('listingReducer', () => {
  const loaded = listingReducer(initialState('/'), { type: 'page/loaded', listing: listing(['a', 'b'], 'b') });

  it('the page: its posts, where the next starts, where the one before ends', () => {
    expect(loaded).toMatchObject({ status: 'idle', after: 'b', before: null });
    expect(loaded.posts.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(listingReducer(initialState('/'), { type: 'page/loaded', listing: listing(['c'], null, 'c') })).toMatchObject({ after: null, before: 'c' });
  });

  it('the page failed: why', () => {
    const failed = listingReducer(initialState('/'), { type: 'page/failed', error: 'Error: /.json?raw_json=1: 403' });
    expect(failed).toMatchObject({ status: 'failed', error: 'Error: /.json?raw_json=1: 403', posts: [] });
  });

  it('the menu’s communities, or why they didn’t come', () => {
    const community = { name: 'soccer', label: 'r/soccer', path: '/r/soccer/', icon: null, favorite: true };
    expect(listingReducer(loaded, { type: 'communities/loaded', communities: [community] }).communities).toEqual({ status: 'loaded', data: [community] });
    expect(listingReducer(loaded, { type: 'communities/failed', error: 'Error: 403' }).communities).toEqual({ status: 'failed', error: 'Error: 403' });
  });

  it('one subreddit’s about, or why it didn’t come', () => {
    const pics = initialState('/r/pics/');
    const about = { name: 'pics', label: 'r/pics', icon: null, banner: null, color: null, members: 1, joined: false };
    expect(listingReducer(pics, { type: 'about/loaded', about }).about).toEqual({ status: 'loaded', data: about });
    expect(listingReducer(pics, { type: 'about/failed', error: 'Error: 404' }).about).toEqual({ status: 'failed', error: 'Error: 404' });
  });

  it('a vote: the post’s, and its score with it; back again when it fails', () => {
    const up = listingReducer(loaded, { type: 'vote/requested', id: 'a', vote: 1 });
    expect(up.posts[0]).toMatchObject({ vote: 1, score: 2 });
    expect(listingReducer(up, { type: 'vote/requested', id: 'a', vote: -1 }).posts[0]).toMatchObject({ vote: -1, score: 0 });
    expect(listingReducer(up, { type: 'vote/failed', id: 'a', vote: 0 }).posts[0]).toMatchObject({ vote: 0, score: 1 });
    expect(up.posts[1]).toBe(loaded.posts[1]);
  });

  it('r/all: its filters asked for (only there); one added, A–Z and once, or taken out; back again when it fails, and why', () => {
    expect(initialState('/r/pics/').filters).toBeNull();
    const all = listingReducer(initialState('/r/all/'), { type: 'filters/loaded', filters: ['funny', 'gaming'] });
    const added = listingReducer(all, { type: 'filter/requested', subreddit: 'aww', filtered: true });
    expect(added.filters).toEqual({ status: 'loaded', data: ['aww', 'funny', 'gaming'] });
    expect(listingReducer(added, { type: 'filter/requested', subreddit: 'AWW', filtered: true }).filters).toEqual({ status: 'loaded', data: ['AWW', 'funny', 'gaming'] });
    expect(listingReducer(added, { type: 'filter/requested', subreddit: 'funny', filtered: false }).filters).toEqual({ status: 'loaded', data: ['aww', 'gaming'] });
    const refused = listingReducer(added, { type: 'filter/failed', subreddit: 'aww', filtered: true, error: 'Error: 400' });
    expect([refused.filters, refused.filterError]).toEqual([{ status: 'loaded', data: ['funny', 'gaming'] }, 'Error: 400']);
    expect(initialState('/r/all/').filters).toEqual({ status: 'loading' });
  });

  it('joining: the subreddit, and its members with it; back again when it fails', () => {
    const about = { name: 'pics', label: 'r/pics', icon: null, banner: null, color: null, members: 10, joined: false };
    const pics = listingReducer(initialState('/r/pics/'), { type: 'about/loaded', about });
    const joined = listingReducer(pics, { type: 'join/requested', joined: true });
    expect(joined.about).toMatchObject({ data: { joined: true, members: 11 } });
    expect(listingReducer(joined, { type: 'join/failed', joined: false }).about).toMatchObject({ data: { joined: false, members: 10 } });
  });
});
