/* Muted words: whole words or phrases, in any case */

import { describe, expect, it } from 'vitest';
import { mutes, wordOf, wordsPattern } from '../src/core/words';

describe('muted words', () => {
  const pattern = wordsPattern(['cat', 'new york', 'c++']);
  const has = (text: string) => mutes(pattern, text);

  it('a whole word, in any case, at either end or among punctuation', () => {
    expect([has('Cat'), has('my cat.'), has('(CAT)'), has("the cat's toy"), has('gato y cat')]).toEqual([true, true, true, true, true]);
  });

  it('not inside another word', () => {
    expect([has('category'), has('bobcat'), has('cats')]).toEqual([false, false, false]);
  });

  it('a phrase, however it is spaced; signs taken as they are', () => {
    expect([has('New  York city'), has('newyork'), has('I like C++'), has('c+')]).toEqual([true, false, true, false]);
  });

  it('none muted: nothing matches; kept as lower case, spaces squeezed', () => {
    expect(mutes(wordsPattern([]), 'cat')).toBe(false);
    expect(wordOf('  New   York ')).toBe('new york');
  });
});
