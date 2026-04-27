import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request }) => {
  const ctx = await requireAuth(request);
  const ref = adminDb.collection('peerReviews').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'ביקורת לא נמצאה');
  // Only the masima author can acknowledge
  const masima = await adminDb.collection('masimot').doc(doc.data()!.masimaId).get();
  if (masima.data()?.assigneeId !== ctx.uid && ctx.tier !== 'officer') {
    throw error(403, 'אין הרשאה לאשר ביקורת זו');
  }
  await ref.update({ status: 'acknowledged' });
  return json({ success: true });
};
