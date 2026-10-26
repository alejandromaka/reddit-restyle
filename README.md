# Reddit Restyle

old.reddit.com, redrawn to look and feel like reddit.com's mobile site, as a
userscript for Safari on iPhone ([Userscripts](https://github.com/quoid/userscripts)).
It's built for an iPhone mini on iOS 16, and it also works on an iPad or a
computer's window.

You keep old reddit's speed and your account, and lose its desktop layout,
ads and trackers. Listings, posts and comments, and profiles are drawn from
reddit's own JSON, fetched as you. Voting, joining, commenting, hiding,
reporting and blocking all go through old reddit's API. Pages it doesn't
draw yet (settings, messages, search…) come up broken on purpose, so it's
obvious what's missing.

This is a personal project, shared as is. It isn't affiliated with reddit.

## Install

You need the free [Userscripts](https://github.com/quoid/userscripts)
app, turned on in Safari and allowed on old.reddit.com.

1. In Safari, open **https://alejandromaka.github.io/reddit-restyle/**.
2. Install both scripts linked there:
   - **Reddit Restyle Loader**: keeps a copy of the restyle on your phone and runs it.
   - **Reddit Blocker**: keeps old reddit's own scripts and stylesheets from loading.
3. Open old.reddit.com and tap **Install** at the bottom of the page.

## Updating

Nothing updates on its own: the loader never fetches anything unless you
ask. To get the latest build, use any of these:

- **Update Reddit Restyle** in your account menu (tap your avatar). It shows
  the build you're on.
- Any old.reddit.com address with `#restyle-update` added to the end, for
  when the saved copy won't start.
- **Update Reddit Restyle** in the Userscripts menu, where the app shows one.

The page tells you either that you're up to date or that a new build is in,
and then reloads.

## Privacy

There are no analytics, no API key and no server of ours. The script talks
only to reddit (as you, with your own cookies), and to GitHub Pages when you
ask it to update. What you block or choose on this device (blocked sites,
dark mode) stays in Safari's storage for old.reddit.com.

## Development

```
npm run watch      # rebuild on every change (into the iCloud folder, if there is one)
npm run check      # typecheck, test, build
npm run bundle     # the build, plus what's published (dist/): reddit-restyle.js,
                   # Reddit Restyle Loader.user.js, index.html
npm run mock [path] # a WebKit iPhone mini on a mock old.reddit.com (fixtures), reloading on every build;
                    # MOCK_WIDTH=1280: a computer's window
```

The build writes `Reddit Restyle.user.js`, which carries its own stylesheet,
and `Reddit Blocker.user.js` to dist/, and to the Userscripts app's iCloud
folder when that exists (`REDDIT_RESTYLE_OUT` picks another). Install
Reddit Restyle.user.js directly while developing, or the loader, but not
both: if both are in, the first to start wins.

Every push to main publishes to GitHub Pages (.github/workflows/publish.yml;
Pages on, with GitHub Actions as its source). The loader (src/loader) runs
the build it keeps in the Userscripts app's storage, in the userscript's
own world, so reddit's Content Security Policy doesn't apply. The URL it
fetches is built in (`REDDIT_RESTYLE_URL` at publish, else this
repository's Pages), so a new one means installing the loader again.

### How it works

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

### Layout

```
src/
  main.ts            entry: shell → page set-up (at document start)
  loader/            the loader: runs the kept build, fetches one when asked;
                     contract.ts: what it shares with the restyle (the page's DOM)
  blocker.json       network rules: old reddit's own scripts and CSS never load
  shell/
    pages.ts         owned pages, by path
    blocker.ts       takes over an owned page: reddit's CSS and scripts out,
                     the viewport fixed, our root in place of reddit's markup
  core/
    store.ts         createStore: a page's state (Preact draws from it)
    http.ts, text.ts, theme.ts (light or dark), domains.ts (sites you block)
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
                     join, leave, comment, block, log out
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

### Pages

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
  none for spoilers. Only its title and its comments open its page: a tap
  anywhere else on it (its media, its text) doesn't.

What you do (vote, join, leave, block) shows at once and goes to old
reddit's own API as you (src/account: /api/vote, /api/subscribe,
/api/block_user, with your modhash from /api/me.json); one reddit refuses
goes back, and the console says why. Blocking someone (Block u/name in a
post's or comment's "…", or Block on their profile; asked first) turns
their posts into a line with Undo and folds their comments, marked Blocked
(as reddit says, too); Unblock is in the same places. Blocking a site (Block
site.com in a link post's "…") is this device's (core/domains.ts: reddit
keeps no such list): its posts, and its subdomains', turn into a line with
Undo, and from then on are left out; your account's Blocked Domains lists
them, each with Unblock.

- **post**: a post and its comments (or one comment's thread), as
  reddit.com's: where, when, who, Join; its title, tags and all of it (text,
  a gallery to swipe, a video Safari plays, a link); votes, comments, Share.
  Then "Join the conversation" (your comment), Sort by (a dropdown: Best,
  Top, New, Controversial, Old, Q&A) and Search Comments (the loaded ones),
  then the comments along their threads: votes, Reply (a box under it), ⊖
  to fold; "N more replies" loads them, a thread too deep continues on its
  own page. Text and comments are reddit's markdown, rebuilt safe
  (core/html.ts): spoilers stay hidden until tapped. A comment's link to a
  picture (reddit's own, or any https picture file) shows the picture in the
  comment, loaded only as it nears the screen (reddit's: a phone's width of
  it, its room kept before it comes); a tap opens it big. A gif with a video
  of itself (reddit's, Giphy's, imgur's .gifv: a fraction of the gif's size)
  is that video, muted and looping, loading and playing only while it's on
  screen (components/markdown.tsx); reddit's markdown for comment media, if
  old reddit leaves it as written (![gif](giphy|id)), shows it too.

On top, as old reddit has it, a strip: Home, Popular, All, then your
communities (favorites first, A–Z, fetched alongside the page's posts), side
by side, swiped for more; it scrolls away. Under it the bar, which stays, as
reddit.com's: ☰ slides in the menu under it (the same, as a list; ☰ again
closes it), reddit's wordmark goes home, and your avatar opens your account
(a sheet from the bottom on a phone, a dropdown on a wide screen): View
Profile and Settings (old reddit's pages, which break until we build them),
Dark Mode (this device remembers it; else your system's), Blocked Domains,
Log Out. The page
is a column (732px, as reddit.com's) centered in the window; on a screen
1024px and up (an iPad mini across, 1133px) the menu is also a sidebar,
always there, at the left edge: from 1280px over the column's margin, and
narrower the column moves over beside it.

### Rules

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
