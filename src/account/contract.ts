/* You, on reddit: who you are (your name and avatar, for the bar) and what
   you do on a page (vote, join, leave, comment, hide, report, block someone,
   filter r/all, log out), sent to old reddit's own API as you (your cookies), each with
   your modhash: old reddit's token against forged requests. All from
   /api/me.json, asked for once per page (again after a failure). */

import { change, fetchJson, postForm, postJson } from '../core/http';
import type { ReportReason } from '../overflow/contract';

interface RedditMe {
  data?: { id: string; name: string; modhash: string; snoovatar_img?: string; icon_img?: string };  // none when you're signed out (id: without t2_)
}

export interface Me {
  name: string;
  icon: string | null;  // your avatar
}

export type Vote = 1 | 0 | -1;  // up, none, down

// Your vote on a post or comment, from reddit's likes: true up, false down, null none
export const voteOf = (likes: boolean | null | undefined): Vote => (likes === null || likes === undefined ? 0 : likes ? 1 : -1);

let me: Promise<NonNullable<RedditMe['data']>> | null = null;

function myData() {
  me ??= fetchJson<RedditMe>('/api/me.json?raw_json=1').then(({ data }) => {
    if (!data?.modhash) throw new Error('/api/me.json: signed out');
    return data;
  });
  me.catch(() => {
    me = null;
  });
  return me;
}

export async function fetchMe(): Promise<Me> {
  const { name, snoovatar_img, icon_img } = await myData();
  return { name, icon: snoovatar_img || icon_img || null };
}

// A post's vote (id: t3_…)
export async function vote(id: string, dir: Vote) {
  await postForm('/api/vote', { id, dir: String(dir), rank: '1', uh: (await myData()).modhash });
}

// Joining a subreddit (its name, as in r/name), or leaving it
export async function subscribe(name: string, join: boolean) {
  const uh = (await myData()).modhash;
  await postForm('/api/subscribe', { action: join ? 'sub' : 'unsub', sr_name: name, uh, ...(join ? { skip_initial_defaults: 'true' } : {}) });
}

// Hiding a post from your listings (id: t3_…; reddit hides posts only), or showing it again
export async function hide(id: string, hidden: boolean) {
  await postForm(hidden ? '/api/hide' : '/api/unhide', { id, uh: (await myData()).modhash });
}

// Blocking someone (by name), as reddit does: their posts and comments out of
// your way, and they can't message you or reply to you; or unblocking them
// (they're off your list of enemies, as reddit's API calls it: yours, t2_…)
export async function block(name: string, blocked: boolean) {
  const { id, modhash } = await myData();
  await postForm(blocked ? '/api/block_user' : '/api/unfriend', blocked ? { name, uh: modhash } : { name, type: 'enemy', container: `t2_${id}`, uh: modhash });
}

// What reddit says went wrong, from an api_type=json answer's errors ([code, message, field])
const wrong = (errors: string[][]) => errors.map((error) => error[1] ?? error[0]).join('; ');

// Reporting a post or comment (t3_… or t1_…), as reddit.com does: by one of
// its subreddit's rules, or one of reddit's reasons (a note, who it's about)
export async function report(id: string, reason: ReportReason) {
  // reddit refuses a reason over 100 characters, a note over 2000 (r2's VLength; RedReader cuts them the same)
  const why: Record<string, string> = reason.kind === 'rule'
    ? { reason: 'rule_reason_selected', rule_reason: reason.text.slice(0, 100) }
    : { reason: 'site_reason_selected', site_reason: reason.text.slice(0, 100) };
  if (reason.kind === 'site' && reason.notes) why.custom_text = reason.notes.slice(0, 2000);
  if (reason.kind === 'site' && reason.usernames) why.usernames = reason.usernames;
  const answer = await postJson<{ json?: { errors: string[][] } }>('/api/report', { api_type: 'json', thing_id: id, ...why, uh: (await myData()).modhash });
  if (answer.json?.errors?.length) throw new Error(wrong(answer.json.errors));
}

// r/all's filter: the subreddits you keep out of it, A–Z (/api/filter/user/you/f/all: a multi of them)
interface RedditFilter {
  data: { subreddits: { name: string }[] };
}

const filterPath = (me: string) => `/api/filter/user/${me}/f/all`;

export async function fetchFilters(): Promise<string[]> {
  const { data } = await fetchJson<RedditFilter>(`${filterPath((await myData()).name)}?raw_json=1`);
  return data.subreddits.map(({ name }) => name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// A subreddit kept out of r/all, or let back in
export async function filter(subreddit: string, filtered: boolean) {
  const { name, modhash } = await myData();
  const url = `${filterPath(name)}/r/${subreddit}`;
  await (filtered ? change('PUT', url, modhash, { model: JSON.stringify({ name: subreddit }) }) : change('DELETE', url, modhash));
}

// Logging out (old reddit's own: your cookies cleared in its answer)
export async function logOut() {
  await postForm('/logout', { uh: (await myData()).modhash, top: 'off' });
}

// reddit's answer to a comment (api_type=json, as you, on old.reddit):
// what went wrong, else the comment, not as a t1's JSON but as old reddit's
// own page inserts it (r2's CommentJsonTemplate.get_rendered): its fullname
// (id: t1_…), its markdown (contentText) and that markdown as HTML
// (contentHTML), its post (link) and parent. No author, score or body: those
// come from who you are and what you sent (post/contract.ts: postedComment)
export interface Posted {
  id: string;           // t1_…
  text: string;         // its markdown
  html: string;         // its markdown, as HTML (reddit's <div class="md">)
  parent: string;       // t3_… or t1_…
  author: string;       // you
}

interface RedditPosted {
  json?: { errors?: string[][]; data?: { things?: { kind: string; data: { id?: string; contentText?: string; contentHTML?: string; parent?: string } }[] } };
}

// A comment on a post or a reply to a comment (parent: t3_… or t1_…). Once
// reddit has it, nothing here throws: the comment is made, and a failure
// after that would have you send it twice
export async function comment(parent: string, text: string): Promise<Posted> {
  const { name, modhash } = await myData();
  const answer = await postJson<RedditPosted>('/api/comment', { api_type: 'json', raw_json: '1', thing_id: parent, text, uh: modhash });
  const errors = answer.json?.errors ?? [];
  if (errors.length) throw new Error(wrong(errors));
  const made = answer.json?.data?.things?.[0]?.data;
  if (!made?.id) throw new Error('reddit didn’t say whether it posted. Reload to check before sending again.');
  return {
    id: made.id,
    text: typeof made.contentText === 'string' ? made.contentText : text,
    html: typeof made.contentHTML === 'string' ? made.contentHTML : '',
    parent: made.parent ?? parent,
    author: name,
  };
}
