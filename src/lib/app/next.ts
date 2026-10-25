// What happens next on a deliverable, and whose move it is: responsibility
// made visible on every screen (UX_REDESIGN.md §4, principle 3).

import type { Deliverable, Team } from '$lib/team/types';
import * as E from '$lib/team/engine';
import { can } from '$lib/team/rules';
import { t } from '$lib/team/i18n';
import { href } from '$lib/team/nav';
import { firstName } from './format';

export interface NextStep {
  text: string;
  /** Member whose move it is. */
  waitingOn?: string;
  mine: boolean;
  action?: { label: string; href?: string; run?: 'take' | 'request' | 'release' };
}

export function nextStep(team: Team, d: Deliverable, me: string): NextStep {
  const owner = firstName(team, d.ownerId);
  const active = E.activeWorkChange(team, d.id);
  const latest = E.latestVersion(d);
  const draft = E.draftOf(d);
  const reviewer = E.reviewerOf(team, d);
  const approver = E.approverOf(team, d);
  const isOwner = d.ownerId === me;

  switch (d.stage) {
    case 'open': {
      const mine = can(team, me, 'take_work');
      return { text: t('d.next.take'), mine, action: mine ? { label: t('plan.take'), run: 'take' } : undefined };
    }
    case 'assigned':
      return {
        text: t('d.next.startDraft', { name: owner }), waitingOn: d.ownerId, mine: isOwner,
        action: isOwner ? { label: t('d.startDraft'), href: href(`/d/${d.id}/edit`) } : undefined,
      };
    case 'in_progress': {
      const n = draft?.n ?? latest?.n ?? 1;
      const canRequest = !!latest && !E.workChangesOf(team, d.id).some(c => c.toVersionId === latest.id && c.status !== 'superseded');
      return {
        text: t('d.next.requestReview', { name: owner, n }), waitingOn: d.ownerId, mine: isOwner,
        action: isOwner
          ? canRequest ? { label: t('d.requestReview'), run: 'request' } : { label: t('d.edit'), href: href(`/d/${d.id}/edit`) }
          : undefined,
      };
    }
    case 'in_review': {
      const n = E.versionById(d, active?.toVersionId)?.n ?? latest?.n ?? 1;
      if (active?.status === 'reviewed') {
        return {
          text: t('d.next.accept', { reviewer: firstName(team, active.reviewedBy), name: firstName(team, approver) }),
          waitingOn: approver, mine: approver === me,
          action: approver === me ? { label: t('review.accept'), href: href(`/d/${d.id}/review/${active.id}`) } : undefined,
        };
      }
      return {
        text: t('d.next.review', { name: firstName(team, reviewer), n }), waitingOn: reviewer, mine: reviewer === me,
        action: reviewer === me && active ? { label: t('need.action.review'), href: href(`/d/${d.id}/review/${active.id}`) } : undefined,
      };
    }
    case 'changes_requested': {
      const by = E.workChangesOf(team, d.id).find(c => c.status === 'changes_requested')?.decidedBy;
      return {
        text: t('d.next.revise', { name: firstName(team, by), owner }), waitingOn: d.ownerId, mine: isOwner,
        action: isOwner ? { label: t('need.action.revise'), href: href(`/d/${d.id}/edit`) } : undefined,
      };
    }
    case 'accepted': {
      const mine = can(team, me, 'release');
      return {
        text: t('d.next.release', { name: firstName(team, approver) }), waitingOn: approver, mine,
        action: mine ? { label: t('d.release'), run: 'release' } : undefined,
      };
    }
    case 'released':
      return { text: t('d.next.released'), mine: false };
  }
}
