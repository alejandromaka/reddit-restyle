# Reddit Restyle

old.reddit.com rebuilt for iPhone mini (iOS 16 Safari), as a userscript for
the Userscripts app. The build writes `Reddit Restyle.user.js`, which carries
its own stylesheet, and `Reddit Blocker.user.js`, its network rules, into the
app's iCloud folder; edit here, not there.

```
npm run watch      # rebuild on every change (straight to the phone)
npm run check      # typecheck, test, build
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
without them: every page we don't draw yet goes to the same address on
www.reddit.com. Nothing falls back: what breaks shows what's missing.

## Layout

```
src/
  main.ts            entry: shell → page set-up (at document start)
  blocker.json       network rules: old reddit's own scripts and CSS never load
  shell/
    pages.ts         owned pages, by path
    blocker.ts       takes over an owned page: reddit's CSS and scripts out,
                     the viewport fixed, our root in place of reddit's markup
    www.ts           every other page: reddit's own, on www
  core/
    store.ts         createStore: a page's state (Preact draws from it)
    http.ts, text.ts
  pages/<page>/
    contract.ts      reddit's requests and answers (its JSON), read into our
                     types; pure
    types.ts         state and actions
    reducer.ts       pure: state + action → state
    effects.ts       network → actions
    index.tsx        set-up: the first request, then mount and draw
    views/           Preact components: our markup from the state (utility
                     classes); DOM events → actions
  components/        ours, reused anywhere (Preact): busy (the one loader),
                     icon; ui.ts: recipes (utility bundles) and cx
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

- **listing**: the front page and subreddits (several too: r/pics+funny),
  by sort (hot, new, top, rising). More posts loads the next page in place.
  Every post shows its preview: a text post's opening, a photo, a video's
  poster, a gallery's first picture (and its count), a link's card; a
  crosspost, the one it shares. None for NSFW or spoilers.

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
