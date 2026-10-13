/* A dropdown under what opened it, at the right (its parent is positioned:
   the bar; or where it's told, on the page): on a wide screen, your account,
   a post's "…". A click outside closes it (so do Escape, and anything clicked
   in it). Always there; closed, it's faded out and inert. */

import type { ComponentChildren } from 'preact';
import { useDismiss } from './dismiss';
import { cx } from './ui';

interface DropdownProps {
  open: boolean;
  label: string;  // what it is, for screen readers
  at?: { top: number; right: number };  // where on the page (px): its top, its right edge's distance from the page's
  onClose: () => void;
  children: ComponentChildren;
}

export function Dropdown({ open, label, at, onClose, children }: DropdownProps) {
  const panel = useDismiss(open, onClose);
  return (
    <div
      class={cx(!open && 'rr-pointer-events-none')}
      inert={!open}
      role="dialog"
      aria-label={label}
    >
      <button
        type="button"
        class="rr-fixed rr-inset-0 rr-w-full"
        tabIndex={-1}
        aria-label={`Close ${label.toLowerCase()}`}
        onClick={onClose}
      />
      <div
        ref={panel}
        tabIndex={-1}
        class={cx(
          'rr-absolute rr-top-full rr-right-4 rr-mt-2 rr-w-64 rr-py-2 rr-rounded-media rr-bg-neutral-background rr-shadow-md rr-outline-none rr-transition-opacity motion-reduce:rr-transition-none',
          !open && 'rr-opacity-0',
        )}
        style={at ? { top: `${at.top}px`, right: `${at.right}px` } : undefined}
        onClick={onClose}
      >
        {children}
      </div>
    </div>
  );
}
