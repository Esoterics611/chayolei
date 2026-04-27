import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth } from '$lib/server/auth';

export const GET: RequestHandler = async ({ params, request }) => {
  await requireAuth(request);
  const doc = await adminDb.collection('talmidim').doc(params.id).get();
  if (!doc.exists) throw error(404, 'חייל לא נמצא');
  return json({ id: doc.id, ...doc.data() });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const ctx = await requireAuth(request);
  // Can only update own profile, or officer can update anyone
  if (ctx.uid !== params.id && ctx.tier !== 'officer') {
    throw error(403, 'אין הרשאה לעדכן פרופיל זה');
  }
  const data = await request.json();
  const ref = adminDb.collection('talmidim').doc(params.id);
  if (!(await ref.get()).exists) throw error(404, 'חייל לא נמצא');

  // Strip fields that shouldn't be user-editable
  const { tokenBalance, totalTokensEarned, rank, tier, ...safeData } = data;
  await ref.update(safeData);
  return json({ success: true });
};
