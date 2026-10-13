/* Someone's tabs, as reddit.com's: Overview, Posts, Comments; yours, also
   Saved, Hidden, Upvoted and Downvoted. Each its own address (old reddit's);
   the row swipes sideways when it's wider than the screen. Under them, a tab
   with sorts has them, as a listing's: New, Hot, Top, Controversial, and with
   Top a span. A line under it all. */

import { Picker } from '../../../components/picker';
import { cx } from '../../../components/ui';
import { TIMES, type Time } from '../../listing/types';
import { tabPath } from '../contract';
import { SORTS, TABS, type Sort, type Tab } from '../types';

const SORT_LABELS: Record<Sort, string> = { new: 'New', hot: 'Hot', top: 'Top', controversial: 'Controversial' };
const TIME_LABELS: Record<Time, string> = { hour: 'Now', day: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All time' };

interface TabsProps {
  name: string;
  tab: Tab;
  mine: boolean;  // your own profile: your tabs too
  sort: Sort | null;
  time: Time | null;
}

export function Tabs({ name, tab, mine, sort, time }: TabsProps) {
  return (
    <div class="rr-grid rr-border-b rr-border-neutral-border-weak">
      <nav
        aria-label="Profile"
        class="rr-flex rr-gap-1 rr-px-4 rr-py-2 rr-overflow-x-auto"
      >
        {TABS.filter((each) => mine || !each.mine || each.name === tab).map((each) => (
          <a
            key={each.name}
            class={cx('rr-flex rr-flex-none rr-items-center rr-h-10 rr-px-4 rr-rounded-full rr-font-semibold', each.name === tab && 'rr-bg-neutral-background-selected')}
            href={tabPath(name, each.name)}
            aria-current={each.name === tab ? 'page' : undefined}
          >
            {each.label}
          </a>
        ))}
      </nav>
      {sort && (
        <div class="rr-flex rr-items-center rr-gap-5 rr-h-12 rr-px-4">
          <Picker
            label="Sort"
            chosen={SORT_LABELS[sort]}
            value={tabPath(name, tab, sort)}
            options={SORTS.map((each) => [tabPath(name, tab, each), SORT_LABELS[each]])}
          />
          {time && (
            <Picker
              label="Time"
              chosen={TIME_LABELS[time]}
              value={tabPath(name, tab, sort, time)}
              options={TIMES.map((span) => [tabPath(name, tab, sort, span), TIME_LABELS[span]])}
            />
          )}
        </div>
      )}
    </div>
  );
}
