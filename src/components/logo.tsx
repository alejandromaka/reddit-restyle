/* Our wordmark: "restyle" in plain type, in reddit's orange (not reddit's
   own logo, which is theirs) */

export function Wordmark() {
  return (
    <span
      class="rr-block rr-flex-none rr-text-xl rr-font-bold rr-leading-none rr-tracking-tight rr-text-global-brand-orangered"
      aria-hidden="true"
    >
      restyle
    </span>
  );
}
