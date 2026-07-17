#!/usr/bin/env node
/**
 * Grant or update Firebase admin access with an explicit RBAC role.
 *
 * Prerequisites:
 * 1. Firebase Console → Authentication → enable Email/Password; create a user (or use existing).
 * 2. Service account JSON: download from Project settings → Service accounts, or set
 *    GOOGLE_APPLICATION_CREDENTIALS=c:\\path\\to\\serviceAccount.json
 * 3. Run:
 *      node scripts/set_admin_claim.mjs you@email.com owner
 *      node scripts/set_admin_claim.mjs --uid FIREBASE_UID owner
 * Add --grant only when converting a non-admin account into an administrator.
 *
 * Then sign in on admin (email or Google); token will include claim admin.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const ADMIN_ROLES = new Set(['owner', 'admin', 'support', 'content_editor', 'moderator', 'analyst', 'developer']);
const allowGrant = argv.includes('--grant');
const args = argv.filter((value) => value !== '--grant');
let targetUid;
let targetEmail;
let role;
if (args[0] === '--uid' && args[1] && args[2]) {
  targetUid = args[1].trim();
  role = args[2].trim();
} else if (args[0] && !args[0].startsWith('-') && args[1]) {
  targetEmail = args[0].trim();
  role = args[1].trim();
} else {
  console.error('Usage: node scripts/set_admin_claim.mjs <admin@email.com> <role> [--grant]');
  console.error('       node scripts/set_admin_claim.mjs --uid <firebaseAuthUid> <role> [--grant]');
  process.exit(1);
}
if (!ADMIN_ROLES.has(role)) {
  console.error(`Invalid role: ${role}. Allowed: ${[...ADMIN_ROLES].join(', ')}`);
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
const existingClaims = user.customClaims ?? {};
if (existingClaims.admin !== true && !allowGrant) {
  throw new Error('Refusing to grant a non-admin account without explicit --grant');
}
await admin.auth().setCustomUserClaims(user.uid, {
  ...(user.customClaims ?? {}),
  admin: true,
  adminRole: role,
});
const label = user.email || user.uid;
console.log(`OK: admin claims updated for ${label}; role=${role}; project=${admin.app().options.projectId || 'default'}`);
console.log('User must sign out and sign in again (or wait ~1h) to refresh ID token; admin page uses getIdTokenResult(true).');

process.exit(0);
