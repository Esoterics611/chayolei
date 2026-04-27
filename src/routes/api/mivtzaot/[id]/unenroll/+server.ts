import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth } from '$lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ params, request }) => {
  const ctx = await requireAuth(request);
  const body = await request.json().catch(() => ({}));
  const talmidId = (ctx.tier === 'officer' && body.talmidId) ? body.talmidId : ctx.uid;

  const ref = adminDb.collection('mivtzaot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'מבצע לא נמצא');

  await ref.update({ enrolledIds: FieldValue.arrayRemove(talmidId), updatedAt: new Date().toISOString() });
  return json({ success: true });
};
