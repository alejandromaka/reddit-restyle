import { describe, expect, it } from 'vitest';
import { pageOf } from '../src/shell/pages';

describe('pageOf', () => {
  it('listings: the front page and subreddits, by sort', () => {
    for (const path of ['/', '/hot/', '/top', '/r/pics', '/r/pics/', '/r/pics/new/', '/r/pics+funny/top']) {
      expect(pageOf(path), path).toBe('listing');
    }
  });

  it('everything else stays reddit’s', () => {
    for (const path of ['/r/pics/comments/abc/title/', '/user/someone/', '/message/inbox/', '/prefs/', '/r/pics/wiki/']) {
      expect(pageOf(path), path).toBeUndefined();
    }
  });
});
