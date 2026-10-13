/* Your account, as reddit.com's: on a phone a sheet from the bottom, on a
   wide screen a dropdown under your avatar (so it goes in the bar). View
   Profile, Settings (old reddit's pages: not ours yet, so they break), Dark
   Mode, Log Out. */

import { useState } from 'preact/hooks';
import type { Me } from '../account/contract';
import { Avatar } from '../components/avatar';
import { Dropdown } from '../components/dropdown';
import { Icon } from '../components/icon';
import { Sheet } from '../components/sheet';
import { cx } from '../components/ui';
import { chooseTheme, isDark } from '../core/theme';

const ROW = 'rr-flex rr-items-center rr-gap-4 rr-w-full rr-h-12 rr-px-4';

interface AccountProps {
  open: boolean;
  me: Me;
  onLogOut: () => void;
  onClose: () => void;
}

export function Account({ open, me, onLogOut, onClose }: AccountProps) {
  return (
    <>
      <div class="lg:rr-hidden">
        <Sheet
          open={open}
          side="bottom"
          label="Account"
          onClose={onClose}
        >
          <AccountItems
            me={me}
            onLogOut={onLogOut}
          />
        </Sheet>
      </div>
      <div class="rr-hidden lg:rr-block">
        <Dropdown
          open={open}
          label="Account"
          onClose={onClose}
        >
          <AccountItems
            me={me}
            onLogOut={onLogOut}
          />
        </Dropdown>
      </div>
    </>
  );
}

interface AccountItemsProps {
  me: Me;
  onLogOut: () => void;
}

function AccountItems({ me, onLogOut }: AccountItemsProps) {
  const [dark, setDark] = useState(isDark);
  return (
    <>
      <a
        class="rr-flex rr-items-center rr-gap-4 rr-px-4 rr-py-3"
        href={`/user/${me.name}/`}
      >
        <Avatar
          name={me.name}
          icon={me.icon}
          size="lg"
        />
        <span class="rr-grid rr-min-w-0">
          <span>View Profile</span>
          <span class="rr-text-xs rr-text-neutral-content-weak rr-truncate">u/{me.name}</span>
        </span>
      </a>
      <hr class="rr-my-2 rr-border-b rr-border-neutral-border-weak" />
      <a
        class={ROW}
        href="/prefs/"
      >
        <Icon name="settings" large />
        Settings
      </a>
      <button
        type="button"
        class={ROW}
        role="switch"
        aria-checked={dark}
        onClick={(event) => {
          event.stopPropagation();  // a switch: the menu stays open
          chooseTheme(!dark);
          setDark(!dark);
        }}
      >
        <Icon name="moon" large />
        Dark Mode
        <span class={cx('rr-flex rr-items-center rr-ml-auto rr-w-10 rr-h-6 rr-p-0.5 rr-rounded-full', dark ? 'rr-justify-end rr-bg-primary-background' : 'rr-bg-secondary-background')}>
          <span class="rr-w-5 rr-h-5 rr-rounded-full rr-bg-neutral-background rr-shadow-md" />
        </span>
      </button>
      <button
        type="button"
        class={ROW}
        onClick={onLogOut}
      >
        <Icon name="logout" large />
        Log Out
      </button>
    </>
  );
}
