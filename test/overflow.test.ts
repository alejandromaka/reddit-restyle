// @vitest-environment jsdom
/* A post's or comment's "…": the menu, hiding, reporting (its state), and a
   subreddit's rules (test/fixtures/rules.json: written by hand in reddit's format) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readRules, rulesUrl } from '../src/overflow/contract';
import { commentThing, initialOverflow, overflowReducer, type OverflowAction, type OverflowState } from '../src/overflow/state';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/rules.json'), 'utf8'));
const post = { id: 't3_a', kind: 'post' as const, subreddit: 'pics', hidden: false };
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
    const comment = commentThing('t1_c', 'pics');
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
});
