// Синхронизирует weekPoints из leaderboard -> league_groups.members
// Запуск: node functions/scripts/sync_group_points.js

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('../../service-account.json')) });
const db = admin.firestore();

async function syncGroupPoints() {
  // Читаем всех пользователей из leaderboard
  const lbSnap = await db.collection('leaderboard').get();
  const lbByUid = {};
  for (const doc of lbSnap.docs) {
    lbByUid[doc.id] = doc.data();
  }
  console.log(`Leaderboard entries: ${Object.keys(lbByUid).length}`);

  // Читаем все league_groups этой недели
  const groupsSnap = await db.collection('league_groups').where('weekId', '==', '2026-W17').get();
  console.log(`Groups this week: ${groupsSnap.size}`);

  let updatedUsers = 0;
  let skippedSame = 0;

  for (const groupDoc of groupsSnap.docs) {
    const groupData = groupDoc.data();
    const members = groupData.members ?? {};
    const updates = {};

    for (const [uid, member] of Object.entries(members)) {
      const lb = lbByUid[uid];
      if (!lb) continue;

      const newPoints = lb.weekPoints ?? 0;
      const newAvatar = lb.avatar ?? null;
      const newFrame = lb.frame ?? null;
      const newStreak = lb.streak ?? 0;
      const newPremium = lb.isPremium ?? false;

      // Обновляем если изменились данные
      if (member.points !== newPoints || member.avatar !== newAvatar) {
        updates[`members.${uid}.points`] = newPoints;
        updates[`members.${uid}.avatar`] = newAvatar;
        updates[`members.${uid}.frame`] = newFrame;
        updates[`members.${uid}.streak`] = newStreak;
        updates[`members.${uid}.isPremium`] = newPremium;
        updatedUsers++;
      } else {
        skippedSame++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await groupDoc.ref.update(updates);
      process.stdout.write('.');
    }
  }

  console.log(`\nDone. Updated: ${updatedUsers} users, skipped (same): ${skippedSame}`);
  process.exit(0);
}

syncGroupPoints().catch(e => { console.error(e.message); process.exit(1); });
