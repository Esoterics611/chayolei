import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, requireNcoOrAbove } from '$lib/server/auth';

export const GET: RequestHandler = async ({ params, request }) => {
  await requireAuth(request);
  const doc = await adminDb.collection('tafkidim').doc(params.id).get();
  if (!doc.exists) throw error(404, 'תפקיד לא נמצא');
  return json({ id: doc.id, ...doc.data() });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const data = await request.json();
  const ref = adminDb.collection('tafkidim').doc(params.id);
  if (!(await ref.get()).exists) throw error(404, 'תפקיד לא נמצא');
  await ref.update(data);
  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const ref = adminDb.collection('tafkidim').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'תפקיד לא נמצא');

  const batch = adminDb.batch();
  batch.delete(ref);

  if (doc.data()?.masimaId) {
    const masimaRef = adminDb.collection('masimot').doc(doc.data()!.masimaId);
    const masimaDoc = await masimaRef.get();
    if (masimaDoc.exists) {
      batch.update(masimaRef, {
        tafkidimCount: Math.max(0, (masimaDoc.data()?.tafkidimCount ?? 1) - 1),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await batch.commit();
  return json({ success: true });
};
