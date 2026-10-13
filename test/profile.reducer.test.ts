import { describe, expect, it } from 'vitest';
import type { Items } from '../src/pages/profile/contract';
import { initialState, profileReducer } from '../src/pages/profile/reducer';

describe('initialState', () => {
  it('whose, which tab, which sort and span, which page, from the address', () => {
    expect(initialState('/user/someone/')).toMatchObject({ name: 'someone', tab: 'overview', sort: 'new', time: null, page: 1, user: { status: 'loading' } });
    expect(initialState('/user/some-one/comments/', '?sort=top')).toMatchObject({ name: 'some-one', tab: 'comments', sort: 'top', time: 'all' });
    expect(initialState('/user/someone/submitted', '?sort=controversial&t=week&count=25&after=t3_x')).toMatchObject({ tab: 'submitted', time: 'week', page: 2 });
    expect(initialState('/user/someone/', '?sort=nonsense').sort).toBe('new');
    expect(initialState('/user/someone/saved/')).toMatchObject({ tab: 'saved', sort: null, time: null });  // yours: no sorts
  });
});

describe('profileReducer', () => {
  const post = { id: 't3_p', title: 'p', subreddit: 'pics', subredditIcon: null, author: 'someone', score: 5, vote: 0 as const, comments: 0, created: 0, permalink: '/r/pics/comments/p/', domain: 'self.pics', link: null, media: null, text: null, nsfw: false, spoiler: false, pinned: false, flair: null };
  const comment = { id: 't1_c', author: 'someone', html: '', score: 2, scoreHidden: false, vote: 1 as const, created: 0, subreddit: 'pics', subredditIcon: null, postTitle: 'p', postPath: '/r/pics/comments/p/', permalink: '/r/pics/comments/p/x/c/' };
  const items: Items = { items: [{ kind: 'post', post }, { kind: 'comment', comment }], after: 't1_c', before: null };
  const loaded = profileReducer(initialState('/user/someone/'), { type: 'page/loaded', items });

  it('the page: its posts and comments, where the next starts', () => {
    expect(loaded).toMatchObject({ status: 'idle', after: 't1_c', before: null });
    expect(loaded.items).toHaveLength(2);
  });

  it('the page failed: why; who they are, or why not', () => {
    expect(profileReducer(loaded, { type: 'page/failed', error: 'Error: 404' })).toMatchObject({ status: 'failed', error: 'Error: 404' });
    expect(profileReducer(loaded, { type: 'user/failed', error: 'Error: 404' }).user).toEqual({ status: 'failed', error: 'Error: 404' });
  });

  it('a vote on a post or a comment: its, and its score with it; back again when it fails', () => {
    const up = profileReducer(loaded, { type: 'vote/requested', id: 't3_p', vote: 1 });
    expect(up.items[0]).toMatchObject({ post: { vote: 1, score: 6 } });
    expect(up.items[1]).toBe(loaded.items[1]);
    const down = profileReducer(loaded, { type: 'vote/requested', id: 't1_c', vote: -1 });
    expect(down.items[1]).toMatchObject({ comment: { vote: -1, score: 0 } });
    expect(profileReducer(down, { type: 'vote/failed', id: 't1_c', vote: 1 }).items[1]).toMatchObject({ comment: { vote: 1, score: 2 } });
  });
});
