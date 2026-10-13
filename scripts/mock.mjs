// npm run mock [path]: a WebKit window (Safari's engine) on an iPhone mini
// viewport, showing old.reddit.com with the restyle on it. Every page load
// reads the latest build (dist/), and the window reloads when `npm run watch`
// writes a new one: edit, look. The path picks where it opens: / (default),
// /r/pics/top/, /r/popular/, …
//
// The build goes in the page itself, first in <head> (WebKit won't let a
// test browser answer a synchronous request, so the script can't fetch it at
// document start). Nothing reaches reddit: every old.reddit.com page is a bare
// old reddit page (its own scripts and CSS refused, as Reddit Blocker does),
// every listing is test/fixtures/listing.json (its next page, after=: the
// same posts under new ids, the last page), every post's page test/fixtures/thread.json
// (more comments: morechildren.json; your comment: posted.json, with your
// words), every profile test/fixtures/user.json and user-listing.json,
// every subreddit's about test/fixtures/about.json (under its own name), your communities test/fixtures/subscriptions.json,
// what you do (vote, join, leave, log out) is taken and printed, and every image is a
// placeholder. A page we don't draw stays the bare old reddit page, as on the
// phone.
//
// MOCK_SHOT=file.png: no window; a screenshot of the page there, then exit
// MOCK_TAP="Menu > r/soccer": with MOCK_SHOT, what to tap first (a label or text)
// MOCK_FULL=1: with MOCK_SHOT, the whole page, not just the screen
// MOCK_WIDTH=1280: a window that wide (a computer's), not the iPhone mini's 375
// MOCK_HOVER=selector: with MOCK_SHOT, the mouse on it after the taps (a :hover look)
// MOCK_EVAL: with MOCK_SHOT, an expression evaluated on the page after the taps, printed (a measurement, a check)

import { existsSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { webkit } from 'playwright';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const JS = 'dist/Reddit Restyle.user.js';
const START = process.argv[2] ?? '/';
const SHOT = process.env.MOCK_SHOT;
const TAP = process.env.MOCK_TAP;

// No build yet: say so (npm run build, or npm run watch)
if (!existsSync(JS)) {
  console.error('mock: no build in dist/ yet: run npm run build (or npm run watch) first');
  process.exit(1);
}

// Old reddit's page, as far as the restyle cares: its head's own CSS and
// script (refused below), and some markup for ours to replace. Its charset in
// the page itself: Playwright's WebKit ignores the one in a fulfilled header
const oldReddit = (js) => `<!DOCTYPE html><html><head><meta charset="utf-8"><script>${js}</script>
<title>reddit: the front page of the internet</title>
<link rel="stylesheet" href="https://www.redditstatic.com/reddit.mock.css">
<script src="https://www.redditstatic.com/reddit-init.en.mock.js"></script>
</head><body><a href="#content">jump to content</a><div id="header">my subreddits · popular · all</div><div class="content">old reddit's markup</div></body></html>`;

// Any image: reddit's gray, stretched to the box it's drawn in
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3" preserveAspectRatio="none"><rect width="4" height="3" fill="#c9d7de"/></svg>';

const fixture = (name) => readFile(`test/fixtures/${name}.json`, 'utf8');
// A subreddit's about: the fixture's, under that subreddit's name
async function about(name) {
  const answer = JSON.parse(await fixture('about'));
  Object.assign(answer.data, { display_name: name, display_name_prefixed: `r/${name}` });
  return JSON.stringify(answer);
}

// More posts: the same posts under new ids, then no more
async function nextPage() {
  const listing = JSON.parse(await fixture('listing'));
  listing.data.children = listing.data.children.map(({ kind, data }) => ({ kind, data: { ...data, name: `${data.name}_2` } }));
  listing.data.after = null;
  listing.data.before = listing.data.children[0].data.name;
  return JSON.stringify(listing);
}

const browser = await webkit.launch({ headless: Boolean(SHOT) });
const WIDTH = Number(process.env.MOCK_WIDTH ?? 375);
const context = await browser.newContext(WIDTH > 375
  ? { viewport: { width: WIDTH, height: 900 } }
  : { viewport: { width: 375, height: 812 }, userAgent: IPHONE, deviceScaleFactor: 2, hasTouch: true });
await context.route('**/*', (route) => answer(route).catch((error) => {
  console.log(`(mock) ${route.request().url()}: ${error.message}`);
  return route.abort().catch(() => {});
}));
async function answer(route) {
  const request = route.request();
  const url = new URL(request.url());
  const json = (body) => route.fulfill({ contentType: 'application/json', body });
  if (url.hostname === 'old.reddit.com') {
    if (url.pathname === '/api/morechildren.json') return json(await fixture('morechildren'));
    if (url.pathname === '/api/comment' && request.method() === 'POST') {
      const text = new URLSearchParams(request.postData() ?? '').get('text') ?? '';
      console.log(`(you) /api/comment ${request.postData()}`);
      const posted = JSON.parse(await fixture('posted'));
      Object.assign(posted.json.data.things[0].data, { body: text, body_html: `<div class="md"><p>${escape(text)}</p></div>` });
      return json(JSON.stringify(posted));
    }
    if (url.pathname === '/api/me.json') return json('{"data":{"name":"you","modhash":"MOCK","snoovatar_img":"https://i.redd.it/snoovatar/mock.png"}}');
    if ((url.pathname.startsWith('/api/') || url.pathname === '/logout') && request.method() === 'POST') {
      console.log(`(you) ${url.pathname} ${request.postData()}`);
      return json('{}');
    }
    if (request.resourceType() === 'document') {
      const js = (await readFile(JS, 'utf8')).replace(/<\/script/gi, '<\\/script');
      return route.fulfill({ contentType: 'text/html', body: oldReddit(js) });
    }
    if (url.pathname === '/subreddits/mine/subscriber.json') return json(await fixture('subscriptions'));
    const subreddit = url.pathname.match(/^\/r\/([^/]+)\/about\.json$/)?.[1];
    if (subreddit) return json(await about(subreddit));
    if (/^\/user\/[^/]+\/about\.json$/.test(url.pathname)) return json(await fixture('user'));
    if (url.pathname.startsWith('/user/') && url.pathname.endsWith('.json')) return json(await fixture('user-listing'));
    if (url.pathname.includes('/comments/') && url.pathname.endsWith('.json')) return json(await fixture('thread'));
    if (url.pathname.endsWith('.json')) return json(url.searchParams.has('after') ? await nextPage() : await fixture('listing'));
  }
  if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER });
  return route.abort();
}

const page = await context.newPage();
page.on('pageerror', (error) => console.log(`(page) ${error.message}`));
// What the page reports (not WebKit's note on its own quirks for this address)
page.on('console', (message) => ['error', 'warning'].includes(message.type()) && !message.text().includes('WebKit quirks') && console.log(`(console) ${message.text()}`));
await page.goto(`https://old.reddit.com${START}`);
if (SHOT) {
  await page.waitForTimeout(1000);
  for (const tap of TAP ? TAP.split(' > ') : []) {
    await page.getByLabel(tap, { exact: true }).or(page.getByText(tap, { exact: true })).first().click();
    await page.waitForTimeout(1000);
  }
  if (process.env.MOCK_HOVER) await page.hover(process.env.MOCK_HOVER);
  if (process.env.MOCK_EVAL) console.log(JSON.stringify(await page.evaluate(process.env.MOCK_EVAL), null, 1));
  await page.screenshot({ path: SHOT, fullPage: Boolean(process.env.MOCK_FULL) });
  await browser.close();
  process.exit(0);
}
console.log(`mock: old.reddit.com${START}, from test/fixtures — reloads on every build; close the window to stop`);

// A new build: reload. The folder is watched, not the file: a build that
// replaces or recreates it (or dist/ itself) keeps the window reloading
let timer;
watch('dist', () => {
  clearTimeout(timer);
  timer = setTimeout(() => existsSync(JS) && page.reload().catch(() => {}), 300);
});
browser.on('disconnected', () => process.exit(0));
page.on('close', () => browser.close());
