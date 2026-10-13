/* A subreddit's header, under the bar, as reddit.com has it. On a phone: its
   banner, then its icon, name and members, and Join or Joined (tap to
   leave) under them. Wider (sm): a taller rounded banner, a big icon in a
   ring over its edge, the name large beside it, Join at the right. A line
   under it. Only a subreddit has one: the front page, Popular, All and
   several subreddits at once have none, as on reddit.com. */

import { Avatar } from '../../../components/avatar';
import { JoinButton } from '../../../components/join';
import type { Load } from '../../../core/store';
import { compact } from '../../../core/text';
import type { About } from '../contract';

interface HeadingProps {
  subreddit: string;
  about: Load<About> | null;
  onJoin: (join: boolean) => void;
}

export function Heading({ subreddit, about, onJoin }: HeadingProps) {
  const known = about?.status === 'loaded' ? about.data : null;
  const line = known ? `${compact(known.members)} members` : about?.status === 'failed' ? about.error : null;
  return (
    <header class="rr-grid rr-border-b rr-border-neutral-border-weak">
      {known?.banner ? (
        <img
          class="rr-block rr-w-full rr-h-16 sm:rr-h-32 sm:rr-mt-2 sm:rr-rounded-media rr-object-cover rr-bg-secondary-background"
          src={known.banner}
          alt=""
        />
      ) : (
        <div
          class="rr-h-16 sm:rr-h-32 sm:rr-mt-2 sm:rr-rounded-media rr-bg-secondary-background"
          style={known?.color ? { backgroundColor: known.color } : undefined}  // the subreddit's own, from reddit
        />
      )}
      <div class="rr-grid rr-gap-4 rr-px-4 rr-pt-5 rr-pb-4 sm:rr-flex sm:rr-items-end sm:rr-pt-0">
        <div class="rr-flex rr-items-center rr-gap-4 sm:rr-items-start sm:rr-min-w-0">
          <span class="rr-flex-none rr-rounded-full rr-border rr-border-neutral-border-weak sm:-rr-mt-10 sm:rr-border-4 sm:rr-border-neutral-background">
            <Avatar
              name={subreddit}
              icon={known?.icon ?? null}
              size="hero"
            />
          </span>
          <div class="rr-grid rr-min-w-0 sm:rr-pt-4">
            <h1 class="rr-text-xl sm:rr-text-3xl rr-font-bold rr-truncate">{known?.label ?? `r/${subreddit}`}</h1>
            {line && <p class="rr-text-xs rr-text-neutral-content-weak rr-truncate">{line}</p>}
          </div>
        </div>
        {known && (
          <div class="rr-flex rr-gap-3 sm:rr-ml-auto sm:rr-pb-3">
            <JoinButton
              joined={known.joined}
              onJoin={onJoin}
            />
          </div>
        )}
      </div>
    </header>
  );
}
