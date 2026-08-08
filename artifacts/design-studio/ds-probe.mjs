// ds-probe.mjs — focused dump of tap-target inputs, swallow candidates, failing requests
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/thinkpad/Data/20_Projects/SUPERWHEEL/node_modules/playwright');

const BASE = 'http://127.0.0.1:4199';
const ROUTES = ['/', '/projects/new', '/ai', '/mockups', '/collections', '/manufacturing', '/projects'];

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const reqs = [];
p.on('requestfailed', r => reqs.push('FAILED ' + r.url().slice(0, 100) + ' ' + (r.failure()?.errorText || '')));
p.on('response', r => { if (r.status() >= 400) reqs.push('HTTP' + r.status() + ' ' + r.url().slice(0, 100)); });

await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2500);

for (const route of ROUTES) {
  reqs.length = 0;
  await p.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
  await p.waitForTimeout(2200);
  const data = await p.evaluate(() => {
    const VW = window.innerWidth;
    const out = { inputs: [], swallow: [], small: [] };
    for (const el of document.querySelectorAll('body input, body button, body a, body select, body textarea, body [role="button"]')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) {
        out.small.push({
          tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', cls: (el.className?.toString?.() || '').slice(0, 90),
          w: Math.round(r.width), h: Math.round(r.height),
          ph: (el.getAttribute('placeholder') || '').slice(0, 30), txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20),
          visible: r.x >= -1 && r.right <= VW + 1 && r.y >= -1 && r.bottom <= innerHeight + 1
        });
      }
      if (r.width >= 44 && r.height >= 44 && r.x >= 0 && r.y >= 0 && r.right <= VW && r.bottom <= innerHeight) {
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (top && top !== el && !el.contains(top)) {
          const tc = getComputedStyle(top);
          out.swallow.push({
            el: el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20),
            coveredBy: (top.tagName.toLowerCase() + '.' + (top.className?.toString?.() || '').slice(0, 70)),
            topPE: tc.pointerEvents, topZ: tc.zIndex, elZ: getComputedStyle(el).zIndex,
            rects: { el: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], top: [Math.round(top.getBoundingClientRect().x), Math.round(top.getBoundingClientRect().y), Math.round(top.getBoundingClientRect().width), Math.round(top.getBoundingClientRect().height)] }
          });
        }
      }
    }
    return out;
  });
  console.log('=== ' + route + ' ===');
  console.log('  reqs:', reqs.slice(0, 6));
  for (const s of data.small) console.log('  SMALL', s.tag, s.type, 'h=' + s.h, 'w=' + s.w, 'vis=' + s.visible, 'ph="' + s.ph + '"', 'txt="' + s.txt + '"', 'cls=' + s.cls);
  for (const s of data.swallow) console.log('  SWALLOW', JSON.stringify(s));
}
await browser.close();
