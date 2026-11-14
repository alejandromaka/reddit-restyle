/* A post's or comment's "…", as reddit.com's: the button (on the post or
   comment), and the page's one menu it opens (on a phone a sheet from the
   bottom, wider a dropdown under the "…"): Hide or Unhide (a post), Report,
   Block u/name (or Unblock; not yours), Block site.com (a post linking off
   reddit; or Unblock), Filter r/name from r/all (on r/all, its filters in). Report: reddit.com's steps (its rules or reddit's
   reasons, and their questions), Submit report, thanks (block them there too); Block u/name: are you sure? (each a sheet; wider, a dialog
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
import { complaintUrl, reportFlow, stepsAt, type ReportReason, type Rules, type Step } from './contract';
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
  onFilter?: (subreddit: string) => void;  // r/all, its filters in: a post's subreddit kept out of it
}

// The page's menu, report and block, always there (each slides or fades as it opens and closes)
export function Overflow({ state, dispatch, onFilter }: OverflowProps) {
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
      onFilter={onFilter && ((subreddit) => {
        dispatch({ type: 'menu/closed' });
        onFilter(subreddit);
      })}
    />
  );
  const form = () => report && (
    <ReportForm
      report={report}
      rules={state.rules[report.thing.subreddit] ?? { status: 'loading' }}
      blockable={canBlock(report.thing.author, state.me.status === 'loaded' ? state.me.data.name : null)}
      blocked={isBlocked(state, report.thing.author)}
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
  onFilter?: (subreddit: string) => void;  // r/all's: kept out of it (its posts leave the page)
}

// Whether you can block someone: not you, not a deleted account
const canBlock = (author: string, me: string | null) => author !== '[deleted]' && author.toLowerCase() !== me?.toLowerCase();

function MenuItems({ thing, hidden, blocked, site, me, dispatch, onFilter }: MenuItemsProps) {
  const { author, domain } = thing;
  const blockable = canBlock(author, me);
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
      {onFilter && thing.kind === 'post' && (
        <button
          type="button"
          class={ui.row}
          onClick={() => onFilter(thing.subreddit)}
        >
          <Icon name="filter" large />
          <span class="rr-truncate">Filter r/{thing.subreddit} from r/all</span>
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
  blockable: boolean;    // its author: not you, not deleted
  blocked: boolean;
  dispatch: (action: OverflowAction) => void;
}

// A report, as reddit.com's: "Submit a report", what's happening (a reason,
// Next for its questions, Back), Submit report; thanks, and blocking its
// author there. Taps in it choose, they don't close it (the sheet closes on a tap in it)
function ReportForm({ report, rules, blockable, blocked, dispatch }: ReportFormProps) {
  const { thing, trail, choice, notes, reviewing, status, error } = report;
  const stop = (event: Event) => event.stopPropagation();
  if (status === 'sent') {
    return (
      <div
        class="rr-grid rr-gap-4 rr-px-4"
        onClick={stop}
      >
        <h2 class="rr-text-lg rr-font-bold">Thanks for your report</h2>
        <p
          class="rr-flex rr-items-center rr-gap-2 rr-font-semibold rr-text-tags-moderator-content"
          role="status"
        >
          <Icon name="check" />
          reddit accepted the report
        </p>
        <p class="rr-text-xs rr-text-neutral-content-weak">It answered your report with no errors. Thanks for looking out for yourself and your fellow redditors.</p>
        {blockable && (
          <button
            type="button"
            class="rr-flex rr-items-center rr-gap-3 rr-w-full rr-py-2 rr-text-left"
            aria-pressed={blocked}
            onClick={() => dispatch({ type: 'block/requested', name: thing.author, blocked: !blocked })}
          >
            <Icon name="block" large />
            <span class="rr-grid rr-flex-1 rr-min-w-0">
              <span class="rr-font-semibold rr-break-words">{blocked ? 'Blocked' : 'Block'} u/{thing.author}</span>
              <span class="rr-text-xs rr-text-neutral-content-weak">You won’t see their posts or comments.{blocked && ' Tap to unblock.'}</span>
            </span>
          </button>
        )}
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
  if (rules.status !== 'loaded') {
    return (
      <div
        class="rr-grid rr-gap-4 rr-px-4"
        onClick={stop}
      >
        <h2 class="rr-text-lg rr-font-bold">Submit a report</h2>
        {rules.status === 'loading' ? <Loader /> : <p class="rr-text-xs rr-text-danger-content">{rules.error}</p>}
      </div>
    );
  }
  const { steps, choices } = stepsAt(reportFlow(rules.data, thing), trail);
  const asking = steps.at(-1);  // the step whose question this is (none: the first)
  const chosen = choice === null ? null : choices[choice] ?? null;
  const reason: ReportReason | null = chosen?.reason
    ? chosen.reason.kind === 'rule'
      ? { kind: 'rule', text: chosen.reason.text }
      : { kind: 'site', text: chosen.reason.text, notes: notes.trim(), usernames: chosen.reason.usernames && thing.author !== '[deleted]' ? thing.author : null }
    : null;
  const primary = 'rr-h-10 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground disabled:rr-bg-button-primary-background-disabled disabled:rr-text-button-primary-text-disabled';
  const back = (
    <button
      type="button"
      class={ui.icon}
      aria-label="Back"
      onClick={() => dispatch({ type: 'report/back' })}
    >
      <Icon name="back" large />
    </button>
  );

  // The second step, as reddit.com's: what you're reporting and why, a note where reddit asks, Submit report
  if (reviewing && chosen && reason) {
    const sending = status === 'sending';
    return (
      <div
        class="rr-grid rr-gap-4 rr-px-4"
        onClick={stop}
      >
        <div class="rr-flex rr-items-center rr-gap-2">
          {back}
          <h2 class="rr-flex-1 rr-min-w-0 rr-text-lg rr-font-bold">Submit a report</h2>
        </div>
        <div class="rr-grid rr-gap-1">
          <span class="rr-text-xs rr-font-semibold rr-text-neutral-content-weak">Reporting this {thing.kind}{thing.author !== '[deleted]' && ` by u/${thing.author}`} for</span>
          <span class="rr-font-semibold rr-break-words">{[...steps, chosen].map((step) => step.label).join(' › ')}</span>
          {chosen.about && <span class="rr-text-xs rr-text-neutral-content-weak rr-break-words">{chosen.about}</span>}
          {reason.kind === 'site' && reason.usernames && <span class="rr-text-xs rr-text-neutral-content-weak">About u/{reason.usernames}</span>}
        </div>
        {chosen.notes && (
          <label class="rr-grid rr-gap-2">
            <span class="rr-text-xs rr-font-semibold rr-text-neutral-content-weak">{chosen.notes.title}</span>
            <textarea
              class="rr-block rr-w-full rr-min-h-24 rr-p-2 rr-text-base rr-rounded-media rr-border rr-border-neutral-border-medium rr-outline-none"
              maxLength={chosen.notes.limit}
              value={notes}
              disabled={sending}
              onInput={(event) => dispatch({ type: 'report/noted', notes: event.currentTarget.value })}
            />
          </label>
        )}
        {sending && <p class="rr-text-xs rr-text-neutral-content-weak" role="status">Sending to reddit…</p>}
        {error && (
          <p
            class="rr-text-xs rr-text-danger-content"
            role="alert"
          >
            reddit didn’t accept the report: {error.replace(/^Error: /, '')}
          </p>
        )}
        <BusyButton
          busy={sending}
          class={primary}
          onClick={() => dispatch({ type: 'report/requested', reason })}
        >
          {error ? 'Try again' : 'Submit report'}
        </BusyButton>
      </div>
    );
  }

  // The first step (what's happening), and its questions: a choice, then Next
  return (
    <div
      class="rr-grid rr-gap-4 rr-px-4"
      onClick={stop}
    >
      {asking ? (
        <div class="rr-flex rr-items-center rr-gap-2">
          {back}
          <h2 class="rr-flex-1 rr-min-w-0 rr-text-lg rr-font-bold">{asking.question}</h2>
        </div>
      ) : (
        <>
          <h2 class="rr-text-lg rr-font-bold">Submit a report</h2>
          <p class="rr-text-neutral-content-weak">Thanks for looking out for yourself and your fellow redditors by reporting things that break the rules. Let us know what’s happening, and we’ll look into it.</p>
        </>
      )}
      {asking
        ? <Choices choices={choices} chosen={choice} dispatch={dispatch} />
        : <Pills choices={choices} chosen={choice} dispatch={dispatch} />}
      {chosen?.complaint && chosen.complaint.prompt && <p class="rr-text-neutral-content-weak">{chosen.complaint.prompt}</p>}
      {chosen?.complaint ? (
        // Not a report: reddit.com's form for it, in a new tab
        <a
          class="rr-grid rr-place-items-center rr-h-10 rr-rounded-full rr-font-semibold rr-bg-primary-background rr-text-primary-onBackground"
          href={complaintUrl(chosen.complaint.url, thing.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {chosen.complaint.button}
        </a>
      ) : (
        <button
          type="button"
          class={primary}
          disabled={!chosen || (!chosen.next.length && !reason)}
          onClick={() => dispatch({ type: chosen?.next.length ? 'report/next' : 'report/review' })}
        >
          Next
        </button>
      )}
    </div>
  );
}

interface ChoicesProps {
  choices: Step[];
  chosen: number | null;
  dispatch: (action: OverflowAction) => void;
}

// The first step's choices, as reddit.com's: pills, the chosen one filled
function Pills({ choices, chosen, dispatch }: ChoicesProps) {
  return (
    <div class="rr-flex rr-flex-wrap rr-gap-2">
      {choices.map((choice, at) => (
        <button
          key={choice.label}
          type="button"
          class={cx(ui.plain, at === chosen ? 'rr-bg-primary-background rr-text-primary-onBackground' : 'rr-bg-secondary-background')}
          aria-pressed={at === chosen}
          onClick={() => dispatch({ type: 'report/chosen', choice: at })}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

// A question's choices: a list, one picked (a rule: what it means, under it)
function Choices({ choices, chosen, dispatch }: ChoicesProps) {
  return (
    <div class="rr-grid">
      {choices.map((choice, at) => (
        <button
          key={choice.label}
          type="button"
          class="rr-flex rr-items-start rr-gap-3 rr-w-full rr-py-3 rr-text-left rr-border-b rr-border-neutral-border-weak"
          aria-pressed={at === chosen}
          onClick={() => dispatch({ type: 'report/chosen', choice: at })}
        >
          <span class={cx('rr-flex-none rr-w-5 rr-h-5 rr-rounded-full rr-border rr-border-neutral-border-medium', at === chosen && 'rr-bg-primary-background')} />
          <span class="rr-grid rr-gap-1 rr-flex-1 rr-min-w-0">
            <span class="rr-font-semibold rr-break-words">{choice.label}</span>
            {at === chosen && choice.about && <span class="rr-text-xs rr-text-neutral-content-weak rr-break-words">{choice.about}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
