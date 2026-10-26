/* Your account, as reddit.com's: on a phone a sheet from the bottom, on a
   wide screen a dropdown under your avatar (so it goes in the bar). View
   Profile, Settings (old reddit's pages: not ours yet, so they break), Dark
   Mode, Blocked Domains (folded: the sites this device blocks, each with
   Unblock), Update Reddit Restyle (run by the loader: it gets the latest
   build, only when asked), Log Out. */

import { useEffect, useState } from 'preact/hooks';
import type { Me } from '../account/contract';
import { Avatar } from '../components/avatar';
import { Dropdown } from '../components/dropdown';
import { Icon } from '../components/icon';
import { Sheet } from '../components/sheet';
import { cx, ui } from '../components/ui';
import { blockDomain, blockedDomains, followDomains } from '../core/domains';
import { chooseTheme, isDark } from '../core/theme';
import { loadedBuild, requestUpdate } from '../loader/contract';

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
        class={ui.row}
        href="/prefs/"
      >
        <Icon name="settings" large />
        Settings
      </a>
      <button
        type="button"
        class={ui.row}
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
      <BlockedDomains />
      <UpdateRestyle />
      <button
        type="button"
        class={ui.row}
        onClick={onLogOut}
      >
        <Icon name="logout" large />
        Log Out
      </button>
    </>
  );
}

// Run by the loader: the latest build, from where it's published (the loader
// says how that went, and reloads the page with it)
function UpdateRestyle() {
  const build = loadedBuild();
  if (!build) return null;
  return (
    <button
      type="button"
      class={ui.row}
      onClick={requestUpdate}
    >
      <Icon name="down" large />
      Update Reddit Restyle
      <span class="rr-ml-auto rr-text-xs rr-text-neutral-content-weak">{build}</span>
    </button>
  );
}

// The sites this device blocks (a link post's "…": Block site.com), folded
// under their row, each with Unblock; up to date as they change. Taps in it
// open and unblock, they don't close the menu
function BlockedDomains() {
  const [domains, setDomains] = useState(blockedDomains);
  useEffect(() => followDomains(setDomains), []);
  return (
    <details
      class="rr-group"
      onClick={(event) => event.stopPropagation()}
    >
      <summary class={cx(ui.row, 'rr-cursor-pointer')}>
        <Icon name="block" large />
        Blocked Domains
        <span class="rr-flex rr-items-center rr-gap-2 rr-ml-auto rr-text-neutral-content-weak">
          {domains.length}
          <span class="group-open:rr-rotate-180">
            <Icon name="chevron" />
          </span>
        </span>
      </summary>
      {domains.length ? (
        <ul>
          {domains.map((domain) => (
            <li
              key={domain}
              class="rr-flex rr-items-center rr-gap-4 rr-h-12 rr-px-4"
            >
              <span class="rr-flex-none rr-w-5" />
              <span class="rr-flex-1 rr-min-w-0 rr-truncate">{domain}</span>
              <button
                type="button"
                class={ui.action}
                onClick={() => blockDomain(domain, false)}
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p class="rr-px-4 rr-pb-2 rr-text-xs rr-text-neutral-content-weak">None yet. A link post’s “…” blocks its site.</p>
      )}
    </details>
  );
}
