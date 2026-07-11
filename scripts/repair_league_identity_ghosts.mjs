import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const deleteLeaderboard = args.includes('--delete-leaderboard');

function valuesFor(flag) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) out.push(args[i + 1]);
  }
  return out;
}

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const weekId = valuesFor('--week')[0] || getWeekKey();
const targetNames = new Set(valuesFor('--name').map((x) => x.trim().toLowerCase()).filter(Boolean));
const targetUids = new Set(valuesFor('--uid').map((x) => x.trim()).filter(Boolean));

if (targetNames.size === 0 && targetUids.size === 0) {
  console.error([
    'Usage:',
    '  node scripts/repair_league_identity_ghosts.mjs --name Janitor --name Janitor48 --dry-run',
    '  node scripts/repair_league_identity_ghosts.mjs --name Janitor --name Janitor48 --apply',
    '  node scripts/repair_league_identity_ghosts.mjs --uid <stable-or-auth-uid> --apply --delete-leaderboard',
    '',
    'Default mode is dry-run. --apply is required to write.',
    '--delete-leaderboard only deletes matched leaderboard docs; without it the script clears current league pointers.',
  ].join('\n'));
  process.exit(1);
}

if (apply && targetUids.size === 0) {
  console.error('Refusing to write from a display-name match. --apply requires --uid.');
  process.exit(2);
}

const credential = existsSync('./service-account.json')
  ? cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
  : applicationDefault();
initializeApp({ credential, projectId: process.env.GCLOUD_PROJECT || 'phraseman-ea0b3' });
const db = getFirestore();

function memberMatches(key, member) {
  const uid = String(member?.uid ?? key ?? '').trim();
  const name = String(member?.name ?? '').trim().toLowerCase();
  return targetUids.has(key) || targetUids.has(uid) || (!apply && targetNames.has(name));
}

async function maybeCommit(batch, count) {
  if (apply && count > 0) await batch.commit();
}

async function loadMatchedLeaderboardIds() {
  const ids = new Set(targetUids);
  if (apply) return ids;
  for (const nameLower of targetNames) {
    const snap = await db.collection('leaderboard').where('nameLower', '==', nameLower).limit(50).get();
    snap.docs.forEach((doc) => ids.add(doc.id));
  }
  return ids;
}

async function main() {
  console.log(`League ghost repair for week=${weekId} mode=${apply ? 'apply' : 'dry-run'}`);
  console.log(`names=${Array.from(targetNames).join(',') || '-'} uids=${Array.from(targetUids).join(',') || '-'}`);

  const groupsSnap = await db.collection('league_groups').where('weekId', '==', weekId).get();
  let groupsTouched = 0;
  let membersRemoved = 0;
  let batch = db.batch();
  let batchCount = 0;
  const now = Date.now();
  const removedUids = new Set();

  for (const doc of groupsSnap.docs) {
    const data = doc.data() || {};
    const members = data.members && typeof data.members === 'object' ? { ...data.members } : {};
    const removeKeys = Object.entries(members)
      .filter(([key, member]) => memberMatches(key, member))
      .map(([key, member]) => {
        const uid = String(member?.uid ?? key).trim();
        if (uid) removedUids.add(uid);
        return key;
      });
    if (removeKeys.length === 0) continue;

    removeKeys.forEach((key) => delete members[key]);
    const nextCount = Object.keys(members).length;
    groupsTouched += 1;
    membersRemoved += removeKeys.length;
    console.log(`group ${doc.id}: remove ${removeKeys.join(', ')} nextCount=${nextCount}`);

    if (apply) {
      if (nextCount <= 0) {
        batch.delete(doc.ref);
      } else {
        batch.set(doc.ref, { members, memberCount: nextCount, updatedAt: now, ghostRepairAt: now }, { merge: true });
      }
      batchCount += 1;
      if (batchCount >= 400) {
        await maybeCommit(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  const matchedLeaderboardIds = await loadMatchedLeaderboardIds();
  removedUids.forEach((uid) => matchedLeaderboardIds.add(uid));

  let leaderboardTouched = 0;
  for (const uid of matchedLeaderboardIds) {
    if (!uid) continue;
    const ref = db.collection('leaderboard').doc(uid);
    const snap = await ref.get().catch(() => null);
    if (!snap?.exists) continue;
    leaderboardTouched += 1;
    console.log(`${deleteLeaderboard ? 'delete' : 'clear league pointer'} leaderboard/${uid}`);
    if (apply) {
      if (deleteLeaderboard) {
        batch.delete(ref);
      } else {
        batch.update(ref, {
          groupId: FieldValue.delete(),
          groupWeekId: FieldValue.delete(),
          ghostRepairAt: now,
          updatedAt: now,
        });
      }
      batchCount += 1;
      if (batchCount >= 400) {
        await maybeCommit(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  await maybeCommit(batch, batchCount);

  console.log(`groupsScanned=${groupsSnap.size}`);
  console.log(`groupsTouched=${groupsTouched}`);
  console.log(`membersRemoved=${membersRemoved}`);
  console.log(`leaderboardTouched=${leaderboardTouched}`);
  console.log(apply ? 'Done.' : 'Dry-run only. Add --apply to write.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
