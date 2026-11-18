/* Pictures opened big, as reddit.com's viewer: over black, one at a time (a
   gallery: swiped through; pinch to zoom), from the one tapped. A tap, ×,
   Escape, or a swipe down closes it: the picture follows the finger and the
   black fades; let go far enough down and it closes, else it goes back. Not
   with two fingers (a pinch) or zoomed in (a drag looks around; a tap zooms
   back out), and a swipe across is the gallery's.

   The zoom is ours, not Safari's: Safari zooming the whole page over a
   gallery (a scroller of big pictures) redraws all of it bigger, and on a
   phone that runs out of memory and the tab reloads (reddit.com's own
   galleries do it too). Ours scales the one picture, and only the pictures
   next to the one shown are loaded at all. */

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useDismiss } from './dismiss';
import { Icon } from './icon';

interface Picture {
  url: string;
  width: number;
  height: number;
}

interface LightboxProps {
  pictures: Picture[];
  start: number;  // the one tapped
  onClose: () => void;
}

const CLOSE_AT = 100;  // px down: let go past it, it closes
const DECIDE_AT = 6;   // px a finger moves before it's a swipe down (ours) or across (the gallery's)
const MAX_ZOOM = 4;
const NEAR = 1;        // pictures loaded either side of the one shown

// The picture zoomed: scale, then moved by x, y (from its top left)
interface Zoom { scale: number; x: number; y: number }
const UNZOOMED: Zoom = { scale: 1, x: 0, y: 0 };

