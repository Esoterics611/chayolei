// ═══════════════════════════════════════════════════════════════
// POST /api/seed  — officer-only Firestore seeder
// Populates: mekomot, treasury/global, mivtzaot, masimot, tafkidim
// ═══════════════════════════════════════════════════════════════
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDb } from '$lib/server/firebase-admin';
import { requireOfficer } from '$lib/server/auth';
import {
  MOCK_MEKOMOT,
  MOCK_MIVTZAOT,
  MOCK_MASIMOT,
  MOCK_TAFKIDIM,
  MOCK_TREASURY,
} from '$lib/stores/mock-data';

export const POST: RequestHandler = async ({ request }) => {
  await requireOfficer(request);

  const results: Record<string, number> = {};

  // ── mekomot ────────────────────────────────────────────────────
  {
    const batch = adminDb.batch();
    for (const makom of MOCK_MEKOMOT) {
      const { id, ...data } = makom;
      batch.set(adminDb.collection('mekomot').doc(id), data, { merge: true });
    }
    await batch.commit();
    results.mekomot = MOCK_MEKOMOT.length;
  }

  // ── treasury/global ────────────────────────────────────────────
  {
    await adminDb
      .collection('treasury')
      .doc('global')
      .set(MOCK_TREASURY, { merge: true });
    results.treasury = 1;
  }

  // ── mivtzaot ───────────────────────────────────────────────────
  {
    const batch = adminDb.batch();
    for (const mv of MOCK_MIVTZAOT) {
      const { id, ...data } = mv;
      batch.set(adminDb.collection('mivtzaot').doc(id), data, { merge: true });
    }
    await batch.commit();
    results.mivtzaot = MOCK_MIVTZAOT.length;
  }

  // ── masimot ────────────────────────────────────────────────────
  {
    // Firestore batches are limited to 500 writes; chunk if needed
    const chunks = chunkArray(MOCK_MASIMOT, 400);
    let count = 0;
    for (const chunk of chunks) {
      const batch = adminDb.batch();
      for (const ms of chunk) {
        const { id, ...data } = ms;
        batch.set(adminDb.collection('masimot').doc(id), data, { merge: true });
      }
      await batch.commit();
      count += chunk.length;
    }
    results.masimot = count;
  }

  // ── tafkidim ───────────────────────────────────────────────────
  {
    const chunks = chunkArray(MOCK_TAFKIDIM, 400);
    let count = 0;
    for (const chunk of chunks) {
      const batch = adminDb.batch();
      for (const tf of chunk) {
        const { id, ...data } = tf;
        batch.set(adminDb.collection('tafkidim').doc(id), data, { merge: true });
      }
      await batch.commit();
      count += chunk.length;
    }
    results.tafkidim = count;
  }

  return json({ ok: true, seeded: results });
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
