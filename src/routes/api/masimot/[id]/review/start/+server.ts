import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireNcoOrAbove } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const ref = adminDb.collection('masimot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');
  const masima = doc.data()!;
  if (masima.status !== 'submitted') throw error(400, `לא ניתן להתחיל ביקורת במצב: ${masima.status}`);
  await ref.update({ status: 'in_review', updatedAt: new Date().toISOString() });
  return json({ success: true });
};
