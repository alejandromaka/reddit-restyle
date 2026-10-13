/* A dropdown under what opened it, at the right (its parent is positioned:
   the bar): on a wide screen, your account. A click outside closes it (so do
   Escape, and anything clicked in it). Always there; closed, it's faded out
   and inert. */

import type { ComponentChildren } from 'preact';
import { useDismiss } from './dismiss';
import { cx } from './ui';

interface DropdownProps {
  open: boolean;
  label: string;  // what it is, for screen readers
  onClose: () => void;
  children: ComponentChildren;
}

export function Dropdown({ open, label, onClose, children }: DropdownProps) {
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
        onClick={onClose}
      >
        {children}
      </div>
    </div>
  );
}
