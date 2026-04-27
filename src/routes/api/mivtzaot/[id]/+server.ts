import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, requireOfficer } from '$lib/server/auth';

// GET /api/mivtzaot/:id
export const GET: RequestHandler = async ({ params, request }) => {
  await requireAuth(request);
  const doc = await adminDb.collection('mivtzaot').doc(params.id).get();
  if (!doc.exists) throw error(404, 'מבצע לא נמצא');
  return json({ id: doc.id, ...doc.data() });
};

// PATCH /api/mivtzaot/:id
export const PATCH: RequestHandler = async ({ params, request }) => {
  const ctx = await requireOfficer(request);
  const data = await request.json();
  const ref = adminDb.collection('mivtzaot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'מבצע לא נמצא');

  // Officers can only update their own mivtzaot (or admin)
  if (doc.data()!.creatorId !== ctx.uid && ctx.tier !== 'officer') {
    throw error(403, 'אין הרשאה לעדכן מבצע זה');
  }

  await ref.update({ ...data, updatedAt: new Date().toISOString() });
  return json({ success: true });
};

// DELETE /api/mivtzaot/:id
export const DELETE: RequestHandler = async ({ params, request }) => {
  await requireOfficer(request);
  const ref = adminDb.collection('mivtzaot').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'מבצע לא נמצא');

  const batch = adminDb.batch();

  // Cascade: delete masimot + their tafkidim/reviews/discussions
  const masimotSnap = await adminDb.collection('masimot').where('mivtzaId', '==', params.id).get();
  for (const masimaDoc of masimotSnap.docs) {
    const masimaId = masimaDoc.id;
    batch.delete(masimaDoc.ref);

    const [tafkidim, reviews, discussions] = await Promise.all([
      adminDb.collection('tafkidim').where('masimaId', '==', masimaId).get(),
      adminDb.collection('peerReviews').where('masimaId', '==', masimaId).get(),
      adminDb.collection('discussions').where('masimaId', '==', masimaId).get(),
    ]);
    tafkidim.docs.forEach(d => batch.delete(d.ref));
    reviews.docs.forEach(d => batch.delete(d.ref));
    discussions.docs.forEach(d => batch.delete(d.ref));
  }

  batch.delete(ref);
  await batch.commit();
  return json({ success: true });
};
