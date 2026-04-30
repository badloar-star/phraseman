// ════════════════════════════════════════════════════════════════════════════
// migrate_league_groups.mjs — Распределение всех пользователей по клубам
//
// Что делает:
//   1. Читает всех пользователей из leaderboard/{uid}
//   2. Группирует по leagueId (0-11)
//   3. Разбивает каждый клуб на комнаты по 20 человек
//   4. Создаёт/обновляет документы в league_groups/
//   5. Записывает groupId обратно в leaderboard/{uid}
//
// Запуск: node scripts/migrate_league_groups.mjs
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync }        from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const GROUP_SIZE = 20;

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const weekId = getWeekKey();
  console.log(`\n📅 Текущая неделя: ${weekId}`);

  // ── 1. Загружаем всех пользователей из leaderboard ───────────────────────
  console.log('\n📥 Загружаем leaderboard...');
  const lbSnap = await db.collection('leaderboard').get();
  console.log(`   Найдено пользователей: ${lbSnap.size}`);

  // ── 2. Группируем по leagueId ────────────────────────────────────────────
  // leagueId = 0..11, дефолт 0 если не задан
  const byLeague = new Map(); // leagueId → [{uid, data}]

  lbSnap.docs.forEach(doc => {
    const d    = doc.data();
    const lid  = typeof d.leagueId === 'number' ? d.leagueId : 0;
    if (!byLeague.has(lid)) byLeague.set(lid, []);
    byLeague.get(lid).push({ uid: doc.id, data: d });
  });

  console.log('\n📊 Распределение по клубам:');
  for (const [lid, members] of [...byLeague.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`   Клуб ${lid}: ${members.length} участн.`);
  }

  // ── 3. Удаляем старые league_groups этой недели ───────────────────────────
  console.log('\n🗑️  Удаляем старые группы текущей недели...');
  const oldGroups = await db.collection('league_groups')
    .where('weekId', '==', weekId)
    .get();

  let deleteCount = 0;
  const delBatch = db.batch();
  oldGroups.docs.forEach(doc => { delBatch.delete(doc.ref); deleteCount++; });
  if (deleteCount > 0) {
    await delBatch.commit();
    console.log(`   Удалено: ${deleteCount} групп`);
  } else {
    console.log('   Нет старых групп — пропускаем');
  }

  // ── 4. Создаём новые группы по 20 человек ────────────────────────────────
  console.log('\n🏗️  Создаём новые группы...');

  // uid → groupId (для обратной записи в leaderboard)
  const uidToGroup = new Map();

  let totalGroups = 0;

  for (const [leagueId, members] of byLeague.entries()) {
    // Сортируем по убыванию weekPoints чтобы сильные попадали в одну комнату
    members.sort((a, b) => (b.data.weekPoints ?? 0) - (a.data.weekPoints ?? 0));

    // Разбиваем на чанки по GROUP_SIZE
    const chunks = [];
    for (let i = 0; i < members.length; i += GROUP_SIZE) {
      chunks.push(members.slice(i, i + GROUP_SIZE));
    }

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk   = chunks[chunkIdx];
      const groupId = `${weekId}_${leagueId}_${chunkIdx}`;

      const membersMap = {};
      chunk.forEach(({ uid, data }) => {
        membersMap[uid] = {
          name:      data.name      ?? 'Игрок',
          points:    data.weekPoints ?? 0,
          uid,
          avatar:    data.user_avatar ?? data.avatar ?? null,
          frame:     data.user_frame  ?? data.frame  ?? null,
          isPremium: data.isPremium   ?? false,
          streak:    data.streak      ?? 0,
        };
        uidToGroup.set(uid, groupId);
      });

      await db.collection('league_groups').doc(groupId).set({
        weekId,
        leagueId,
        memberCount: chunk.length,
        createdAt:   Date.now(),
        members:     membersMap,
      });

      totalGroups++;
      console.log(`   ✅ Клуб ${leagueId}, группа ${chunkIdx + 1}/${chunks.length} — ${chunk.length} участн. (${groupId})`);
    }
  }

  // ── 5. Записываем groupId обратно в leaderboard/{uid} ────────────────────
  console.log(`\n💾 Обновляем leaderboard (${uidToGroup.size} пользователей)...`);

  const BATCH_SIZE = 400; // Firestore batch limit = 500
  const entries    = [...uidToGroup.entries()];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch();
    entries.slice(i, i + BATCH_SIZE).forEach(([uid, groupId]) => {
      batch.update(db.collection('leaderboard').doc(uid), {
        groupId,
        groupWeekId: weekId,
      });
    });
    await batch.commit();
    console.log(`   Записано ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`);
  }

  // ── 6. Итог ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log(`✅ Миграция завершена!`);
  console.log(`   Всего пользователей: ${lbSnap.size}`);
  console.log(`   Создано групп:       ${totalGroups}`);
  console.log(`   Неделя:              ${weekId}`);
  console.log('════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка миграции:', err);
  process.exit(1);
});
