import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request }) => {
  await requireAuth(request);
  const ref = adminDb.collection('masimot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');
  const masima = doc.data()!;
  if (masima.status !== 'open') throw error(400, `לא ניתן להתחיל משימה במצב: ${masima.status}`);
  await ref.update({ status: 'in_progress', updatedAt: new Date().toISOString() });
  return json({ success: true });
};
