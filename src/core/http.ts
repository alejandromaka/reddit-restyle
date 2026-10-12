// GETs reddit's JSON (as the signed-in user: same site, its cookies); throws on an error status
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init, headers: { Accept: 'application/json', ...init.headers } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json() as Promise<T>;
}
