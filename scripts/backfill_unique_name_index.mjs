#!/usr/bin/env node
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Math.max(0, Number(LIMIT_ARG.split('=')[1]) || 0) : 0;
const NAME_INDEX = 'name_index';

function readProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    const firebaserc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
    return firebaserc?.projects?.default || undefined;
  } catch {
    return undefined;
  }
}

function initAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = readProjectId();
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}

function cleanName(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 32);
}

function nameKey(value) {
  return cleanName(value).toLowerCase();
}

function isVisibleUser(data) {
  return data?.identityHidden !== true && data?.banned !== true;
}

function candidateName(id, data) {
  const progress = data?.progress ?? {};
  const raw =
    progress.user_name ||
    data?.name ||
    `User${id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6)}`;
  const cleaned = cleanName(raw).replace(/[@#]/g, '').trim();
  return cleaned.length >= 2 ? cleaned : `User${id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6)}`;
}

function allocateUnique(base, used) {
  const stem = cleanName(base).slice(0, 32);
  let candidate = stem;
  let n = 2;
  while (used.has(nameKey(candidate))) {
    const suffix = String(n);
    candidate = `${stem.slice(0, Math.max(2, 32 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(nameKey(candidate));
  return candidate;
}

initAdmin();
const db = admin.firestore();
const now = Date.now();

const userSnap = await db.collection('users').get();
const rows = userSnap.docs
  .filter((doc) => isVisibleUser(doc.data()))
  .map((doc) => ({ id: doc.id, data: doc.data(), base: candidateName(doc.id, doc.data()) }))
  .sort((a, b) => {
    const ac = Number(a.data.created_at || a.data.createdAt || a.data.updatedAt || 0);
    const bc = Number(b.data.created_at || b.data.createdAt || b.data.updatedAt || 0);
    return ac - bc || a.id.localeCompare(b.id);
  });

const used = new Set();
const plan = [];
for (const row of rows) {
  const unique = allocateUnique(row.base, used);
  if (LIMIT > 0 && plan.length >= LIMIT) break;
  const oldKey = nameKey(row.base);
  const newKey = nameKey(unique);
  const changed = cleanName(row.base) !== unique;
  plan.push({ uid: row.id, oldName: cleanName(row.base), newName: unique, oldKey, newKey, changed });
}

const changed = plan.filter((row) => row.changed);
const rowsByUid = new Map(rows.map((row) => [row.id, row]));
console.log(JSON.stringify({
  mode: APPLY ? 'apply' : 'dry-run',
  scannedUsers: rows.length,
  plannedUsers: plan.length,
  changedUsers: changed.length,
  sampleChanges: changed.slice(0, 30),
}, null, 2));

if (!APPLY) {
  console.log('Dry run only. Re-run with --apply to write users/profiles/leaderboard/name_index.');
  process.exit(0);
}

let batch = db.batch();
let writes = 0;
async function commitMaybe(force = false) {
  if (writes === 0) return;
  if (!force && writes < 450) return;
  await batch.commit();
  batch = db.batch();
  writes = 0;
}

for (const row of plan) {
  const userRef = db.collection('users').doc(row.uid);
  const profileRef = db.collection('public_profiles').doc(row.uid);
  const leaderboardRef = db.collection('leaderboard').doc(row.uid);
  const indexRef = db.collection(NAME_INDEX).doc(row.newKey);
  const existingProgress = rowsByUid.get(row.uid)?.data?.progress ?? {};
  const progressPatch = {
    user_name: row.newName,
    user_name_lower: row.newKey,
    nickname_migrated_at: String(now),
  };
  if (existingProgress.nickname_changed_at) {
    progressPatch.nickname_changed_at = String(existingProgress.nickname_changed_at);
  }
  if (existingProgress.nickname_change_available_at) {
    progressPatch.nickname_change_available_at = String(existingProgress.nickname_change_available_at);
  }

  batch.set(userRef, {
    progress: progressPatch,
    updatedAt: now,
  }, { merge: true });
  batch.set(profileRef, { uid: row.uid, name: row.newName, nameLower: row.newKey, updatedAt: now }, { merge: true });
  batch.set(leaderboardRef, { name: row.newName, nameLower: row.newKey, updatedAt: now }, { merge: true });
  batch.set(indexRef, { uid: row.uid, name: row.newName, nameLower: row.newKey, updatedAt: now }, { merge: true });
  writes += 4;

  await commitMaybe();
}

await commitMaybe(true);
console.log(`Applied ${plan.length} unique nickname reservations.`);
