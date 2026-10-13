/* How the comments show, as reddit.com's: Sort by (a dropdown) and Search
   Comments (the ones loaded) */

import { Icon } from '../../../components/icon';
import { Picker } from '../../../components/picker';
import { COMMENT_SORTS, type CommentSort } from '../types';

interface CommentToolsProps {
  path: string;   // the post's own address
  sort: CommentSort;
  query: string;
  onSearch: (query: string) => void;
}

export function CommentTools({ path, sort, query, onSearch }: CommentToolsProps) {
  const sorted = (name: CommentSort) => `${path}?sort=${name}`;
  return (
    <div class="rr-flex rr-items-center rr-gap-3 rr-px-4 rr-py-2">
      <span class="rr-flex rr-flex-none rr-items-center rr-gap-1">
        <span class="rr-text-xs rr-text-neutral-content-weak">Sort by:</span>
        <Picker
          label="Sort comments"
          chosen={COMMENT_SORTS[sort]}
          value={sorted(sort)}
          options={(Object.keys(COMMENT_SORTS) as CommentSort[]).map((name) => [sorted(name), COMMENT_SORTS[name]])}
        />
      </span>
      <label class="rr-flex rr-flex-1 rr-items-center rr-gap-2 rr-min-w-0 rr-h-10 rr-px-3 rr-rounded-full rr-border rr-border-neutral-border-medium rr-text-neutral-content-weak">
        <Icon name="search" />
        <input
          class="rr-flex-1 rr-min-w-0 rr-text-base rr-text-neutral-content-strong rr-outline-none"
          type="search"
          placeholder="Search Comments"
          aria-label="Search comments"
          value={query}
          onInput={(event) => onSearch(event.currentTarget.value)}
        />
        {query && (
          <button
            type="button"
            class="rr-grid rr-flex-none rr-place-items-center rr-w-6 rr-h-6 rr-rounded-full"
            aria-label="Clear search"
            onClick={() => onSearch('')}
          >
            <Icon name="close" />
          </button>
        )}
      </label>
    </div>
  );
}
