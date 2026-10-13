/* A post's or comment's "…" (views.tsx), on every page that has them: one
   menu per page (Hide or Unhide for a post, Report), the posts you hid or
   showed again, and a report on its way: the subreddit's rules to choose
   from (asked for when a report starts), the reason chosen, sent. Each page's
   store carries it (OverflowState) and hands its actions to overflowReducer;
   startOverflow does its network. */

import type { Load, Store } from '../core/store';
import type { Rules } from './contract';

export interface Thing {
  id: string;                    // t3_… or t1_…
  kind: 'post' | 'comment';
  subreddit: string;             // whose rules it's reported by
  hidden: boolean;               // a post: hidden from your listings
}

// A post or a comment, as its menu needs it (a post: hidden as you left it here, else as reddit says)
export const postThing = (post: { id: string; subreddit: string; hidden: boolean }, hidden: Record<string, boolean>): Thing =>
  ({ id: post.id, kind: 'post', subreddit: post.subreddit, hidden: hidden[post.id] ?? post.hidden });
export const commentThing = (id: string, subreddit: string): Thing => ({ id, kind: 'comment', subreddit, hidden: false });

export interface Spot {
  top: number;                   // px from the page's top: under the "…"
  right: number;                 // px from the page's right: its right edge
}

export interface OverflowState {
  menu: { thing: Thing; at: Spot; open: boolean } | null;  // closed: still there while it goes
  hidden: Record<string, boolean>;                          // posts you hid or showed again (else reddit's say)
  report: {
    thing: Thing;
    reason: string | null;       // the one chosen
    status: 'choosing' | 'sending' | 'sent' | 'failed';
    error: string | null;        // why it didn't go
    open: boolean;
  } | null;
  rules: Record<string, Load<Rules>>;  // by subreddit, once asked for
}

export type OverflowAction =
  | { type: 'menu/opened'; thing: Thing; at: Spot }
  | { type: 'menu/closed' }
  | { type: 'hide/requested'; id: string; hidden: boolean }
  | { type: 'hide/failed'; id: string; hidden: boolean }    // back to before
  | { type: 'report/opened'; thing: Thing }
  | { type: 'report/chosen'; reason: string }
  | { type: 'report/requested' }
  | { type: 'report/sent' }
  | { type: 'report/failed'; error: string }
  | { type: 'report/closed' }
  | { type: 'rules/loaded'; subreddit: string; rules: Rules }
  | { type: 'rules/failed'; subreddit: string; error: string };

const TYPES = new Set<string>([
  'menu/opened', 'menu/closed', 'hide/requested', 'hide/failed', 'report/opened', 'report/chosen',
  'report/requested', 'report/sent', 'report/failed', 'report/closed', 'rules/loaded', 'rules/failed',
]);

export const isOverflowAction = (action: { type: string }): action is OverflowAction => TYPES.has(action.type);

export const initialOverflow = (): OverflowState => ({ menu: null, hidden: {}, report: null, rules: {} });

const closed = <T extends { open: boolean } | null>(it: T): T => (it ? { ...it, open: false } : it);

export function overflowReducer<S extends OverflowState>(state: S, action: OverflowAction): S {
  switch (action.type) {
    case 'menu/opened':
      return { ...state, menu: { thing: action.thing, at: action.at, open: true } };
    case 'menu/closed':
      return { ...state, menu: closed(state.menu) };
    case 'hide/requested':
      return { ...state, menu: closed(state.menu), hidden: { ...state.hidden, [action.id]: action.hidden } };
    case 'hide/failed':
      return { ...state, hidden: { ...state.hidden, [action.id]: action.hidden } };
    case 'report/opened': {
      const { subreddit } = action.thing;
      return {
        ...state,
        menu: closed(state.menu),
        report: { thing: action.thing, reason: null, status: 'choosing', error: null, open: true },
        rules: state.rules[subreddit] ? state.rules : { ...state.rules, [subreddit]: { status: 'loading' } },
      };
    }
    case 'report/chosen':
      return state.report && state.report.status !== 'sending' && state.report.status !== 'sent'
        ? { ...state, report: { ...state.report, reason: action.reason, status: 'choosing', error: null } }
        : state;
    case 'report/requested':
      return state.report?.reason && (state.report.status === 'choosing' || state.report.status === 'failed')
        ? { ...state, report: { ...state.report, status: 'sending', error: null } }
        : state;
    case 'report/sent':
      return state.report ? { ...state, report: { ...state.report, status: 'sent' } } : state;
    case 'report/failed':
      return state.report ? { ...state, report: { ...state.report, status: 'failed', error: action.error } } : state;
    case 'report/closed':
      return { ...state, report: closed(state.report) };
    case 'rules/loaded':
      return { ...state, rules: { ...state.rules, [action.subreddit]: { status: 'loaded', data: action.rules } } };
    case 'rules/failed':
      return { ...state, rules: { ...state.rules, [action.subreddit]: { status: 'failed', error: action.error } } };
  }
}

interface OverflowApi {
  hide: (id: string, hidden: boolean) => Promise<void>;
  report: (id: string, reason: string) => Promise<void>;
  rules: (subreddit: string) => Promise<Rules>;
}

// Network → actions: a hide sent (on screen already; refused, back again and
// the console says why), a subreddit's rules when a report starts, the report
export function startOverflow<S extends OverflowState, A extends { type: string }>(store: Store<S, A | OverflowAction>, api: OverflowApi) {
  const dispatch = (action: OverflowAction) => store.dispatch(action);
  store.subscribe((state, previous, action) => {
    if (!isOverflowAction(action)) return;
    if (action.type === 'hide/requested') {
      api.hide(action.id, action.hidden).catch((error: unknown) => {
        console.error(error);
        dispatch({ type: 'hide/failed', id: action.id, hidden: !action.hidden });
      });
    }
    if (action.type === 'report/opened' && !previous.rules[action.thing.subreddit]) {
      const { subreddit } = action.thing;
      api.rules(subreddit).then(
        (rules) => dispatch({ type: 'rules/loaded', subreddit, rules }),
        (error) => dispatch({ type: 'rules/failed', subreddit, error: String(error) }),
      );
    }
    if (action.type === 'report/requested' && state.report?.status === 'sending' && state.report.reason && previous.report?.status !== 'sending') {
      api.report(state.report.thing.id, state.report.reason).then(
        () => dispatch({ type: 'report/sent' }),
        (error) => dispatch({ type: 'report/failed', error: String(error) }),
      );
    }
  });
}
