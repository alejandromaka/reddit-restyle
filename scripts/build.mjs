// Builds the userscripts: src/main.ts bundled into Reddit Restyle.user.js,
// carrying src/styles/index.css (its @imports bundled, nesting flattened for
// iOS 16), which the script adds to the page itself; and src/blocker.json
// into Reddit Blocker.user.js, network rules for the Userscripts app. Written
// to dist/ and to the app's iCloud folder when there is one (REDDIT_RESTYLE_OUT
// overrides it). --watch rebuilds the script on every change (the rules: on a
// restart).
//
// For publishing (npm run bundle, the Pages workflow): the same script as
// reddit-restyle.js, its first line its version, for the loader to fetch when
// asked; and the loader, Reddit Restyle Loader.user.js (src/loader), which
// fetches it from REDDIT_RESTYLE_URL (by default this repository's GitHub
// Pages). With an index.html linking them, all in dist/.
import { context, build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { existsSync, watch } from 'node:fs';

const ICLOUD = `${homedir()}/Library/Mobile Documents/com~apple~CloudDocs/Developer/userscripts`;
const OUT = process.env.REDDIT_RESTYLE_OUT ?? (existsSync(ICLOUD) ? ICLOUD : null);
const NAME = 'Reddit Restyle';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const PUBLISH = process.argv.includes('--publish');

// Where the published build is: this repository's GitHub Pages, unless told
const REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'alejandromaka/reddit-restyle';
const [OWNER, REPO] = REPOSITORY.split('/');
const BUNDLE = 'reddit-restyle.js';
const BUNDLE_URL = process.env.REDDIT_RESTYLE_URL ?? `https://${OWNER.toLowerCase()}.github.io/${REPO}/${BUNDLE}`;
const LOADER = `${NAME} Loader.user.js`;

// A published build's version: the package's, and the commit it's from
function buildVersion() {
  const commit = process.env.GITHUB_SHA
    ?? (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();
  return `${version}+${commit.slice(0, 7)}`;
}

const JS_HEADER = `// ==UserScript==
// @name         ${NAME}
// @namespace    https://local/reddit-restyle
// @version      ${version}
// @description  old.reddit.com rebuilt for the iPhone mini. Carries its own stylesheet: on the pages it owns, removes reddit's CSS and scripts and draws the page from reddit's own JSON; every other page is left as it comes (broken without old reddit's code, on purpose: what's missing shows). Built from github.com/alejandromaka/reddit-restyle: edit there, not here.
// @author       you
// @match        *://old.reddit.com/*
// @run-at       document-start
// @inject-into  page
// @noframes
// @grant        none
// ==/UserScript==
`;

// Safari's declarativeNetRequest, through Userscripts' request scripts
const BLOCKER_HEADER = `// ==UserScript==
// @name         Reddit Blocker
// @namespace    https://local/reddit-blocker
// @version      ${version}
// @description  Network rules for Reddit Restyle. The Userscripts app gets a page script's code asynchronously, so old reddit's head (its whole JS bundle, reddit-init.js, and its stylesheets) is parsed before Reddit Restyle starts, and runs. These keep them from loading at all: old reddit's own scripts and CSS (www.redditstatic.com/reddit…) and subreddit stylesheets (thumbs.redditmedia.com). Paths only old reddit uses: www.reddit.com is unaffected. Built from github.com/alejandromaka/reddit-restyle (src/blocker.json): edit there, not here.
// @author       you
// @run-at       request
// ==/UserScript==
`;

// Installed once; runs the build it keeps, and fetches a new one only when you
// ask (src/loader/main.ts). The update URL is in its code, not its header:
// the Userscripts app never updates it by itself
const LOADER_HEADER = `// ==UserScript==
// @name         ${NAME} Loader
// @namespace    https://local/reddit-restyle-loader
// @version      ${version}
// @description  Runs Reddit Restyle on old.reddit.com from the copy it keeps, and gets a new copy only when you ask: Update Reddit Restyle in your account menu, or any old.reddit.com address with #restyle-update on the end. Never fetches by itself. Install it instead of Reddit Restyle.user.js (keep Reddit Blocker). Built from github.com/${REPOSITORY}: edit there, not here.
// @author       you
// @match        *://old.reddit.com/*
// @run-at       document-start
// @inject-into  content
// @noframes
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// ==/UserScript==
`;

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// The published page: what to install, and what the loader fetches
const indexHtml = (built) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reddit Restyle</title>
<style>body{font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}code{font-size:.9em}</style>
</head><body>
<h1>Reddit Restyle</h1>
<p>Latest build: <code>${escapeHtml(built)}</code></p>
<p>Install these two in Safari with the Userscripts app, once:</p>
<ul>
<li><a href="${encodeURI(LOADER)}">${escapeHtml(LOADER)}</a>: keeps a copy of the restyle and runs it. It gets a new one only when you ask: <b>Update Reddit Restyle</b> in your account menu, or any old.reddit.com address with <code>#restyle-update</code> on the end.</li>
<li><a href="Reddit%20Blocker.user.js">Reddit Blocker.user.js</a>: keeps old reddit's own code from loading.</li>
</ul>
<p>The build the loader fetches: <a href="${BUNDLE}">${BUNDLE}</a></p>
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

// The published build, the loader that runs it, and the page linking them (dist/ only)
async function publish(result) {
  const built = buildVersion();
  await write(BUNDLE, `// ${NAME} ${built}\n${result.outputFiles[0].text}`, { local: false });
  const loader = await build({
    entryPoints: ['src/loader/main.ts'],
    bundle: true,
    format: 'iife',
    target: 'safari16',
    charset: 'utf8',
    legalComments: 'none',
    write: false,
    logLevel: 'warning',
    define: { __BUNDLE_URL__: JSON.stringify(BUNDLE_URL) },
  });
  await write(LOADER, LOADER_HEADER + loader.outputFiles[0].text, { local: false });
  await write('index.html', indexHtml(built), { local: false });
  console.log(`published ${built}: the loader fetches ${BUNDLE_URL}`);
}

const rules = JSON.parse(await readFile('src/blocker.json', 'utf8'));
await write('Reddit Blocker.user.js', `${BLOCKER_HEADER}\n${JSON.stringify(rules, null, 2)}\n`);

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
  if (PUBLISH && !result.errors.length) await publish(result);
}
