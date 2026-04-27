import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireNcoOrAbove } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request }) => {
  await requireNcoOrAbove(request);
  const ref = adminDb.collection('tafkidim').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'תפקיד לא נמצא');
  const tafkid = doc.data()!;
  if (tafkid.status !== 'submitted') throw error(400, `לא ניתן לדחות תפקיד במצב: ${tafkid.status}`);
  await ref.update({ status: 'todo' });
  return json({ success: true });
};
