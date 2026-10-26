/* The sites you block (a link post's "…": Block thehill.com): this device
   remembers them, as it does Dark Mode (reddit keeps no such list). A post
   linking to one, or to a subdomain of one, is left out of listings. */

const KEY = 'reddit-restyle:domains';
const listeners = new Set<(domains: string[]) => void>();

// As reddit writes a post's domain: lower case, no www.
export const domainOf = (domain: string) => domain.toLowerCase().replace(/^www\./, '');

// The ones this device blocks, A–Z
export function blockedDomains(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((domain): domain is string => typeof domain === 'string') : [];
  } catch {
    return [];  // not ours: as if none
  }
}

// A domain blocked, or let back in; whoever follows them told
export function blockDomain(domain: string, blocked: boolean) {
  const name = domainOf(domain);
  const rest = blockedDomains().filter((each) => each !== name);
  const domains = blocked ? [...rest, name].sort() : rest;
  localStorage.setItem(KEY, JSON.stringify(domains));
  for (const listener of listeners) listener(domains);
}

// Told of every change (the page's, the account menu's); returns how to stop
export function followDomains(listener: (domains: string[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// All of it, for a page's "…" (overflow/state.ts: startOverflow)
export const sites = { read: blockedDomains, block: blockDomain, follow: followDomains };
