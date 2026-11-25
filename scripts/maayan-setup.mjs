#!/usr/bin/env node
// Set up the wellsprings in the live Firestore (docs/MAAYAN.md §6).
//
//   node scripts/maayan-setup.mjs wellsprings          write src/lib/maayan/wellsprings.json to wellsprings/{id}
//                                                      (keeps each one's follower count)
//   node scripts/maayan-setup.mjs teacher <email>      make the member with this email the teacher
//                                                      (they sign in once first, so their profile exists)
//   node scripts/maayan-setup.mjs teachers             the same for every address in MAAYAN_TEACHERS
//                                                      (deploy.env, comma-separated; run by each deploy);
//                                                      one not signed up yet is reported, not an error
//
// Credentials as the app's: FIREBASE_PROJECT_ID with FIREBASE_CLIENT_EMAIL and
// FIREBASE_PRIVATE_KEY in .env, or Application Default Credentials (gcloud auth
// application-default login), or the emulator (FIRESTORE_EMULATOR_HOST).
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
} else if (cmd === 'teachers') {
  // MAAYAN_TEACHERS: addresses, or "sha256:<hex>" of an address that should not
  // be published (deploy.env and the Actions logs are public). Every one must be
  // a member: one that isn't fails the run (after the deploy itself is done),
  // so a wrong or unfinished sign-up is seen, not passed over.
  const sha = e => createHash('sha256').update(e.trim().toLowerCase()).digest('hex');
  const wanted = (process.env.MAAYAN_TEACHERS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    .map(e => (e.startsWith('sha256:') ? { hash: e.slice(7).toLowerCase(), label: `sha256:${e.slice(7, 19)}…` } : { hash: sha(e), label: e.toLowerCase() }));
  const members = (await db.collection('maayanMembers').get()).docs;
  const missing = [];
  for (const t of wanted) {
    const doc = members.find(d => sha(String(d.data().email ?? '')) === t.hash);
    if (!doc) { missing.push(t.label); continue; }
    if (doc.data().teacher !== true) await doc.ref.update({ teacher: true });
    console.log(`teacher ${t.label}: yes`);
  }
  if (missing.length) {
    for (const m of missing) console.log(`::error title=Teacher not found::${m} has no member profile. Sign in at /maayan with that address and finish joining ("כניסה למעיין"), then deploy again.`);
    process.exit(1);
  }
} else if (cmd === 'teacher' && arg) {
  const snap = await db.collection('maayanMembers').where('email', '==', arg.trim().toLowerCase()).limit(1).get();
  if (snap.empty) { console.error(`No member with ${arg}: sign in once on /maayan first.`); process.exit(1); }
  await snap.docs[0].ref.update({ teacher: true });
  console.log(`${arg} is the teacher.`);
} else {
  console.error('usage: node scripts/maayan-setup.mjs wellsprings | teachers | teacher <email>');
  process.exit(2);
}
