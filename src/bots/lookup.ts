/* Who posted, asked of reddit (/user/name/about.json) only when their post
   comes on screen (badge.tsx), two at a time, each author once, and kept on
   this device for a day (localStorage). Nothing leaves reddit: the asks go
   to reddit, as you. If reddit says slow down (429), we stop asking for a
   minute. What we keep is the account's facts (score.ts scores them), so a
   change to the scoring needs no new asks. */

import { readAccount, type Found, type RedditAccount } from './score';

const KEY = 'rr-bots';
const DAY = 86400e3;
const KEPT = 2000;     // accounts kept, the newest
const AT_ONCE = 2;
const PAUSE = 60e3;

interface Kept {
  at: number;          // when we asked (ms)
  found: Found;
}

let kept: Record<string, Kept> | null = null;
const asking = new Map<string, Promise<Found>>();
const waiting: (() => void)[] = [];
let running = 0;
let pausedUntil = 0;

function load(): Record<string, Kept> {
  if (kept) return kept;
  kept = {};
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (saved && typeof saved === 'object') {
      const now = Date.now();
      for (const [name, entry] of Object.entries(saved as Record<string, Kept>)) {
        if (entry && typeof entry.at === 'number' && now - entry.at < DAY && entry.found) kept[name] = entry;
      }
    }
  } catch {
    // unreadable: start over
  }
  return kept;
}

function save() {
  const all = load();
  const names = Object.keys(all);
  if (names.length > KEPT) {
    names.sort((a, b) => all[a]!.at - all[b]!.at).slice(0, names.length - KEPT).forEach((name) => delete all[name]);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // full: it's only a cache
  }
}

// Already known (and still fresh): no ask
export function known(name: string): Found | null {
  const entry = load()[name.toLowerCase()];
  return entry && Date.now() - entry.at < DAY ? entry.found : null;
}

async function inTurn<T>(work: () => Promise<T>): Promise<T> {
  if (running >= AT_ONCE) await new Promise<void>((go) => waiting.push(go));
  running += 1;
  try {
    return await work();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

async function ask(name: string): Promise<Found> {
  if (Date.now() < pausedUntil) throw new Error('reddit asked us to slow down');
  const response = await fetch(`/user/${encodeURIComponent(name)}/about.json?raw_json=1`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (response.status === 429) {
    pausedUntil = Date.now() + PAUSE;
    throw new Error('reddit asked us to slow down');
  }
  if (response.status === 404) return 'gone';
  if (!response.ok) throw new Error(`u/${name}: ${response.status}`);
  return readAccount(await response.json() as RedditAccount);
}

// Their account: known, else asked (once, however many of their posts ask)
export function lookUp(name: string): Promise<Found> {
  const key = name.toLowerCase();
  const already = known(key);
  if (already) return Promise.resolve(already);
  let pending = asking.get(key);
  if (!pending) {
    pending = inTurn(() => ask(name)).then((found) => {
      load()[key] = { at: Date.now(), found };
      save();
      return found;
    }).finally(() => asking.delete(key));
    asking.set(key, pending);
  }
  return pending;
}

// For tests: forget everything
export function forget() {
  kept = null;
  asking.clear();
  waiting.length = 0;
  running = 0;
  pausedUntil = 0;
}
