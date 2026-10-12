/* Our one loader: a spinning ring in reddit's loader color (still with reduced motion). In a
   button, a small one in place of its label. */

import type { ComponentChildren } from 'preact';
import { BUSY, cx } from './ui';

// The ring, centered in the space it waits in
export function Loader() {
  return (
    <div class="rr-grid rr-place-items-center rr-py-12">
      <span class="rr-w-12 rr-h-12 rr-rounded-full rr-border-spinner rr-animate-spin motion-reduce:rr-animate-none" />
      <span class="rr-sr-only">Loading</span>
    </div>
  );
}

function Spinner() {
  return <span class="rr-absolute rr-inset-0 rr-m-auto rr-w-6 rr-h-6 rr-rounded-full rr-border-spinner rr-animate-spin" />;
}

interface BusyButtonProps {
  busy: boolean;
  class: string;
  onClick?: () => void;
  children?: ComponentChildren;
}

export function BusyButton({ busy, class: className, onClick, children }: BusyButtonProps) {
  return (
    <button
      type="button"
      class={cx(className, busy && BUSY)}
      onClick={onClick}
    >
      {children}
      {busy && <Spinner />}
    </button>
  );
}
