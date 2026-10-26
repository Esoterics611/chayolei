// End-to-end check of the live app (VITE_TEAM_BACKEND=firestore) against the
// Firebase emulators, with two simulated browser wallets: sign in, start a
// team, invite, join, pass a budget by vote, take work, version it, review,
// accept and pay. Run it with scripts/e2e/run-live.sh.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const { Wallet, getBytes } = createRequire(new URL('../../package.json', import.meta.url))('ethers');

const BASE = process.env.BASE ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
export const mendelKey = '0x' + '11'.repeat(32);
export const leviKey = '0x' + '22'.repeat(32);

export async function userContext(browser, key) {
  const wallet = new Wallet(key);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.exposeFunction('__sign', async (hex) => wallet.signMessage(getBytes(hex)));
  await ctx.addInitScript(({ address }) => {
    window.ethereum = {
      isMetaMask: true,
      async request({ method, params }) {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
        if (method === 'eth_chainId') return '0x14a34';
        if (method === 'net_version') return '84532';
        if (method === 'personal_sign') return window.__sign(params[0]);
        throw new Error('unsupported ' + method);
      },
      on() {}, removeListener() {},
    };
  }, { address: wallet.address.toLowerCase() });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log(`[${wallet.address.slice(0, 6)} console]`, m.text()); });
  page.on('pageerror', e => console.log(`[${wallet.address.slice(0, 6)} pageerror]`, e.message));
  return { ctx, page, wallet };
}

export const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null);

export async function confirmSign(page) {
  const dialog = page.locator('dialog:has(button.sign)');
  await dialog.locator('button.sign').click();
  await dialog.waitFor({ state: 'detached', timeout: 20000 });
}

// A clean slate in the emulators.
const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-chayolei';
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

