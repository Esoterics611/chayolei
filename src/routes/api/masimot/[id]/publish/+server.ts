import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireOfficer, activityEntry } from '$lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ params, request }) => {
  const ctx = await requireOfficer(request);
  const ref = adminDb.collection('masimot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');
  const masima = doc.data()!;
  if (masima.status !== 'approved') throw error(400, `לא ניתן לפרסם משימה במצב: ${masima.status}`);

  const batch = adminDb.batch();
  const now = new Date().toISOString();
  batch.update(ref, { status: 'published', updatedAt: now });

  // Increment assignee's papersPublished
  if (masima.assigneeId) {
    const talmidRef = adminDb.collection('talmidim').doc(masima.assigneeId);
    batch.set(talmidRef, { papersPublished: FieldValue.increment(1) }, { merge: true });
  }

  const actRef = adminDb.collection('activities').doc();
  batch.set(actRef, activityEntry(ctx.uid, ctx.decoded.name ?? 'קצין', 'paper_published', params.id, masima.shem, 'פרסם משימה'));

  await batch.commit();
  return json({ success: true });
};
