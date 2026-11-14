// @vitest-environment jsdom
/* A post's or comment's "…": the menu, hiding, reporting, blocking (its state), and a
   subreddit's rules (test/fixtures/rules.json: written by hand in reddit's format) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { complaintUrl, readRules, reportFlow, rulesUrl, stepsAt } from '../src/overflow/contract';
import { commentThing, initialOverflow, isBlocked, overflowReducer, postThing, siteBlock, siteOf, type OverflowAction, type OverflowState } from '../src/overflow/state';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/rules.json'), 'utf8'));
const post = { id: 't3_a', kind: 'post' as const, subreddit: 'pics', author: 'someone', domain: null, hidden: false };
const at = { top: 100, right: 16 };
const run = (...actions: OverflowAction[]) => actions.reduce<OverflowState>(overflowReducer, initialOverflow());

describe('readRules', () => {
  it('the subreddit’s, each for posts, comments or both, and reddit’s report steps (questions, notes, forms on reddit.com)', () => {
    const rules = readRules(answer);
    expect(rules.subreddit).toEqual([
      { label: 'No screenshots', about: 'Screenshots go in r/screenshots.', on: 'post' },
      { label: 'Be civil', about: 'No insults.', on: 'all' },
      { label: 'No spoilers in comments', about: '', on: 'comment' },
    ]);
    const [harassment, spam, copyright] = rules.reddit;
    expect(harassment).toMatchObject({ label: 'Harassment', question: 'Who is being harassed?', reason: null });
    expect(harassment!.next.map((step) => [step.label, step.reason, step.notes])).toEqual([
      ['You', { kind: 'site', text: "It's targeted harassment at me", usernames: true }, { title: 'Additional information (optional)', limit: 2000 }],
      ['Someone else', { kind: 'site', text: "It's targeted harassment at someone else", usernames: true }, null],
    ]);
    expect(spam).toMatchObject({ label: 'Spam', question: null, next: [], reason: { kind: 'site', text: 'This is spam', usernames: false } });
    expect(copyright).toMatchObject({ reason: null, complaint: { prompt: 'Copyright reports go through a form on reddit.com.', button: 'Go to the form' } });
    expect(complaintUrl(copyright!.complaint!.url, 't3_a')).toBe('https://www.reddithelp.com/hc/en-us/requests/new?ticket_form_id=73933&thing=t3_a');
    expect(rulesUrl('pics')).toBe('/r/pics/about/rules.json?raw_json=1');
  });

  it('no steps from reddit: its plain list, each a reason', () => {
    expect(readRules({ ...answer, site_rules_flow: [] }).reddit.map((step) => [step.label, step.reason?.text])).toEqual([
      ['Spam', 'Spam'], ['Personal and confidential information', 'Personal and confidential information'], ['Threatening, harassing, or inciting violence', 'Threatening, harassing, or inciting violence'],
    ]);
  });

  it('the report’s first step: "Breaks r/name rules" (the rules for it, behind it), then reddit’s; a step’s choices by the trail', () => {
    const rules = readRules(answer);
    const flow = reportFlow(rules, { kind: 'comment', subreddit: 'pics' });
    expect(flow.map((step) => step.label)).toEqual(['Breaks r/pics rules', 'Harassment', 'Spam', 'Copyright violation']);
    expect(flow[0]!.question).toBe('Which community rule does this violate?');
    expect(flow[0]!.next.map((step) => [step.label, step.reason])).toEqual([
      ['Be civil', { kind: 'rule', text: 'Be civil', usernames: false }],
      ['No spoilers in comments', { kind: 'rule', text: 'No spoilers in comments', usernames: false }],
    ]);
    expect(stepsAt(flow, [1]).steps.map((step) => step.label)).toEqual(['Harassment']);
    expect(stepsAt(flow, [1]).choices.map((step) => step.label)).toEqual(['You', 'Someone else']);
    expect(reportFlow({ subreddit: [], reddit: rules.reddit }, { kind: 'post', subreddit: 'x' })[0]!.label).toBe('Harassment');  // no rules: no "Breaks"
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

  it('a report: its subreddit’s rules asked for once; a choice, Next, Back; a note; sent once; thanks', () => {
    const comment = commentThing('t1_c', 'pics', 'someone');
    const reason = { kind: 'rule', text: 'Be civil' } as const;
    const opened = run({ type: 'report/opened', thing: comment });
    expect(opened.report).toEqual({ thing: comment, trail: [], choice: null, notes: '', reviewing: false, status: 'choosing', error: null, open: true });
    expect(opened.rules).toEqual({ pics: { status: 'loading' } });
    expect(overflowReducer(opened, { type: 'report/requested', reason })).toBe(opened);  // nothing chosen yet
    expect(overflowReducer(opened, { type: 'report/next' })).toBe(opened);
    const next = overflowReducer(overflowReducer(opened, { type: 'report/chosen', choice: 0 }), { type: 'report/next' });
    expect(next.report).toMatchObject({ trail: [0], choice: null });
    const back = overflowReducer(next, { type: 'report/back' });
    expect(back.report).toMatchObject({ trail: [], choice: 0 });
    expect(overflowReducer(opened, { type: 'report/back' })).toBe(opened);  // the first step
    const chosen = overflowReducer(next, { type: 'report/chosen', choice: 1 });
    const noted = overflowReducer(chosen, { type: 'report/noted', notes: 'more' });
    expect(noted.report?.notes).toBe('more');
    expect(overflowReducer(noted, { type: 'report/chosen', choice: 0 }).report?.notes).toBe('');  // another choice: its own note
    expect(overflowReducer(chosen, { type: 'report/requested', reason })).toBe(chosen);  // not before the second step
    const reviewing = overflowReducer(noted, { type: 'report/review' });
    expect(reviewing.report).toMatchObject({ trail: [0], choice: 1, notes: 'more', reviewing: true });
    expect(overflowReducer(reviewing, { type: 'report/chosen', choice: 0 })).toBe(reviewing);  // chosen: Back to change it
    expect(overflowReducer(reviewing, { type: 'report/back' }).report).toMatchObject({ trail: [0], choice: 1, notes: 'more', reviewing: false });
    const sending = overflowReducer(reviewing, { type: 'report/requested', reason });
    expect(sending.report).toMatchObject({ trail: [0], choice: 1, status: 'sending' });
    expect(overflowReducer(sending, { type: 'report/requested', reason })).toBe(sending);
    expect(overflowReducer(sending, { type: 'report/chosen', choice: 0 })).toBe(sending);
    expect(overflowReducer(sending, { type: 'report/back' })).toBe(sending);
    const failed = overflowReducer(sending, { type: 'report/failed', error: 'Error: 500' });
    expect(failed.report).toMatchObject({ status: 'failed', error: 'Error: 500' });
    expect(overflowReducer(failed, { type: 'report/requested', reason }).report).toMatchObject({ status: 'sending', error: null });  // again
    expect(overflowReducer(sending, { type: 'report/sent' }).report?.status).toBe('sent');
    const again = overflowReducer(overflowReducer(chosen, { type: 'report/closed' }), { type: 'report/opened', thing: comment });
    expect(again.rules).toBe(chosen.rules);  // already asked for
    expect(again.report).toMatchObject({ trail: [], choice: null });  // from the start
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
