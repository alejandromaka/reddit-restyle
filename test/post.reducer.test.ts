// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readMore, readThread, type Comment, type More } from '../src/pages/post/contract';
import { findReply, initialState, postReducer } from '../src/pages/post/reducer';

const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));
const loaded = postReducer(initialState('/r/pics/comments/1q2c001/welcome_to_rpics/'), { type: 'page/loaded', thread: readThread(fixture('thread')) });

describe('initialState', () => {
  it('reads the subreddit, the post, one comment’s thread, and the sort from the address', () => {
    expect(initialState('/r/pics/comments/abc/title/def/', '?sort=new')).toMatchObject({ subreddit: 'pics', path: '/r/pics/comments/abc/title/', focus: 't1_def', sort: 'new', about: { status: 'loading' } });
    expect(initialState('/comments/abc/')).toMatchObject({ subreddit: null, path: '/comments/abc/', focus: null, sort: 'confidence', about: null });
    expect(initialState('/r/pics/comments/abc/title/', '?sort=nonsense').sort).toBe('confidence');
  });
});

describe('postReducer', () => {
  it('a vote on a comment: its score with it; on the post: the post’s', () => {
    const up = postReducer(loaded, { type: 'vote/requested', id: 't1_c2', vote: 1 });
    expect(findReply(up.comments, 't1_c2')).toMatchObject({ vote: 1, score: 11 });
    expect(postReducer(loaded, { type: 'vote/requested', id: 't3_1q2c001', vote: -1 }).post).toMatchObject({ vote: -1, score: 1203 });
  });

  it('folding: yours, over reddit’s', () => {
    expect(postReducer(loaded, { type: 'fold/toggled', id: 't1_c3', folded: false }).folded).toEqual({ t1_c3: false });
  });

  it('more: on its way once; loaded in its place', () => {
    const asked = postReducer(loaded, { type: 'more/requested', id: 'm1' });
    expect(asked.loading).toEqual({ m1: '' });
    expect(postReducer(asked, { type: 'more/requested', id: 'm1' })).toBe(asked);
    const replies = readMore(fixture('morechildren').json.data.things, '/r/pics/comments/1q2c001/welcome_to_rpics/');
    const done = postReducer(asked, { type: 'more/loaded', id: 'm1', replies });
    expect((findReply(done.comments, 't1_c1') as Comment).replies.map(({ id }) => id)).toEqual(['t1_c2', 't1_c5', 't1_c7']);
    expect(done.loading).toEqual({});
  });

  it('more than reddit sends at once: the rest stays a "more"', () => {
    const many = { ...loaded, comments: [{ kind: 'more', id: 'm9', parent: 't3_x', count: 150, children: Array.from({ length: 150 }, (_, i) => `c${i}`), depth: 0, continueAt: null } as More] };
    const done = postReducer(many, { type: 'more/loaded', id: 'm9', replies: [] });
    expect(done.comments).toEqual([{ ...many.comments[0], count: 50, children: many.comments[0]!.children.slice(100) }]);
  });

  it('a comment made: the post’s first, a reply its comment’s first; the boxes reset', () => {
    const made = (findReply(loaded.comments, 't1_c2') as Comment);
    const sent = postReducer(postReducer(loaded, { type: 'comment/requested', parent: 't1_c1', text: 'hi' }), { type: 'comment/posted', parent: 't1_c1', comment: made });
    expect((findReply(sent.comments, 't1_c1') as Comment).replies[0]).toBe(made);
    expect(sent).toMatchObject({ sending: null, replyingTo: null, sent: 1 });
    const top = postReducer(loaded, { type: 'comment/posted', parent: 't3_1q2c001', comment: made });
    expect(top.comments[0]).toBe(made);
  });

  it('a comment reddit refused: why, for its box', () => {
    const refused = postReducer(postReducer(loaded, { type: 'comment/requested', parent: 't1_c1', text: 'hi' }), { type: 'comment/failed', parent: 't1_c1', error: 'Error: too fast' });
    expect(refused).toMatchObject({ sending: null, sendError: { parent: 't1_c1', error: 'Error: too fast' } });
  });
});
