import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, activityEntry } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request }) => {
  const ctx = await requireAuth(request);
  const body = await request.json().catch(() => ({}));
  const ref = adminDb.collection('masimot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');

  const masima = doc.data()!;
  if (!['in_progress', 'revision_requested'].includes(masima.status)) {
    throw error(400, `לא ניתן להגיש משימה במצב: ${masima.status}`);
  }

  const batch = adminDb.batch();
  const now = new Date().toISOString();
  batch.update(ref, { status: 'submitted', contentUrl: body.contentUrl ?? masima.contentUrl ?? null, updatedAt: now });

  const actRef = adminDb.collection('activities').doc();
  batch.set(actRef, activityEntry(ctx.uid, ctx.decoded.name ?? 'חייל', 'masima_completed', params.id, masima.shem, 'הגיש משימה'));

  await batch.commit();
  return json({ success: true });
};
