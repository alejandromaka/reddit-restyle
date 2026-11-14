/* Bot-likeness: how much an account looks like a bot's, from what reddit
   says about it (/user/name/about.json, a t2). A guess, not a fact: points
   for and against, added up (log-odds), then made a percent. Real people
   with new or throwaway accounts can score high; an old account someone
   bought, or one posting AI-written text, can score low. */

// The parts of a t2 we read (a suspended account: its name, is_suspended, little else)
export interface RedditAccount {
  kind: 't2';
  data: {
    name: string;
    icon_img?: string;
    snoovatar_img?: string;
    link_karma?: number;
    comment_karma?: number;
    created_utc?: number;
    has_verified_email?: boolean;
    is_suspended?: boolean;
    is_employee?: boolean;
    is_gold?: boolean;
    is_mod?: boolean;
    subreddit?: { public_description?: string } | null;
  };
}

// What we keep of it (on your phone, a day: lookup.ts)
export interface Account {
  created: number | null;    // since when (seconds)
  postKarma: number;
  commentKarma: number;
  verified: boolean | null;  // a verified email; null: reddit didn't say
  avatar: 'custom' | 'default' | null;
  bio: boolean;
  suspended: boolean;
  employee: boolean;
  premium: boolean;
  mod: boolean;
}

// Not there (404): deleted since it posted, or banned by reddit without a word (shadowbanned)
export type Found = Account | 'gone';

export interface Reason {
  text: string;
  toward: 'bot' | 'person';
}

export interface Score {
  percent: number;  // 1–99 (100: reddit's own bot)
  reasons: Reason[];
}

export function readAccount({ data }: RedditAccount): Account {
  const icon = data.snoovatar_img || data.icon_img || '';
  return {
    created: data.created_utc ?? null,
    postKarma: data.link_karma ?? 0,
    commentKarma: data.comment_karma ?? 0,
    verified: data.has_verified_email ?? null,
    avatar: !icon ? null : data.snoovatar_img || !icon.includes('avatar_default') ? 'custom' : 'default',
    bio: Boolean(data.subreddit?.public_description?.trim()),
    suspended: Boolean(data.is_suspended),
    employee: Boolean(data.is_employee),
    premium: Boolean(data.is_gold),
    mod: Boolean(data.is_mod),
  };
}

// reddit's own bots: no need to ask
export const KNOWN_BOTS = new Set(['automoderator']);
export const isKnownBot = (name: string) => KNOWN_BOTS.has(name.toLowerCase());

// The names reddit picks for you when you don't (Adjective_Noun_1234, Word-Word-1234)
export const isGeneratedName = (name: string) => /^[A-Z][a-z]+[-_][A-Z][a-z]+[-_]\d{1,5}$/.test(name);

// A name that says it's a bot: some_bot, RemindMeBot, LINKBOT
export const isBotName = (name: string) => /[-_]bot$/i.test(name) || /[a-z0-9]Bot$/.test(name) || /BOT$/.test(name);

const DAY = 86400;
const START = -2;  // ≈ 12%: before anything's known

const percentOf = (points: number) => Math.min(99, Math.max(1, Math.round(100 / (1 + Math.exp(-points)))));

const age = (days: number) => {
  if (days < 1) return 'under a day';
  if (days < 60) return `${Math.floor(days)} day${Math.floor(days) === 1 ? '' : 's'}`;
  if (days < 730) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
};

export function scoreOf(name: string, found: Found, now = Date.now() / 1000): Score {
  if (isKnownBot(name)) return { percent: 100, reasons: [{ text: 'reddit’s own moderation bot', toward: 'bot' }] };
  if (found === 'gone') return { percent: 80, reasons: [{ text: 'The account is gone: deleted since, or banned by reddit without notice', toward: 'bot' }] };
  if (found.suspended) return { percent: 90, reasons: [{ text: 'reddit suspended the account', toward: 'bot' }] };

  let points = START;
  const reasons: Reason[] = [];
  const add = (weight: number, text: string) => {
    points += weight;
    reasons.push({ text, toward: weight > 0 ? 'bot' : 'person' });
  };

  if (isBotName(name)) add(2.5, 'Its name says it’s a bot');
  if (found.employee) add(-3, 'A reddit employee');

  if (found.created !== null) {
    const days = (now - found.created) / DAY;
    if (days < 7) add(2, `Made ${age(days)} ago`);
    else if (days < 30) add(1.2, `Made ${age(days)} ago`);
    else if (days < 180) add(0.4, `Made ${age(days)} ago`);
    else if (days > 3 * 365) add(-1, `${age(days)} old`);
    else if (days > 365) add(-0.5, `${age(days)} old`);
  }

  const { postKarma, commentKarma } = found;
  if (postKarma >= 200 && commentKarma < postKarma / 10) add(1.2, `Lots of post karma (${postKarma}), little from comments (${commentKarma})`);
  else if (commentKarma >= 1000 && commentKarma >= postKarma) add(-0.6, `Mostly comment karma (${commentKarma})`);

  if (found.verified === false) add(0.5, 'No verified email');
  else if (found.verified) add(-0.3, 'Verified email');

  if (found.avatar === 'default') add(0.3, 'reddit’s default avatar');
  else if (found.avatar === 'custom') add(-0.2, 'Its own avatar');

  if (found.bio) add(-0.2, 'Wrote a bio');
  if (isGeneratedName(name)) add(0.6, 'The name reddit made up for it');
  if (found.premium) add(-0.3, 'Pays for reddit Premium');
  if (found.mod) add(-0.4, 'Moderates a community');

  return { percent: percentOf(points), reasons };
}
