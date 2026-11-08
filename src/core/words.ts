/* The words you mute (your account's Muted Words): this device remembers
   them, as it does the sites you block (reddit keeps no such list). A post
   whose title or text has one, as a whole word or phrase, in any case, is
   left out of listings and profiles. */

const KEY = 'reddit-restyle:words';
const listeners = new Set<(words: string[]) => void>();

// As kept: lower case, spaces squeezed
export const wordOf = (word: string) => word.trim().replace(/\s+/g, ' ').toLowerCase();

// The ones this device mutes, A–Z
export function mutedWords(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((word): word is string => typeof word === 'string' && word !== '') : [];
  } catch {
    return [];  // not ours: as if none
  }
}

// A word muted, or let back in; whoever follows them told
export function muteWord(word: string, muted: boolean) {
  const name = wordOf(word);
  if (!name) return;
  const rest = mutedWords().filter((each) => each !== name);
  const words = muted ? [...rest, name].sort() : rest;
  localStorage.setItem(KEY, JSON.stringify(words));
  for (const listener of listeners) listener(words);
}

// Told of every change (your account menu's); returns how to stop
export function followWords(listener: (words: string[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const escaped = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');

// One pattern for them all: each a whole word (no letter or digit either
// side, so "cat" isn't in "category"); no lookbehind, which iOS 16.0–16.3 lacks
export function wordsPattern(words: string[]): RegExp | null {
  return words.length ? new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${words.map(escaped).join('|')})(?![\\p{L}\\p{N}])`, 'iu') : null;
}

// Whether any of the texts has a muted word
export const mutes = (pattern: RegExp | null, ...texts: string[]) => Boolean(pattern && texts.some((text) => pattern.test(text)));

// All of it, for a page (overflow/state.ts: startOverflow)
export const words = { read: mutedWords, follow: followWords };
