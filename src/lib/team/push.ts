// What reaches a member's device while Chayolei is closed (UX_REDESIGN.md
// phase 8: "push only for blocking or expiring items"). Blocking: someone
// waits on you (a review, an acceptance, changes on your work, a request to
// approve, an objective left without a lead). Expiring: a vote you haven't
// cast closes within a day. Everything else stays in the app's bell.
//
// Each item has a key, so the server sends it once (src/lib/server/push.ts).

import type { Locale, Team, Text } from './types';
import * as E from './engine';
import { closingSoon } from './notify';
import { DICTS } from './i18n';

export interface PushItem {
  /** Stable for as long as the item waits: the server sends each key once. */
  key: string;
  title: string;
  body: string;
  /** App path to open. */
  url: string;
  /** Expiring soon: delivered with high urgency. */
  urgent: boolean;
}

/** The payload a device receives, and what the service worker shows. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const textIn = (x: Text | undefined, locale: Locale) => (x === undefined ? '' : typeof x === 'string' ? x : x[locale]);

/** A dictionary string outside the browser (the server has no UI locale). */
export function tr(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const s = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** What should reach `memberId`'s devices now. */
export function pushItems(team: Team, memberId: string, now: string, locale: Locale): PushItem[] {
  const out: PushItem[] = [];
  const title = textIn(team.name, locale);
  const dTitle = (id: string) => textIn(team.deliverables.find(d => d.id === id)?.title, locale);
  for (const n of E.needsYou(team, memberId, now)) {
    switch (n.kind) {
      case 'review':
        out.push({ key: `review:${n.changeId}`, title, body: tr(locale, 'push.review', { title: dTitle(n.deliverableId) }), url: `/d/${n.deliverableId}/review/${n.changeId}`, urgent: false });
        break;
      case 'accept':
        out.push({ key: `accept:${n.changeId}`, title, body: tr(locale, 'push.accept', { title: dTitle(n.deliverableId) }), url: `/d/${n.deliverableId}/review/${n.changeId}`, urgent: false });
        break;
      case 'revise': {
        const round = E.workChangesOf(team, n.deliverableId).find(c => c.status === 'changes_requested');
        out.push({ key: `revise:${round?.id ?? n.deliverableId}`, title, body: tr(locale, 'push.revise', { title: dTitle(n.deliverableId) }), url: `/d/${n.deliverableId}/edit`, urgent: false });
        break;
      }
      case 'approve_money': {
        const c = team.changes.find(x => x.id === n.changeId);
        out.push({ key: `money:${n.changeId}`, title, body: tr(locale, 'push.approve_money', { title: c && c.kind !== 'work' ? textIn(c.title, locale) : '' }), url: `/decide/p/${n.changeId}`, urgent: false });
        break;
      }
      case 'lead': {
        const o = team.objectives.find(x => x.id === n.objectiveId);
        out.push({ key: `lead:${n.objectiveId}:${o?.ownerId ?? ''}`, title, body: tr(locale, 'push.lead', { objective: textIn(o?.title, locale) }), url: `/plan/${n.objectiveId}`, urgent: false });
        break;
      }
      // Votes push only when they are about to close (below); stalls and
      // scheduled pay wait on the member themselves, in the app.
    }
  }
  for (const c of closingSoon(team, memberId, now)) {
    out.push({ key: `closing:${c.id}`, title, body: tr(locale, 'push.closing', { title: textIn(c.title, locale) }), url: `/decide/p/${c.id}`, urgent: true });
  }
  return out;
}

export const payloadOf = (item: PushItem): PushPayload => ({ title: item.title, body: item.body, url: item.url, tag: item.key });
