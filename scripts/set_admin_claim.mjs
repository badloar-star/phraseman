#!/usr/bin/env node
/**
 * One-time: grant Firestore admin panel access via custom claim { admin: true }.
 *
 * Prerequisites:
 * 1. Firebase Console → Authentication → enable Email/Password; create a user (or use existing).
 * 2. Service account JSON: download from Project settings → Service accounts, or set
 *    GOOGLE_APPLICATION_CREDENTIALS=c:\\path\\to\\serviceAccount.json
 * 3. Run:
 *      node scripts/set_admin_claim.mjs you@email.com
 *      node scripts/set_admin_claim.mjs --uid FIREBASE_UID   # e.g. after Google sign-in
 *
 * Then sign in on admin (email or Google); token will include claim admin.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
let targetUid;
let targetEmail;
if (argv[0] === '--uid' && argv[1]) {
  targetUid = argv[1].trim();
} else if (argv[0] && !argv[0].startsWith('-')) {
  targetEmail = argv[0].trim();
} else {
  console.error('Usage: node scripts/set_admin_claim.mjs <admin@email.com>');
  console.error('       node scripts/set_admin_claim.mjs --uid <firebaseAuthUid>');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const fallback = join(root, 'service-account.json');
  try {
    readFileSync(fallback);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = fallback;
    console.log('Using service-account.json in project root (set GOOGLE_APPLICATION_CREDENTIALS to override).');
  } catch {
    console.error('Set env GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path, or add service-account.json in project root.');
    process.exit(1);
  }
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const user = targetUid
  ? await admin.auth().getUser(targetUid)
  : await admin.auth().getUserByEmail(targetEmail);
await admin.auth().setCustomUserClaims(user.uid, { admin: true });
const label = user.email || user.uid;
console.log('OK: custom claim { admin: true } set for', label, 'uid=', user.uid);
console.log('User must sign out and sign in again (or wait ~1h) to refresh ID token; admin page uses getIdTokenResult(true).');

process.exit(0);
