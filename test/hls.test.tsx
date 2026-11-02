// @vitest-environment jsdom
/* Reddit's videos where the browser can't play HLS (Chrome, Brave): hls.js,
   fetched once and checked by its hash; its MP4 if hls.js can't load */

import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Media } from '../src/pages/listing/contract';
import type { MediaView as View } from '../src/pages/listing/views/media';

const video: Media = {
  kind: 'video', url: 'https://v.redd.it/v/HLSPlaylist.m3u8', poster: null, loop: false,
  stream: { fallback: 'https://v.redd.it/v/DASH_720.mp4' },
};
const hlsScript = () => document.querySelector<HTMLScriptElement>('script[src*="hls.js"]');
// Its first: hls.js is fetched once per page, so each test gets a fresh one
let MediaView: typeof View;
const findScript = () => vi.waitFor(() => hlsScript() ?? Promise.reject(new Error('no hls.js yet')));

describe('a reddit video on Brave', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ MediaView } = await import('../src/pages/listing/views/media'));
  });

  afterEach(() => {
    render(null, document.body);
    document.head.replaceChildren();
    delete (window as { Hls?: unknown }).Hls;
  });

  it('plays through hls.js: fetched pinned and hashed, the stream loaded only once played', async () => {
    HTMLMediaElement.prototype.canPlayType = () => '';
    const hls = { loadSource: vi.fn(), attachMedia: vi.fn(), startLoad: vi.fn(), destroy: vi.fn() };
    const Hls = Object.assign(vi.fn(function () { return hls; }), { isSupported: () => true });
    render(<MediaView media={video} />, document.body);
    const script = await findScript();
    expect([script.src, script.integrity.startsWith('sha384-'), script.crossOrigin, script.dataset.restyle])
      .toEqual(['https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js', true, 'anonymous', '']);
    (window as { Hls?: unknown }).Hls = Hls;
    script.onload!(new Event('load'));
    const element = document.querySelector('video')!;
    await vi.waitFor(() => expect(hls.attachMedia).toHaveBeenCalledWith(element));
    expect(Hls).toHaveBeenCalledWith({ autoStartLoad: false });
    expect(hls.loadSource).toHaveBeenCalledWith(video.url);
    expect(element.hasAttribute('src')).toBe(false);
    expect(hls.startLoad).not.toHaveBeenCalled();
    element.dispatchEvent(new Event('play'));
    expect(hls.startLoad).toHaveBeenCalled();
  });

  it('plays its MP4 when hls.js can’t load', async () => {
    HTMLMediaElement.prototype.canPlayType = () => '';
    render(<MediaView media={video} />, document.body);
    (await findScript()).onerror!(new Event('error'));
    await vi.waitFor(() => expect(document.querySelector('video')!.getAttribute('src')).toBe('https://v.redd.it/v/DASH_720.mp4'));
  });

  it('Chromium says it plays HLS, and gets hls.js all the same', async () => {
    HTMLMediaElement.prototype.canPlayType = () => 'maybe';
    Object.defineProperty(navigator, 'userAgentData', { value: {}, configurable: true });
    try {
      render(<MediaView media={video} />, document.body);
      expect(await findScript()).toBeTruthy();
    } finally {
      delete (navigator as { userAgentData?: unknown }).userAgentData;
    }
  });

  it('Safari plays the stream itself: no hls.js', async () => {
    HTMLMediaElement.prototype.canPlayType = () => 'maybe';
    render(<MediaView media={video} />, document.body);
    expect(document.querySelector('video')!.getAttribute('src')).toBe(video.url);
    await new Promise((done) => setTimeout(done, 50));
    expect(hlsScript()).toBeNull();
  });
});
