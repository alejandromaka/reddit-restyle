/* A choice of pages, as reddit.com's dropdowns: the one chosen and a chevron,
   iOS's own picker on tap (the real control, invisible over them; 16px, so
   iOS doesn't zoom in on it). Choosing one goes there, as a link would. */

import { Icon } from './icon';

interface PickerProps {
  label: string;                           // what it chooses, for screen readers
  chosen: string;                          // shown
  value: string;                           // the chosen one's address
  options: (readonly [string, string])[];  // each: its address, its name
}

export function Picker({ label, chosen, value, options }: PickerProps) {
  return (
    <label class="rr-relative rr-flex rr-items-center rr-gap-1 rr-h-10 rr-font-semibold rr-text-neutral-content-weak">
      {chosen}
      <Icon name="chevron" />
      <select
        class="rr-absolute rr-inset-0 rr-w-full rr-opacity-0 rr-text-base"
        aria-label={label}
        value={value}
        onChange={(event) => location.assign(event.currentTarget.value)}
      >
        {options.map(([address, name]) => (
          <option
            key={address}
            value={address}
          >
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
