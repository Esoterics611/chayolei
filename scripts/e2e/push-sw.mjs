// The push service worker (src/service-worker.ts) in Chromium: a push message
// delivered through the DevTools protocol becomes a notification with the
// payload's title, text and link. Run with scripts/e2e/run-push-sw.sh.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const ORIGIN = process.env.SW_ORIGIN ?? 'http://127.0.0.1:4174';
// Full Chromium (new headless): the lighter headless shell has no notifications.
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const context = await browser.newContext();
  await context.grantPermissions(['notifications'], { origin: ORIGIN });
  const page = await context.newPage();
  await page.goto(ORIGIN + '/favicon.svg');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
  });
  const cdp = await context.newCDPSession(page);
  const regs = new Promise(resolve => cdp.on('ServiceWorker.workerRegistrationUpdated', e => { if (e.registrations.length) resolve(e.registrations); }));
  await cdp.send('ServiceWorker.enable');
  const [reg] = await regs;
  const payload = { title: 'Brachos Translation Group', body: '“Chapter 1” waits for your review', url: '/d/abc/review/c1', tag: 'review:c1' };
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: ORIGIN, registrationId: reg.registrationId, data: JSON.stringify(payload) });
  let shown = [];
  for (let i = 0; i < 40 && !shown.length; i++) {
    await page.waitForTimeout(100);
    shown = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications())
      .map(n => ({ title: n.title, body: n.body, tag: n.tag, url: n.data?.url })));
  }
  console.log(JSON.stringify(shown));
  const n = shown[0];
  if (!n || n.title !== payload.title || n.body !== payload.body || n.tag !== payload.tag || n.url !== payload.url) {
    throw new Error('the service worker did not show the pushed notification');
  }
  console.log('OK: push message shown as a notification');
} finally {
  await browser.close();
}
