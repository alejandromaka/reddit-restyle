import { describe, expect, it } from 'vitest';
import { pageOf } from '../src/shell/pages';

describe('pageOf', () => {
  it('listings: the front page and subreddits, by sort', () => {
    for (const path of ['/', '/best/', '/hot/', '/top', '/r/pics', '/r/pics/', '/r/pics/new/', '/r/pics+funny/top']) {
      expect(pageOf(path), path).toBe('listing');
    }
  });

  it('a post and its comments, or one comment’s thread', () => {
    for (const path of ['/r/pics/comments/abc/title/', '/r/pics/comments/abc/title', '/r/pics/comments/abc/title/def/', '/comments/abc/', '/r/pics/comments/abc/']) {
      expect(pageOf(path), path).toBe('post');
    }
  });

  it('someone’s profile, by tab', () => {
    for (const path of ['/user/someone/', '/user/someone', '/user/some-one_2/comments/', '/user/someone/submitted', '/user/someone/saved/', '/user/someone/downvoted/']) {
      expect(pageOf(path), path).toBe('profile');
    }
  });

  it('everything else stays reddit’s', () => {
    for (const path of ['/user/someone/gilded/', '/user/someone/m/multi/', '/message/inbox/', '/prefs/', '/r/pics/wiki/', '/r/pics/about/', '/submit']) {
      expect(pageOf(path), path).toBeUndefined();
    }
  });
});
