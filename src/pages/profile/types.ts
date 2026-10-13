import type { Vote } from '../../account/contract';
import type { Load } from '../../core/store';
import type { ChromeAction, ChromeState } from '../../nav/chrome';
import type { Time } from '../listing/types';
import type { Item, Items, User } from './contract';

// Someone's tabs, as reddit.com's (old reddit's paths: submitted is Posts); the last four: yours only
export const TABS = [
  { name: 'overview', label: 'Overview', mine: false },
  { name: 'submitted', label: 'Posts', mine: false },
  { name: 'comments', label: 'Comments', mine: false },
  { name: 'saved', label: 'Saved', mine: true },
  { name: 'hidden', label: 'Hidden', mine: true },
  { name: 'upvoted', label: 'Upvoted', mine: true },
  { name: 'downvoted', label: 'Downvoted', mine: true },
] as const;
export type Tab = (typeof TABS)[number]['name'];

export const SORTED: readonly Tab[] = ['overview', 'submitted', 'comments'];  // the tabs with sorts (?sort=)
export const SORTS = ['new', 'hot', 'top', 'controversial'] as const;       // newest first unless the address says
export type Sort = (typeof SORTS)[number];

export interface ProfileState extends ChromeState {
  name: string;               // whose
  tab: Tab;
  sort: Sort | null;          // null: a tab without sorts
  time: Time | null;          // top's (and controversial's) span: all unless the address says; null: a sort without one
  path: string;               // its address (its pages' links)
  search: string;
  page: number;               // which page, from 1
  items: Item[];
  after: string | null;       // the next page's start; null: the last page
  before: string | null;      // the page before's end; null: the first
  status: 'loading' | 'failed' | 'idle';
  error: string | null;       // why the page didn't come
  user: Load<User>;
}

export type ProfileAction =
  | { type: 'page/loaded'; items: Items }
  | { type: 'page/failed'; error: string }
  | { type: 'user/loaded'; user: User }
  | { type: 'user/failed'; error: string }
  | { type: 'vote/requested'; id: string; vote: Vote }
  | { type: 'vote/failed'; id: string; vote: Vote }     // back to the vote before
  | ChromeAction;
