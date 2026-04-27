import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from '$env/static/private';

let _initialized = false;

function getAdminApp() {
  if (!_initialized) {
    const privateKey = FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error(
        'Firebase Admin env vars missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env'
      );
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId:   FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
    _initialized = true;
  }
  return getApps()[0];
}

export function getAdminAuth(): Auth {
  getAdminApp();
  return getAuth();
}

export function getAdminDb(): Firestore {
  getAdminApp();
  return getFirestore();
}

// Convenience aliases
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getAdminAuth() as any)[prop];
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getAdminDb() as any)[prop];
  },
});
