/* Class bundles we use again and again (Tailwind-style utilities from
   styles/utilities.css, named), and cx to join them. */

const tag = 'rr-inline-block rr-px-2 rr-py-0.5 rr-rounded-full rr-text-xs rr-font-semibold';
const pill = 'rr-flex rr-items-center rr-h-8 rr-rounded-full rr-text-xs rr-font-semibold';  // reddit's small button

export const ui = {
  tag,  // a pill: flair, NSFW, Pinned
  badge: `${tag} rr-absolute rr-top-2 rr-right-2 rr-bg-media-background rr-text-media-onBackground`,  // a pill on a picture: a video, a gallery's count
  pill,  // the vote pill (its color: the vote)
  action: `${pill} rr-gap-1 rr-px-3 rr-bg-secondary-background`,  // comments, Share
  plain: `${pill} rr-gap-1 rr-px-3`,  // Reply: an action without its pill
  icon: 'rr-grid rr-place-items-center rr-flex-none rr-w-8 rr-h-8 rr-rounded-full',  // a round button with an icon in it
  row: 'rr-flex rr-items-center rr-gap-4 rr-w-full rr-h-12 rr-px-4',  // a menu's: an icon, then its words
};

export const cx = (...parts: (string | false | null | undefined)[]) => [...new Set(parts.filter(Boolean).join(' ').split(' ').filter(Boolean))].join(' ');

// A busy button: label hidden, taps ignored (busy.tsx adds the spinner)
export const BUSY = 'rr-relative rr-text-transparent rr-pointer-events-none';
