/* Every page's frame: the strip and the bar on top, the page in a column
   centered in the window, as reddit.com's (a feed: 732px with its padding; a
   post: 732px of post, its padding around it), and on a wide screen the
   sidebar at its left: over the column's margin from 1280px, and between
   (an iPad mini across: 1024 to 1133px) the column centered in what's left. The column is
   positioned: a page can put a bar beside it (r/all's filters). Nothing in
   it ever scrolls the page sideways: what's too wide is cut at the window
   (clip, not hidden: the sidebar and bars still stick). */

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
      <div class="rr-relative rr-overflow-x-clip lg:rr-pl-[272px] xl:rr-pl-0">
        <Sidebar
          current={current}
          communities={chrome.communities}
        />
        <main class={cx('rr-relative rr-w-full rr-min-w-0 rr-mx-auto rr-pb-8', post ? 'rr-max-w-[764px]' : 'rr-max-w-[732px]')}>{children}</main>
      </div>
    </>
  );
}
