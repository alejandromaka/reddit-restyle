/* reddit's markdown, cleaned (core/html.ts), in a grid (its blocks spaced);
   a tap on a spoiler shows it, on a picture (a comment's) opens it big. A
   gif (a video of it: data-src) loads as it nears the screen and plays only
   while it's there, muted and looping */

import { useEffect, useRef, useState } from 'preact/hooks';
import { Lightbox } from './lightbox';
import { cx } from './ui';

const HIDDEN = ['rr-bg-neutral-content-strong', 'rr-text-transparent'];

interface Opened { url: string; width: number; height: number }

export function Markdown({ html, class: className }: { html: string; class?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  useEffect(() => {
    const gifs = [...box.current!.querySelectorAll<HTMLVideoElement>('video[data-src]')];
    gifs.forEach(watch);
    return () => gifs.forEach(unwatch);
  }, [html]);
  const tap = (event: MouseEvent) => {
    if (reveal(event)) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-picture]');
    const shown = link?.querySelector<HTMLImageElement | HTMLVideoElement>('img, video');
    if (!link || !shown) return;
    event.preventDefault();  // opened here, not followed
    const [width, height] = shown instanceof HTMLVideoElement ? [shown.videoWidth, shown.videoHeight] : [shown.naturalWidth, shown.naturalHeight];
    setOpened({ url: link.dataset.picture!, width: width || shown.width, height: height || shown.height });
  };
  return (
    <>
      <div
        ref={box}
        class={cx('rr-grid rr-gap-2 rr-min-w-0 rr-break-words', className)}
        onClick={tap}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {opened && (
        <Lightbox
          pictures={[opened]}
          start={0}
          onClose={() => setOpened(null)}
        />
      )}
    </>
  );
}

// A spoiler shown (true: it was one)
function reveal(event: MouseEvent) {
  const spoiler = (event.target as Element).closest('[data-spoiler]');
  if (!spoiler?.classList.contains('rr-text-transparent')) return false;
  spoiler.classList.remove(...HIDDEN);
  event.preventDefault();  // a spoiler inside a link: shown, not followed
  return true;
}

// The gifs on the page, near the screen (a little before they're on it) or not
let near: IntersectionObserver | null = null;

function watch(gif: HTMLVideoElement) {
  if (typeof IntersectionObserver === 'undefined') return;  // none to tell: still
  near ??= new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const video = target as HTMLVideoElement;
      if (!isIntersecting) {
        video.pause();
        continue;
      }
      if (!video.getAttribute('src')) {  // the first time: its still, its video
        if (video.dataset.poster) video.poster = video.dataset.poster;
        video.src = video.dataset.src!;
      }
      video.muted = true;
      video.play().catch(() => {});  // not now (Low Power Mode): its still; a tap opens the gif
    }
  }, { rootMargin: '200px 0px' });
  near.observe(gif);
}

function unwatch(gif: HTMLVideoElement) {
  near?.unobserve(gif);
  gif.pause();
}
