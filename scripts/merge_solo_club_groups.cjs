/**
 * Переносит игроков из сольных league_groups (1 участник) в существующие
 * неполные группы того же клуба (leagueId) и той же недели (weekId).
 *
 * Логика подбора цели совпадает с приложением: среди групп с count < 20
 * выбирается с максимальным числом участников, tie-break — меньший doc id.
 *
 * Запуск (из корня репо, нужен service-account.json):
 *   node scripts/merge_solo_club_groups.cjs
 *   DRY_RUN=1 node scripts/merge_solo_club_groups.cjs
 *   WEEK_ID=2026-W18 node scripts/merge_solo_club_groups.cjs
 *
 * Windows (PowerShell):
 *   $env:DRY_RUN=1; node scripts/merge_solo_club_groups.cjs
 */

const admin = require('firebase-admin');

const GROUP_SIZE = 20;
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const WEEK_ARG = (process.argv.find((a) => a.startsWith('--week=')) || '').split('=')[1];
const weekIdFromEnv = process.env.WEEK_ID;

function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function countMembers(members) {
  if (!members || typeof members !== 'object') return 0;
  return Object.keys(members).length;
}

function bestTargetId(state, leagueId, fromId) {
  let best = null;
  let bestC = -1;
  for (const [id, g] of state) {
    if (g.leagueId !== leagueId) continue;
    if (id === fromId) continue;
    const c = countMembers(g.members);
    if (c >= GROUP_SIZE) continue;
    if (c > bestC || (c === bestC && (best == null || id < best))) {
      bestC = c;
      best = id;
    }
  }
  return best;
}

/**
 * Собирает список ходов: { fromId, toId, uid } до тех пор, пока есть сольник,
 * в который можно перелить.
 */
function planMerges(initialGroups) {
  const state = new Map();
  for (const { id, leagueId, members, weekId, createdAt } of initialGroups) {
    state.set(id, { leagueId, weekId, createdAt, members: { ...members } });
  }

  const moves = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let did = false;
    for (const [id, g] of Array.from(state.entries())) {
      if (countMembers(g.members) !== 1) continue;
      const t = bestTargetId(state, g.leagueId, id);
      if (!t) continue;
      const uid = Object.keys(g.members)[0];
      moves.push({ fromId: id, toId: t, uid, weekId: g.weekId, leagueId: g.leagueId });
      const member = { ...g.members[uid] };
      g.members = {};
      state.delete(id);
      const tg = state.get(t);
      tg.members[uid] = member;
      did = true;
      break;
    }
    if (!did) break;
  }
  return { moves, finalState: state };
}

async function applyMove(db, { fromId, toId, uid }, dryRun) {
  const gRef = (id) => db.collection('league_groups').doc(id);
  const lbRef = (u) => db.collection('leaderboard').doc(u);

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] move ${uid}: ${fromId} -> ${toId}`);
    return;
  }

  await db.runTransaction(async (tx) => {
    const sSnap = await tx.get(gRef(fromId));
    const tSnap = await tx.get(gRef(toId));
    if (!sSnap.exists) throw new Error(`missing source group ${fromId}`);
    if (!tSnap.exists) throw new Error(`missing target group ${toId}`);
    const sData = sSnap.data() || {};
    const tData = tSnap.data() || {};
    const sMembers = { ...(sData.members || {}) };
    const tMembers = { ...(tData.members || {}) };
    if (!sMembers[uid]) throw new Error(`uid ${uid} not in source ${fromId}`);
    if (tMembers[uid]) throw new Error(`uid ${uid} already in target ${toId}`);
    const tCount = countMembers(tMembers);
    if (tCount >= GROUP_SIZE) throw new Error(`target ${toId} full`);

    const m = sMembers[uid];
    delete sMembers[uid];
    tMembers[uid] = m;
    const sCount = countMembers(sMembers);
    const newTCount = countMembers(tMembers);

    tx.set(
      gRef(toId),
      { members: tMembers, memberCount: newTCount, weekId: tData.weekId, leagueId: tData.leagueId },
      { merge: true },
    );

    if (sCount === 0) {
      tx.delete(gRef(fromId));
    } else {
      tx.set(
        gRef(fromId),
        { members: sMembers, memberCount: sCount, weekId: sData.weekId, leagueId: sData.leagueId },
        { merge: true },
      );
    }

    tx.set(
      lbRef(uid),
      { groupId: toId, groupWeekId: tData.weekId, leagueId: tData.leagueId },
      { merge: true },
    );
  });
}

async function run() {
  const weekId = weekIdFromEnv || WEEK_ARG || getWeekId();
  // eslint-disable-next-line no-console
  console.log('weekId:', weekId, DRY_RUN ? '(DRY_RUN)' : '');

  if (!admin.apps.length) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account.json')) });
  }
  const db = admin.firestore();

  const groupsSnap = await db.collection('league_groups').where('weekId', '==', weekId).get();
  const initialGroups = [];
  for (const doc of groupsSnap.docs) {
    const data = doc.data() || {};
    const members = data.members || {};
    const n = countMembers(members);
    if (n === 0) {
      // eslint-disable-next-line no-console
      if (!DRY_RUN) {
        // eslint-disable-next-line no-await-in-loop
        await doc.ref.delete();
        // eslint-disable-next-line no-console
        console.log('deleted empty group', doc.id);
      } else {
        // eslint-disable-next-line no-console
        console.log('[dry-run] would delete empty group', doc.id);
      }
      continue;
    }
    initialGroups.push({
      id: doc.id,
      weekId: data.weekId,
      leagueId: data.leagueId ?? 0,
      createdAt: data.createdAt,
      members,
    });
  }

  const { moves, finalState } = planMerges(initialGroups);
  // eslint-disable-next-line no-console
  console.log('planned moves:', moves.length);
  for (const m of moves) {
    // eslint-disable-next-line no-console
    console.log(
      `  league ${m.leagueId}: ${m.uid} ${m.fromId} -> ${m.toId}`,
    );
  }
  // eslint-disable-next-line no-console
  console.log('final groups in simulation:', finalState.size);

  if (moves.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Nothing to do.');
    process.exit(0);
  }

  let ok = 0;
  for (const m of moves) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await applyMove(db, m, DRY_RUN);
      ok++;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('FAILED move', m, e.message || e);
    }
  }
  // eslint-disable-next-line no-console
  console.log(DRY_RUN ? 'Dry run finished.' : `Done. Applied ${ok}/${moves.length} moves.`);
  process.exit(ok === moves.length ? 0 : 1);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
