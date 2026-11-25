#!/usr/bin/env node
// Set up the wellsprings in the live Firestore (docs/MAAYAN.md §6).
//
//   node scripts/maayan-setup.mjs wellsprings          write src/lib/maayan/wellsprings.json to wellsprings/{id}
//                                                      (keeps each one's follower count)
//   node scripts/maayan-setup.mjs teacher <email>      make the member with this email the teacher
//                                                      (they sign in once first, so their profile exists)
//
// Credentials as the app's: FIREBASE_PROJECT_ID with FIREBASE_CLIENT_EMAIL and
// FIREBASE_PRIVATE_KEY in .env, or Application Default Credentials (gcloud auth
// application-default login), or the emulator (FIRESTORE_EMULATOR_HOST).
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
initializeApp(process.env.FIREBASE_CLIENT_EMAIL && key
  ? { credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) }
  : { projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT });
const db = getFirestore();

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'wellsprings') {
  const list = JSON.parse(readFileSync('src/lib/maayan/wellsprings.json', 'utf8'));
  for (const w of list) {
    const ref = db.collection('wellsprings').doc(w.id);
    const before = await ref.get();
    await ref.set({ ...w, followers: before.data()?.followers ?? 0 });
    console.log(`wellspring ${w.id}: ${w.status}`);
  }
} else if (cmd === 'teacher' && arg) {
  const snap = await db.collection('maayanMembers').where('email', '==', arg.trim().toLowerCase()).limit(1).get();
  if (snap.empty) { console.error(`No member with ${arg}: sign in once on /maayan first.`); process.exit(1); }
  await snap.docs[0].ref.update({ teacher: true });
  console.log(`${arg} is the teacher.`);
} else {
  console.error('usage: node scripts/maayan-setup.mjs wellsprings | teacher <email>');
  process.exit(2);
}
