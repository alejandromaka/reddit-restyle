/* Someone's header, as reddit.com's profile: their banner, their avatar
   (88px, in a ring the page's color, over the banner's edge), their name
   large and u/name under it, their bio. Then About, folded (a tap opens
   it): their followers, karma, and how long they've been on reddit. */

import { Avatar } from '../../../components/avatar';
import { Icon } from '../../../components/icon';
import type { Load } from '../../../core/store';
import { ago, compact } from '../../../core/text';
import type { User } from '../contract';

const BANNER = 'rr-block rr-w-full rr-h-20 sm:rr-h-32 sm:rr-mt-2 sm:rr-rounded-media rr-bg-secondary-background';

export function Heading({ name, user }: { name: string; user: Load<User> }) {
  const known = user.status === 'loaded' ? user.data : null;
  const note = user.status === 'failed' ? user.error : known?.suspended ? 'This account has been suspended' : null;
  return (
    <header class="rr-grid rr-gap-4 rr-pb-2">
      <div class="rr-grid">
        {known?.banner ? (
          <img
            class={`${BANNER} rr-object-cover`}
            src={known.banner}
            alt=""
          />
        ) : (
          <div class={BANNER} />
        )}
        <div class="rr-grid rr-gap-1 rr-px-4">
          <span class="rr-justify-self-start -rr-mt-6 rr-rounded-full rr-border-4 rr-border-neutral-background">
            <Avatar
              name={name}
              icon={known?.icon ?? null}
              size="xl"
            />
          </span>
          <h1 class="rr-text-xl sm:rr-text-3xl rr-font-bold rr-truncate">{known?.label ?? name}</h1>
          <p class="rr-text-neutral-content-weak">u/{name}</p>
          {known?.bio && <p class="rr-pt-2">{known.bio}</p>}
          {note && <p class="rr-text-xs rr-text-neutral-content-weak">{note}</p>}
        </div>
      </div>
      {known && !known.suspended && <About user={known} />}
    </header>
  );
}

function About({ user }: { user: User }) {
  return (
    <details class="rr-group rr-mx-4 rr-rounded-media rr-bg-neutral-background-weak">
      <summary class="rr-flex rr-items-center rr-justify-between rr-h-12 rr-px-4 rr-text-neutral-content-weak rr-cursor-pointer">
        About
        <span class="group-open:rr-rotate-180">
          <Icon name="chevron" />
        </span>
      </summary>
      <div class="rr-grid rr-gap-4 rr-px-4 rr-pb-4">
        {user.followers !== null && (
          <p class="rr-font-semibold rr-text-neutral-content-weak">
            {compact(user.followers)} {user.followers === 1 ? 'follower' : 'followers'}
          </p>
        )}
        <div class="rr-grid rr-grid-cols-2 rr-gap-4">
          <Fact
            value={compact(user.karma)}
            label="Karma"
          />
          {user.created !== null && (
            <Fact
              value={ago(user.created)}
              label="Reddit Age"
            />
          )}
        </div>
      </div>
    </details>
  );
}

// A number, and what it is under it
function Fact({ value, label }: { value: string; label: string }) {
  return (
    <p class="rr-grid">
      <span class="rr-font-semibold">{value}</span>
      <span class="rr-text-neutral-content-weak">{label}</span>
    </p>
  );
}
