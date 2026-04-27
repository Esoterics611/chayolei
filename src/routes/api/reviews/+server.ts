import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireAuth, activityEntry } from '$lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { RANK_META } from '$lib/types';

// POST /api/reviews — submit a peer review
export const POST: RequestHandler = async ({ request }) => {
  const ctx = await requireAuth(request);
  const data = await request.json();
  const now = new Date().toISOString();

  // Validate masima exists and is in reviewable state
  const masimaRef = adminDb.collection('masimot').doc(data.masimaId);
  const masimaDoc = await masimaRef.get();
  if (!masimaDoc.exists) throw error(404, 'משימה לא נמצאה');
  const masima = masimaDoc.data()!;
  if (!['submitted', 'in_review'].includes(masima.status)) {
    throw error(400, 'לא ניתן לבקר משימה זו');
  }

  // Reviewer cannot review their own work
  if (masima.assigneeId === ctx.uid) throw error(400, 'לא ניתן לבקר עבודה שלך');

  const ref = adminDb.collection('peerReviews').doc();
  const batch = adminDb.batch();

  const reviewData = {
    masimaId:    data.masimaId,
    reviewerId:  ctx.uid,
    authorId:    masima.assigneeId ?? '',
    rating:      data.rating,
    comments:    data.comments ?? '',
    suggestions: data.suggestions ?? [],
    status:      'submitted',
    tokensEarned: data.tokensEarned ?? 10,
    createdAt:   now,
  };
  batch.set(ref, reviewData);

  // Recalculate masima review stats
  const existingReviews = await adminDb.collection('peerReviews')
    .where('masimaId', '==', data.masimaId).get();
  const allRatings = [...existingReviews.docs.map(d => d.data().rating as number), data.rating];
  const avgRating = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;
  batch.update(masimaRef, {
    reviewCount:   allRatings.length,
    averageRating: avgRating,
    updatedAt:     now,
  });

  // Award tokens to reviewer
  if (reviewData.tokensEarned > 0) {
    const reviewerRef = adminDb.collection('talmidim').doc(ctx.uid);
    const reviewerDoc = await reviewerRef.get();
    const rankMeta = RANK_META[(reviewerDoc.data()?.rank ?? 'turai') as keyof typeof RANK_META];
    const awarded = Math.round(reviewData.tokensEarned * (rankMeta?.multiplier ?? 1));
    batch.set(reviewerRef, {
      tokenBalance:      FieldValue.increment(awarded),
      totalTokensEarned: FieldValue.increment(awarded),
      peerReviewsGiven:  FieldValue.increment(1),
    }, { merge: true });
    batch.set(adminDb.collection('treasury').doc('global'), {
      totalTmimDistributed: FieldValue.increment(awarded),
      tmimCirculating:      FieldValue.increment(awarded),
    }, { merge: true });
  }

  // Increment author's peerReviewsReceived
  if (masima.assigneeId) {
    batch.set(adminDb.collection('talmidim').doc(masima.assigneeId), {
      peerReviewsReceived: FieldValue.increment(1),
    }, { merge: true });
  }

  const actRef = adminDb.collection('activities').doc();
  batch.set(actRef, activityEntry(ctx.uid, ctx.decoded.name ?? 'חייל', 'peer_review_submitted', data.masimaId, masima.shem, 'הגיש ביקורת עמיתים'));

  await batch.commit();
  return json({ id: ref.id, ...reviewData }, { status: 201 });
};
