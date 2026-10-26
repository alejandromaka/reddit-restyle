/* A round picture: a community's icon or your avatar, else its initial.
   sm 24px (lists), comment 24px on a phone and 32px on a wide screen, md 32px (the bar), lg 40px (you, in your account), hero
   40px on a phone and 88px wider (a subreddit's header, as reddit.com's), xl
   88px (someone's profile). OP's initial: blue, on a tint of it */

import { cx } from './ui';

const SIZES = {
  sm: ['rr-w-6 rr-h-6 rr-text-xs', 24],
  comment: ['rr-w-6 rr-h-6 lg:rr-w-8 lg:rr-h-8 rr-text-xs', 32],
  md: ['rr-w-8 rr-h-8 rr-text-xs', 32],
  lg: ['rr-w-10 rr-h-10 rr-text-lg', 40],
  hero: ['rr-w-10 rr-h-10 sm:rr-w-22 sm:rr-h-22 rr-text-lg sm:rr-text-3xl', 88],
  xl: ['rr-w-22 rr-h-22 rr-text-3xl', 88],
} as const;

interface AvatarProps {
  name: string;
  icon: string | null;
  size?: keyof typeof SIZES;
  op?: boolean;  // a comment's: the post's author
}

export function Avatar({ name, icon, size = 'sm', op = false }: AvatarProps) {
  const [box, pixels] = SIZES[size];
  if (icon) {
    return (
      <img
        class={cx('rr-block rr-flex-none rr-rounded-full rr-object-cover', box)}
        src={icon}
        width={pixels}
        height={pixels}
        loading="lazy"
        decoding="async"
        alt=""
      />
    );
  }
  return (
    <span class={cx('rr-grid rr-place-items-center rr-flex-none rr-rounded-full rr-font-semibold', op ? 'rr-bg-op-background rr-text-a-default' : 'rr-bg-secondary-background', box)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
