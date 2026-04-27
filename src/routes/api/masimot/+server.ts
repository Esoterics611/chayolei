import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, requireNcoOrAbove, activityEntry } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request }) => {
  await requireAuth(request);
  const snap = await adminDb.collection('masimot').orderBy('createdAt', 'desc').get();
  return json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const POST: RequestHandler = async ({ request }) => {
  const ctx = await requireNcoOrAbove(request);
  const data = await request.json();
  const now = new Date().toISOString();

  const ref = adminDb.collection('masimot').doc();
  const batch = adminDb.batch();

  batch.set(ref, {
    ...data,
    tafkidimCount: 0,
    reviewCount:   0,
    averageRating: null,
    createdAt:     now,
    updatedAt:     now,
  });

  // Increment parent mivtza masimotCount
  if (data.mivtzaId) {
    const mivtzaRef = adminDb.collection('mivtzaot').doc(data.mivtzaId);
    const mivtzaSnap = await mivtzaRef.get();
    const curCount = (mivtzaSnap.data()?.masimotCount as number | undefined) ?? 0;
    batch.update(mivtzaRef, { masimotCount: curCount + 1, updatedAt: now });
  }

  const actRef = adminDb.collection('activities').doc();
  batch.set(actRef, activityEntry(ctx.uid, ctx.decoded.name ?? 'חייל', 'masima_opened', ref.id, data.shem, 'פתח משימה חדשה'));

  await batch.commit();
  const doc = await ref.get();
  return json({ id: ref.id, ...doc.data() }, { status: 201 });
};
