/* A post's "Bot 12%": how bot-like its author's account looks (score.ts),
   asked for just before the post comes on screen (about a screen ahead), so
   posts you never scroll to cost nothing. Tapped: why, in a sheet. Nothing
   while it's on its way, or if reddit didn't answer. */

import { useEffect, useRef, useState } from 'preact/hooks';
import { Sheet } from '../components/sheet';
import { cx, ui } from '../components/ui';
import { known, lookUp } from './lookup';
import { isKnownBot, scoreOf, type Found, type Score } from './score';

// No one to ask about: a deleted account's posts
const NOBODY = new Set(['[deleted]', '[removed]', '']);

// Whether it's come within a screen of being seen (then it stops watching)
function useNear(on: boolean) {
  const spot = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!on || near || !spot.current || typeof IntersectionObserver === 'undefined') return undefined;
    const watch = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNear(true);
        watch.disconnect();
      }
    }, { rootMargin: '100% 0px' });
    watch.observe(spot.current);
    return () => watch.disconnect();
  }, [on, near]);
  return [spot, near] as const;
}

export const tone = (percent: number) =>
  percent >= 70 ? 'rr-bg-tags-danger-background rr-text-tags-danger-content'
    : percent >= 30 ? 'rr-bg-tags-caution-background rr-text-tags-caution-content'
      : 'rr-bg-tags-neutral-background rr-text-tags-neutral-content';

export function BotBadge({ name }: { name: string }) {
  const askable = !NOBODY.has(name);
  const [found, setFound] = useState<Found | null>(() => (askable && !isKnownBot(name) ? known(name) : null));
  const [spot, near] = useNear(askable && !found && !isKnownBot(name));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!near || found) return undefined;
    let here = true;
    lookUp(name).then((answer) => here && setFound(answer), () => {});
    return () => {
      here = false;
    };
  }, [near, found, name]);

  if (!askable) return null;
  const score: Score | null = isKnownBot(name) ? scoreOf(name, 'gone') : found ? scoreOf(name, found) : null;
  if (!score) return <span ref={spot} class="rr-flex-none" />;

  const against = score.reasons.filter((reason) => reason.toward === 'bot');
  const toward = score.reasons.filter((reason) => reason.toward === 'person');
  return (
    <>
      <button
        type="button"
        class={cx(ui.tag, 'rr-flex-none', tone(score.percent))}
        aria-label={`Bot-likeness ${score.percent}%: why`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Bot {score.percent}%
      </button>
      {open && (
        <Sheet
          open
          side="bottom"
          label="Bot-likeness"
          onClose={() => setOpen(false)}
        >
          <div class="rr-grid rr-gap-3 rr-px-4 rr-py-2 rr-text-neutral-content">
            <p class="rr-text-base rr-font-semibold rr-text-neutral-content-strong">u/{name} looks {score.percent}% like a bot</p>
            <p class="rr-text-neutral-content-weak">A guess from their account, not a fact. New and throwaway accounts can look bot-like; old, bought ones can look human.</p>
            {against.length > 0 && <Reasons title="Like a bot" reasons={against.map((reason) => reason.text)} />}
            {toward.length > 0 && <Reasons title="Like a person" reasons={toward.map((reason) => reason.text)} />}
            {score.reasons.length === 0 && <p>Nothing stands out either way.</p>}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Reasons({ title, reasons }: { title: string; reasons: string[] }) {
  return (
    <div>
      <p class="rr-font-semibold rr-text-neutral-content-strong">{title}</p>
      <ul class="rr-list-disc rr-pl-5">
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </div>
  );
}
