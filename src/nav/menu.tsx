/* The menu every page shares, as reddit.com's: Home, Popular, All and your
   communities (and nothing else). A sheet from the left under the bar (☰);
   on a wide screen (an iPad mini across and up), always there: a sidebar at
   the left, over the page's margin when there's room (1280px: 272px each side
   of the centered page), else beside it (the frame moves the page over). */

import type { ComponentChildren } from 'preact';
import { Avatar } from '../components/avatar';
import { Loader } from '../components/busy';
import { Icon } from '../components/icon';
import { Sheet } from '../components/sheet';
import { cx } from '../components/ui';
import type { Load } from '../core/store';
import type { Community } from './contract';
import { isHere, REDDITS } from './reddits';

interface MenuProps {
  open: boolean;
  current: string | null;              // the subreddit on screen (popular, all, …); null: home
  communities: Load<Community[]>;
  top: number;                         // where the bar ends
  onClose: () => void;
}

export function Menu({ open, current, communities, top, onClose }: MenuProps) {
  return (
    <Sheet
      open={open}
      side="left"
      label="Menu"
      top={top}
      onClose={onClose}
    >
      <MenuList
        current={current}
        communities={communities}
      />
    </Sheet>
  );
}

interface SidebarProps {
  current: string | null;
  communities: Load<Community[]>;
}

// Wide screens (lg: an iPad mini across, 1024px and up), the menu always
// there: down the page's left edge, its list under the bar as you scroll (it
// scrolls on its own)
export function Sidebar({ current, communities }: SidebarProps) {
  return (
    <aside class="rr-hidden lg:rr-block rr-absolute rr-inset-y-0 rr-left-0 rr-w-[272px] rr-border-r rr-border-neutral-border-weak">
      <div class="rr-sticky rr-top-14 rr-h-[calc(100dvh-3.5rem)] rr-overflow-y-auto rr-overscroll-contain rr-py-2">
        <MenuList
          current={current}
          communities={communities}
        />
      </div>
    </aside>
  );
}

interface MenuListProps {
  current: string | null;
  communities: Load<Community[]>;
}

function MenuList({ current, communities }: MenuListProps) {
  return (
    <nav>
      {REDDITS.map((reddit) => (
        <MenuItem
          key={reddit.path}
          href={reddit.path}
          current={isHere(reddit.name, current)}
        >
          <Icon name={reddit.icon} large />
          {reddit.label}
        </MenuItem>
      ))}
      <hr class="rr-mx-4 rr-my-2 rr-border-b rr-border-neutral-border-weak" />
      <h2 class="rr-px-4 rr-py-2 rr-text-xs rr-font-semibold rr-uppercase rr-text-neutral-content-weak">Your communities</h2>
      {communities.status === 'loading' && <Loader />}
      {communities.status === 'failed' && <p class="rr-px-4 rr-text-xs rr-text-neutral-content-weak">{communities.error}</p>}
      {communities.status === 'loaded' && communities.data.map((community) => (
        <MenuItem
          key={community.path}
          href={community.path}
          current={isHere(community.name, current)}
        >
          <Avatar
            name={community.name}
            icon={community.icon}
          />
          <span class="rr-min-w-0 rr-truncate">{community.label}</span>
          {community.favorite && (
            <span class="rr-ml-auto rr-text-neutral-content-weak">
              <Icon name="star" />
              <span class="rr-sr-only">Favorite</span>
            </span>
          )}
        </MenuItem>
      ))}
    </nav>
  );
}

interface MenuItemProps {
  href: string;
  current: boolean;
  children: ComponentChildren;
}

function MenuItem({ href, current, children }: MenuItemProps) {
  return (
    <a
      class={cx('rr-flex rr-items-center rr-gap-3 rr-h-10 rr-px-4', current && 'rr-bg-neutral-background-selected')}
      href={href}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </a>
  );
}
