/* Reading reddit's listing JSON (test/fixtures/listing.json: written by hand
   in reddit's format; replace it with a saved /r/pics.json?raw_json=1) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pageOf, pageUrl } from '../src/core/paging';
import { aboutUrl, listingUrl, readAbout, readListing } from '../src/pages/listing/contract';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8'));

describe('readListing', () => {
  const { posts, after, before } = readListing(answer);
  const [pinned, photo, link, nsfw, video, gallery, crosspost] = posts;

  it('reads every post and where the next page starts', () => {
    expect(posts.map(({ id }) => id)).toEqual(['t3_1q2c001', 't3_1q2c002', 't3_1q2c003', 't3_1q2c004', 't3_1q2c005', 't3_1q2c006', 't3_1q2c007']);
    expect(after).toBe('t3_1q2c007');
    expect(before).toBeNull();  // the first page
  });

  it('a text post: its opening as plain text, spoilers hidden; pinned with its flair', () => {
    expect(pinned).toMatchObject({ link: null, media: null, pinned: true, flair: 'Announcement', subreddit: 'pics', comments: 87 });
    expect(pinned!.text).toBe('Hi everyone! Please read the rules before posting. No screenshots & no memes. Be civil Credit the artist The last episode [spoiler] by the way.');
  });

  it('your vote: none, or up (reddit’s likes)', () => {
    expect([pinned!.vote, photo!.vote]).toEqual([0, 1]);
  });

  it('a photo: the smallest preview at least 640 wide, and big (1080 or more, else the original) to open; reddit’s own, so no link', () => {
    expect(photo).toMatchObject({ link: null, text: null, media: {
      kind: 'pictures',
      pictures: [{ url: 'https://preview.redd.it/abc123.jpeg?width=640&s=c', width: 640, height: 853 }],
      big: [{ url: 'https://preview.redd.it/abc123.jpeg?width=3024&s=src', width: 3024, height: 4032 }],
    } });
  });

  it('a link: its card opens it; an empty flair is none', () => {
    expect(link).toMatchObject({ link: 'https://example.com/museum-restores-painting', domain: 'example.com', flair: null, media: {
      kind: 'link', url: 'https://example.com/museum-restores-painting', playable: false, card: { url: 'https://external-preview.redd.it/museum.jpg?width=640&s=c' },
    } });
  });

  it('NSFW: its media, as any other', () => {
    expect(nsfw).toMatchObject({ nsfw: true, media: { kind: 'pictures', pictures: [{ url: 'https://preview.redd.it/nsfw.jpeg?width=640&s=c', width: 640, height: 640 }] } });
  });

  it('its subreddit’s icon (sr_detail), when reddit sends it', () => {
    expect(photo!.subredditIcon).toBe('https://styles.redditmedia.com/t5_2qh0u/styles/communityIcon_pics.png?width=256&s=d');
    expect(pinned!.subredditIcon).toBeNull();
  });

  it('a video reddit hosts: it plays (HLS: Safari, with sound), its poster first', () => {
    expect(video).toMatchObject({ link: null, media: { kind: 'video', url: 'https://v.redd.it/vid005/HLSPlaylist.m3u8?a=1', loop: false, poster: { url: 'https://external-preview.redd.it/vid005.png?width=640&s=c', width: 640, height: 360 } } });
  });

  it('a gif: its mp4, looped', () => {
    const gif = readListing({ kind: 'Listing', data: { after: null, before: null, children: [{ kind: 't3', data: { ...answer.data.children[1].data, preview: { images: [{
      source: { url: 'https://preview.redd.it/g.gif?s=src', width: 400, height: 300 },
      resolutions: [],
      variants: { mp4: { source: { url: 'https://preview.redd.it/g.gif?format=mp4&s=m', width: 400, height: 300 }, resolutions: [] } },
    }] } } }] } }).posts[0];
    expect(gif!.media).toMatchObject({ kind: 'video', url: 'https://preview.redd.it/g.gif?format=mp4&s=m', loop: true });
  });

  it('a gallery: its pictures in its own order, swiped through (failed ones left out), each big to open', () => {
    expect(gallery!.media).toMatchObject({ kind: 'pictures', pictures: [
      { url: 'https://preview.redd.it/g2.jpg?width=640&s=x', width: 640, height: 853 },
      { url: 'https://preview.redd.it/g1.jpg?width=640&s=x', width: 640, height: 480 },
    ], big: [{ url: 'https://preview.redd.it/g2.jpg?width=3000&s=x' }, { url: 'https://preview.redd.it/g1.jpg?width=4000&s=x' }] });
    expect(gallery!.link).toBeNull();
  });

  it('a crosspost: the media of the post it shares', () => {
    expect(crosspost).toMatchObject({ subreddit: 'pics', link: null, domain: 'i.redd.it', media: { kind: 'pictures', pictures: [{ url: 'https://preview.redd.it/light.jpeg?width=640&s=c' }] } });
  });
});

describe('listingUrl', () => {
  it('adds .json to the page, keeps its query (where it starts), asks for unescaped URLs, a page of 25', () => {
    expect(listingUrl('/', '')).toBe('/.json?raw_json=1&sr_detail=1&limit=25');
    expect(listingUrl('/r/pics/top/', '?t=week')).toBe('/r/pics/top/.json?t=week&raw_json=1&sr_detail=1&limit=25');
    expect(listingUrl('/r/pics', '?count=25&after=t3_x&limit=100')).toBe('/r/pics/.json?count=25&after=t3_x&limit=25&raw_json=1&sr_detail=1');
  });
});

describe('pages, as old reddit’s', () => {
  it('which page an address is: after=, the posts before it; before=, the first post of the page after it', () => {
    expect(['', '?t=week', '?count=25&after=t3_x', '?count=50&after=t3_x', '?count=26&before=t3_x', '?count=51&before=t3_x', '?after=t3_x'].map(pageOf))
      .toEqual([1, 1, 2, 3, 1, 2, 1]);
  });

  it('a page’s address: the listing’s (its span kept, where it started dropped), then where the page starts', () => {
    expect(pageUrl('/r/pics/top/', '?t=week&count=25&after=t3_a', 1)).toBe('/r/pics/top/?t=week');
    expect(pageUrl('/r/pics/', '', 2, { after: 't3_b' })).toBe('/r/pics/?count=25&after=t3_b');
    expect(pageUrl('/r/pics/', '?count=50&after=t3_a', 2, { before: 't3_c' })).toBe('/r/pics/?count=51&before=t3_c');
    for (const [page, start] of [[2, { after: 'x' }], [5, { after: 'x' }], [2, { before: 'x' }], [5, { before: 'x' }]] as const) {
      expect(pageOf(pageUrl('/', '', page, start).slice(1))).toBe(page);  // each address is the page it says
    }
  });
});

describe('readAbout', () => {
  it('a subreddit’s name as it writes it, its icon, its members', () => {
    const about = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/about.json'), 'utf8'));
    expect(readAbout(about)).toEqual({
      name: 'pics',
      label: 'r/pics',
      icon: 'https://styles.redditmedia.com/t5_2qh0u/styles/communityIcon_pics.png?width=256&s=d',
      banner: 'https://styles.redditmedia.com/t5_2qh0u/styles/mobileBannerImage_pics.png',
      color: '#0079d3',
      members: 32100000,
      joined: false,
    });
    expect(aboutUrl('pics')).toBe('/r/pics/about.json?raw_json=1');
  });
});
