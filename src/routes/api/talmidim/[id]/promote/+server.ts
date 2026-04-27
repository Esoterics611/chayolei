import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb, adminAuth } from '$lib/server/firebase-admin';
import { requireOfficer, activityEntry } from '$lib/server/auth';
import { RANKS, RANK_META } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
  const ctx = await requireOfficer(request);
  const ref = adminDb.collection('talmidim').doc(params.id);
  const doc = await ref.get();
  if (!doc.exists) throw error(404, 'חייל לא נמצא');

  const talmid = doc.data()!;
  const rankIdx = RANKS.indexOf(talmid.rank);
  if (rankIdx < 0 || rankIdx >= RANKS.length - 1) throw error(400, 'כבר בדרגה הגבוהה ביותר');

  const newRank = RANKS[rankIdx + 1];
  const newMeta = RANK_META[newRank as keyof typeof RANK_META];

  const batch = adminDb.batch();
  batch.update(ref, {
    rank:        newRank,
    tier:        newMeta.tier,
    votingPower: newMeta.votingPower,
  });

  const actRef = adminDb.collection('activities').doc();
  batch.set(actRef, activityEntry(ctx.uid, ctx.decoded.name ?? 'קצין', 'talmid_promoted', params.id, talmid.shem, `קודם ל${newMeta.shem}`));

  await batch.commit();

  // Update Firebase custom claims so the new tier takes effect
  await adminAuth.setCustomUserClaims(`wallet_${talmid.walletAddress}`, {
    tier:    newMeta.tier,
    rank:    newRank,
    makomId: talmid.makomId,
    talmidId: params.id,
  });

  return json({ success: true, newRank, newTier: newMeta.tier });
};
