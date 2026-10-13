/* r/all's filter, as old reddit's sidebar has it: a field to add a
   subreddit you keep out of r/all, and the ones you do, each with × (let it
   back in). Wide enough (1400px: room beside the feed), a bar at the feed's
   right, as old reddit's and reddit.com's right rail, its list folded (Show
   17) as old reddit's; narrower, Filters (N) in the sorts' row opens it as a
   sheet from the bottom, its list open. */

import { useCallback, useState } from 'preact/hooks';
import { Loader } from '../../../components/busy';
import { Icon } from '../../../components/icon';
import { Sheet } from '../../../components/sheet';
import { cx, ui } from '../../../components/ui';
import type { Load } from '../../../core/store';

interface FiltersProps {
  filters: Load<string[]>;
  error: string | null;  // why a change didn't go
  onFilter: (subreddit: string, filtered: boolean) => void;
}

// The bar: beside the feed (its column is positioned), staying in view as the feed scrolls
export function FiltersRail({ filters, error, onFilter }: FiltersProps) {
  return (
    <aside class="rr-hidden min-[1400px]:rr-block rr-absolute rr-inset-y-0 rr-left-full rr-ml-4 rr-w-[316px]">
      <div class="rr-sticky rr-top-14 rr-pt-4">
        <div class="rr-rounded-media rr-bg-neutral-background-weak">
          <FilterList
            filters={filters}
            error={error}
            folded
            onFilter={onFilter}
          />
        </div>
      </div>
    </aside>
  );
}

// Narrower: the button, and its sheet
export function FiltersButton({ filters, error, onFilter }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <span class="rr-ml-auto min-[1400px]:rr-hidden">
      <button
        type="button"
        class={cx(ui.plain, 'rr-text-neutral-content-weak')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Filters{filters.status === 'loaded' && ` (${filters.data.length})`}
      </button>
      <Sheet
        open={open}
        side="bottom"
        label="Filtered from r/all"
        onClose={close}
      >
        {/* Taps in it add and remove, they don't close it (the sheet closes on a tap in it) */}
        <div onClick={(event) => event.stopPropagation()}>
          <FilterList
            filters={filters}
            error={error}
            onFilter={onFilter}
          />
        </div>
      </Sheet>
    </span>
  );
}

function FilterList({ filters, error, folded = false, onFilter }: FiltersProps & { folded?: boolean }) {
  const [open, setOpen] = useState(!folded);
  const count = filters.status === 'loaded' ? filters.data.length : 0;
  return (
    <section class="rr-grid rr-gap-3 rr-p-4">
      <h2 class="rr-font-semibold">Filtered from r/all</h2>
      <p class="rr-text-xs rr-text-neutral-content-weak">Posts from these communities don’t show up in r/all.</p>
      <form
        class="rr-flex rr-items-center rr-gap-2 rr-h-10 rr-px-3 rr-rounded-full rr-border rr-border-neutral-border-medium rr-bg-neutral-background"
        onSubmit={(event) => {
          event.preventDefault();
          const field = event.currentTarget.elements.namedItem('subreddit') as HTMLInputElement;
          const name = field.value.trim().replace(/^\/?r\//i, '');  // r/name or name
          if (!name) return;
          onFilter(name, true);
          field.value = '';
        }}
      >
        <input
          name="subreddit"
          class="rr-flex-1 rr-min-w-0 rr-text-base rr-outline-none"
          placeholder="Filter a subreddit"
          aria-label="Subreddit to filter"
          autocapitalize="off"
          autocomplete="off"
          spellcheck={false}
          enterKeyHint="done"
        />
        <button
          type="submit"
          class="rr-grid rr-flex-none rr-place-items-center rr-w-6 rr-h-6 rr-rounded-full"
          aria-label="Filter it"
        >
          <Icon name="plus" />
        </button>
      </form>
      {error && <p class="rr-text-xs rr-text-danger-content">{error}</p>}
      {filters.status === 'loading' && <Loader />}
      {filters.status === 'failed' && <p class="rr-text-xs rr-text-danger-content">{filters.error}</p>}
      {filters.status === 'loaded' && filters.data.length === 0 && <p class="rr-text-xs rr-text-neutral-content-weak">None yet</p>}
      {folded && count > 0 && (
        <button
          type="button"
          class={cx(ui.action, 'rr-justify-self-start')}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Show less' : `Show ${count}`}
        </button>
      )}
      {open && filters.status === 'loaded' && filters.data.length > 0 && (
        <ul class="rr-grid">
          {filters.data.map((name) => (
            <li
              key={name}
              class="rr-flex rr-items-center rr-gap-2 rr-h-10"
            >
              <a
                class="rr-flex-1 rr-min-w-0 rr-truncate"
                href={`/r/${name}/`}
              >
                r/{name}
              </a>
              <button
                type="button"
                class={cx(ui.icon, 'rr-text-neutral-content-weak')}
                aria-label={`Let r/${name} back into r/all`}
                onClick={() => onFilter(name, false)}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
