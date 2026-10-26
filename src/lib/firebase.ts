import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Prevent duplicate initialization in dev HMR
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = getAuth(firebaseApp);
export const db   = getFirestore(firebaseApp);

// Local development and browser tests against the Firebase emulators
// (VITE_FIREBASE_EMULATORS=1; Auth on 9099, Firestore on 8080).
const EMULATORS = import.meta.env.VITE_FIREBASE_EMULATORS === '1';
if (EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Enable offline persistence (browser only)
if (typeof window !== 'undefined' && !EMULATORS) {
  enableIndexedDbPersistence(db).catch(() => {
    // Fails gracefully if already enabled or in SSR — ignore
  });
}

export { firebaseApp };
