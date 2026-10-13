// GETs reddit's JSON (as the signed-in user: same site, its cookies); throws on an error status
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init, headers: { Accept: 'application/json', ...init.headers } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json() as Promise<T>;
}

// POSTs a form to reddit's API (as the signed-in user); throws on an error status
export async function postForm(url: string, fields: Record<string, string>): Promise<void> {
  const response = await fetch(url, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams(fields) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
}

// POSTs a form to reddit's API and reads its JSON answer; throws on an error status
export async function postJson<T>(url: string, fields: Record<string, string>): Promise<T> {
  const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }, body: new URLSearchParams(fields) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json() as Promise<T>;
}
