import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';

const credential = existsSync('./service-account.json')
  ? cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
  : applicationDefault();
initializeApp({ credential, projectId: process.env.GCLOUD_PROJECT || 'phraseman-ea0b3' });

const db = getFirestore();
const GROUP_SIZE = 30;

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function currentWeekPoints(progress, weekId) {
  try {
    const raw = progress?.week_points_v2;
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.weekKey !== weekId) return 0;
    const points = Number(parsed?.points ?? 0);
    return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  } catch {
    return 0;
  }
}

function currentLeagueId(progress, fallback = 0) {
  try {
    const parsed = progress?.league_state_v3 ? JSON.parse(progress.league_state_v3) : null;
    const lid = Number(parsed?.leagueId);
    return Number.isFinite(lid) ? Math.max(0, Math.min(11, Math.trunc(lid))) : fallback;
  } catch {
    return fallback;
  }
}

function memberFrom(uid, lb, points) {
  return {
    uid,
    name: lb.name || 'Player',
    points,
    avatar: lb.avatar ?? null,
    frame: lb.frame ?? null,
    isPremium: lb.isPremium ?? false,
    streak: lb.streak ?? 0,
    totalXp: lb.points ?? 0,
  };
}

async function commitBatch(batch, count) {
  if (count > 0) await batch.commit();
}

async function main() {
  const weekId = getWeekKey();
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;
  if (apply && !process.argv.includes('--confirm-current-week-rebuild')) {
    throw new Error('Refusing current-week league rebuild without --confirm-current-week-rebuild');
  }
  console.log(`Repairing weekly league rollover for ${weekId}${dryRun ? ' (dry run)' : ''}`);

  const usersSnap = await db.collection('users').get();
  const pointsByUid = new Map();
  const leagueByUid = new Map();

  for (const doc of usersSnap.docs) {
    const progress = doc.data()?.progress ?? {};
    pointsByUid.set(doc.id, currentWeekPoints(progress, weekId));
    leagueByUid.set(doc.id, currentLeagueId(progress, 0));
  }

  const lbSnap = await db.collection('leaderboard').get();
  const byLeague = new Map();
  let fixedLeaderboard = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of lbSnap.docs) {
    const lb = doc.data();
    const uid = doc.id;
    const incomingPoints = pointsByUid.get(uid) ?? 0;
    const points = lb.weekKey === weekId
      ? Math.max(0, Math.floor(Number(lb.weekPoints) || 0), incomingPoints)
      : incomingPoints;
    const leagueId = leagueByUid.get(uid) ?? (typeof lb.leagueId === 'number' ? lb.leagueId : 0);
    const nextLb = { ...lb, weekPoints: points, weekKey: weekId, leagueId };
    if (!byLeague.has(leagueId)) byLeague.set(leagueId, []);
    byLeague.get(leagueId).push({ uid, data: nextLb });

    if (lb.weekPoints !== points || lb.weekKey !== weekId || lb.leagueId !== leagueId) {
      fixedLeaderboard++;
      if (!dryRun) {
        batch.set(doc.ref, { weekPoints: points, weekKey: weekId, leagueId, updatedAt: Date.now() }, { merge: true });
        batchCount++;
        if (batchCount >= 400) {
          await commitBatch(batch, batchCount);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
  }
  if (!dryRun) await commitBatch(batch, batchCount);

  const oldGroups = await db.collection('league_groups').where('weekId', '==', weekId).get();
  if (!dryRun && !oldGroups.empty) {
    batch = db.batch();
    batchCount = 0;
    for (const doc of oldGroups.docs) {
      batch.delete(doc.ref);
      batchCount++;
      if (batchCount >= 400) {
        await commitBatch(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
    await commitBatch(batch, batchCount);
  }

  const uidToGroup = new Map();
  let createdGroups = 0;
  batch = db.batch();
  batchCount = 0;

  for (const [leagueId, members] of byLeague.entries()) {
    members.sort((a, b) => (b.data.weekPoints ?? 0) - (a.data.weekPoints ?? 0));
    for (let i = 0; i < members.length; i += GROUP_SIZE) {
      const chunk = members.slice(i, i + GROUP_SIZE);
      const groupId = `${weekId}_${leagueId}_repair_${Math.floor(i / GROUP_SIZE)}`;
      const membersMap = {};
      for (const { uid, data } of chunk) {
        membersMap[uid] = memberFrom(uid, data, data.weekPoints ?? 0);
        uidToGroup.set(uid, groupId);
      }
      createdGroups++;
      if (!dryRun) {
        batch.set(db.collection('league_groups').doc(groupId), {
          weekId,
          leagueId,
          memberCount: chunk.length,
          createdAt: Date.now(),
          repairedAt: Date.now(),
          members: membersMap,
        });
        batchCount++;
        if (batchCount >= 400) {
          await commitBatch(batch, batchCount);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
  }
  if (!dryRun) await commitBatch(batch, batchCount);

  if (!dryRun) {
    batch = db.batch();
    batchCount = 0;
    for (const [uid, groupId] of uidToGroup.entries()) {
      batch.set(db.collection('leaderboard').doc(uid), { groupId, groupWeekId: weekId }, { merge: true });
      batchCount++;
      if (batchCount >= 400) {
        await commitBatch(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }
    await commitBatch(batch, batchCount);
  }

  console.log(`users=${usersSnap.size}`);
  console.log(`leaderboard=${lbSnap.size}`);
  console.log(`fixedLeaderboard=${fixedLeaderboard}`);
  console.log(`deletedCurrentWeekGroups=${oldGroups.size}`);
  console.log(`createdGroups=${createdGroups}`);
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
