/* Every page's frame: the strip and the bar on top, the page in a column
   centered in the window, as reddit.com's (a feed: 732px with its padding; a
   post: 732px of post, its padding around it), and on a wide screen the
   sidebar at its left (it doesn't push the column over) */

import type { ComponentChildren } from 'preact';
import { cx } from '../components/ui';
import { Bar } from './bar';
import type { ChromeAction, ChromeState } from './chrome';
import { Sidebar } from './menu';

interface FrameProps {
  current: string | null;  // the subreddit on screen; null: home
  chrome: ChromeState;
  dispatch: (action: ChromeAction) => void;
  post?: boolean;  // a post's page: its column wider by its padding
  children: ComponentChildren;
}

export function Frame({ current, chrome, dispatch, post = false, children }: FrameProps) {
  return (
    <>
      <Bar
        current={current}
        communities={chrome.communities}
        me={chrome.me}
        onLogOut={() => dispatch({ type: 'logout/requested' })}
      />
      <div class="rr-relative">
        <Sidebar
          current={current}
          communities={chrome.communities}
        />
        <main class={cx('rr-w-full rr-min-w-0 rr-mx-auto rr-pb-8', post ? 'rr-max-w-[764px]' : 'rr-max-w-[732px]')}>{children}</main>
      </div>
    </>
  );
}
