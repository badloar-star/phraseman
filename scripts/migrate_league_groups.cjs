// ════════════════════════════════════════════════════════════════════════════
// migrate_league_groups.cjs — Распределение всех пользователей по клубам
//
// БЕЗОПАСНАЯ версия: НЕ удаляет существующие группы, НЕ затирает очки.
// Добавляет только тех кто ещё не привязан к группе текущей недели.
//
// Запуск: node scripts/migrate_league_groups.cjs  (из корня phraseman)
// ════════════════════════════════════════════════════════════════════════════

const admin           = require('../functions/node_modules/firebase-admin');
const { readFileSync } = require('fs');
const path            = require('path');

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

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

  // ── 1. Загружаем все текущие league_groups чтобы знать реальные очки ────────
  console.log('\n📥 Загружаем текущие league_groups...');
  const groupsSnap = await db.collection('league_groups')
    .where('weekId', '==', weekId)
    .get();

  // uid → { groupId, points, avatar, frame, isPremium, streak }
  const existingMembers = new Map();
  const existingGroups  = new Map(); // groupId → { leagueId, memberCount, members }

  groupsSnap.docs.forEach(doc => {
    const d = doc.data();
    existingGroups.set(doc.id, { leagueId: d.leagueId, memberCount: d.memberCount ?? 0, members: d.members ?? {} });
    Object.entries(d.members ?? {}).forEach(([uid, m]) => {
      existingMembers.set(uid, { groupId: doc.id, ...(m) });
    });
  });

  console.log(`   Существующих групп: ${existingGroups.size}, участников: ${existingMembers.size}`);

  // ── 2. Загружаем всех пользователей из leaderboard ───────────────────────
  console.log('\n📥 Загружаем leaderboard...');
  const lbSnap = await db.collection('leaderboard').get();
  console.log(`   Всего пользователей: ${lbSnap.size}`);

  // ── 3. Определяем кто уже в группе, кто нет, и у кого неправильный leagueId
  const toAssign = []; // пользователи которых нужно распределить

  lbSnap.docs.forEach(doc => {
    const d        = doc.data();
    const uid      = doc.id;
    const leagueId = typeof d.leagueId === 'number' ? d.leagueId : 0;

    const existing = existingMembers.get(uid);
    if (existing) {
      // Уже в группе — обновляем weekPoints если они стали актуальнее
      const freshPoints = d.weekPoints ?? 0;
      if (freshPoints > (existing.points ?? 0)) {
        // Запомним для обновления
        toAssign.push({ uid, data: d, leagueId, updateOnly: true, groupId: existing.groupId, points: freshPoints });
      }
      return; // уже привязан
    }

    // Нет в группе — нужно добавить
    toAssign.push({ uid, data: d, leagueId, updateOnly: false, points: d.weekPoints ?? 0 });
  });

  const newUsers    = toAssign.filter(u => !u.updateOnly);
  const updateUsers = toAssign.filter(u => u.updateOnly);

  console.log(`\n📊 Статус:`);
  console.log(`   Уже в группе:          ${existingMembers.size}`);
  console.log(`   Нужно добавить новых:  ${newUsers.length}`);
  console.log(`   Нужно обновить очки:   ${updateUsers.length}`);

  // ── 4. Обновляем очки для тех кто уже в группе но заработал новые ────────
  if (updateUsers.length > 0) {
    console.log('\n🔄 Обновляем очки в существующих группах...');
    const CHUNK = 400;
    for (let i = 0; i < updateUsers.length; i += CHUNK) {
      const batch = db.batch();
      updateUsers.slice(i, i + CHUNK).forEach(({ uid, groupId, points, data }) => {
        batch.update(db.collection('league_groups').doc(groupId), {
          [`members.${uid}.points`]:    points,
          [`members.${uid}.avatar`]:    data.user_avatar ?? data.avatar ?? null,
          [`members.${uid}.frame`]:     data.user_frame  ?? data.frame  ?? null,
          [`members.${uid}.isPremium`]: data.isPremium   ?? false,
          [`members.${uid}.streak`]:    data.streak      ?? 0,
        });
      });
      await batch.commit();
    }
    console.log(`   Обновлено: ${updateUsers.length}`);
  }

  // ── 5. Распределяем новых пользователей по клубам ────────────────────────
  if (newUsers.length === 0) {
    console.log('\n✅ Новых пользователей для распределения нет.');
  } else {
    console.log(`\n🏗️  Распределяем ${newUsers.length} новых участников...`);

    // Группируем по leagueId
    const byLeague = new Map();
    newUsers.forEach(u => {
      if (!byLeague.has(u.leagueId)) byLeague.set(u.leagueId, []);
      byLeague.get(u.leagueId).push(u);
    });

    // uid → groupId для обратной записи
    const uidToGroup = new Map();

    for (const [leagueId, members] of byLeague.entries()) {
      // Сортируем по убыванию очков
      members.sort((a, b) => b.points - a.points);

      // Ищем существующие незаполненные группы этого клуба
      const existingForLeague = [...existingGroups.entries()]
        .filter(([, g]) => g.leagueId === leagueId && g.memberCount < GROUP_SIZE)
        .sort((a, b) => b[1].memberCount - a[1].memberCount); // самые заполненные первыми

      let usedSlot = 0;

      for (const user of members) {
        let groupId;

        // Пробуем вписать в существующую неполную группу
        const slot = existingForLeague.find(([, g]) => g.memberCount < GROUP_SIZE);
        if (slot) {
          groupId = slot[0];
          slot[1].memberCount += 1;
        } else {
          // Создаём новую группу
          const idx = existingGroups.size + usedSlot;
          groupId   = `${weekId}_${leagueId}_new${idx}`;
          existingGroups.set(groupId, { leagueId, memberCount: 1, members: {} });
          existingForLeague.push([groupId, existingGroups.get(groupId)]);
          usedSlot++;
        }

        const memberData = {
          name:      user.data.name        ?? 'Игрок',
          points:    user.points,
          uid:       user.uid,
          avatar:    user.data.user_avatar ?? user.data.avatar ?? null,
          frame:     user.data.user_frame  ?? user.data.frame  ?? null,
          isPremium: user.data.isPremium   ?? false,
          streak:    user.data.streak      ?? 0,
        };

        // Создаём или обновляем группу в Firestore
        await db.collection('league_groups').doc(groupId).set({
          weekId,
          leagueId,
          memberCount: admin.firestore.FieldValue.increment(
            existingGroups.get(groupId)?.memberCount === 1 ? 0 : 1
          ),
          createdAt: Date.now(),
          [`members.${user.uid}`]: memberData,
        }, { merge: true });

        uidToGroup.set(user.uid, groupId);
      }

      console.log(`   ✅ Клуб ${leagueId}: добавлено ${members.length} участн.`);
    }

    // ── 6. Записываем groupId в leaderboard для новых пользователей ─────────
    if (uidToGroup.size > 0) {
      console.log(`\n💾 Обновляем leaderboard (${uidToGroup.size} новых пользователей)...`);
      const BATCH_SIZE = 400;
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
    }
  }

  // ── Итог ─────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('✅ Миграция завершена!');
  console.log(`   Всего в leaderboard:  ${lbSnap.size}`);
  console.log(`   Было в группах:       ${existingMembers.size}`);
  console.log(`   Добавлено новых:      ${newUsers.length}`);
  console.log(`   Обновлено очков:      ${updateUsers.length}`);
  console.log(`   Неделя:               ${weekId}`);
  console.log('════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка миграции:', err);
  process.exit(1);
});
