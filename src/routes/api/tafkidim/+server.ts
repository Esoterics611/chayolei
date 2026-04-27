import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, requireNcoOrAbove } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request }) => {
  await requireAuth(request);
  const snap = await adminDb.collection('tafkidim').orderBy('createdAt', 'desc').get();
  return json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const POST: RequestHandler = async ({ request }) => {
  const ctx = await requireNcoOrAbove(request);
  const data = await request.json();
  const now = new Date().toISOString();
  const ref = adminDb.collection('tafkidim').doc();

  const batch = adminDb.batch();
  batch.set(ref, { ...data, createdAt: now });

  // Increment parent masima tafkidimCount
  if (data.masimaId) {
    const masimaRef = adminDb.collection('masimot').doc(data.masimaId);
    const masimaDoc = await masimaRef.get();
    if (masimaDoc.exists) {
      batch.update(masimaRef, { tafkidimCount: (masimaDoc.data()?.tafkidimCount ?? 0) + 1, updatedAt: now });
    }
  }

  await batch.commit();
  const doc = await ref.get();
  return json({ id: ref.id, ...doc.data() }, { status: 201 });
};
