// A count the way reddit's app shows it: 999, 1.2k, 12k, 1.5m
export function compact(count: number) {
  const short = (value: number, unit: string) => `${value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value)}${unit}`;
  if (count >= 1_000_000) return short(count / 1_000_000, 'm');
  if (count >= 1_000) return short(count / 1_000, 'k');
  return String(count);
}

// How long ago, shortest first unit: now, 5m, 3h, 2d, 4mo, 1y
export function ago(seconds: number, now = Date.now() / 1000) {
  const minutes = Math.floor((now - seconds) / 60);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
