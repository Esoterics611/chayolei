/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Shows the live app's push notifications (src/lib/server/push.ts) and opens
// what they are about. Registered only when a member turns push on; it
// caches nothing, so the app always loads fresh.

const sw = self as unknown as ServiceWorkerGlobalScope;

interface Payload { title?: string; body?: string; url?: string; tag?: string }

sw.addEventListener('push', event => {
  let p: Payload = {};
  try { p = event.data?.json() ?? {}; } catch { p = { body: event.data?.text() }; }
  event.waitUntil(sw.registration.showNotification(p.title || 'Chayolei', {
    body: p.body ?? '', tag: p.tag, icon: '/favicon.svg', badge: '/favicon.svg', data: { url: p.url ?? '/' },
  }));
});

sw.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = String(event.notification.data?.url ?? '/');
  const url = new URL(path.startsWith('/') ? path : '/', sw.location.origin).href;
  event.waitUntil((async () => {
    const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find(w => new URL(w.url).origin === sw.location.origin) as WindowClient | undefined;
    if (open) {
      await open.navigate(url).catch(() => undefined);
      return open.focus();
    }
    return sw.clients.openWindow(url);
  })());
});
