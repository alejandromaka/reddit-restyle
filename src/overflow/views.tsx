/* A post's or comment's "…", as reddit.com's: the button (on the post or
   comment), and the page's one menu it opens (on a phone a sheet from the
   bottom, wider a dropdown under the "…"): Hide or Unhide (a post), Report,
   Block u/name (or Unblock; not yours), Block site.com (a post linking off
   reddit; or Unblock). Report: the subreddit's rules for it and reddit's, one
   chosen, Report; Block u/name: are you sure? (each a sheet; wider, a dialog
   in the middle). A post you hid, or whose author or site you blocked here,
   in a listing: a line saying so, Undo. */

import { useCallback } from 'preact/hooks';
import { BusyButton, Loader } from '../components/busy';
import { Dropdown } from '../components/dropdown';
import { Icon } from '../components/icon';
import { Sheet } from '../components/sheet';
import { cx, ui } from '../components/ui';
import type { Load } from '../core/store';
import type { ChromeState } from '../nav/chrome';
import type { Rules } from './contract';
import { isBlocked, siteBlock, type OverflowAction, type OverflowState, type Spot, type Thing } from './state';

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

// A post you hid, or whose author or site you blocked (u/name, site.com), where it was in the listing
export function HiddenPost({ blocked, onUndo }: { blocked?: string; onUndo: () => void }) {
  return (
    <div class="rr-flex rr-items-center rr-gap-2 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak">
      <span class="rr-flex-1 rr-min-w-0 rr-truncate rr-text-neutral-content-weak">{blocked ? `${blocked} blocked` : 'Post hidden'}</span>
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
  state: OverflowState & Pick<ChromeState, 'me'>;  // you: no blocking yourself
  dispatch: (action: OverflowAction) => void;
}

// The page's menu, report and block, always there (each slides or fades as it opens and closes)
export function Overflow({ state, dispatch }: OverflowProps) {
  const { menu, report, block } = state;
  const closeMenu = useCallback(() => dispatch({ type: 'menu/closed' }), [dispatch]);
  const closeReport = useCallback(() => dispatch({ type: 'report/closed' }), [dispatch]);
  const closeBlock = useCallback(() => dispatch({ type: 'block/closed' }), [dispatch]);
  // Made for each place they're drawn (the phone's and the wider one)
  const items = () => menu && (
    <MenuItems
      thing={menu.thing}
      hidden={state.hidden[menu.thing.id] ?? menu.thing.hidden}
      blocked={isBlocked(state, menu.thing.author)}
      site={siteBlock(state, menu.thing.domain)?.domain ?? null}
      me={state.me.status === 'loaded' ? state.me.data.name : null}
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
  const sure = () => block && (
    <BlockForm
      name={block.name}
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
        <Sheet
          open={Boolean(block?.open)}
          side="bottom"
          label="Block account"
          onClose={closeBlock}
        >
          {sure()}
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
        <Sheet
          open={Boolean(block?.open)}
          side="center"
          label="Block account"
          onClose={closeBlock}
        >
          {sure()}
        </Sheet>
      </div>
    </>
  );
}

interface MenuItemsProps {
  thing: Thing;
  hidden: boolean;
  blocked: boolean;      // its author
  site: string | null;   // the blocked site its link falls under (itself or a subdomain's)
  me: string | null;     // your name (null: not known yet)
  dispatch: (action: OverflowAction) => void;
}

function MenuItems({ thing, hidden, blocked, site, me, dispatch }: MenuItemsProps) {
  const { author, domain } = thing;
  const blockable = author !== '[deleted]' && author.toLowerCase() !== me?.toLowerCase();
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
      {blockable && (
        // Blocking asks first; unblocking doesn't
        <button
          type="button"
          class={ui.row}
          onClick={() => dispatch(blocked ? { type: 'block/requested', name: author, blocked: false } : { type: 'block/opened', name: author })}
        >
          <Icon name="block" large />
          <span class="rr-truncate">{blocked ? 'Unblock' : 'Block'} u/{author}</span>
        </button>
      )}
      {domain && (
        // A site: this device's, at once
        <button
          type="button"
          class={ui.row}
          onClick={() => dispatch({ type: 'domain/requested', domain: site ?? domain, blocked: !site })}
        >
          <Icon name="block" large />
          <span class="rr-truncate">{site ? `Unblock ${site}` : `Block ${domain}`}</span>
        </button>
      )}
    </>
  );
}

// Blocking someone: are you sure? (taps in it don't close it, as a report's)
function BlockForm({ name, dispatch }: { name: string; dispatch: (action: OverflowAction) => void }) {
  return (
    <div
      class="rr-grid rr-gap-4 rr-px-4"
      onClick={(event) => event.stopPropagation()}
    >
      <h2 class="rr-text-lg rr-font-bold rr-break-words">Block u/{name}?</h2>
      <p class="rr-text-neutral-content-weak">You won’t see their posts, and their comments fold away. They can’t message you or reply to your posts and comments.</p>
      <button
        type="button"
        class="rr-h-10 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground"
        onClick={() => dispatch({ type: 'block/requested', name, blocked: true })}
      >
        Block account
      </button>
      <button
        type="button"
        class="rr-h-10 rr-rounded-full rr-font-semibold rr-bg-secondary-background"
        onClick={() => dispatch({ type: 'block/closed' })}
      >
        Cancel
      </button>
    </div>
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
