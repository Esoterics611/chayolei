import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, requireNcoOrAbove } from '$lib/server/auth';

export const GET: RequestHandler = async ({ params, request }) => {
  await requireAuth(request);
  const doc = await adminDb.collection('masimot').doc(params.id).get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');
  return json({ id: doc.id, ...doc.data() });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const data = await request.json();
  const ref = adminDb.collection('masimot').doc(params.id);
  if (!(await ref.get()).exists) throw error(404, 'משימה לא נמצאה');
  await ref.update({ ...data, updatedAt: new Date().toISOString() });
  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const ref = adminDb.collection('masimot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'משימה לא נמצאה');

  const batch = adminDb.batch();
  const masimaId = params.id;

  const [tafkidim, reviews, discussions] = await Promise.all([
    adminDb.collection('tafkidim').where('masimaId', '==', masimaId).get(),
    adminDb.collection('peerReviews').where('masimaId', '==', masimaId).get(),
    adminDb.collection('discussions').where('masimaId', '==', masimaId).get(),
  ]);
  tafkidim.docs.forEach(d => batch.delete(d.ref));
  reviews.docs.forEach(d => batch.delete(d.ref));
  discussions.docs.forEach(d => batch.delete(d.ref));
  batch.delete(ref);

  await batch.commit();
  return json({ success: true });
};
