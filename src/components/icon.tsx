/* Our icons: reddit's outline style, 16px (large: 20px), in the text's color;
   filled, solid in it (a vote you gave) */

import { cx } from './ui';

const PATHS = {
  up: 'M10 3 3 11h4v6h6v-6h4z',
  down: 'M10 17 3 9h4V3h6v6h4z',
  comments: 'M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  play: 'M6 4v12l10-6z',
  menu: 'M3 5h14M3 10h14M3 15h14',
  home: 'M3 9.5 10 3l7 6.5V17h-5v-5H8v5H3z',
  popular: 'M3 14l5-5 3 3 6-6M12 6h5v5',
  all: 'M4 17V10M10 17V3M16 17v-5',
  star: 'M10 2.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L10 14.3l-4.6 2.5.9-5.2L2.5 8l5.2-.7z',
  chevron: 'M6 8l4 4 4-4',
  back: 'M12 5l-5 5 5 5',
  forward: 'M8 5l5 5-5 5',
  logout: 'M8 3H4v14h4M13 6l4 4-4 4M17 10H8',
  settings: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  moon: 'M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9z',
  share: 'M11 4l6 5-6 5v-3c-4 0-6.5 1-8 4 .5-4.5 3-7.5 8-8V4z',
  search: 'M14.5 9a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zM13 13l4 4',
  close: 'M5 5l10 10M15 5L5 15',
  plus: 'M10 4v12M4 10h12',
  fold: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM6.5 10h7',
  unfold: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM6.5 10h7M10 6.5v7',
  more: 'M4.2 10a.8.8 0 1 0 1.6 0 .8.8 0 1 0-1.6 0zM9.2 10a.8.8 0 1 0 1.6 0 .8.8 0 1 0-1.6 0zM14.2 10a.8.8 0 1 0 1.6 0 .8.8 0 1 0-1.6 0z',
  hide: 'M3 3l14 14M8.3 5.2A7.6 7.6 0 0 1 10 5c4.5 0 7.5 5 7.5 5a14 14 0 0 1-2.2 2.8M12.1 12.1A3 3 0 0 1 7.9 7.9M5.3 6.4A14 14 0 0 0 2.5 10s3 5 7.5 5c1.2 0 2.3-.3 3.3-.8',
  show: 'M2.5 10S5.5 5 10 5s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5zM12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  flag: 'M5 17.5v-15M5 3.5h10l-2.5 3.5 2.5 3.5H5',
  block: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM5.05 5.05l9.9 9.9',
};

interface IconProps {
  name: keyof typeof PATHS;
  large?: boolean;
  filled?: boolean;
}

export function Icon({ name, large = false, filled = false }: IconProps) {
  return (
    <svg
      class={cx('rr-block rr-flex-none', large ? 'rr-w-5 rr-h-5' : 'rr-w-4 rr-h-4')}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        d={PATHS[name]}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  );
}
