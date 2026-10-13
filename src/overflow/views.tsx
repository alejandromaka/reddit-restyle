/* A post's or comment's "…", as reddit.com's: the button (on the post or
   comment), and the page's one menu it opens (on a phone a sheet from the
   bottom, wider a dropdown under the "…"): Hide or Unhide (a post), Report.
   Report: the subreddit's rules for it and reddit's, one chosen, Report (a
   sheet; wider, a dialog in the middle). A post you hid, in a listing: Post
   hidden, Undo. */

import { useCallback } from 'preact/hooks';
import { BusyButton, Loader } from '../components/busy';
import { Dropdown } from '../components/dropdown';
import { Icon } from '../components/icon';
import { Sheet } from '../components/sheet';
import { cx, ui } from '../components/ui';
import type { Load } from '../core/store';
import type { Rules } from './contract';
import type { OverflowAction, OverflowState, Spot, Thing } from './state';

// "…": the page's menu for it, under it
export function MoreButton({ onOpen }: { onOpen: (at: Spot) => void }) {
  return (
    <button
      type="button"
      class={ui.icon}
      aria-label="More options"
      aria-haspopup="dialog"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        onOpen({ top: box.bottom + scrollY, right: document.documentElement.clientWidth - box.right });
      }}
    >
      <Icon name="more" />
    </button>
  );
}

// A post you hid, where it was in the listing
export function HiddenPost({ onUndo }: { onUndo: () => void }) {
  return (
    <div class="rr-flex rr-items-center rr-gap-2 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak">
      <span class="rr-flex-1 rr-text-neutral-content-weak">Post hidden</span>
      <button
        type="button"
        class={ui.action}
        onClick={onUndo}
      >
        Undo
      </button>
    </div>
  );
}

interface OverflowProps {
  state: OverflowState;
  dispatch: (action: OverflowAction) => void;
}

// The page's menu and report, always there (each slides or fades as it opens and closes)
export function Overflow({ state, dispatch }: OverflowProps) {
  const { menu, report } = state;
  const closeMenu = useCallback(() => dispatch({ type: 'menu/closed' }), [dispatch]);
  const closeReport = useCallback(() => dispatch({ type: 'report/closed' }), [dispatch]);
  // Made for each place they're drawn (the phone's and the wider one)
  const items = () => menu && (
    <MenuItems
      thing={menu.thing}
      hidden={state.hidden[menu.thing.id] ?? menu.thing.hidden}
      dispatch={dispatch}
    />
  );
  const form = () => report && (
    <ReportForm
      report={report}
      rules={state.rules[report.thing.subreddit] ?? { status: 'loading' }}
      dispatch={dispatch}
    />
  );
  return (
    <>
      <div class="lg:rr-hidden">
        <Sheet
          open={Boolean(menu?.open)}
          side="bottom"
          label="More options"
          onClose={closeMenu}
        >
          {items()}
        </Sheet>
        <Sheet
          open={Boolean(report?.open)}
          side="bottom"
          label="Report"
          onClose={closeReport}
        >
          {form()}
        </Sheet>
      </div>
      <div class="rr-hidden lg:rr-block">
        <Dropdown
          open={Boolean(menu?.open)}
          label="More options"
          at={menu?.at}
          onClose={closeMenu}
        >
          {items()}
        </Dropdown>
        <Sheet
          open={Boolean(report?.open)}
          side="center"
          label="Report"
          onClose={closeReport}
        >
          {form()}
        </Sheet>
      </div>
    </>
  );
}

interface MenuItemsProps {
  thing: Thing;
  hidden: boolean;
  dispatch: (action: OverflowAction) => void;
}

function MenuItems({ thing, hidden, dispatch }: MenuItemsProps) {
  return (
    <>
      {thing.kind === 'post' && (
        <button
          type="button"
          class={ui.row}
          onClick={() => dispatch({ type: 'hide/requested', id: thing.id, hidden: !hidden })}
        >
          <Icon name={hidden ? 'show' : 'hide'} large />
          {hidden ? 'Unhide' : 'Hide'}
        </button>
      )}
      <button
        type="button"
        class={ui.row}
        onClick={() => dispatch({ type: 'report/opened', thing })}
      >
        <Icon name="flag" large />
        Report
      </button>
    </>
  );
}

interface ReportFormProps {
  report: NonNullable<OverflowState['report']>;
  rules: Load<Rules>;
  dispatch: (action: OverflowAction) => void;
}

// Taps in it choose, they don't close it (the sheet closes on a tap in it)
function ReportForm({ report, rules, dispatch }: ReportFormProps) {
  const { thing, reason, status, error } = report;
  if (status === 'sent') {
    return (
      <div
        class="rr-grid rr-gap-4 rr-px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 class="rr-text-lg rr-font-bold">Thanks for your report</h2>
        <p class="rr-text-neutral-content-weak">r/{thing.subreddit}’s moderators will look at it.</p>
        <button
          type="button"
          class="rr-h-10 rr-rounded-full rr-font-semibold rr-bg-secondary-background"
          onClick={() => dispatch({ type: 'report/closed' })}
        >
          Done
        </button>
      </div>
    );
  }
  return (
    <div
      class="rr-grid rr-gap-4 rr-px-4"
      onClick={(event) => event.stopPropagation()}
    >
      <h2 class="rr-text-lg rr-font-bold">Report this {thing.kind}</h2>
      {rules.status === 'loading' && <Loader />}
      {rules.status === 'failed' && <p class="rr-text-xs rr-text-danger-content">{rules.error}</p>}
      {rules.status === 'loaded' && (
        <>
          <Reasons
            title={`r/${thing.subreddit} rules`}
            reasons={rules.data.subreddit.filter(({ on }) => on === 'all' || on === thing.kind).map((rule) => [rule.reason, rule.label] as const)}
            chosen={reason}
            dispatch={dispatch}
          />
          <Reasons
            title="Reddit rules"
            reasons={rules.data.reddit.map((rule) => [rule, rule] as const)}
            chosen={reason}
            dispatch={dispatch}
          />
        </>
      )}
      {error && <p class="rr-text-xs rr-text-danger-content">{error}</p>}
      <BusyButton
        busy={status === 'sending'}
        disabled={!reason}
        class="rr-h-10 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground disabled:rr-bg-button-primary-background-disabled disabled:rr-text-button-primary-text-disabled"
        onClick={() => dispatch({ type: 'report/requested' })}
      >
        Report
      </BusyButton>
    </div>
  );
}

interface ReasonsProps {
  title: string;
  reasons: (readonly [string, string])[];  // each: what the report says, its name
  chosen: string | null;
  dispatch: (action: OverflowAction) => void;
}

// A list of reasons as reddit.com's: pills, the chosen one filled
function Reasons({ title, reasons, chosen, dispatch }: ReasonsProps) {
  if (!reasons.length) return null;
  return (
    <section class="rr-grid rr-gap-2">
      <h3 class="rr-text-xs rr-font-semibold rr-text-neutral-content-weak">{title}</h3>
      <div class="rr-flex rr-flex-wrap rr-gap-2">
        {reasons.map(([reason, name]) => (
          <button
            key={reason}
            type="button"
            class={cx(ui.plain, reason === chosen ? 'rr-bg-primary-background rr-text-primary-onBackground' : 'rr-bg-secondary-background')}
            aria-pressed={reason === chosen}
            onClick={() => dispatch({ type: 'report/chosen', reason })}
          >
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}
