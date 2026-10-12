/* Class bundles we use again and again (Tailwind-style utilities from
   styles/utilities.css, named), and cx to join them. */

const tag = 'rr-inline-block rr-px-2 rr-py-0.5 rr-rounded-full rr-text-xs rr-font-semibold';

export const ui = {
  tag,  // a pill: flair, NSFW, Pinned
  badge: `${tag} rr-absolute rr-top-2 rr-right-2 rr-bg-media-background rr-text-media-onBackground`,  // a pill on a picture: a video, a gallery's count
  action: 'rr-flex rr-items-center rr-gap-1 rr-h-8 rr-px-3 rr-rounded-full rr-bg-secondary-background rr-text-xs rr-font-semibold',  // reddit's small button: score, comments
};

export const cx = (...parts: (string | false | null | undefined)[]) => [...new Set(parts.filter(Boolean).join(' ').split(' ').filter(Boolean))].join(' ');

// A busy button: label hidden, taps ignored (busy.tsx adds the spinner)
export const BUSY = 'rr-relative rr-text-transparent rr-pointer-events-none';
