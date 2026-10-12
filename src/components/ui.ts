/* Class bundles we use again and again (Tailwind-style utilities from
   styles/utilities.css, named), and cx to join them. */

export const ui = {
  tag: 'rr-inline-block rr-px-2 rr-rounded-full rr-text-xs rr-font-bold',  // a pill: flair, NSFW, Pinned
};

export const cx = (...parts: (string | false | null | undefined)[]) => [...new Set(parts.filter(Boolean).join(' ').split(' ').filter(Boolean))].join(' ');

// A busy button: label hidden, taps ignored (busy.tsx adds the spinner)
export const BUSY = 'rr-relative rr-text-transparent rr-pointer-events-none';
