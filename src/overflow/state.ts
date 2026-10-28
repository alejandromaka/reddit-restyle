/* A post's or comment's "…" (views.tsx), on every page that has them: one
   menu per page (Hide or Unhide for a post, Report, Block its author, Block
   the site it links to), the posts you hid or showed again, a report on its
   way: the subreddit's rules to choose from (asked for when a report
   starts), the reason chosen, sent; the people you blocked or unblocked (a
   block asked first), and the sites (this device's, core/domains.ts). Each page's
   store carries it (OverflowState) and hands its actions to overflowReducer;
   startOverflow does its network. */

import { domainOf } from '../core/domains';
import type { Load, Store } from '../core/store';
import type { Rules } from './contract';

export interface Thing {
  id: string;                    // t3_… or t1_…
  kind: 'post' | 'comment';
  subreddit: string;             // whose rules it's reported by
  author: string;                // who'd be blocked ('[deleted]': no one)
  domain: string | null;         // a post linking off reddit: the site
  hidden: boolean;               // a post: hidden from your listings
}

// A post's site: where its link goes (none: on reddit)
export const siteOf = (post: { domain: string; link: string | null }) => (post.link ? domainOf(post.domain) : null);

// A post or a comment, as its menu needs it (a post: hidden as you left it here, else as reddit says)
export const postThing = (post: { id: string; subreddit: string; author: string; domain: string; link: string | null; hidden: boolean }, hidden: Record<string, boolean>): Thing =>
  ({ id: post.id, kind: 'post', subreddit: post.subreddit, author: post.author, domain: siteOf(post), hidden: hidden[post.id] ?? post.hidden });
export const commentThing = (id: string, subreddit: string, author: string): Thing => ({ id, kind: 'comment', subreddit, author, domain: null, hidden: false });

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
  blocked: Record<string, boolean>;    // people you blocked or unblocked here, by name in lower case (else reddit's say)
  block: { name: string; open: boolean } | null;  // blocking someone: are you sure?
  domains: Record<string, boolean>;    // sites you blocked here (true; a post from one: a line, Undo; else left out)
  savedDomains: string[];              // the ones this device blocks, as last read
}

// Whether you blocked them: as you left it here, else as reddit says (said)
export const isBlocked = (state: Pick<OverflowState, 'blocked'>, name: string, said = false) => state.blocked[name.toLowerCase()] ?? said;

const under = (domain: string, blocked: string) => domain === blocked || domain.endsWith(`.${blocked}`);

// The blocked site a post's (null: none) falls under, itself or a subdomain:
// blocked here (here: a line, Undo), or before (left out); null: not blocked
export function siteBlock(state: Pick<OverflowState, 'domains' | 'savedDomains'>, domain: string | null) {
  const blocked = domain && state.savedDomains.find((each) => under(domain, each));
  return blocked ? { domain: blocked, here: Boolean(state.domains[blocked]) } : null;
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
  | { type: 'rules/failed'; subreddit: string; error: string }
  | { type: 'block/opened'; name: string }                   // are you sure?
  | { type: 'block/closed' }
  | { type: 'block/requested'; name: string; blocked: boolean }  // blocked, or unblocked
  | { type: 'block/failed'; name: string; blocked: boolean }     // back to before
  | { type: 'domain/requested'; domain: string; blocked: boolean }  // a site blocked, or unblocked (saved, then read again)
  | { type: 'domains/loaded'; domains: string[] };                  // this device's

const TYPES = new Set<string>([
  'menu/opened', 'menu/closed', 'hide/requested', 'hide/failed', 'report/opened', 'report/chosen',
  'report/requested', 'report/sent', 'report/failed', 'report/closed', 'rules/loaded', 'rules/failed',
  'block/opened', 'block/closed', 'block/requested', 'block/failed', 'domain/requested', 'domains/loaded',
]);

export const isOverflowAction = (action: { type: string }): action is OverflowAction => TYPES.has(action.type);

export const initialOverflow = (): OverflowState => ({ menu: null, hidden: {}, report: null, rules: {}, blocked: {}, block: null, domains: {}, savedDomains: [] });

// As a page is kept when you leave it (core/place.ts): no menu, report or block open
export const settledOverflow = <S extends OverflowState>(state: S): S => ({ ...state, menu: null, report: null, block: null });

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
    case 'block/opened':
      return { ...state, menu: closed(state.menu), block: { name: action.name, open: true } };
    case 'block/closed':
      return { ...state, block: closed(state.block) };
    case 'block/requested':
      return { ...state, block: closed(state.block), blocked: { ...state.blocked, [action.name.toLowerCase()]: action.blocked } };
    case 'block/failed':
      return { ...state, blocked: { ...state.blocked, [action.name.toLowerCase()]: action.blocked } };
    case 'domain/requested':
      return { ...state, menu: closed(state.menu), domains: { ...state.domains, [domainOf(action.domain)]: action.blocked } };
    case 'domains/loaded':
      return { ...state, savedDomains: action.domains };
  }
}

interface OverflowApi {
  hide: (id: string, hidden: boolean) => Promise<void>;
  report: (id: string, reason: string) => Promise<void>;
  rules: (subreddit: string) => Promise<Rules>;
  block: (name: string, blocked: boolean) => Promise<void>;
  sites: {                                 // this device's blocked sites (core/domains.ts)
    read: () => string[];
    block: (domain: string, blocked: boolean) => void;
    follow: (listener: (domains: string[]) => void) => void;
  };
}

// Network → actions: a hide or a block sent (on screen already; refused, back
// again and the console says why), a subreddit's rules when a report starts,
// the report. And this device's blocked sites: read now, again whenever they
// change (here, or in your account menu); a site blocked here, saved
export function startOverflow<S extends OverflowState, A extends { type: string }>(store: Store<S, A | OverflowAction>, api: OverflowApi) {
  const dispatch = (action: OverflowAction) => store.dispatch(action);
  dispatch({ type: 'domains/loaded', domains: api.sites.read() });
  api.sites.follow((domains) => dispatch({ type: 'domains/loaded', domains }));
  store.subscribe((state, previous, action) => {
    if (!isOverflowAction(action)) return;
    if (action.type === 'domain/requested') api.sites.block(action.domain, action.blocked);
    if (action.type === 'hide/requested') {
      api.hide(action.id, action.hidden).catch((error: unknown) => {
        console.error(error);
        dispatch({ type: 'hide/failed', id: action.id, hidden: !action.hidden });
      });
    }
    if (action.type === 'block/requested') {
      api.block(action.name, action.blocked).catch((error: unknown) => {
        console.error(error);
        dispatch({ type: 'block/failed', name: action.name, blocked: !action.blocked });
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
