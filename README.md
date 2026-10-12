# Reddit Restyle

old.reddit.com rebuilt for iPhone mini (iOS 16 Safari), as a userscript for
the Userscripts app (or Tampermonkey/Violentmonkey). The build writes
`Reddit Restyle.user.js`, which carries its own stylesheet, into the app's
iCloud folder; edit here, not there.

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
reddit closed self-service API access in November 2025. Every other page
stays reddit's own.

## Layout

```
src/
  main.ts            entry: shell → page set-up (at document start)
  shell/
    pages.ts         owned pages, by path
    blocker.ts       takes over an owned page: reddit's CSS and scripts out,
                     the viewport fixed, our root in place of reddit's markup
    gate.ts          per-page fallback to reddit's own page (sessionStorage + reload)
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
```

## Pages

- **listing**: the front page and subreddits (several too: r/pics+funny),
  by sort (hot, new, top, rising). More posts loads the next page in place.

## Rules

- Styles: utility classes only (`rr-` prefix, Tailwind's names), values from
  tokens; bundles that repeat are recipes in components/ui.ts. No component
  or BEM classes, no IDs in our markup.
- Views: Preact, written as if eslint-plugin-react and react-hooks were on:
  stable keys, complete effect dependencies, no components inside
  components, children and compound components over components as props.
- One loader: components/busy (the brand ring).
- Keep it personal: no bulk fetching, no automated actions.
