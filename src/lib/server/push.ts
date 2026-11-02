// ═══════════════════════════════════════════════════════════════
// Push notifications while Chayolei is closed (docs/TEAM_BACKEND.md §6c)
//
// Only what blocks someone or is about to expire (src/lib/team/push.ts),
// each item once per member, to the devices they turned it on for. After
// every action on a team the server looks at what now waits on whom; a
// sweep every few minutes catches votes coming within a day of closing.
//
//   pushSubscriptions/{sha256(endpoint)}  { uid, subscription, locale }   server only
//   teams/{id}/system/push                { sent: { [memberId]: [keys] } }
//
// Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (a secret) and VAPID_SUBJECT
// (a mailto: or https: contact). Without them push is off and the app says so.
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import { env } from '$env/dynamic/private';
import { adminDb } from '$lib/server/firebase-admin';
import { loadTeam } from '$lib/server/teams';
import { payloadOf, pushItems } from '$lib/team/push';
import type { PushItem, PushPayload } from '$lib/team/push';
import { activeMembers } from '$lib/team/rules';
import { DomainError } from '$lib/team/types';
import type { Locale } from '$lib/team/types';

const subs = () => adminDb.collection('pushSubscriptions');
const MAX_DEVICES = 10;

export interface StoredSubscription {
  uid: string;
  subscription: PushSubscription;
  locale: Locale;
  createdAt: string;
}

/** Sends one payload; resolves to the push service's status code. */
export type Sender = (subscription: PushSubscription, payload: PushPayload, urgent: boolean) => Promise<number>;

let configured: boolean | null = null;
function vapid(): boolean {
  if (configured !== null) return configured;
  const pub = env.VAPID_PUBLIC_KEY, priv = env.VAPID_PRIVATE_KEY, subject = env.VAPID_SUBJECT;
  configured = !!(pub && priv && subject);
  if (configured) webpush.setVapidDetails(subject!, pub!, priv!);
  return configured;
}

/** What the browser needs to subscribe, or that push is off on this server. */
export const pushInfo = () => (vapid() ? { enabled: true, publicKey: env.VAPID_PUBLIC_KEY } : { enabled: false });

const webSender: Sender = async (subscription, payload, urgent) => {
  try {
    const r = await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 24 * 3600, urgency: urgent ? 'high' : 'normal' });
    return r.statusCode;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status) return status;
    throw e;
  }
};

const docId = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');

function readSubscription(raw: unknown): PushSubscription {
  const s = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const ok = !!s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') && s.endpoint.length < 1000
    && typeof s.keys?.p256dh === 'string' && s.keys.p256dh.length < 200 && typeof s.keys?.auth === 'string' && s.keys.auth.length < 100;
  if (!ok) throw new DomainError('err.invalid_input');
  return { endpoint: s!.endpoint as string, keys: { p256dh: s!.keys!.p256dh as string, auth: s!.keys!.auth as string } };
}

/** Turn push on for one of the member's devices. */
export async function subscribe(uid: string, raw: unknown, locale: unknown): Promise<void> {
  if (!vapid()) throw new DomainError('err.push.unavailable');
  const subscription = readSubscription(raw);
  const mine = await subs().where('uid', '==', uid).get();
  if (mine.size >= MAX_DEVICES && !mine.docs.some(d => d.id === docId(subscription.endpoint))) throw new DomainError('err.push.devices', { n: MAX_DEVICES });
  const doc: StoredSubscription = { uid, subscription, locale: locale === 'he' ? 'he' : 'en', createdAt: new Date().toISOString() };
  await subs().doc(docId(subscription.endpoint)).set(doc);
}

/** Turn push off for a device (only its owner can). */
export async function unsubscribe(uid: string, endpoint: unknown): Promise<void> {
  if (typeof endpoint !== 'string') throw new DomainError('err.invalid_input');
  const ref = subs().doc(docId(endpoint));
  const snap = await ref.get();
  if (snap.exists && snap.get('uid') === uid) await ref.delete();
}

/**
 * Send each member of the team what newly waits on them, once. Items that no
 * longer wait are forgotten, so a new round of the same thing is sent again.
 */
export async function notifyTeam(teamId: string, send: Sender = webSender, now = new Date().toISOString()): Promise<number> {
  if (send === webSender && !vapid()) return 0;
  const team = await loadTeam(teamId);
  const people = activeMembers(team).filter(m => !m.ai);
  if (!people.length) return 0;
  const devices = new Map<string, StoredSubscription[]>();
  for (let i = 0; i < people.length; i += 30) {
    const snap = await subs().where('uid', 'in', people.slice(i, i + 30).map(m => m.id)).get();
    for (const d of snap.docs) {
      const s = d.data() as StoredSubscription;
      devices.set(s.uid, [...(devices.get(s.uid) ?? []), s]);
    }
  }
  if (!devices.size) return 0;

  // Claim what to send in a transaction, so two servers never send the same item twice.
  const ref = adminDb.collection('teams').doc(teamId).collection('system').doc('push');
  const toSend = await adminDb.runTransaction(async tx => {
    const sent = ((await tx.get(ref)).data()?.sent ?? {}) as Record<string, string[]>;
    const next: Record<string, string[]> = {};
    const out: { device: StoredSubscription; item: PushItem }[] = [];
    for (const [uid, list] of devices) {
      const byLocale = new Map<Locale, PushItem[]>();
      const items = (l: Locale) => byLocale.get(l) ?? byLocale.set(l, pushItems(team, uid, now, l)).get(l)!;
      const current = items('en').map(x => x.key);
      const before = new Set(sent[uid] ?? []);
      next[uid] = current;
      for (const device of list) for (const item of items(device.locale)) if (!before.has(item.key)) out.push({ device, item });
    }
    for (const uid of Object.keys(sent)) if (!(uid in next)) next[uid] = sent[uid];
    tx.set(ref, { sent: next, at: now });
    return out;
  });

  let delivered = 0;
  for (const { device, item } of toSend) {
    try {
      const status = await send(device.subscription, payloadOf(item), item.urgent);
      if (status === 404 || status === 410) await subs().doc(docId(device.subscription.endpoint)).delete(); // the device unsubscribed
      else if (status < 300) delivered++;
    } catch (e) {
      console.error('[push] sending failed', e);
    }
  }
  return delivered;
}

/** Teams with a vote closing within a day: their voters may need a reminder. */
export async function sweepClosingVotes(send: Sender = webSender, now = new Date()): Promise<number> {
  if (send === webSender && !vapid()) return 0;
  const within = new Date(now.getTime() + 24 * 3600_000).toISOString();
  const snap = await adminDb.collection('teams').where('closesSoonest', '<=', within).get();
  let n = 0;
  for (const d of snap.docs) n += await notifyTeam(d.id, send, now.toISOString()).catch(e => { console.error('[push] sweep failed for', d.id, e); return 0; });
  return n;
}

let started = false;

export function startPushSweeper(): void {
  if (started || !vapid()) return;
  started = true;
  const tick = async () => {
    try { await sweepClosingVotes(); } catch (e) { console.error('[push] sweep failed', e); }
    finally { setTimeout(tick, 10 * 60_000); }
  };
  void tick();
}
