/* A post's media, in the feed and on its page, as reddit.com's: a video
   (reddit's own, or a gif) plays where it is; pictures (one, or a gallery to
   swipe through) open big when tapped; a link's card opens the link (an
   outside video: ▶). Nothing of a video loads until it's played. */

import { useState } from 'preact/hooks';
import { Icon } from '../../../components/icon';
import { Lightbox } from '../../../components/lightbox';
import { ui } from '../../../components/ui';
import type { Image, Media } from '../contract';

export function MediaView({ media }: { media: Media }) {
  if (media.kind === 'video') {
    return (
      <video
        class="rr-block rr-w-full rr-h-auto rr-max-h-[75vh] rr-rounded-media rr-bg-media-background"
        src={media.url}
        poster={media.poster?.url}
        width={media.poster?.width}
        height={media.poster?.height}
        controls
        playsInline
        preload="none"
        loop={media.loop}
        muted={media.loop}  // a gif: no sound to begin with
      />
    );
  }
  if (media.kind === 'link') {
    return (
      <a
        class="rr-relative rr-block"
        href={media.url}
      >
        <Picture picture={media.card} />
        {media.playable && (
          <span class={ui.badge}>
            <Icon name="play" />
            <span class="rr-sr-only">Video</span>
          </span>
        )}
      </a>
    );
  }
  return (
    <Pictures
      pictures={media.pictures}
      big={media.big}
    />
  );
}

function Picture({ picture }: { picture: Image }) {
  return (
    <img
      class="rr-block rr-w-full rr-h-auto rr-rounded-media"
      src={picture.url}
      width={picture.width}
      height={picture.height}
      loading="lazy"
      decoding="async"
      alt=""
    />
  );
}

// One picture, or a gallery swiped through (which one: its badge); a tap opens them big
function Pictures({ pictures, big }: { pictures: Image[]; big: Image[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [at, setAt] = useState(0);
  return (
    <div class="rr-relative">
      <div
        class="rr-flex rr-items-center rr-overflow-x-auto rr-snap-x rr-rounded-media"
        onScroll={(event) => setAt(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
      >
        {pictures.map((picture, index) => (
          <button
            key={picture.url}
            type="button"
            class="rr-block rr-flex-none rr-w-full rr-snap-center"
            aria-label="Open the picture"
            onClick={() => setOpen(index)}
          >
            <Picture picture={picture} />
          </button>
        ))}
      </div>
      {pictures.length > 1 && <span class={ui.badge}>{at + 1}/{pictures.length}</span>}
      {open !== null && (
        <Lightbox
          pictures={big}
          start={open}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
