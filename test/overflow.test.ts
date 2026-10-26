// @vitest-environment jsdom
/* A post's or comment's "…": the menu, hiding, reporting, blocking (its state), and a
   subreddit's rules (test/fixtures/rules.json: written by hand in reddit's format) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readRules, rulesUrl } from '../src/overflow/contract';
import { commentThing, initialOverflow, isBlocked, overflowReducer, postThing, siteBlock, siteOf, type OverflowAction, type OverflowState } from '../src/overflow/state';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/rules.json'), 'utf8'));
const post = { id: 't3_a', kind: 'post' as const, subreddit: 'pics', author: 'someone', domain: null, hidden: false };
const at = { top: 100, right: 16 };
const run = (...actions: OverflowAction[]) => actions.reduce<OverflowState>(overflowReducer, initialOverflow());

describe('readRules', () => {
  it('the subreddit’s, each for posts, comments or both (its violation reason, else its name), and reddit’s', () => {
    expect(readRules(answer)).toEqual({
      subreddit: [
        { label: 'No screenshots', reason: 'Screenshot', on: 'post' },
        { label: 'Be civil', reason: 'Incivility', on: 'all' },
        { label: 'No spoilers in comments', reason: 'No spoilers in comments', on: 'comment' },
      ],
      reddit: ['Spam', 'Personal and confidential information', 'Threatening, harassing, or inciting violence'],
    });
    expect(rulesUrl('pics')).toBe('/r/pics/about/rules.json?raw_json=1');
  });
});

describe('overflowReducer', () => {
  it('the menu: open for a thing, under its "…"; closed, still there while it goes', () => {
    const open = run({ type: 'menu/opened', thing: post, at });
    expect(open.menu).toEqual({ thing: post, at, open: true });
    expect(overflowReducer(open, { type: 'menu/closed' }).menu).toEqual({ thing: post, at, open: false });
  });

  it('hiding a post: yours here, the menu closed; back when reddit refuses', () => {
    const hid = run({ type: 'menu/opened', thing: post, at }, { type: 'hide/requested', id: 't3_a', hidden: true });
    expect([hid.hidden, hid.menu?.open]).toEqual([{ t3_a: true }, false]);
    expect(overflowReducer(hid, { type: 'hide/failed', id: 't3_a', hidden: false }).hidden).toEqual({ t3_a: false });
  });

  it('a report: its subreddit’s rules asked for once; a reason, then sent once; thanks', () => {
    const comment = commentThing('t1_c', 'pics', 'someone');
    const opened = run({ type: 'report/opened', thing: comment });
    expect(opened.report).toEqual({ thing: comment, reason: null, status: 'choosing', error: null, open: true });
    expect(opened.rules).toEqual({ pics: { status: 'loading' } });
    expect(overflowReducer(opened, { type: 'report/requested' })).toBe(opened);  // no reason yet
    const chosen = overflowReducer(opened, { type: 'report/chosen', reason: 'Incivility' });
    const sending = overflowReducer(chosen, { type: 'report/requested' });
    expect(sending.report).toMatchObject({ reason: 'Incivility', status: 'sending' });
    expect(overflowReducer(sending, { type: 'report/requested' })).toBe(sending);
    expect(overflowReducer(sending, { type: 'report/chosen', reason: 'Spam' })).toBe(sending);
    const failed = overflowReducer(sending, { type: 'report/failed', error: 'Error: 500' });
    expect(failed.report).toMatchObject({ status: 'failed', error: 'Error: 500' });
    expect(overflowReducer(failed, { type: 'report/requested' }).report).toMatchObject({ status: 'sending', error: null });  // again
    expect(overflowReducer(sending, { type: 'report/sent' }).report?.status).toBe('sent');
    const again = overflowReducer(overflowReducer(chosen, { type: 'report/closed' }), { type: 'report/opened', thing: comment });
    expect(again.rules).toBe(chosen.rules);  // already asked for
  });

  it('blocking: are you sure? (the menu closed); blocked, by name in any case; back when reddit refuses; unblocked', () => {
    const asked = run({ type: 'menu/opened', thing: post, at }, { type: 'block/opened', name: 'Someone' });
    expect([asked.block, asked.menu?.open, isBlocked(asked, 'someone')]).toEqual([{ name: 'Someone', open: true }, false, false]);
    expect(overflowReducer(asked, { type: 'block/closed' }).block).toEqual({ name: 'Someone', open: false });
    const blocked = overflowReducer(asked, { type: 'block/requested', name: 'Someone', blocked: true });
    expect([blocked.block?.open, isBlocked(blocked, 'someone'), isBlocked(blocked, 'SOMEONE')]).toEqual([false, true, true]);
    expect(isBlocked(overflowReducer(blocked, { type: 'block/failed', name: 'Someone', blocked: false }), 'someone')).toBe(false);
    const unblocked = overflowReducer(blocked, { type: 'block/requested', name: 'someone', blocked: false });
    expect(isBlocked(unblocked, 'Someone', true)).toBe(false);  // yours here, over reddit's say
    expect(isBlocked(initialOverflow(), 'someone', true)).toBe(true);  // reddit's, else
  });

  it('a post’s site: where its link goes (lower case, no www.), none on reddit', () => {
    const link = { id: 't3_b', subreddit: 'news', author: 'newsy', domain: 'WWW.TheHill.com', link: 'https://www.thehill.com/a', hidden: false };
    expect(siteOf(link)).toBe('thehill.com');
    expect(siteOf({ ...link, domain: 'self.news', link: null })).toBeNull();
    expect(postThing(link, {}).domain).toBe('thehill.com');
  });

  it('blocking a site: the menu closed; blocked by this device’s list, subdomains too; a line when blocked here, else left out', () => {
    const blocked = run({ type: 'menu/opened', thing: post, at }, { type: 'domain/requested', domain: 'thehill.com', blocked: true });
    expect([blocked.menu?.open, siteBlock(blocked, 'thehill.com')]).toEqual([false, null]);  // not saved yet: the list says
    const saved = overflowReducer(blocked, { type: 'domains/loaded', domains: ['thehill.com'] });
    expect(siteBlock(saved, 'thehill.com')).toEqual({ domain: 'thehill.com', here: true });
    expect(siteBlock(saved, 'm.thehill.com')).toEqual({ domain: 'thehill.com', here: true });
    expect(siteBlock(saved, 'notthehill.com')).toBeNull();
    expect(siteBlock(saved, null)).toBeNull();
    expect(siteBlock(run({ type: 'domains/loaded', domains: ['thehill.com'] }), 'thehill.com')).toEqual({ domain: 'thehill.com', here: false });
    expect(siteBlock(overflowReducer(saved, { type: 'domains/loaded', domains: [] }), 'thehill.com')).toBeNull();  // unblocked anywhere
  });
});
