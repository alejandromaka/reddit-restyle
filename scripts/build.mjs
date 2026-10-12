// Builds the userscript: src/main.ts bundled into Reddit Restyle.user.js,
// carrying src/styles/index.css (its @imports bundled, nesting flattened for
// iOS 16), which the script adds to the page itself. Written to dist/ and to
// the Userscripts app's iCloud folder (REDDIT_RESTYLE_OUT overrides it).
// --watch rebuilds on every change.
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
// @description  old.reddit.com rebuilt for the iPhone mini. Carries its own stylesheet: on the pages it owns, removes reddit's CSS and scripts and draws the page from reddit's own JSON. Built from ~/Developer/reddit-restyle: edit there, not here.
// @author       you
// @match        *://old.reddit.com/*
// @run-at       document-start
// @inject-into  page
// @noframes
// @grant        none
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
