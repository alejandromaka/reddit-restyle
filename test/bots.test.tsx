// @vitest-environment jsdom
/* Bot-likeness: the scoring (score.ts), asking reddit (lookup.ts: once per
   author, two at a time, kept a day, a pause on 429), and the badge (only
   once near the screen; tapped, why) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotBadge } from '../src/bots/badge';
import { forget, known, lookUp } from '../src/bots/lookup';
import { isBotName, isGeneratedName, readAccount, scoreOf, type Account } from '../src/bots/score';

const NOW = 1_800_000_000;
const DAY = 86400;
const person: Account = { created: NOW - 5 * 365 * DAY, postKarma: 300, commentKarma: 9000, verified: true, avatar: 'custom', bio: true, suspended: false, employee: false, premium: false, mod: false };
const farm: Account = { created: NOW - 3 * DAY, postKarma: 2400, commentKarma: 4, verified: false, avatar: 'default', bio: false, suspended: false, employee: false, premium: false, mod: false };

describe('scoreOf', () => {
  it('an old, talkative, verified account: low', () => {
    const { percent, reasons } = scoreOf('someone', person, NOW);
    expect(percent).toBeLessThan(5);
    expect(reasons.every((reason) => reason.toward === 'person')).toBe(true);
  });

  it('a 3-day-old karma farm with a made-up name: high, and why', () => {
    const { percent, reasons } = scoreOf('Late_Ad_4521', farm, NOW);
    expect(percent).toBeGreaterThanOrEqual(90);
    expect(reasons.map((reason) => reason.text)).toEqual([
      'Made 3 days ago',
      'Lots of post karma (2400), little from comments (4)',
      'No verified email',
      'reddit’s default avatar',
      'The name reddit made up for it',
    ]);
  });

  it('suspended, gone, and reddit’s own bot', () => {
    expect(scoreOf('x', { ...person, suspended: true }, NOW).percent).toBe(90);
    expect(scoreOf('x', 'gone', NOW).percent).toBe(80);
    expect(scoreOf('AutoModerator', person, NOW).percent).toBe(100);
  });

  it('stays between 1 and 99', () => {
    expect(scoreOf('x', { ...person, employee: true, mod: true, premium: true }, NOW).percent).toBe(1);
    expect(scoreOf('spam_bot', farm, NOW).percent).toBe(99);
  });

  it('names', () => {
    expect(isGeneratedName('Late_Ad_4521')).toBe(true);
    expect(isGeneratedName('Ok-Description-1234')).toBe(true);
    expect(isGeneratedName('someone')).toBe(false);
    expect(isBotName('RemindMeBot')).toBe(true);
    expect(isBotName('save_bot')).toBe(true);
    expect(isBotName('Talbot')).toBe(false);
  });
});

describe('readAccount', () => {
  it('reads the fixture’s someone', () => {
    const user = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/user.json'), 'utf8'));
    expect(readAccount(user)).toEqual({ created: 1700000000, postKarma: 1000, commentKarma: 234, verified: null, avatar: 'custom', bio: true, suspended: false, employee: false, premium: false, mod: false });
  });

  it('reddit’s default avatar, a verified email', () => {
    expect(readAccount({ kind: 't2', data: { name: 'x', icon_img: 'https://www.redditstatic.com/avatar/defaults/v2/avatar_default_3.png', snoovatar_img: '', has_verified_email: true } }))
      .toMatchObject({ avatar: 'default', verified: true, bio: false });
  });
});

const t2 = (name: string) => JSON.stringify({ kind: 't2', data: { name, created_utc: NOW, link_karma: 1, comment_karma: 1 } });

describe('lookUp', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    forget();
    fetchMock = vi.fn(async (url: string) => new Response(t2(url.split('/')[2]!)));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('asks once per author, however many ask, and keeps it on the device', async () => {
    await Promise.all([lookUp('someone'), lookUp('someone'), lookUp('Someone')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/user/someone/about.json?raw_json=1');
    forget();  // a new page: from localStorage
    expect(known('someone')).toMatchObject({ postKarma: 1 });
    await lookUp('someone');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forgets after a day', async () => {
    await lookUp('someone');
    const saved = JSON.parse(localStorage.getItem('rr-bots')!);
    saved.someone.at -= 86400e3 + 1;
    localStorage.setItem('rr-bots', JSON.stringify(saved));
    forget();
    expect(known('someone')).toBeNull();
  });

  it('two at a time', async () => {
    let open = 0;
    let most = 0;
    fetchMock.mockImplementation(async (url: string) => {
      open += 1;
      most = Math.max(most, open);
      await new Promise((go) => setTimeout(go, 5));
      open -= 1;
      return new Response(t2(url.split('/')[2]!));
    });
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map(lookUp));
    expect(most).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('404: gone (kept); 429: a minute’s pause (not kept)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await lookUp('ghost')).toBe('gone');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    await expect(lookUp('busy')).rejects.toThrow();
    await expect(lookUp('other')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(known('busy')).toBeNull();
  });
});

describe('BotBadge', () => {
  let near: (() => void) | null;
  let root: HTMLElement;
  beforeEach(() => {
    localStorage.clear();
    forget();
    near = null;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private seen: IntersectionObserverCallback) {}
      observe() {
        near = () => this.seen([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ kind: 't2', data: { name: 'Late_Ad_4521', created_utc: Date.now() / 1000 - 3 * DAY, link_karma: 2400, comment_karma: 4, has_verified_email: false } }))));
    root = document.createElement('div');
    document.body.replaceChildren(root);
  });
  afterEach(() => render(null, root));

  it('asks nothing until near the screen, then shows the score; tapped, why', async () => {
    await act(() => render(<BotBadge name="Late_Ad_4521" />, root));
    expect(fetch).not.toHaveBeenCalled();
    expect(root.textContent).toBe('');
    await act(() => near!());
    await vi.waitFor(() => expect(root.querySelector('button')?.textContent).toMatch(/^Bot \d+%$/));
    expect(root.querySelector('button')!.className).toContain('rr-bg-tags-danger-background');
    await act(() => root.querySelector('button')!.click());
    expect(document.body.textContent).toContain('Lots of post karma (2400), little from comments (4)');
    expect(document.body.textContent).toContain('not a fact');
  });

  it('a deleted account’s post: nothing, no ask', async () => {
    await act(() => render(<BotBadge name="[deleted]" />, root));
    expect(root.innerHTML).toBe('');
    expect(near).toBeNull();
  });
});
