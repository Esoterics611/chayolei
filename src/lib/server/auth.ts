// Server-side auth helpers for API routes
import { error } from '@sveltejs/kit';
import { adminAuth, adminDb } from './firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthContext {
  decoded: DecodedIdToken;
  uid: string;
  tier: 'enlisted' | 'nco' | 'officer';
  rank: string;
  makomId: string;
  talmidId: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Throws 401 if missing/invalid, else returns decoded claims.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) throw error(401, 'נדרש אימות');

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw error(401, 'טוקן לא תקין');
  }

  return {
    decoded,
    uid:      decoded.uid,
    tier:     (decoded.tier as 'enlisted' | 'nco' | 'officer') ?? 'enlisted',
    rank:     (decoded.rank as string) ?? 'turai',
    makomId:  (decoded.makomId as string) ?? '',
    talmidId: (decoded.talmidId as string) ?? decoded.uid,
  };
}

export async function requireOfficer(request: Request): Promise<AuthContext> {
  const ctx = await requireAuth(request);
  if (ctx.tier !== 'officer') throw error(403, 'נדרשת דרגת קצין');
  return ctx;
}

export async function requireNcoOrAbove(request: Request): Promise<AuthContext> {
  const ctx = await requireAuth(request);
  if (!['nco', 'officer'].includes(ctx.tier)) throw error(403, 'נדרשת דרגת נגד קצין לפחות');
  return ctx;
}

/**
 * Log an activity entry via batch write.
 */
export function activityEntry(
  actorId: string,
  actorShem: string,
  type: string,
  targetId: string,
  targetTitle: string,
  description: string,
) {
  return {
    type,
    actorId,
    actorShem,
    targetId,
    targetTitle,
    description,
    timestamp: new Date().toISOString(),
    metadata: {},
  };
}
