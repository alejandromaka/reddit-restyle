/* Reading your communities (test/fixtures/subscriptions.json: written by
   hand in reddit's format; replace it with a saved
   /subreddits/mine/subscriber.json?raw_json=1) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { communitiesUrl, readCommunities } from '../src/nav/contract';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/subscriptions.json'), 'utf8'));

describe('readCommunities', () => {
  const communities = readCommunities([answer]);

  it('favorites first, then A–Z whatever the case', () => {
    expect(communities.map(({ label }) => label)).toEqual(['r/soccer', 'r/AskHistorians', 'r/aviation', 'u/someone']);
  });

  it('the newer icon over the older; none when neither', () => {
    expect(communities[1]).toMatchObject({ name: 'AskHistorians', path: '/r/AskHistorians/', icon: 'https://styles.redditmedia.com/t5_2ssp3/styles/communityIcon_x.png?width=256&s=c', favorite: false });
    expect(communities[0]).toMatchObject({ icon: 'https://b.thumbs.redditmedia.com/soccer.png', favorite: true });
    expect(communities[2]!.icon).toBeNull();
  });

  it('a person you follow: their profile', () => {
    expect(communities[3]).toMatchObject({ label: 'u/someone', path: '/user/someone/' });
  });
});

describe('communitiesUrl', () => {
  it('a hundred a page, unescaped, and the next page', () => {
    expect(communitiesUrl()).toBe('/subreddits/mine/subscriber.json?limit=100&raw_json=1');
    expect(communitiesUrl('t5_x')).toBe('/subreddits/mine/subscriber.json?limit=100&raw_json=1&after=t5_x');
  });
});
