import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb, adminAuth } from '$lib/server/firebase-admin';
import { verifyMessage } from 'ethers';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const { walletAddress, signature } = body ?? {};

  if (!walletAddress || !signature) {
    throw error(400, 'walletAddress ו-signature נדרשים');
  }

  const addr = walletAddress.toLowerCase();

  // 1. Get nonce
  const nonceDoc = await adminDb.collection('nonces').doc(addr).get();
  if (!nonceDoc.exists) throw error(401, 'Nonce לא נמצא');

  const { nonce, expiresAt } = nonceDoc.data()!;
  if (new Date() > new Date(expiresAt)) {
    await adminDb.collection('nonces').doc(addr).delete();
    throw error(401, 'Nonce פג תוקף');
  }

  // 2. Verify signature (ecrecover)
  let recovered: string;
  try {
    recovered = verifyMessage(nonce, signature).toLowerCase();
  } catch {
    throw error(401, 'חתימה לא תקינה');
  }
  if (recovered !== addr) throw error(401, 'חתימה לא תואמת');

  // 3. Delete used nonce
  await adminDb.collection('nonces').doc(addr).delete();

  // 4. Check if talmid already exists
  const talmidSnap = await adminDb.collection('talmidim')
    .where('walletAddress', '==', addr)
    .limit(1)
    .get();

  const isNewUser = talmidSnap.empty;
  const talmidDoc = isNewUser ? null : talmidSnap.docs[0];

  // 5. Build custom claims
  const uid = `wallet_${addr}`;
  const BOOTSTRAP_ADMIN = '0x41521c37db02956185437c4e2461261a321073e1';
  const isAdmin = addr === BOOTSTRAP_ADMIN;

  const claims = isAdmin
    ? { tier: 'officer', rank: 'aluf', makomId: '', talmidId: uid }
    : isNewUser
    ? {}
    : {
        tier:     talmidDoc!.data().tier,
        rank:     talmidDoc!.data().rank,
        makomId:  talmidDoc!.data().makomId,
        talmidId: talmidDoc!.id,
      };

  // 6. If bootstrap admin, always upsert their talmid doc with aluf rank
  if (isAdmin) {
    await adminDb.collection('talmidim').doc(uid).set({
      shem: 'מפקד',
      rank: 'aluf',
      tier: 'officer',
      track: 'תמים',
      makomId: 'makom-001',
      walletAddress: addr,
      tokenBalance: 0,
      totalTokensEarned: 0,
      peerReviewsGiven: 0,
      peerReviewsReceived: 0,
      papersPublished: 0,
      votingPower: 60,
      tafkidimCompleted: 0,
      chavrusaId: null,
      shiurGroupId: null,
      zalId: null,
      avatarUrl: null,
      nirashemAt: new Date().toISOString(),
      isOnline: true,
    });
  }

  // 7. Create Firebase custom token
  const customToken = await adminAuth.createCustomToken(uid, claims);

  return json({ customToken, isNewUser: isAdmin ? false : isNewUser, talmidId: isAdmin ? uid : (talmidDoc?.id ?? null) });
};
