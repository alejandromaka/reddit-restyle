/* What a sheet or dropdown does while open: takes focus (for screen readers
   and keys; not scrolled to), and closes on Escape */

import { useEffect, useRef } from 'preact/hooks';

export function useDismiss(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.focus({ preventScroll: true });
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onClose]);
  return panel;
}
