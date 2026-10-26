// Actions shared by several screens. Settled actions go through the
// confirm-and-sign dialog with their consequences; signed ones run at once.

import type { Deliverable } from '$lib/team/types';
import * as E from '$lib/team/engine';
import { store } from '$lib/team/store.svelte';
import { ui } from '$lib/team/ui.svelte';
import { lt, t } from '$lib/team/i18n';
import { go } from '$lib/team/nav';
import type { NextStep } from './next';

export function takeWork(d: Deliverable): void {
  void store.do({ type: 'take', deliverableId: d.id }, t('plan.taken'));
}

export async function requestReview(d: Deliverable): Promise<void> {
  const c = await store.do({ type: 'requestReview', deliverableId: d.id }, t('d.reviewRequested'));
  if (c?.id) go(`/d/${d.id}/review/${c.id}`);
}

export function releaseWork(d: Deliverable): void {
  const v = E.versionById(d, d.acceptedVersionId);
  ui.askToSign({
    title: t('d.signRelease', { title: lt(d.title) }),
    lines: [t('d.signReleaseLine1', { n: v?.n ?? 0 }), t('d.signReleaseLine2')],
    confirmLabel: t('d.release'),
    onConfirm: async () => !!(await store.do({ type: 'release', deliverableId: d.id }, t('d.released', { date: '' }).trim())),
  });
}

export function runStep(d: Deliverable, step: NonNullable<NextStep['action']>): void {
  if (step.href) { go(step.href.replace(/^#/, '')); return; }
  if (step.run === 'take') takeWork(d);
  else if (step.run === 'request') void requestReview(d);
  else if (step.run === 'release') releaseWork(d);
}
