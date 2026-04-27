import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth } from '$lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: RequestHandler = async ({ request }) => {
  const ctx = await requireAuth(request);
  const { talmidId, amount } = await request.json();

  if (!amount || amount <= 0) throw error(400, 'סכום לא תקין');

  // Can only redeem own tokens (unless officer)
  const targetId = talmidId ?? ctx.uid;
  if (targetId !== ctx.uid && ctx.tier !== 'officer') {
    throw error(403, 'אין הרשאה לפדות טוקנים של חייל אחר');
  }

  const talmidRef = adminDb.collection('talmidim').doc(targetId);
  const talmidDoc = await talmidRef.get();
  if (!talmidDoc.exists) throw error(404, 'חייל לא נמצא');

  const currentBalance = talmidDoc.data()!.tokenBalance ?? 0;
  if (currentBalance < amount) throw error(400, 'אין מספיק TMIM');

  const batch = adminDb.batch();
  batch.set(talmidRef, { tokenBalance: FieldValue.increment(-amount) }, { merge: true });
  batch.set(adminDb.collection('treasury').doc('global'), {
    totalTmimRedeemed: FieldValue.increment(amount),
    tmimCirculating:   FieldValue.increment(-amount),
    currentBalance:    FieldValue.increment(-(amount * 0.10)),
  }, { merge: true });

  await batch.commit();

  const usd = (amount * 0.10).toFixed(2);
  return json({ success: true, tmimRedeemed: amount, usdValue: usd });
};
