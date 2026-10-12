/* www.reddit.com's CSS variables, as JSON on the clipboard: paste into
   Safari's console on www.reddit.com (light theme), then save the clipboard
   as docs/reddit-vars.json. Our tokens (src/styles/tokens.css) come from it. */

(() => {
  const names = new Set(), sheets = [...document.styleSheets, ...(document.adoptedStyleSheets || [])];
  const scan = (t) => { for (const m of t.matchAll(/--[\w-]+/g)) names.add(m[0]); };
  document.querySelectorAll('*').forEach((el) => el.shadowRoot && sheets.push(...el.shadowRoot.styleSheets, ...el.shadowRoot.adoptedStyleSheets));
  for (const s of sheets) { try { for (const r of s.cssRules) scan(r.cssText); } catch {} }
  scan(document.documentElement.outerHTML);
  const cs = getComputedStyle(document.querySelector('shreddit-app') || document.body), vars = {};
  for (const n of [...names].sort()) { const v = cs.getPropertyValue(n).trim(); if (v) vars[n] = v; }
  vars['font (body)'] = getComputedStyle(document.body).fontFamily;
  copy(JSON.stringify(vars, null, 1));
  return Object.keys(vars).length + ' copied';
})()
