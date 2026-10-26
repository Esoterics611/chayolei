// Accessibility audit of the new UI (UX_REDESIGN.md phase 10): axe-core on
// every screen of the static demo, in English and Hebrew, light and dark,
// desktop and phone. Fails on any violation of WCAG 2.2 A/AA rules.
// Run with scripts/e2e/run-a11y.sh.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = readFileSync(createRequire(new URL('../../package.json', import.meta.url)).resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.DEMO_URL ?? 'http://127.0.0.1:4173/chayolei-new-ui.html';
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const browser = await chromium.launch();
const problems = new Map();

async function audit(page, label) {
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(async () =>
    // @ts-ignore
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
  for (const v of result.violations) {
    const key = `${v.id}: ${v.help}`;
    const entry = problems.get(key) ?? { impact: v.impact, where: new Set(), nodes: new Set() };
    entry.where.add(label);
    for (const n of v.nodes.slice(0, 3)) entry.nodes.add(n.target.join(' ') + (n.failureSummary ? ` — ${n.failureSummary.split('\n')[1]?.trim() ?? ''}` : ''));
    problems.set(key, entry);
  }
}

try {
  // Collect the routes from the demo's own links.
  const page = await (await browser.newContext({ viewport: VIEWPORTS.desktop })).newPage();
  await page.goto(BASE + '#/plan');
  await page.getByText('Needs you').or(page.locator('main h1')).first().waitFor({ timeout: 20000 });
  const links = async () => page.$$eval('a[href^="#/"]', as => as.map(a => a.getAttribute('href')));
  const found = new Set(await links());
  await page.goto(BASE + '#/decide/log');
  await page.locator('main h1').first().waitFor();
  for (const l of await links()) found.add(l);
  const pick = (re) => [...found].find(h => re.test(h));
  const d = pick(/^#\/d\/[^/]+$/)?.slice(2);
  const routes = ['/', '/plan', pick(/^#\/plan\/./)?.slice(1), '/work', `/${d}`, `/${d}/work`, `/${d}/tasks`, `/${d}/reviews`,
    `/${d}/thread`, `/${d}/history`, `/${d}/edit`, pick(/^#\/d\/[^/]+\/review\//)?.slice(1), '/decide', '/decide/log',
    '/decide/charter', '/decide/members', pick(/^#\/decide\/p\//)?.slice(1), '/treasury', '/ledger', '/ledger/money', '/wallet', '/start']
    .filter(Boolean);
  console.log(`Auditing ${routes.length} routes × 2 languages × 2 themes × 2 sizes`);

  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    for (const locale of ['en', 'he']) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport });
        await ctx.addInitScript(([l, th]) => localStorage.setItem('chayolei-ui-v1', JSON.stringify({ locale: l, theme: th })), [locale, theme]);
        const p = await ctx.newPage();
        for (const r of routes) {
          await p.goto(BASE + '#' + r);
          await p.locator('main').first().waitFor();
          // Each screen's stylesheet loads with it: audit only what people see.
          await p.waitForLoadState('networkidle');
          await p.waitForFunction(() => getComputedStyle(document.querySelector('.ui')).fontFamily.includes('Plex'));
          await p.waitForTimeout(150);
          await audit(p, `${r} ${locale} ${theme} ${size}`);
        }
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (problems.size) {
  for (const [key, e] of problems) {
    console.log(`\n[${e.impact}] ${key}\n  on ${e.where.size} views, e.g. ${[...e.where].slice(0, 3).join('; ')}`);
    for (const n of [...e.nodes].slice(0, 4)) console.log(`  · ${n}`);
  }
  console.log(`\n${problems.size} kinds of violation`);
  process.exit(1);
}
console.log('OK: no WCAG A/AA violations found by axe');
