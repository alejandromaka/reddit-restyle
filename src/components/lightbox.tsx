/* Pictures opened big, as reddit.com's viewer: over black, one at a time (a
   gallery: swiped through; pinch to zoom), from the one tapped. A tap, ×,
   Escape, or a swipe down closes it: the picture follows the finger and the
   black fades; let go far enough down and it closes, else it goes back. Not
   with two fingers (a pinch) or zoomed in (a drag looks around), and a swipe
   across is the gallery's. */

import { useLayoutEffect, useRef } from 'preact/hooks';
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

export function Lightbox({ pictures, start, onClose }: LightboxProps) {
  const panel = useDismiss(true, onClose);
  const strip = useRef<HTMLDivElement>(null);
  // A finger on it: where it started, how far down, and once it's moved, whether it's going down
  const drag = useRef<{ x: number; y: number; dy: number; down: boolean | null } | null>(null);
  const dragged = useRef(false);  // a swipe just ended: a click after it isn't a tap
  useLayoutEffect(() => {
    if (strip.current) strip.current.scrollLeft = start * strip.current.clientWidth;
  }, [start]);

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
        else onClose();
      }}
      onTouchStart={(event) => {
        const [finger] = event.touches;
        if (event.touches.length > 1 || !finger || (window.visualViewport?.scale ?? 1) > 1) {  // a pinch, or zoomed in
          drag.current = null;
          follow(0);
          return;
        }
        drag.current = { x: finger.clientX, y: finger.clientY, dy: 0, down: null };
        dragged.current = false;
      }}
      onTouchMove={(event) => {
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
      onTouchEnd={() => {
        const at = drag.current;
        drag.current = null;
        if (!at?.down) return;
        if (at.dy > CLOSE_AT) onClose();
        else back();
      }}
      onTouchCancel={() => {
        drag.current = null;
        back();
      }}
    >
      <div
        ref={strip}
        class="rr-flex rr-h-full rr-overflow-x-auto rr-overscroll-contain rr-snap-x rr-touch-pan-x"  // sideways only, here too: it scrolls, so the panel's doesn't reach in
      >
        {pictures.map((picture) => (
          <img
            key={picture.url}
            class="rr-block rr-flex-none rr-w-full rr-h-full rr-object-contain rr-snap-center"
            src={picture.url}
            width={picture.width}
            height={picture.height}
            decoding="async"
            alt=""
          />
        ))}
      </div>
      <button
        type="button"
        class="rr-absolute rr-top-4 rr-right-4 rr-grid rr-place-items-center rr-w-10 rr-h-10 rr-rounded-full rr-bg-media-background rr-text-media-onBackground"
        aria-label="Close"
        onClick={onClose}
      >
        <Icon name="close" large />
      </button>
    </div>
  );
}
