# Reddit Restyle

old.reddit.com rebuilt for iPhone mini (iOS 16 Safari), as a userscript for
the Userscripts app. The build writes `Reddit Restyle.user.js`, which carries
its own stylesheet, and `Reddit Blocker.user.js`, its network rules, into the
app's iCloud folder; edit here, not there.

```
npm run watch      # rebuild on every change (straight to the phone)
npm run check      # typecheck, test, build
npm run mock [path] # a WebKit iPhone mini on a mock old.reddit.com (fixtures), reloading on every build;
                    # MOCK_WIDTH=1280: a computer's window
```

`REDDIT_RESTYLE_OUT` overrides the output folder.

## How it works

On the pages it owns, the script removes reddit's CSS and every reddit
script (ads and trackers with them) as the HTML parses, and draws the page
itself from reddit's own JSON: the same address with `.json` added, fetched
as you (your cookies), so your subscriptions and settings apply. No API key:
reddit closed self-service API access in November 2025.

Userscripts injects the script only after the HTML's head is parsed, too late
to stop what's there, so old reddit's own JS bundle and stylesheets are
blocked at the network instead (Reddit Blocker: Safari's
declarativeNetRequest, through Userscripts; rules in src/blocker.json, picked
up when a Safari window regains focus). Old reddit's own pages can't work
without them, on purpose: every page we don't draw yet comes up broken, so
what's missing shows. Nothing redirects, nothing falls back.

## Layout

```
src/
  main.ts            entry: shell → page set-up (at document start)
  blocker.json       network rules: old reddit's own scripts and CSS never load
  shell/
    pages.ts         owned pages, by path
    blocker.ts       takes over an owned page: reddit's CSS and scripts out,
                     the viewport fixed, our root in place of reddit's markup
  core/
    store.ts         createStore: a page's state (Preact draws from it)
    http.ts, text.ts, theme.ts (light or dark)
    html.ts          reddit's rendered markdown, rebuilt safe, with our classes
  pages/<page>/      listing (the front page, subreddits), post (a post and its comments)
    contract.ts      reddit's requests and answers (its JSON), read into our
                     types
    types.ts         state and actions
    reducer.ts       pure: state + action → state
    effects.ts       network → actions
    index.tsx        set-up: the first request, then mount and draw
    views/           Preact components: our markup from the state (utility
                     classes); DOM events → actions
  account/           you on reddit (me.json: name, avatar, modhash); vote,
                     join, leave, comment, log out
  nav/               what every page shares: its frame (strip, bar, sidebar,
                     column), the menu, your account, your communities, and
                     their data (chrome.ts)
  components/        ours, reused anywhere (Preact): busy (the one loader),
                     icon, logo, avatar, sheet (slides over the page: the
                     menu, your account); ui.ts: recipes (utility bundles) and cx
  styles/            index.css @imports tokens → base → utilities; nested,
                     flattened by the build for iOS 16
    utilities.css    our markup's classes: Tailwind's names, rr- prefixed
test/                reducers as pure functions; contracts on saved JSON
                     (test/fixtures); pages in jsdom
docs/
  reddit-vars.json   www.reddit.com's CSS variables (light), where the tokens
                     come from; reddit-vars.js captures them again
```

## Pages

- **listing**: the front page, Popular, All and subreddits (several too:
  r/pics+funny), by sort (a dropdown: Best on the front page, Hot, New, Top
  with a second for its span, Rising). Under the bar, a subreddit's header
  as reddit.com has it: banner, icon, name and members (its about.json),
  with Join or Joined (tap to leave); wider than a phone, a taller rounded
  banner with a big icon over its edge and the name large; the front page,
  Popular, All and several subreddits at once have none. More posts loads
  the next page in place. Each post: its subreddit with its icon (a listing
  of several) or its author (one subreddit's), and its media, as
  reddit.com's feed: a video (reddit's own, or a gif) plays where it is
  (nothing of it loads until played); pictures (one, or a gallery to swipe
  through) open big when tapped (components/lightbox.tsx); a link's card
  opens the link (an outside video: ▶). Else its text's opening. NSFW too;
  none for spoilers. Its title, its comments, or a tap anywhere else on it:
  its page.

What you do (vote, join, leave) shows at once and goes to old reddit's own
API as you (src/account: /api/vote, /api/subscribe, with your modhash from
/api/me.json); one reddit refuses goes back, and the console says why.

- **post**: a post and its comments (or one comment's thread), as
  reddit.com's: where, when, who, Join; its title, tags and all of it (text,
  a gallery to swipe, a video Safari plays, a link); votes, comments, Share.
  Then "Join the conversation" (your comment), Sort by (a dropdown: Best,
  Top, New, Controversial, Old, Q&A) and Search Comments (the loaded ones),
  then the comments along their threads: votes, Reply (a box under it), ⊖
  to fold; "N more replies" loads them, a thread too deep continues on its
  own page. Text and comments are reddit's markdown, rebuilt safe
  (core/html.ts): spoilers stay hidden until tapped.

On top, as old reddit has it, a strip: Home, Popular, All, then your
communities (favorites first, A–Z, fetched alongside the page's posts), side
by side, swiped for more; it scrolls away. Under it the bar, which stays, as
reddit.com's: ☰ slides in the menu under it (the same, as a list; ☰ again
closes it), reddit's wordmark goes home, and your avatar opens your account
(a sheet from the bottom on a phone, a dropdown on a wide screen): View
Profile and Settings (old reddit's pages, which break until we build them),
Dark Mode (this device remembers it; else your system's), Log Out. The page
is a column (732px, as reddit.com's) centered in the window; on a screen
wide enough to have the menu beside it (1280px and up) the menu is also a
sidebar, always there, at the left edge (it doesn't push the column over).

## Rules

- Styles: utility classes only (`rr-` prefix, Tailwind's names), values from
  tokens; bundles that repeat are recipes in components/ui.ts. No component
  or BEM classes, no IDs in our markup.
- Look: www.reddit.com's own. Tokens take its values under its variable
  names (docs/reddit-vars.json), so colors read `rr-text-neutral-content-weak`,
  `rr-bg-secondary-background`, as reddit's do.
- Views: Preact, written as if eslint-plugin-react and react-hooks were on:
  stable keys, complete effect dependencies, no components inside
  components, children and compound components over components as props.
- One loader: components/busy (a ring in reddit's loader color).
- Keep it personal: no bulk fetching, no automated actions.
