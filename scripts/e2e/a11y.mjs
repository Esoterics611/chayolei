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
  // Demo ids are random per browser: every context gets this one's sample
  // data, so the screens behind the collected links exist there too.
  const demo = await page.evaluate(() => localStorage.getItem('chayolei-demo-v1'));
  if (!demo) throw new Error('the demo saved no data');

  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    for (const locale of ['en', 'he']) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport });
        await ctx.addInitScript(([l, th, data]) => {
          localStorage.setItem('chayolei-ui-v1', JSON.stringify({ locale: l, theme: th }));
          localStorage.setItem('chayolei-demo-v1', data);
        }, [locale, theme, demo]);
        const p = await ctx.newPage();
        for (const r of routes) {
          await p.goto(BASE + '#' + r);
          await p.locator('main').first().waitFor();
          // Each screen's stylesheet loads with it: audit only what people see.
          await p.waitForLoadState('networkidle');
          await p.waitForFunction(() => getComputedStyle(document.querySelector('.ui')).fontFamily.includes('Plex'));
          await p.waitForTimeout(150);
          if (await p.getByText(/^(That item doesn’t exist any more|הפריט הזה כבר לא קיים)/).count()) throw new Error(`${r} shows "not found" (${locale} ${theme} ${size})`);
          await audit(p, `${r} ${locale} ${theme} ${size}`);
        }
        // The AI planner's dialog, holding a suggestion to edit.
        const objective = routes.find(r => r.startsWith('/plan/'));
        if (objective) {
          await p.goto(BASE + '#' + objective);
          await p.getByRole('button', { name: /Suggest deliverables|הצעת תוצרים/ }).first().click();
          await p.locator('dialog[open] .form-actions .btn-primary').click();
          await p.locator('dialog[open] fieldset').first().waitFor();
          await p.waitForTimeout(250);
          await audit(p, `planner dialog ${locale} ${theme} ${size}`);
        }
        // The first-pass reviewer's notes and the source finder's results (samples in the demo),
        // on the round waiting for the acting lead's acceptance.
        await p.goto(BASE + '#/');
        const round = await p.locator('main a[href*="/review/"]').first().getAttribute('href');
        await p.goto(BASE + round);
        await p.locator('main .actions .helper').click();
        await p.locator('dialog[open] .form-actions .btn-primary').click();
        await p.locator('dialog[open] .items').waitFor();
        await p.waitForTimeout(250);
        await audit(p, `first-pass dialog ${locale} ${theme} ${size}`);
        await p.goto(BASE + round.replace(/\/review\/.*$/, '/thread'));
        await p.locator('main .helpers .btn').first().click();
        await p.locator('dialog[open] .form-actions .btn-primary').click();
        await p.locator('dialog[open] .items').waitFor();
        await p.waitForTimeout(250);
        await audit(p, `sources dialog ${locale} ${theme} ${size}`);
        // The role-change dialog, with a member picked and a role added.
        await p.goto(BASE + '#/decide/members');
        await p.getByRole('button', { name: /^(Change roles|שינוי תפקידים)$/ }).nth(1).click();
        await p.locator('dialog[open] fieldset input[type=checkbox]').first().waitFor();
        await p.locator('dialog[open] fieldset input[type=checkbox]:not(:checked)').first().check();
        await p.waitForTimeout(250);
        await audit(p, `roles dialog ${locale} ${theme} ${size}`);
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
