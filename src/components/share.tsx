/* Share: the phone's own share sheet. When Safari won't open it (no
   navigator.share, or it refuses: NotAllowedError, a share already open, the
   page's policy), a sheet of ours instead, never nothing: the link, to copy
   (Copy, else selected for you to copy). */

import { useRef, useState } from 'preact/hooks';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { ui } from './ui';

// Copies text: the clipboard API, else the old way (the field selected,
// "copy", while still in your tap); false if neither did, the field left
// selected for you to copy
export async function copyText(text: string, field: HTMLInputElement | null): Promise<boolean> {
  const select = () => {
    field?.focus();
    field?.setSelectionRange(0, text.length);
  };
  if (typeof navigator.clipboard?.writeText !== 'function') {
    select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    select();
    return false;
  }
}

// Opens the phone's share sheet: 'shared' (or closed by you), else 'failed': show ours
export async function openShareSheet(title: string, url: string): Promise<'shared' | 'failed'> {
  if (typeof navigator.share !== 'function') return 'failed';
  try {
    await navigator.share({ title, url });
    return 'shared';
  } catch (error) {
    if ((error as Error | null)?.name === 'AbortError') return 'shared';  // you closed it
    console.error(error);
    return 'failed';
  }
}

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);  // null: not tried
  const field = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        class={ui.action}
        onClick={() => {
          setCopied(null);
          void openShareSheet(title, url).then((how) => {
            if (how === 'failed') setOpen(true);
          });
        }}
      >
        <Icon name="share" />
        Share
      </button>
      <Sheet
        open={open}
        side="bottom"
        label="Share"
        onClose={() => setOpen(false)}
      >
        <div
          class="rr-grid rr-gap-2 rr-px-4 rr-pb-2"
          onClick={(event) => event.stopPropagation()}  // a tap here keeps it open
        >
          <p class="rr-font-semibold">Share</p>
          <input
            class="rr-w-full rr-h-10 rr-px-4 rr-rounded-full rr-border rr-border-neutral-border-medium rr-outline-none"
            readOnly
            value={url}
            aria-label="Link"
            ref={field}
            onFocus={(event) => event.currentTarget.select()}
          />
          {copied === false && <p class="rr-text-xs rr-text-neutral-content-weak">Couldn’t copy it: the link is selected, tap it and choose Copy.</p>}
          <button
            type="button"
            class="rr-h-10 rr-px-4 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground"
            onClick={() => {
              void copyText(url, field.current).then((done) => {
                setCopied(done);
                if (done) setTimeout(() => setOpen(false), 600);
              });
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
