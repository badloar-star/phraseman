// Миграция: регистрирует всех пользователей из leaderboard в league_groups
// Запуск: node functions/scripts/migrate_users_to_league_groups.js

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const GROUP_SIZE = 20;

async function migrateUsersToLeagueGroups() {
  const weekId = getWeekKey();
  console.log(`Week: ${weekId}`);

  // Читаем всех пользователей из leaderboard
  const lbSnap = await db.collection('leaderboard').get();
  console.log(`Total leaderboard entries: ${lbSnap.size}`);

  // Группируем пользователей по leagueId
  const byLeague = {};
  for (const doc of lbSnap.docs) {
    const d = doc.data();
    if (!d.name) continue;
    // Пропускаем ботов
    if (d.isBot) continue;
    const leagueId = d.leagueId ?? 0;
    if (!byLeague[leagueId]) byLeague[leagueId] = [];
    byLeague[leagueId].push({ uid: doc.id, ...d });
  }

  console.log('Users per league:', Object.entries(byLeague).map(([k, v]) => `league ${k}: ${v.length}`).join(', '));

  // Проверяем каких пользователей уже нет в league_groups этой недели
  const existingGroupsSnap = await db.collection('league_groups')
    .where('weekId', '==', weekId)
    .get();

  const alreadyInGroup = new Set();
  for (const doc of existingGroupsSnap.docs) {
    const members = doc.data().members ?? {};
    Object.keys(members).forEach(uid => alreadyInGroup.add(uid));
  }
  console.log(`Already in groups this week: ${alreadyInGroup.size}`);

  // Кэш групп по leagueId (для текущей недели)
  const groupCache = {}; // leagueId -> { id, memberCount }

  // Инициализируем кэш из существующих групп
  for (const doc of existingGroupsSnap.docs) {
    const d = doc.data();
    const lid = d.leagueId;
    if (!groupCache[lid]) groupCache[lid] = [];
    groupCache[lid].push({ id: doc.id, memberCount: d.memberCount ?? Object.keys(d.members ?? {}).length });
  }

  let registered = 0;
  let skipped = 0;

  for (const [leagueIdStr, users] of Object.entries(byLeague)) {
    const leagueId = parseInt(leagueIdStr);

    for (const user of users) {
      if (alreadyInGroup.has(user.uid)) { skipped++; continue; }

      const memberData = {
        name: user.name,
        points: user.weekPoints ?? 0,
        uid: user.uid,
        avatar: user.avatar ?? null,
        frame: user.frame ?? null,
        isPremium: user.isPremium ?? false,
        streak: user.streak ?? 0,
      };

      // Найти группу с местом
      const groups = groupCache[leagueId] ?? [];
      const available = groups.find(g => g.memberCount < GROUP_SIZE);

      if (available) {
        // Добавляем в существующую группу
        await db.collection('league_groups').doc(available.id).update({
          memberCount: admin.firestore.FieldValue.increment(1),
          [`members.${user.uid}`]: memberData,
        });
        available.memberCount++;
        // Обновляем leaderboard doc с groupId
        await db.collection('leaderboard').doc(user.uid).set(
          { groupId: available.id, groupWeekId: weekId },
          { merge: true }
        );
      } else {
        // Создаём новую группу
        const groupId = `${weekId}_${leagueId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.collection('league_groups').doc(groupId).set({
          weekId,
          leagueId,
          memberCount: 1,
          createdAt: Date.now(),
          members: { [user.uid]: memberData },
        });
        if (!groupCache[leagueId]) groupCache[leagueId] = [];
        groupCache[leagueId].push({ id: groupId, memberCount: 1 });
        // Обновляем leaderboard doc с groupId
        await db.collection('leaderboard').doc(user.uid).set(
          { groupId, groupWeekId: weekId, leagueId },
          { merge: true }
        );
      }

      alreadyInGroup.add(user.uid);
      registered++;
      if (registered % 10 === 0) process.stdout.write(`\rRegistered: ${registered}...`);
    }
  }

  console.log(`\nDone. Registered: ${registered}, skipped (already in group): ${skipped}`);
  process.exit(0);
}

migrateUsersToLeagueGroups().catch(e => { console.error(e); process.exit(1); });
