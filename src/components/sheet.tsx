/* A sheet over the page: it slides in from the left (the menu, under the
   bar, as reddit.com's), up from the bottom (your account; on a phone, a
   post's "…" and a report), or fades in in the middle (a report, wider), over
   a scrim that fades in and closes it (so does Escape, and anything tapped in
   it). Always there; closed, it's off screen (or faded out) and inert. */

import type { ComponentChildren } from 'preact';
import { useDismiss } from './dismiss';
import { cx } from './ui';

const SIDES = {
  left: { panel: 'rr-inset-y-0 rr-left-0 rr-w-[18rem] rr-max-w-[85%] rr-py-2 rr-transition-transform', closed: '-rr-translate-x-full' },
  bottom: { panel: 'rr-inset-x-0 rr-bottom-0 rr-max-h-[85%] rr-rounded-t-media rr-pt-2 rr-pb-8 rr-transition-transform', closed: 'rr-translate-y-full' },
  center: { panel: 'rr-inset-0 rr-m-auto rr-w-[32rem] rr-max-w-[calc(100%-2rem)] rr-h-fit rr-max-h-[85%] rr-rounded-media rr-py-4 rr-transition-opacity', closed: 'rr-opacity-0' },
} as const;

interface SheetProps {
  open: boolean;
  side: keyof typeof SIDES;
  label: string;  // what it is, for screen readers
  top?: number;   // where it starts, px from the screen's top (the menu: under the bar); else the whole screen
  onClose: () => void;
  children: ComponentChildren;
}

export function Sheet({ open, side, label, top = 0, onClose, children }: SheetProps) {
  const panel = useDismiss(open, onClose);

  return (
    <div
      class={cx('rr-fixed rr-inset-0 rr-z-menu rr-overflow-hidden', !open && 'rr-pointer-events-none')}
      style={top ? { top: `${top}px` } : undefined}  // measured: where the bar ends
      inert={!open}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        class={cx('rr-absolute rr-inset-0 rr-w-full rr-bg-scrim rr-touch-none rr-transition-opacity motion-reduce:rr-transition-none', !open && 'rr-opacity-0')}
        aria-label={`Close ${label.toLowerCase()}`}
        onClick={onClose}
      />
      <div
        ref={panel}
        tabIndex={-1}
        class={cx(
          'rr-absolute rr-overflow-y-auto rr-overscroll-contain rr-outline-none rr-bg-neutral-background motion-reduce:rr-transition-none',
          SIDES[side].panel,
          !open && SIDES[side].closed,
        )}
        onClick={onClose}
      >
        {children}
      </div>
    </div>
  );
}
