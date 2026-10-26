// Smoke test of the static demo build (scripts/build-demo.sh): a vote, an
// acceptance, the AI planner's flow, the rule-range check and Hebrew.
// Run with scripts/e2e/run-demo.sh.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const { chromium } = createRequire(import.meta.url)('playwright');
const FILE = process.env.DEMO_URL ?? 'http://127.0.0.1:4173/chayolei-new-ui.html';
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
const browser = await chromium.launch();
const errors = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  // Performance budget (UX_REDESIGN.md phase 10): what the first screen loads, gzipped.
  const BUDGET = { js: 160_000, total: 200_000 };
  const loaded = [];
  page.on('response', async r => {
    if (!r.url().startsWith(new URL(FILE).origin)) return;
    try { const body = await r.body(); loaded.push({ url: r.url(), gz: gzipSync(body).length }); } catch { /* redirects, aborted */ }
  });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const confirm = async () => {
    const d = page.locator('dialog:has(button.sign)');
    await d.locator('button.sign').click();
    await d.waitFor({ state: 'detached', timeout: 15000 });
  };
  await page.goto(FILE + '#/');
  await page.getByText('Needs you').first().waitFor({ timeout: 20000 });
  await page.waitForLoadState('networkidle');
  const js = loaded.filter(f => f.url.endsWith('.js')).reduce((n, f) => n + f.gz, 0);
  const total = loaded.reduce((n, f) => n + f.gz, 0);
  console.log(`first screen: ${(js / 1000).toFixed(0)} kB JS, ${(total / 1000).toFixed(0)} kB in all (gzip)`);
  if (js > BUDGET.js || total > BUDGET.total) throw new Error(`over the performance budget (${BUDGET.js / 1000} kB JS, ${BUDGET.total / 1000} kB in all)`);
  await shot(page, 'demo-01-home');

  // Notifications: what's waiting, and news since last time.
  await page.getByRole('button', { name: /^Notifications/ }).click();
  await page.getByText('waiting on you').first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(300); // past the panel's fade-in
  await shot(page, 'demo-01b-notifications');
  await page.keyboard.press('Escape');

  // Mendel votes on the open rule change.
  await page.goto(FILE + '#/decide');
  await page.locator('a[href*="/decide/p/"]').first().click();
  await page.getByRole('button', { name: 'For', exact: true }).click();
  await confirm();
  await page.getByText('Vote recorded').first().waitFor({ timeout: 10000 }).catch(() => {});
  await shot(page, 'demo-02-voted');

  // Mendel accepts the reviewed chapter.
  await page.goto(FILE + '#/');
  await page.locator('a[href*="/review/"]').first().click();
  await page.getByRole('button', { name: 'Accept & pay' }).first().click();
  await confirm();
  await page.getByText('Accepted and paid').first().waitFor({ timeout: 10000 });
  await shot(page, 'demo-03-accepted');

  // The AI planner (a labelled sample in the demo): suggest, edit, add; the
  // added deliverables show as AI-assisted in the plan and the ledger.
  await page.goto(FILE + '#/plan');
  await page.getByRole('link', { name: 'Rashi companion' }).first().click();
  await page.getByRole('button', { name: 'Suggest deliverables' }).first().click();
  const planner = page.locator('dialog[open]');
  await planner.getByRole('button', { name: 'Suggest', exact: true }).click();
  await planner.getByText('A sample breakdown, not from an AI.').waitFor({ timeout: 5000 });
  await planner.getByRole('checkbox', { name: 'Include' }).nth(3).uncheck();
  await planner.getByLabel('Title').first().fill('Rashi: scope and sources');
  await page.waitForTimeout(300);
  await shot(page, 'demo-05-planner');
  await planner.getByRole('button', { name: 'Add 3 to the plan' }).click();
  await page.getByText('Added 3 to the plan, marked AI-assisted').first().waitFor({ timeout: 5000 });
  await page.getByRole('link', { name: 'Rashi: scope and sources' }).first().click();
  await page.getByRole('heading', { level: 1, name: 'Rashi: scope and sources' }).waitFor({ timeout: 5000 });
  await page.locator('main .dh').getByText('AI-assisted').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400); // past the view transition
  await shot(page, 'demo-06-ai-assisted');
  await page.goto(FILE + '#/ledger');
  await page.getByText('“Rashi: scope and sources” from the AI planner’s suggestion').first().waitFor({ timeout: 5000 });

  // The proposal form refuses a 100% majority.
  await page.goto(FILE + '#/decide');
  await page.getByRole('button', { name: 'Propose a rule change' }).click();
  await page.locator('dialog[open] select').selectOption('majority_pct');
  await page.locator('dialog[open] input[type=number]').fill('100');
  const disabled = await page.locator('dialog[open] button[type=submit]').isDisabled();
  console.log('submit disabled at 100% majority:', disabled);
  await page.getByText('From 50 to 99.').first().waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');

  // Hebrew.
  await page.goto(FILE + '#/ledger');
  await page.getByText('Ledger').first().waitFor({ timeout: 10000 });
  await page.evaluate(() => { localStorage.setItem('chayolei-ui-v1', JSON.stringify({ locale: 'he', theme: 'dark' })); });
  await page.reload();
  await page.getByText('פנקס').first().waitFor({ timeout: 10000 });
  await shot(page, 'demo-04-ledger-he');
  if (!disabled) throw new Error('a 100% majority should not be proposable');
  if (errors.length) throw new Error('console errors:\n' + errors.join('\n'));
  console.log('OK: demo flows, no console errors');
} finally {
  await browser.close();
}