const browser = await chromium.launch();
try {
  // ── Mendel signs in and starts a team ──
  const m = await userContext(browser, mendelKey);
  await m.page.goto(BASE + '/');
  await m.page.getByRole('button', { name: 'Sign in with your wallet' }).click();
  await m.page.getByText('You’re not in a team yet').waitFor({ timeout: 20000 });
  await shot(m.page, '01-no-team');
  await m.page.getByRole('link', { name: 'Start a team' }).click();
  await m.page.getByLabel('Team name').fill('Brachos Translation Group');
  await m.page.getByLabel('Purpose').fill('Translate and publish Brachos by Nisan.');
  await m.page.getByLabel('Your name').fill('Mendel Katz');
  await m.page.getByRole('button', { name: 'Continue' }).click();
  await m.page.getByRole('button', { name: 'Continue' }).click();
  await shot(m.page, '02-start-step3');
  await m.page.getByRole('button', { name: 'Create team' }).click();
  await confirmSign(m.page);
  const inviteDialog = m.page.getByRole('dialog');
  await inviteDialog.locator('code').waitFor({ timeout: 20000 });
  const link = (await inviteDialog.locator('code').textContent()).trim();
  console.log('invite link:', link);
  await shot(m.page, '03-invite');
  await inviteDialog.getByRole('button', { name: 'Done' }).click();

  // ── Levi opens the link, signs in and joins ──
  const l = await userContext(browser, leviKey);
  await l.page.goto(link);
  await l.page.getByText('Translate and publish Brachos by Nisan.').waitFor({ timeout: 20000 });
  await shot(l.page, '04-join');
  await l.page.getByRole('button', { name: 'Sign in to join' }).click();
  await l.page.getByLabel('Your name').fill('Levi Stern');
  await l.page.getByRole('button', { name: 'Join the team' }).click();
  await l.page.waitForURL(BASE + '/', { timeout: 20000 });
  await l.page.getByText('Brachos Translation Group').first().waitFor();
  await shot(l.page, '05-levi-home');

  // Mendel sees Levi join without reloading.
  await m.page.goto(BASE + '/decide/members');
  await m.page.getByText('Levi Stern').waitFor({ timeout: 20000 });
  await shot(m.page, '06-members');
  console.log('OK: sign in, start a team, invite, join');

  // ── An objective, and a budget passed by both members' votes ──
  const dlg = (page) => page.locator('dialog[open]').last();
  await m.page.goto(BASE + '/plan');
  await m.page.getByRole('button', { name: 'New objective' }).first().click();
  await dlg(m.page).getByLabel('Title').fill('Volume 1');
  await dlg(m.page).locator('button[type=submit]').click();
  await m.page.waitForURL(/\/plan\/[^/]+$/, { timeout: 20000 });
  const objectiveId = m.page.url().split('/').pop();
  await m.page.goto(BASE + '/decide');
  await m.page.getByRole('button', { name: 'Request money' }).click();
  await dlg(m.page).getByText('Set an objective’s budget').click();
  await dlg(m.page).getByLabel('New budget (TMIM)').fill('5000');
  await dlg(m.page).getByLabel('Why').fill('Ten chapters at 500 TMIM.');
  await dlg(m.page).locator('button[type=submit]').click();
  await confirmSign(m.page);
  await m.page.waitForURL(/\/decide\/p\//, { timeout: 20000 });
  const budgetUrl = m.page.url();
  await m.page.getByRole('button', { name: 'For', exact: true }).click();
  await confirmSign(m.page);
  await l.page.goto(budgetUrl);
  await l.page.getByRole('button', { name: 'For', exact: true }).click();
  await confirmSign(l.page);
  await l.page.getByText('Passed').first().waitFor({ timeout: 20000 });
  await shot(l.page, '07-budget-passed');
  console.log('OK: budget passed by vote');

  // ── A deliverable; Levi takes it, writes v1 and asks for review ──
  await m.page.goto(BASE + '/plan/' + objectiveId);
  await m.page.getByRole('button', { name: 'New deliverable' }).first().click();
  await dlg(m.page).getByLabel('Title').fill('Chapter 1');
  await dlg(m.page).locator('button[type=submit]').click();
  await dlg(m.page).waitFor({ state: 'detached', timeout: 20000 });
  await l.page.goto(BASE + '/plan/' + objectiveId);
  await l.page.getByRole('button', { name: 'Take' }).first().click({ timeout: 20000 });
  await l.page.getByText('Taken').first().waitFor({ timeout: 20000 }).catch(() => {});
  const dHref = await l.page.locator('a[href^="/d/"]').first().getAttribute('href');
  const deliverableId = dHref.split('/')[2];
  await l.page.goto(BASE + `/d/${deliverableId}/edit`);
  await l.page.locator('textarea.doc-input').fill('Blessed are You, who opens the gates of dawn.\n\nThe second paragraph, with its source.');
  await l.page.locator('button.btn-primary.btn-block').click();
  await l.page.waitForURL(/\/review\//, { timeout: 20000 });
  const reviewUrl = l.page.url();
  await shot(l.page, '08-review-requested');
  console.log('OK: version saved and review requested');

  // ── Mendel reviews, accepts and pays ──
  await m.page.goto(reviewUrl);
  await m.page.getByRole('button', { name: 'Mark reviewed' }).click();
  await m.page.getByRole('button', { name: 'Accept & pay' }).first().click({ timeout: 20000 });
  await confirmSign(m.page);
  await m.page.getByText('Accepted').first().waitFor({ timeout: 20000 });
  await shot(m.page, '09-accepted');

  await l.page.goto(BASE + '/wallet');
  await l.page.getByText('1,200').first().waitFor({ timeout: 20000 });
  await shot(l.page, '10-levi-wallet');
  await m.page.goto(BASE + '/ledger');
  await m.page.locator('button.proof-btn').first().click({ timeout: 20000 });
  await m.page.getByText('Not on-chain yet', { exact: false }).first().waitFor({ timeout: 10000 });
  await shot(m.page, '11-ledger');
  console.log('OK: accepted and paid; Levi holds 1,200 TMIM');
} finally {
  await browser.close();
}