type Point = { x: number; y: number };
const middle = (a: Touch, b: Touch): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
const apart = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function Lightbox({ pictures, start, onClose }: LightboxProps) {
  const panel = useDismiss(true, onClose);
  const strip = useRef<HTMLDivElement>(null);
  const shown = useRef<(HTMLImageElement | null)[]>([]);
  const [at, setAt] = useState(start);  // the one on screen
  // A finger on it: where it started, how far down, and once it's moved, whether it's going down
  const drag = useRef<{ x: number; y: number; dy: number; down: boolean | null } | null>(null);
  const dragged = useRef(false);  // a swipe or pinch just ended: a click after it isn't a tap
  const zoom = useRef<Zoom>(UNZOOMED);
  // Fingers zooming or looking around: the zoom when they began, where they began, and (a pinch) how far apart
  const gesture = useRef<{ from: Zoom; at: Point; apart: number | null } | null>(null);

  useLayoutEffect(() => {
    if (strip.current) strip.current.scrollLeft = start * strip.current.clientWidth;
  }, [start]);

  // Safari's own pinch: never, here (it zooms the page)
  useEffect(() => {
    const element = panel.current;
    if (!element) return undefined;
    const stop = (event: Event) => event.preventDefault();
    for (const name of ['gesturestart', 'gesturechange', 'gestureend']) element.addEventListener(name, stop);
    return () => {
      for (const name of ['gesturestart', 'gesturechange', 'gestureend']) element.removeEventListener(name, stop);
    };
  }, []);

  // The picture shown, zoomed (kept in its box: no black past its edges); zoomed in, the gallery holds still
  const apply = (next: Zoom) => {
    const box = strip.current;
    if (!box) return;
    const { clientWidth: width, clientHeight: height } = box;
    const scale = clamp(next.scale, 1, MAX_ZOOM);
    zoom.current = {
      scale,
      x: clamp(next.x, width - width * scale, 0),
      y: clamp(next.y, height - height * scale, 0),
    };
    const picture = shown.current[at];
    if (picture) picture.style.transform = scale > 1 ? `translate(${zoom.current.x}px, ${zoom.current.y}px) scale(${scale})` : '';
    box.style.overflowX = scale > 1 ? 'hidden' : '';
  };
  const unzoom = () => apply(UNZOOMED);
  const zoomed = () => zoom.current.scale > 1;

  // The picture down by dy, the black fading as it goes (straight on the page: a finger's every move)
  const follow = (dy: number) => {
    if (strip.current) strip.current.style.transform = dy ? `translateY(${dy}px)` : '';
    if (panel.current) panel.current.style.backgroundColor = dy ? `color-mix(in srgb, var(--color-lightbox) ${100 - Math.min(dy / 4, 70)}%, transparent)` : '';
  };
  const back = () => {
    const picture = strip.current;
    if (!picture) return;
    picture.style.transition = 'transform var(--duration) var(--ease-out)';
    follow(0);
    picture.addEventListener('transitionend', () => picture.style.removeProperty('transition'), { once: true });
  };

  // Fingers now on it (a pinch, or one looking around a zoomed picture): from here
  const begin = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    if (!a) return;
    gesture.current = b
      ? { from: zoom.current, at: middle(a, b), apart: apart(a, b) }
      : { from: zoom.current, at: { x: a.clientX, y: a.clientY }, apart: null };
  };

  // Touch, not pointer events: once a swipe goes down it's ours (preventDefault), so
  // Safari never makes it a scroll of the page behind and cancels it
  return (
    <div
      ref={panel}
      tabIndex={-1}
      class="rr-fixed rr-inset-0 rr-z-menu rr-bg-lightbox rr-outline-none rr-touch-pan-x"
      role="dialog"
      aria-modal="true"
      aria-label="Pictures"
      onClick={() => {
        if (dragged.current) dragged.current = false;
        else if (zoomed()) unzoom();
        else onClose();
      }}
      onTouchStart={(event) => {
        const [finger] = event.touches;
        if (!finger) return;
        if (event.touches.length > 1 || zoomed()) {  // a pinch, or zoomed in: ours, not a swipe down
          drag.current = null;
          follow(0);
          dragged.current = event.touches.length > 1;  // one finger on a zoomed picture: a tap zooms out, unless it moves
          begin(event.touches);
          return;
        }
        gesture.current = null;
        drag.current = { x: finger.clientX, y: finger.clientY, dy: 0, down: null };
        dragged.current = false;
      }}
      onTouchMove={(event) => {
        const pinch = gesture.current;
        if (pinch) {
          event.preventDefault();  // not the gallery's, nor Safari's
          dragged.current = true;
          const [a, b] = [event.touches[0], event.touches[1]];
          if (!a) return;
          const { from } = pinch;
          if (b && pinch.apart) {
            // The spot between the fingers stays under them as the picture grows
            const now = middle(a, b);
            const scale = clamp(from.scale * (apart(a, b) / pinch.apart), 1, MAX_ZOOM);
            const spot = { x: (pinch.at.x - from.x) / from.scale, y: (pinch.at.y - from.y) / from.scale };
            apply({ scale, x: now.x - spot.x * scale, y: now.y - spot.y * scale });
          } else if (!b && !pinch.apart) {
            apply({ scale: from.scale, x: from.x + a.clientX - pinch.at.x, y: from.y + a.clientY - pinch.at.y });
          }
          return;
        }
        const at = drag.current;
        const [finger] = event.touches;
        if (!at || !finger) return;
        const dx = finger.clientX - at.x;
        const dy = finger.clientY - at.y;
        if (at.down === null) {
          if (Math.hypot(dx, dy) < DECIDE_AT) return;
          at.down = dy > Math.abs(dx);
        }
        if (!at.down) return;  // across: the gallery's
        event.preventDefault();
        dragged.current = true;
        at.dy = Math.max(0, dy);
        follow(at.dy);
      }}
      onTouchEnd={(event) => {
        if (gesture.current) {
          // A finger lifted from a pinch: the one left goes on looking around
          if (event.touches.length && zoomed()) begin(event.touches);
          else gesture.current = null;
          if (!event.touches.length && zoom.current.scale < 1.05) unzoom();
          return;
        }
        const at = drag.current;
        drag.current = null;
        if (!at?.down) return;
        if (at.dy > CLOSE_AT) onClose();
        else back();
      }}
      onTouchCancel={() => {
        gesture.current = null;
        drag.current = null;
        back();
      }}
    >
      <div
        ref={strip}
        class="rr-flex rr-h-full rr-overflow-x-auto rr-overflow-y-hidden rr-overscroll-contain rr-snap-x rr-touch-pan-x"  // sideways only, here too: it scrolls, so the panel's doesn't reach in
        onScroll={(event) => {
          const now = Math.round(event.currentTarget.scrollLeft / (event.currentTarget.clientWidth || 1));
          if (now !== at) setAt(now);
        }}
      >
        {pictures.map((picture, index) => Math.abs(index - at) <= NEAR ? (
          <img
            key={picture.url}
            ref={(element) => { shown.current[index] = element; }}
            class="rr-block rr-flex-none rr-w-full rr-h-full rr-object-contain rr-snap-center rr-origin-top-left"
            src={picture.url}
            width={picture.width}
            height={picture.height}
            decoding="async"
            alt=""
          />
        ) : (
          // Far from the one shown: its place only, nothing loaded (a gallery of 20 big pictures is a lot for a phone)
          <div key={picture.url} class="rr-flex-none rr-w-full rr-h-full rr-snap-center" />
        ))}
      </div>
      <button
        type="button"
        class="rr-absolute rr-top-4 rr-right-4 rr-grid rr-place-items-center rr-w-10 rr-h-10 rr-rounded-full rr-bg-media-background rr-text-media-onBackground"
        aria-label="Close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <Icon name="close" large />
      </button>
    </div>
  );
}
