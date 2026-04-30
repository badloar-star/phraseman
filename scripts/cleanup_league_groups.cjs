/**
 * cleanup_league_groups.cjs — Чистка league_groups текущей недели.
 *
 * Делает три вещи:
 *   1. Удаляет «мёртвые» ссылки в `members[uid]` — те uids, которых нет в leaderboard
 *      (legacy Firebase Auth uids, оставшиеся от старой identity-схемы).
 *   2. Удаляет дубликаты: если uid присутствует в нескольких group.members,
 *      оставляет его в самой полной группе, из остальных удаляет.
 *      Дополнительно поправляет leaderboard.{uid}.groupId на «канонический».
 *   3. Удаляет полностью пустые группы (после чистки).
 *
 * Запуск:
 *   DRY_RUN=1 node scripts/cleanup_league_groups.cjs
 *   node scripts/cleanup_league_groups.cjs
 *   WEEK_ID=2026-W17 node scripts/cleanup_league_groups.cjs
 */

const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const path = require('path');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const WEEK_ARG = (process.argv.find((a) => a.startsWith('--week=')) || '').split('=')[1];
const WEEK_ENV = process.env.WEEK_ID;

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

async function main() {
  if (!admin.apps.length) {
    const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  const db = admin.firestore();

  const weekId = WEEK_ENV || WEEK_ARG || getWeekId();
  console.log(`weekId: ${weekId}${DRY_RUN ? ' (DRY_RUN)' : ''}`);

  // 1. Загружаем все leaderboard doc.id — это список «живых» uids
  const lbSnap = await db.collection('leaderboard').get();
  const validUids = new Set();
  lbSnap.docs.forEach((doc) => validUids.add(doc.id));
  console.log(`📥 leaderboard docs: ${validUids.size}`);

  // 2. Загружаем все league_groups текущей недели
  const groupsSnap = await db.collection('league_groups').where('weekId', '==', weekId).get();
  console.log(`📥 league_groups (weekId=${weekId}): ${groupsSnap.size}`);

  // uid → [{ groupId, count }] (для дедупа)
  const uidToGroups = new Map();
  // groupId → { ref, data, members, deadUids:[], dupUidsToRemove:[] }
  const groupOps = new Map();

  for (const doc of groupsSnap.docs) {
    const data = doc.data() || {};
    const members = (data.members && typeof data.members === 'object') ? data.members : {};
    groupOps.set(doc.id, { ref: doc.ref, data, members, deadUids: [], dupUidsToRemove: [] });

    for (const uid of Object.keys(members)) {
      if (!validUids.has(uid)) continue;  // мёртвых сюда не пишем
      if (!uidToGroups.has(uid)) uidToGroups.set(uid, []);
      uidToGroups.get(uid).push({ groupId: doc.id, count: countMembers(members) });
    }
  }

  // 3. Найти мёртвые ссылки в каждой группе
  let totalDead = 0;
  for (const [groupId, op] of groupOps) {
    for (const uid of Object.keys(op.members)) {
      if (!validUids.has(uid)) {
        op.deadUids.push(uid);
        totalDead++;
      }
    }
  }
  console.log(`🧹 Мёртвых ссылок (uids нет в leaderboard): ${totalDead}`);

  // 4. Найти дубликаты — uid в >1 группе. Оставить в группе с max count;
  //    при равенстве — в группе с лексикографически меньшим groupId (стабильно).
  let totalDupRemovals = 0;
  const lbUpdates = []; // [{ uid, canonicalGroupId, leagueId }]
  for (const [uid, occurs] of uidToGroups) {
    if (occurs.length <= 1) continue;
    occurs.sort((a, b) => b.count - a.count || a.groupId.localeCompare(b.groupId));
    const keep = occurs[0].groupId;
    for (let i = 1; i < occurs.length; i++) {
      const drop = occurs[i].groupId;
      groupOps.get(drop).dupUidsToRemove.push(uid);
      totalDupRemovals++;
    }
    const canonicalLeagueId = groupOps.get(keep).data?.leagueId ?? 0;
    lbUpdates.push({ uid, canonicalGroupId: keep, leagueId: canonicalLeagueId });
  }
  console.log(`🧹 Удалений по дубликатам: ${totalDupRemovals}`);
  console.log(`🔧 Обновлений leaderboard.groupId для дубликатов: ${lbUpdates.length}`);

  // 5. Применяем правки в league_groups
  let groupsTouched = 0;
  let groupsDeleted = 0;
  for (const [groupId, op] of groupOps) {
    if (op.deadUids.length === 0 && op.dupUidsToRemove.length === 0) continue;
    const newMembers = { ...op.members };
    for (const uid of op.deadUids) delete newMembers[uid];
    for (const uid of op.dupUidsToRemove) delete newMembers[uid];
    const newCount = countMembers(newMembers);

    if (DRY_RUN) {
      console.log(`  [dry-run] ${groupId}: -${op.deadUids.length} dead, -${op.dupUidsToRemove.length} dup → count ${newCount}`);
    } else {
      if (newCount === 0) {
        await op.ref.delete();
        groupsDeleted++;
      } else {
        await op.ref.set(
          { members: newMembers, memberCount: newCount, weekId, leagueId: op.data?.leagueId ?? 0 },
          { merge: false }, // полная замена members
        );
      }
      groupsTouched++;
    }
  }
  console.log(`✏️  Групп тронуто: ${groupsTouched}, удалено пустых: ${groupsDeleted}`);

  // 6. Обновляем leaderboard.groupId для дублей (чтобы клиент видел ту же группу)
  if (lbUpdates.length > 0) {
    const CHUNK = 400;
    let lbWritten = 0;
    for (let i = 0; i < lbUpdates.length; i += CHUNK) {
      const chunk = lbUpdates.slice(i, i + CHUNK);
      if (DRY_RUN) {
        chunk.forEach(({ uid, canonicalGroupId }) => {
          console.log(`  [dry-run] leaderboard/${uid}.groupId → ${canonicalGroupId}`);
        });
      } else {
        const batch = db.batch();
        chunk.forEach(({ uid, canonicalGroupId, leagueId }) => {
          batch.update(db.collection('leaderboard').doc(uid), {
            groupId: canonicalGroupId,
            groupWeekId: weekId,
            leagueId,
          });
        });
        await batch.commit();
      }
      lbWritten += chunk.length;
    }
    console.log(`📝 leaderboard updates: ${lbWritten}${DRY_RUN ? ' (dry-run)' : ''}`);
  }

  console.log(DRY_RUN ? '\nDry run finished.' : '\n✅ Cleanup applied.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
