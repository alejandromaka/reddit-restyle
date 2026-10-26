/* What every page has on top: the strip (Home, Popular, All, your
   communities), then the bar that stays as you scroll, as reddit.com's: the
   menu (it opens under the bar, which stays; ☰ again closes it), reddit's
   wordmark (home), and you: your account (in the bar, so on a wide screen its
   dropdown sits under your avatar) */

import { useCallback, useRef, useState } from 'preact/hooks';
import type { Me } from '../account/contract';
import { Avatar } from '../components/avatar';
import { Icon } from '../components/icon';
import { Wordmark } from '../components/logo';
import { ui } from '../components/ui';
import type { Load } from '../core/store';
import { Account } from './account';
import type { Community } from './contract';
import { Menu } from './menu';
import { Strip } from './strip';

interface BarProps {
  current: string | null;            // the subreddit on screen; null: home
  communities: Load<Community[]>;
  me: Load<Me>;
  onLogOut: () => void;
}

export function Bar({ current, communities, me, onLogOut }: BarProps) {
  const [open, setOpen] = useState<'menu' | 'account' | null>(null);
  const [barEnd, setBarEnd] = useState(0);
  const bar = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(null), []);
  const toggleMenu = () => {
    setBarEnd(bar.current?.getBoundingClientRect().bottom ?? 0);  // lower while the strip still shows
    setOpen(open === 'menu' ? null : 'menu');
  };
  return (
    <>
      <Strip
        current={current}
        communities={communities}
      />
      <header
        ref={bar}
        class="rr-sticky rr-top-0 rr-z-bar rr-flex rr-items-center rr-h-14 rr-px-4 rr-bg-neutral-background rr-border-b rr-border-neutral-border-weak"
      >
        <button
          type="button"
          class={`${ui.icon} rr-mr-2 lg:rr-hidden`}
          aria-label="Menu"
          aria-expanded={open === 'menu'}
          onClick={toggleMenu}
        >
          <Icon name="menu" large />
        </button>
        <a
          href="/"
          aria-label="Reddit home"
        >
          <Wordmark />
        </a>
        {me.status === 'loaded' && (
          <button
            type="button"
            class="rr-ml-auto rr-flex-none rr-rounded-full"
            aria-label="Account"
            aria-expanded={open === 'account'}
            onClick={() => setOpen('account')}
          >
            <Avatar
              name={me.data.name}
              icon={me.data.icon}
              size="md"
            />
          </button>
        )}
        {me.status === 'loaded' && (
          <Account
            open={open === 'account'}
            me={me.data}
            onLogOut={onLogOut}
            onClose={close}
          />
        )}
      </header>
      <Menu
        open={open === 'menu'}
        current={current}
        communities={communities}
        top={barEnd}
        onClose={close}
      />
    </>
  );
}
