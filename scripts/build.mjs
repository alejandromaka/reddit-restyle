// Builds the userscripts: src/main.ts bundled into Reddit Restyle.user.js,
// carrying src/styles/index.css (its @imports bundled, nesting flattened for
// iOS 16), which the script adds to the page itself; and src/blocker.json
// into Reddit Blocker.user.js, network rules for the Userscripts app. Written
// to dist/ and to the app's iCloud folder when there is one (REDDIT_RESTYLE_OUT
// overrides it). --watch rebuilds the script on every change (the rules: on a
// restart).
//
// For publishing (npm run bundle, the Pages workflow): the same two as
// reddit-restyle.user.js and reddit-blocker.user.js, each with an update URL
// (this repository's GitHub Pages) and a version that goes up every run, and
// an index.html linking them, in dist/. The Userscripts app checks that URL
// when its popup opens, and updates only when you tap Update.
import { context, build } from 'esbuild';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { existsSync, watch } from 'node:fs';

const ICLOUD = `${homedir()}/Library/Mobile Documents/com~apple~CloudDocs/Developer/userscripts`;
const OUT = process.env.REDDIT_RESTYLE_OUT ?? (existsSync(ICLOUD) ? ICLOUD : null);
const NAME = 'Reddit Restyle';
const PUBLISH = process.argv.includes('--publish');

// Published: the workflow's run number on the end, so each publish is newer
const { version: PACKAGE_VERSION } = JSON.parse(await readFile('package.json', 'utf8'));
const version = PUBLISH ? `${PACKAGE_VERSION}.${process.env.GITHUB_RUN_NUMBER ?? 0}` : PACKAGE_VERSION;

// Where the published scripts are: this repository's GitHub Pages, unless told
const REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'alejandromaka/reddit-restyle';
const [OWNER, REPO] = REPOSITORY.split('/');
const SITE = process.env.REDDIT_RESTYLE_SITE ?? `https://${OWNER.toLowerCase()}.github.io/${REPO}`;
const PUBLISHED = { js: 'reddit-restyle.user.js', blocker: 'reddit-blocker.user.js' };

// A published script's: where the app looks for a newer version, and gets it
const updateLines = (file) => PUBLISH ? `// @updateURL    ${SITE}/${file}
// @downloadURL  ${SITE}/${file}
` : '';

const JS_HEADER = `// ==UserScript==
// @name         ${NAME}
// @namespace    https://github.com/${REPOSITORY}
// @version      ${version}
// @description  old.reddit.com rebuilt for the iPhone mini. Carries its own stylesheet: on the pages it owns, removes reddit's CSS and scripts and draws the page from reddit's own JSON; every other page is left as it comes (broken without old reddit's code, on purpose: what's missing shows). Built from github.com/${REPOSITORY}: edit there, not here.
// @author       you
// @match        *://old.reddit.com/*
// @run-at       document-start
// @inject-into  page
// @noframes
// @grant        none
${updateLines(PUBLISHED.js)}// ==/UserScript==
`;

// Safari's declarativeNetRequest, through Userscripts' request scripts
const BLOCKER_HEADER = `// ==UserScript==
// @name         Reddit Blocker
// @namespace    https://github.com/${REPOSITORY}/blocker
// @version      ${version}
// @description  Network rules for Reddit Restyle. The Userscripts app gets a page script's code asynchronously, so old reddit's head (its whole JS bundle, reddit-init.js, and its stylesheets) is parsed before Reddit Restyle starts, and runs. These keep them from loading at all: old reddit's own scripts and CSS (www.redditstatic.com/reddit…) and subreddit stylesheets (thumbs.redditmedia.com). Paths only old reddit uses: www.reddit.com is unaffected. Built from github.com/${REPOSITORY} (src/blocker.json): edit there, not here.
// @author       you
// @run-at       request
${updateLines(PUBLISHED.blocker)}// ==/UserScript==
`;

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// The published page: what to install
const indexHtml = () => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reddit Restyle</title>
<style>body{font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}code{font-size:.9em}</style>
</head><body>
<h1>Reddit Restyle</h1>
<p>Latest version: <code>${escapeHtml(version)}</code></p>
<p>Install both in Safari with the Userscripts app, once: open each, then tap <b>AA</b> (or the puzzle piece) → <b>Userscripts</b> → Install.</p>
<ul>
<li><a href="${PUBLISHED.js}">${PUBLISHED.js}</a>: the restyle.</li>
<li><a href="${PUBLISHED.blocker}">${PUBLISHED.blocker}</a>: keeps old reddit's own code from loading.</li>
</ul>
<p>To update: open the Userscripts popup on any page; when it shows an update, tap Update. Nothing updates by itself.</p>
</body></html>
`;

// Into dist/ and the scripts folder: only when it changed, and whole (written
// beside it, then renamed over it). The Userscripts app reads the folder
// whenever a Safari window gets focus, Reddit Blocker's rules cleared first:
// a file it finds half written leaves them cleared, and old reddit's code runs.
async function write(name, text, { local = true } = {}) {
  await mkdir('dist', { recursive: true });
  for (const path of [`dist/${name}`, ...(local && OUT ? [`${OUT}/${name}`] : [])]) {
    if (await readFile(path, 'utf8').catch(() => null) === text) continue;
    await writeFile(`${path}.tmp`, text);
    await rename(`${path}.tmp`, path);
  }
}

// The page's stylesheet, for the script to add
async function pageCss() {
  const result = await build({
    entryPoints: ['src/styles/index.css'],
    bundle: true,
    minify: true,
    target: 'safari16',
    charset: 'utf8',
    write: false,
    logLevel: 'warning',
  });
  return result.outputFiles[0].text.trim();
}

// What the build puts into the script: its stylesheet
const defines = async () => ({ __CSS__: JSON.stringify(await pageCss()) });

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'safari16',  // the iPhone mini's iOS 16
  charset: 'utf8',
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
};

const writeJs = async (result) => {
  if (result.errors.length) return;
  await write(`${NAME}.user.js`, JS_HEADER + result.outputFiles[0].text);
  console.log(`built js ${version} → ${OUT ?? 'dist'}`);
};

const rules = JSON.parse(await readFile('src/blocker.json', 'utf8'));
const blocker = `${BLOCKER_HEADER}\n${JSON.stringify(rules, null, 2)}\n`;
await write('Reddit Blocker.user.js', blocker);

options.define = await defines();

if (process.argv.includes('--watch')) {
  const out = { name: 'out', setup: (b) => b.onEnd(writeJs) };
  let js = await context({ ...options, plugins: [out] });
  await js.watch();
  // The stylesheet rides in the script: on a change under styles/, rebuild it with it
  let carried = JSON.stringify(options.define);
  let queue = Promise.resolve();
  watch('src/styles', { recursive: true }, () => {
    queue = queue.then(async () => {
      const define = await defines();
      if (JSON.stringify(define) === carried) return;
      carried = JSON.stringify(define);
      await js.dispose();
      js = await context({ ...options, define, plugins: [out] });
      await js.watch();
    });
  });
} else {
  const result = await build(options);
  await writeJs(result);
  if (PUBLISH && !result.errors.length) {
    await write(PUBLISHED.js, JS_HEADER + result.outputFiles[0].text, { local: false });
    await write(PUBLISHED.blocker, blocker, { local: false });
    await write('index.html', indexHtml(), { local: false });
    console.log(`published ${version}: updates from ${SITE}`);
  }
}
