// npm run screenshots: the README's pictures (docs/screenshots/), taken on
// the mock (scripts/mock.mjs: test/fixtures, made-up pictures, nobody's
// account), one mock run per picture. Run npm run build first.
// MOCK_BROWSER=chromium (and MOCK_BROWSER_PATH) where there's no WebKit.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
const POST = '/r/pics/comments/1q2c001/welcome_to_rpics/';

// name: [path, its environment]
const SHOTS = {
  feed: ['/', {}],
  subreddit: ['/r/pics/', {}],
  post: [POST, {}],
  menu: ['/', { MOCK_TAP: 'Menu' }],
  account: ['/', { MOCK_TAP: 'Account' }],
  profile: ['/user/someone/', {}],
  dark: [POST, { MOCK_DARK: '1' }],
  wide: ['/', { MOCK_WIDTH: '1280' }],
};

mkdirSync(OUT, { recursive: true });
for (const [name, [path, env]] of Object.entries(SHOTS)) {
  execFileSync('node', ['scripts/mock.mjs', path], {
    env: { ...process.env, MOCK_PICTURES: '1', MOCK_SHOT: `${OUT}/${name}.png`, ...env },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log(`${OUT}/${name}.png`);
}
