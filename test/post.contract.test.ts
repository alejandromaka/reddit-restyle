// @vitest-environment jsdom
/* Reading a post's page (test/fixtures/thread.json, morechildren.json: written
   by hand in reddit's format; replace them with a saved post's .json) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clean } from '../src/core/html';
import { moreUrl, readMore, readThread, threadUrl, type Comment, type More } from '../src/pages/post/contract';

const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));

describe('clean: reddit’s markdown, safe and ours', () => {
  it('keeps markdown’s tags (our classes on them), its links (http(s), reddit’s own), and nothing else', () => {
    const html = clean('<div class="md"><p class="x">Hi <strong>you</strong> <a href="https://a.com" class="y">a</a> <a href="/r/pics">b</a> <a href="javascript:x()">c</a></p><script>x()</script><p onclick="x()">d</p><img src="https://t.co/p.png" onerror="x()"></div>');
    expect(html).toBe('<p>Hi <strong class="rr-font-bold">you</strong> <a class="rr-text-a-default rr-underline" href="https://a.com" rel="noopener noreferrer">a</a> <a class="rr-text-a-default rr-underline" href="/r/pics" rel="noopener noreferrer">b</a> c</p><p>d</p>');
  });

  it('a spoiler, hidden until tapped', () => {
    expect(clean('<p><span class="md-spoiler-text">it ends</span></p>')).toBe('<p><span class="rr-rounded-sm rr-bg-neutral-content-strong rr-text-transparent" data-spoiler="">it ends</span></p>');
  });
});

describe('readThread', () => {
  const { post, comments } = readThread(fixture('thread'));
  const [first, mod, more] = comments as [Comment, Comment, More];

  it('the post: all of its text, cleaned', () => {
    expect(post).toMatchObject({ id: 't3_1q2c001', title: 'Welcome to r/pics: read the rules before posting', flair: 'Announcement', locked: false, media: null });
    expect(post.html).toContain('<strong class="rr-font-bold">everyone</strong>');
    expect(post.html).toContain('data-spoiler');
    expect(post.html).not.toMatch(/script|onclick|javascript|class="md"/);
  });

  it('its comments, as a tree: each with its replies, and "more" for those not sent', () => {
    expect(comments.map(({ kind, id }) => [kind, id])).toEqual([['comment', 't1_c1'], ['comment', 't1_c3'], ['more', 'm2']]);
    expect(first).toMatchObject({ author: 'early_riser', score: 120, vote: 0, text: 'First! Great sub', folded: false, depth: 0 });
    expect(first.replies.map(({ id }) => id)).toEqual(['t1_c2', 'm1']);
    expect(first.replies[0]).toMatchObject({ op: true, author: 'pics-mod' });
    expect(more).toMatchObject({ parent: 't3_1q2c001', count: 12, children: ['c8', 'c9'], depth: 0, continueAt: null });
  });

  it('too deep to send: continue the thread on its own page', () => {
    const [deep] = (first.replies[0] as Comment).replies as [More];
    expect(deep).toMatchObject({ kind: 'more', continueAt: '/r/pics/comments/1q2c001/welcome_to_rpics/c2/' });
  });

  it('a moderator’s, pinned, folded as reddit folds it', () => {
    expect(mod).toMatchObject({ mod: true, pinned: true, folded: true });
  });
});

describe('readMore: morechildren’s flat answer, as a tree', () => {
  it('each under its parent; the rest where the "more" was', () => {
    const replies = readMore(fixture('morechildren').json.data.things, '/r/pics/comments/1q2c001/welcome_to_rpics/') as Comment[];
    expect(replies.map(({ id }) => id)).toEqual(['t1_c5', 't1_c7']);
    expect(replies[0]!.replies.map(({ id }) => id)).toEqual(['t1_c6']);
  });
});

describe('addresses', () => {
  it('the post’s JSON: its path, its query (sort), unescaped, with its subreddit’s icon', () => {
    expect(threadUrl('/r/pics/comments/abc/title/', '?sort=new')).toBe('/r/pics/comments/abc/title/.json?sort=new&raw_json=1&sr_detail=1');
  });

  it('more comments: a hundred at most', () => {
    const children = Array.from({ length: 150 }, (_, i) => `c${i}`);
    const url = new URL(moreUrl('t3_abc', children, 'top'), 'https://old.reddit.com');
    expect(url.pathname).toBe('/api/morechildren.json');
    expect(url.searchParams.get('children')!.split(',')).toHaveLength(100);
    expect([url.searchParams.get('link_id'), url.searchParams.get('sort'), url.searchParams.get('api_type')]).toEqual(['t3_abc', 'top', 'json']);
  });
});
