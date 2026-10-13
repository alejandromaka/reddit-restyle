/* A comment box, as reddit.com's: "Join the conversation" until tapped, then
   the box, Cancel and Comment. What's written stays if reddit refuses it, and
   why shows under it. (The box keeps its own text: read when sent, nothing
   drawn again as you type.) */

import { useRef, useState } from 'preact/hooks';
import { BusyButton } from '../../../components/busy';

interface ComposerProps {
  placeholder: string;
  open?: boolean;          // a reply's box opens at once
  sending: boolean;
  error: string | null;    // reddit refused it: why
  onSend: (text: string) => void;
  onCancel?: () => void;   // a reply's box: closed
}

export function Composer({ placeholder, open: startOpen = false, sending, error, onSend, onCancel }: ComposerProps) {
  const [open, setOpen] = useState(startOpen);
  const box = useRef<HTMLTextAreaElement>(null);
  if (!open) {
    return (
      <button
        type="button"
        class="rr-flex rr-items-center rr-w-full rr-h-10 rr-px-4 rr-rounded-full rr-border rr-border-neutral-border-medium rr-text-neutral-content-weak"
        onClick={() => setOpen(true)}
      >
        {placeholder}
      </button>
    );
  }
  return (
    <div class="rr-grid rr-gap-2 rr-p-2 rr-rounded-media rr-border rr-border-neutral-border-medium">
      <textarea
        class="rr-block rr-w-full rr-min-h-24 rr-p-2 rr-text-base rr-outline-none"
        placeholder={placeholder}
        aria-label={placeholder}
        ref={box}
        autoFocus
      />
      {error && <p class="rr-px-2 rr-text-xs rr-text-danger-content">{error}</p>}
      <div class="rr-flex rr-justify-end rr-gap-2">
        <button
          type="button"
          class="rr-h-8 rr-px-4 rr-rounded-full rr-font-semibold rr-bg-secondary-background"
          onClick={() => {
            setOpen(false);
            onCancel?.();
          }}
        >
          Cancel
        </button>
        <BusyButton
          busy={sending}
          class="rr-h-8 rr-px-4 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground"
          onClick={() => {
            const text = box.current?.value ?? '';
            if (text.trim()) onSend(text);
          }}
        >
          Comment
        </BusyButton>
      </div>
    </div>
  );
}
