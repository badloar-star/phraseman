import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import {
  restoredXPForOld250VisibleLevel,
  XP_LEVEL_RESTORE_250_TO_400_KEY,
} from './lib/xp_level_restore.mjs';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const limitArg = [...args].find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.slice('--limit='.length)) || 0) : 0;
const projectArg = [...args].find((arg) => arg.startsWith('--project='));

function readFirebaseProjectId() {
  if (projectArg) return projectArg.slice('--project='.length);
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    const rc = JSON.parse(readFileSync('./.firebaserc', 'utf8'));
    return rc?.projects?.default || undefined;
  } catch {
    return undefined;
  }
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
let credential;
let credentialLabel = 'applicationDefault';
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  credential = cert(serviceAccount);
  credentialLabel = serviceAccountPath;
} catch {
  credential = applicationDefault();
}
const projectId = readFirebaseProjectId();
initializeApp(projectId ? { credential, projectId } : { credential });

const db = getFirestore();
const now = Date.now();

function parseProgressXP(progress) {
  return Math.max(0, Math.floor(Number(progress?.user_total_xp ?? 0) || 0));
}

function numericLegacyAvatar(value) {
  return value == null || /^\d+$/.test(String(value).trim());
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`[xp-restore] mode=${apply ? 'APPLY' : 'DRY-RUN'} credential=${credentialLabel} project=${projectId || 'auto'}`);

  const affected = new Map();
  let scannedUsers = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection('users').orderBy('__name__').limit(250);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      scannedUsers += 1;
      const data = doc.data() || {};
      const progress = data.progress || {};
      const currentXP = parseProgressXP(progress);
      const alreadyRestored = Boolean(progress[XP_LEVEL_RESTORE_250_TO_400_KEY]);
      const restored = restoredXPForOld250VisibleLevel(currentXP);
      if (!alreadyRestored && restored.targetXP <= currentXP) continue;
      if (alreadyRestored && currentXP <= 0) continue;
      if (alreadyRestored && restored.targetXP <= currentXP) continue;

      const firebaseAuthUid = typeof data.firebaseAuthUid === 'string' && data.firebaseAuthUid.trim()
        ? data.firebaseAuthUid.trim()
        : null;

      affected.set(doc.id, {
        uid: doc.id,
        firebaseAuthUid,
        currentXP,
        targetXP: restored.targetXP,
        oldLevel: restored.oldLevel,
        restoredLevel: restored.restoredLevel,
        alreadyRestored,
        progress,
      });

      if (limit && affected.size >= limit) break;
    }

    if (limit && affected.size >= limit) break;
  }

  console.log(`[xp-restore] scanned users=${scannedUsers}, affected=${affected.size}`);
  for (const item of [...affected.values()].slice(0, 10)) {
    const mode = item.targetXP > item.currentXP
      ? (item.alreadyRestored ? 'repair-stale-marker' : 'restore')
      : 'mirror-only';
    console.log(`[sample] ${mode} ${item.uid}: ${item.currentXP} -> ${item.targetXP}, level ${item.oldLevel} -> ${item.restoredLevel}`);
  }

  if (affected.size === 0 || !apply) {
    console.log('[xp-restore] no writes performed');
    return;
  }

  let userWrites = 0;
  let leaderboardWrites = 0;
  let arenaWrites = 0;
  let leagueGroupWrites = 0;

  for (const batchItems of chunk([...affected.values()], 400)) {
    const batch = db.batch();
    for (const item of batchItems) {
      const userRef = db.collection('users').doc(item.uid);
      batch.set(userRef, {
        progress: {
          user_total_xp: String(item.targetXP),
          user_prev_xp: String(item.targetXP),
          [XP_LEVEL_RESTORE_250_TO_400_KEY]: '1',
          xp_migration_v2: '1',
        },
        xpLevelRestore250To400At: FieldValue.serverTimestamp(),
      }, { merge: true });
      userWrites += 1;

      const lbRef = db.collection('leaderboard').doc(item.uid);
      const lbPatch = {
        points: item.targetXP,
        xpLevelRestore250To400At: FieldValue.serverTimestamp(),
        updatedAt: now,
      };
      const avatarRaw = item.progress?.user_avatar;
      if (numericLegacyAvatar(avatarRaw)) lbPatch.avatar = String(item.restoredLevel);
      batch.set(lbRef, lbPatch, { merge: true });
      leaderboardWrites += 1;

      const arenaIds = [...new Set([item.uid, item.firebaseAuthUid].filter(Boolean))];
      for (const arenaId of arenaIds) {
        batch.set(db.collection('arena_profiles').doc(arenaId), {
          courseTotalXp: item.targetXP,
          updatedAt: FieldValue.serverTimestamp(),
          xpLevelRestore250To400At: FieldValue.serverTimestamp(),
        }, { merge: true });
        arenaWrites += 1;
      }
    }
    await batch.commit();
  }

  const affectedIds = new Set(affected.keys());
  let lastGroup = null;
  while (true) {
    let query = db.collection('league_groups').orderBy('__name__').limit(100);
    if (lastGroup) query = query.startAfter(lastGroup);
    const snap = await query.get();
    if (snap.empty) break;
    lastGroup = snap.docs[snap.docs.length - 1];

    const batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members;
      if (!members || typeof members !== 'object') continue;

      let changed = false;
      const nextMembers = { ...members };
      for (const uid of Object.keys(nextMembers)) {
        if (!affectedIds.has(uid)) continue;
        const restore = affected.get(uid);
        nextMembers[uid] = {
          ...nextMembers[uid],
          totalXp: restore.targetXP,
          level: restore.restoredLevel,
        };
        changed = true;
      }
      if (!changed) continue;

      batch.set(doc.ref, {
        members: nextMembers,
        xpLevelRestore250To400At: FieldValue.serverTimestamp(),
      }, { merge: true });
      count += 1;
      leagueGroupWrites += 1;
    }
    if (count > 0) await batch.commit();
  }

  console.log(`[xp-restore] wrote users=${userWrites}, leaderboard=${leaderboardWrites}, arenaProfiles=${arenaWrites}, leagueGroups=${leagueGroupWrites}`);
}

main().catch((error) => {
  console.error('[xp-restore] failed', error);
  process.exit(1);
});
