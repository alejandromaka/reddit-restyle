/* Our icons: 20px, in the text's color */

const PATHS = {
  up: 'M10 3 3 11h4v6h6v-6h4z',
  down: 'M10 17 3 9h4V3h6v6h4z',
  comments: 'M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg
      class="rr-flex-none rr-w-5 rr-h-5"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        d={PATHS[name]}
        fill={name === 'comments' ? 'none' : 'currentColor'}
        stroke={name === 'comments' ? 'currentColor' : 'none'}
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
  );
}
