/* Old reddit's pages, numbered: ‹ Prev, 1 … the page before, this one, the
   page after, Next ›; on the first, the one after that too, so there are
   always three. reddit's listings go a page at a time (after=, before=), so
   those are the pages there are addresses for (the third: once the second's
   been asked for where it ends); each is a page of its own. At the top (in
   the sorts' row, at its right): just the three numbers, the ‹ Prev and
   Next › being the numbers beside this one anyway, and 1 … left to the
   bottom's, so they fit beside the sorts. */

import { pageUrl } from '../core/paging';
import { cx, ui } from './ui';

const NUMBER = 'rr-grid rr-place-items-center rr-min-w-8 rr-h-8 rr-px-2 rr-rounded-full rr-text-xs rr-font-semibold';

interface PagerProps {
  path: string;            // the listing's address
  search: string;
  page: number;            // this one's number
  after: string | null;    // where the next starts; null: this is the last
  before: string | null;   // where the one before ends; null: this is the first
  beyond?: string | null;  // where the one after next starts; null: not known (or none)
  top?: boolean;           // the one at the top: numbers only
}

export function Pager({ path, search, page, after, before, beyond = null, top = false }: PagerProps) {
  const first = pageUrl(path, search, 1);
  const prev = page === 2 ? first : page > 2 && before ? pageUrl(path, search, page - 1, { before }) : null;
  const next = after ? pageUrl(path, search, page + 1, { after }) : null;
  const later = next && beyond ? pageUrl(path, search, page + 2, { after: beyond }) : null;
  if (!prev && !next) return null;
  return (
    <nav
      aria-label={top ? 'Pages, at the top' : 'Pages'}
      class={top ? 'rr-flex rr-flex-none rr-items-center' : 'rr-flex rr-items-center rr-justify-center rr-gap-1 rr-p-4'}
    >
      {prev && !top && (
        <a
          class={ui.plain}
          href={prev}
        >
          ‹ Prev
        </a>
      )}
      {page > 2 && !top && (
        <a
          class={NUMBER}
          href={first}
        >
          1
        </a>
      )}
      {page > 3 && !top && <span class="rr-text-neutral-content-weak">…</span>}
      {prev && (
        <a
          class={NUMBER}
          href={prev}
        >
          {page - 1}
        </a>
      )}
      <span
        class={cx(NUMBER, 'rr-bg-neutral-background-selected')}
        aria-current="page"
      >
        {page}
      </span>
      {next && (
        <a
          class={NUMBER}
          href={next}
        >
          {page + 1}
        </a>
      )}
      {later && (
        <a
          class={NUMBER}
          href={later}
        >
          {page + 2}
        </a>
      )}
      {next && !top && (
        <a
          class={ui.plain}
          href={next}
        >
          Next ›
        </a>
      )}
    </nav>
  );
}
