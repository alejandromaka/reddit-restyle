// Builds the userscripts: src/main.ts bundled into Reddit Restyle.user.js,
// carrying src/styles/index.css (its @imports bundled, nesting flattened for
// iOS 16), which the script adds to the page itself; and src/blocker.json
// into Reddit Blocker.user.js, network rules for the Userscripts app. Written
// to dist/ and to the app's iCloud folder (REDDIT_RESTYLE_OUT overrides it).
// --watch rebuilds the script on every change (the rules: on a restart).
import { context, build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { watch } from 'node:fs';

const OUT = process.env.REDDIT_RESTYLE_OUT
  ?? `${homedir()}/Library/Mobile Documents/com~apple~CloudDocs/Developer/userscripts`;
const NAME = 'Reddit Restyle';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));

const JS_HEADER = `// ==UserScript==
// @name         ${NAME}
// @namespace    https://local/reddit-restyle
// @version      ${version}
// @description  old.reddit.com rebuilt for the iPhone mini. Carries its own stylesheet: on the pages it owns, removes reddit's CSS and scripts and draws the page from reddit's own JSON; every other page is left as it comes (broken without old reddit's code, on purpose: what's missing shows). Built from ~/Developer/reddit-restyle: edit there, not here.
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
// @description  Network rules for Reddit Restyle. The Userscripts app gets a page script's code asynchronously, so old reddit's head (its whole JS bundle, reddit-init.js, and its stylesheets) is parsed before Reddit Restyle starts, and runs. These keep them from loading at all: old reddit's own scripts and CSS (www.redditstatic.com/reddit…) and subreddit stylesheets (thumbs.redditmedia.com). Paths only old reddit uses: www.reddit.com is unaffected. Built from ~/Developer/reddit-restyle (src/blocker.json): edit there, not here.
// @author       you
// @run-at       request
// ==/UserScript==
`;

async function write(name, text) {
  await mkdir('dist', { recursive: true });
  await writeFile(`dist/${name}`, text);
  await writeFile(`${OUT}/${name}`, text);
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
  console.log(`built js ${version} → ${OUT}`);
};

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
  await writeJs(await build(options));
}
