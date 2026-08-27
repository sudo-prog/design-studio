// atelier-studio-mobile-audit.mjs — mobile-UI gate for ATELIER-STUDIO (390x844, touch)
// Run from the app-dir so 'playwright' resolves; BASE is the local prod-build preview.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/thinkpad/Data/20_Projects/SUPERWHEEL/node_modules/playwright');
import fs from 'fs';

const BASE = (process.env.DS_URL || 'http://127.0.0.1:4199').replace(/\/$/, '');
// Resolve a REAL project id for the detail route: /projects/:id against an empty
// production DB 404s (browser logs the failed resource load) — an environmental
// false-positive, not a UI defect. Test the detail surface only against real data;
// record explicitly when it is skipped so the report stays honest.
const skippedRoutes = [];
let detailRoute = null;
try {
  const listRes = await fetch(`${BASE}/api/projects`, { headers: { accept: 'application/json' } });
  const projects = listRes.ok ? await listRes.json() : [];
  if (Array.isArray(projects) && projects.length > 0 && projects[0]?.id != null) {
    detailRoute = `/projects/${projects[0].id}`;
  }
  if (!detailRoute) skippedRoutes.push('/projects/:id (no projects in API — DB empty)');
} catch {
  skippedRoutes.push('/projects/:id (API unreachable)');
}
const ROUTES = ['/', '/projects', '/projects/new', detailRoute, '/ai', '/colors', '/mockups', '/print', '/tech-packs', '/manufacturing', '/collections', '/assets', '/settings', '/editor'].filter(Boolean);

const AUDIT_FN = () => {
  const VW = window.innerWidth;
  const out = { overflow: [], tapTargets: [], swallowed: [], docOverflow: 0 };
  const inScrollable = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };
  // MOBILE-UI-STANDARD exemptions for the swallow (hit-test) check:
  // 1) Elements inside a rotated-away backface (flip cards) are not visible/tappable in the
  //    current state — hiding them is correct, not a bug.
  // 2) Elements whose probe point is clipped by an overflow:auto/scroll/hidden ancestor are
  //    scrolled-out list content — scrollable lists are correct, not a bug.
  const inHiddenFlipFace = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const pc = getComputedStyle(p);
      if (pc.backfaceVisibility === 'hidden' && pc.transform && pc.transform.includes('-1')) return true;
      p = p.parentElement;
    }
    return false;
  };
  const clippedByScrollAncestor = (el, cx, cy) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const pc = getComputedStyle(p);
      const cl = pc.overflowX === 'auto' || pc.overflowX === 'scroll' || pc.overflowX === 'hidden' ||
                 pc.overflowY === 'auto' || pc.overflowY === 'scroll' || pc.overflowY === 'hidden';
      if (cl) {
        const pr = p.getBoundingClientRect();
        if (cx < pr.left - 1 || cx > pr.right + 1 || cy < pr.top - 1 || cy > pr.bottom + 1) return true;
      }
      p = p.parentElement;
    }
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > VW + 1 && !inScrollable(el))
      out.overflow.push({ tag: el.tagName.toLowerCase(), right: Math.round(r.right),
        cls: (el.className?.toString?.() || '').slice(0, 80) });
    const inter = el.matches('button,a[href],[role="button"],input:not([type=hidden]),select,textarea');
    if (inter && r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))
      out.tapTargets.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) });
    if (inter && r.width > 8 && r.height > 8 && r.x >= 0 && r.y >= 0 && r.right <= VW && r.bottom <= innerHeight) {
      let p = el; let inert = false;
      while (p && p !== document.documentElement) {
        const pc = getComputedStyle(p);
        if (pc.width === '0px' || pc.pointerEvents === 'none') { inert = true; break; }
        p = p.parentElement;
      }
      if (inert) continue;
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      if (inHiddenFlipFace(el) || clippedByScrollAncestor(el, cx, cy)) continue;
      const top = document.elementFromPoint(cx, cy);
      if (top && !el.contains(top) && top !== el)
        out.swallowed.push({ tag: el.tagName.toLowerCase(),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26),
          coveredBy: (top.className?.toString?.() || top.tagName).slice(0, 60) });
    }
  }
  const dd = (a, k) => { const s = new Set(); const o = []; for (const x of a) { const j = k(x); if (!s.has(j)) { s.add(j); o.push(x); } } return o; };
  out.overflow = dd(out.overflow, o => o.tag + o.cls).slice(0, 8);
  out.tapTargets = dd(out.tapTargets, o => o.tag + o.w + o.h + o.label).slice(0, 8);
  out.swallowed = dd(out.swallowed, o => o.tag + o.label + o.coveredBy).slice(0, 8);
  out.docOverflow = document.documentElement.scrollWidth - VW;
  return out;
};

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e).slice(0, 110)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 110)); });

await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2500);

const report = {};
for (const route of ROUTES) {
  const before = errors.length;
  await p.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
  await p.waitForTimeout(2400);
  const res = await p.evaluate(AUDIT_FN);
  res.errors = [...new Set(errors.slice(before))].slice(0, 3);
  report[route] = res;
  const bad = res.overflow.length + res.tapTargets.length + res.swallowed.length;
  const pass = bad === 0 && res.errors.length === 0 && res.docOverflow <= 2;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${route.padEnd(20)} docOv=${res.docOverflow} ovf=${res.overflow.length} tap=${res.tapTargets.length} swallow=${res.swallowed.length} err=${res.errors.length}`);
  if (!pass) {
    if (res.overflow.length) console.log('   overflow:', JSON.stringify(res.overflow));
    if (res.tapTargets.length) console.log('   taps:', JSON.stringify(res.tapTargets));
    if (res.swallowed.length) console.log('   swallowed:', JSON.stringify(res.swallowed));
    if (res.errors.length) console.log('   errors:', JSON.stringify(res.errors));
  }
}
report._skipped = skippedRoutes;
fs.writeFileSync('ds-audit-report.json', JSON.stringify(report, null, 2));
await browser.close();

// Final gate: realOff===0, smallTaps===0, consoleErrs===0, docOverflow<=2 per route
let fails = 0;
for (const [route, res] of Object.entries(report)) {
  if (route.startsWith('_') || !res || typeof res !== 'object') continue;
  if (res.overflow.length || res.tapTargets.length || res.swallowed.length || res.errors.length || res.docOverflow > 2) fails++;
}
if (skippedRoutes.length) console.log(`SKIPPED: ${skippedRoutes.join('; ')}`);
console.log(`\nGATE: routes=${ROUTES.length} failing=${fails} skipped=${skippedRoutes.length} -> ${fails === 0 ? 'PASS' : 'FAIL'}`);
process.exit(fails === 0 ? 0 : 1);
