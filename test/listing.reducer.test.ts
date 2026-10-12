import { describe, expect, it } from 'vitest';
import type { Listing, Post } from '../src/pages/listing/contract';
import { initialState, listingReducer } from '../src/pages/listing/reducer';

const post = (id: string): Post => ({
  id, title: id, subreddit: 'pics', author: 'a', score: 1, comments: 0, created: 0, permalink: `/r/pics/comments/${id}/`,
  domain: 'self.pics', link: null, image: null, video: false, gallery: 0, text: null, nsfw: false, spoiler: false, pinned: false, flair: null,
});
const listing = (ids: string[], after: string | null): Listing => ({ posts: ids.map(post), after });

describe('initialState', () => {
  it('reads the subreddit and sort from the path', () => {
    expect(initialState('/')).toMatchObject({ subreddit: null, sort: 'hot', status: 'loading' });
    expect(initialState('/new/')).toMatchObject({ subreddit: null, sort: 'new' });
    expect(initialState('/r/pics')).toMatchObject({ subreddit: 'pics', sort: 'hot' });
    expect(initialState('/r/pics+funny/top/')).toMatchObject({ subreddit: 'pics+funny', sort: 'top' });
  });
});

describe('listingReducer', () => {
  const loaded = listingReducer(initialState('/'), { type: 'page/loaded', listing: listing(['a', 'b'], 'b') });

  it('the first page', () => {
    expect(loaded).toMatchObject({ status: 'idle', after: 'b' });
    expect(loaded.posts.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('more: asked once, appended without repeats', () => {
    const asked = listingReducer(loaded, { type: 'more/requested' });
    expect(asked.status).toBe('more');
    expect(listingReducer(asked, { type: 'more/requested' })).toBe(asked);
    const more = listingReducer(asked, { type: 'more/loaded', listing: listing(['b', 'c'], null) });
    expect(more.posts.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(more).toMatchObject({ status: 'idle', after: null });
  });

  it('no next page: nothing to ask for', () => {
    const last = listingReducer(initialState('/'), { type: 'page/loaded', listing: listing(['a'], null) });
    expect(listingReducer(last, { type: 'more/requested' })).toBe(last);
  });

  it('the first page failed: why, and nothing to ask for', () => {
    const failed = listingReducer(initialState('/'), { type: 'page/failed', error: 'Error: /.json?raw_json=1: 403' });
    expect(failed).toMatchObject({ status: 'failed', error: 'Error: /.json?raw_json=1: 403', posts: [] });
    expect(listingReducer(failed, { type: 'more/requested' })).toBe(failed);
  });

  it('more failed: asked again', () => {
    const failed = listingReducer(listingReducer(loaded, { type: 'more/requested' }), { type: 'more/failed' });
    expect(failed.status).toBe('more-failed');
    expect(listingReducer(failed, { type: 'more/requested' }).status).toBe('more');
  });
});
