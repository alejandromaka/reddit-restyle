/* Pictures opened big, as reddit.com's viewer: over black, one at a time (a
   gallery: swiped through; pinch to zoom), from the one tapped. A tap, ×, or
   Escape closes it. */

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

export function Lightbox({ pictures, start, onClose }: LightboxProps) {
  const panel = useDismiss(true, onClose);
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (strip.current) strip.current.scrollLeft = start * strip.current.clientWidth;
  }, [start]);
  return (
    <div
      ref={panel}
      tabIndex={-1}
      class="rr-fixed rr-inset-0 rr-z-menu rr-bg-lightbox rr-outline-none rr-touch-pan-x"
      role="dialog"
      aria-modal="true"
      aria-label="Pictures"
      onClick={onClose}
    >
      <div
        ref={strip}
        class="rr-flex rr-h-full rr-overflow-x-auto rr-overscroll-contain rr-snap-x"
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
