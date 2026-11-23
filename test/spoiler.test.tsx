// @vitest-environment jsdom
/* A spoiler post: its media and text kept (readPost, readThread), and drawn
   blurred under "View spoiler" until tapped (components/spoiler) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { Spoiler } from '../src/components/spoiler';
import { readListing } from '../src/pages/listing/contract';
import { readThread } from '../src/pages/post/contract';

const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));
const spoilered = <T extends { data: { children: { data: object }[] } }>(answer: T) => {
  answer.data.children.forEach(({ data }) => { (data as { spoiler: boolean }).spoiler = true; });
  return answer;
};

describe('reading a spoiler post', () => {
  it('in a listing: its media and the start of its text, as any post’s', () => {
    const [text, photo] = readListing(spoilered(fixture('listing'))).posts;
    expect(text).toMatchObject({ spoiler: true, media: null, text: expect.stringContaining('Hi everyone!') });
    expect(photo).toMatchObject({ spoiler: true, text: null, media: { kind: 'pictures' } });
  });

  it('on its page: all of its text', () => {
    const thread = fixture('thread');
    spoilered(thread[0]);
    const { post } = readThread(thread);
    expect(post.spoiler).toBe(true);
    expect(post.html).toContain('<strong class="rr-font-bold">everyone</strong>');
  });
});

describe('Spoiler', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  afterEach(() => render(null, root));
  const show = (hidden: boolean) => act(() => render(
    <Spoiler
      hidden={hidden}
      kind="media"
    >
      <button type="button">Open the picture</button>
    </Spoiler>,
    root,
  ));
  const cover = () => [...root.querySelectorAll('button')].find((button) => button.textContent === 'View spoiler');

  it('a spoiler: blurred, out of reach, "View spoiler" over it; a tap shows it', () => {
    show(true);
    const inside = root.querySelector('[aria-hidden="true"]')!;
    expect(inside.className).toContain('rr-blur-2xl');
    expect(inside.hasAttribute('inert')).toBe(true);
    expect(inside.textContent).toBe('Open the picture');
    act(() => cover()!.click());
    expect(cover()).toBeUndefined();
    expect(root.querySelector('[aria-hidden]')).toBeNull();
    expect(root.textContent).toBe('Open the picture');
  });

  it('not a spoiler: just what’s in it', () => {
    show(false);
    expect(cover()).toBeUndefined();
    expect(root.innerHTML).toBe('<button type="button">Open the picture</button>');
  });
});
