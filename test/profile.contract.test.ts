// @vitest-environment jsdom
/* Reading reddit's profile JSON (test/fixtures/user.json, user-listing.json:
   written by hand in reddit's format, for a made-up someone) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readItems, readUser, tabPath, userUrl } from '../src/pages/profile/contract';

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));

describe('readUser', () => {
  it('who: their display name, avatar, banner, bio; karma, followers, since when', () => {
    expect(readUser(read('user'))).toEqual({
      name: 'someone',
      label: 'Some One',
      icon: 'https://styles.redditmedia.com/t5_7x1yz2/styles/profileIcon_someone.png?width=256&height=256&crop=256:256,smart&s=a1',
      banner: 'https://styles.redditmedia.com/t5_7x1yz2/styles/profileBanner_someone.png?width=1280&s=b2',
      bio: 'Lighthouses, mostly.',
      karma: 1234,
      followers: 12,
      created: 1700000000,
      suspended: false,
      blocked: false,
    });
    expect(userUrl('someone')).toBe('/user/someone/about.json?raw_json=1');
  });

  it('a suspended account: its name, and that it is', () => {
    expect(readUser({ kind: 't2', data: { name: 'gone', is_suspended: true } })).toMatchObject({ name: 'gone', label: 'gone', icon: null, karma: 0, followers: null, created: null, suspended: true });
  });
});

describe('readItems', () => {
  const { items, after, before } = readItems(read('user-listing'));

  it('their comments and posts, in reddit’s order, and where the next page starts', () => {
    expect(items.map((item) => item.kind)).toEqual(['comment', 'post', 'comment']);
    expect([after, before]).toEqual(['t1_u1c002', null]);
  });

  it('a comment: cleaned, your vote, the post it’s on (here, not www), its thread', () => {
    expect(items[0]).toMatchObject({ kind: 'comment', comment: {
      id: 't1_u1c001', author: 'someone', score: 41, vote: 1, subreddit: 'pics',
      subredditIcon: 'https://styles.redditmedia.com/t5_2qh0u/styles/communityIcon_pics.png?width=256&s=d',
      postTitle: 'Sunrise over the Grand Canyon this morning',
      postPath: '/r/pics/comments/1q2c002/sunrise_over_the_grand_canyon/',
      permalink: '/r/pics/comments/1q2c002/sunrise_over_the_grand_canyon/u1c001/',
    } });
    expect(items[0]!.kind === 'comment' && items[0]!.comment.html).toContain('<strong');
    expect(items[2]).toMatchObject({ kind: 'comment', comment: { vote: 0, scoreHidden: true, subredditIcon: null } });
  });

  it('a post: as a listing’s', () => {
    expect(items[1]).toMatchObject({ kind: 'post', post: { id: 't3_1q2c007', title: 'A lighthouse at night (from r/EarthPorn)', author: 'someone' } });
  });
});

describe('tabPath', () => {
  it('a tab’s address: overview, the profile’s own; a sort but new, and its span, in the query', () => {
    expect(tabPath('someone', 'overview')).toBe('/user/someone/');
    expect(tabPath('someone', 'submitted', 'new')).toBe('/user/someone/submitted/');
    expect(tabPath('someone', 'comments', 'top', 'week')).toBe('/user/someone/comments/?sort=top&t=week');
  });
});
