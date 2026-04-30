// Исправляет ситуацию когда пользователи остались без groupId после dedup:
// - находит все leaderboard/{uid} без groupId на текущей неделе
// - находит solo-группы (1 участник) созданные после нового билда
// - объединяет всех в группы по 20

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(require('../service-account.json')) });
const db = admin.firestore();

const GROUP_SIZE = 20;

// Текущая неделя — ISO week
function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function run() {
  const weekId = getWeekId();
  console.log('Текущая неделя:', weekId);

  // 1. Читаем все leaderboard документы
  const lbSnap = await db.collection('leaderboard').get();
  console.log('Leaderboard docs:', lbSnap.size);

  // 2. Читаем все league_groups для текущей недели
  const groupsSnap = await db.collection('league_groups').where('weekId', '==', weekId).get();
  console.log('Групп на текущей неделе:', groupsSnap.size);

  // Карта groupId → данные группы
  const groups = new Map();
  for (const doc of groupsSnap.docs) {
    const data = doc.data();
    const realMemberCount = Object.keys(data.members || {}).length;
    groups.set(doc.id, { id: doc.id, leagueId: data.leagueId, memberCount: realMemberCount, members: data.members || {} });
  }

  // 3. Найти пользователей без groupId или с groupId в solo-группе
  const usersNeedingGroup = []; // { uid, lbData }

  for (const doc of lbSnap.docs) {
    const data = doc.data();
    const uid = doc.id;
    const leagueId = data.leagueId ?? 0;
    const groupId = data.groupId;
    const groupWeekId = data.groupWeekId;

    // Нет groupId вообще или groupId на другую неделю
    if (!groupId || groupWeekId !== weekId) {
      if (data.name) {
        usersNeedingGroup.push({ uid, leagueId, name: data.name, points: data.weekPoints ?? 0, avatar: data.avatar, frame: data.frame, isPremium: data.isPremium ?? false, streak: data.streak ?? 0 });
      }
      continue;
    }

    // groupId есть, но сама группа solo (1 участник) — тоже нужно перегруппировать
    const group = groups.get(groupId);
    if (group && group.memberCount === 1) {
      if (data.name) {
        usersNeedingGroup.push({ uid, leagueId, name: data.name, points: data.weekPoints ?? 0, avatar: data.avatar, frame: data.frame, isPremium: data.isPremium ?? false, streak: data.streak ?? 0 });
        // Удаляем solo-группу из рабочей карты
        groups.delete(groupId);
      }
    }
  }

  console.log(`\nПользователей без нормальной группы: ${usersNeedingGroup.length}`);
  if (usersNeedingGroup.length === 0) {
    console.log('Все уже в группах, ничего делать не нужно.');
    process.exit(0);
  }

  usersNeedingGroup.forEach(u => console.log(`  - ${u.name} (uid=${u.uid}, leagueId=${u.leagueId})`));

  // 4. Группируем по leagueId и распределяем в существующие неполные группы или создаём новые
  const byLeague = new Map();
  for (const u of usersNeedingGroup) {
    if (!byLeague.has(u.leagueId)) byLeague.set(u.leagueId, []);
    byLeague.get(u.leagueId).push(u);
  }

  const batch = db.batch();
  const lbBatch = db.batch();
  let ops = 0;

  for (const [leagueId, users] of byLeague) {
    console.log(`\nОбрабатываем leagueId=${leagueId}, пользователей: ${users.length}`);

    // Найти существующую неполную группу этого leagueId
    let targetGroup = null;
    for (const [gid, g] of groups) {
      if (g.leagueId === leagueId && g.memberCount < GROUP_SIZE) {
        targetGroup = g;
        break;
      }
    }

    for (const user of users) {
      // Если текущая группа заполнена — создаём новую
      if (!targetGroup || targetGroup.memberCount >= GROUP_SIZE) {
        const newId = `${weekId}_${leagueId}_${Date.now()}_fix`;
        targetGroup = { id: newId, leagueId, memberCount: 0, members: {} };
        groups.set(newId, targetGroup);
        // Создаём документ группы
        batch.set(db.collection('league_groups').doc(newId), {
          weekId,
          leagueId,
          memberCount: 0,
          createdAt: Date.now(),
          members: {},
        });
        console.log(`  Создана новая группа: ${newId}`);
      }

      const memberData = {
        name: user.name,
        points: user.points,
        uid: user.uid,
        avatar: user.avatar ?? null,
        frame: user.frame ?? null,
        isPremium: user.isPremium,
        streak: user.streak,
      };

      // Добавляем участника в группу
      batch.update(db.collection('league_groups').doc(targetGroup.id), {
        [`members.${user.uid}`]: memberData,
        memberCount: admin.firestore.FieldValue.increment(1),
      });
      targetGroup.memberCount++;
      targetGroup.members[user.uid] = memberData;

      // Обновляем leaderboard запись пользователя
      lbBatch.update(db.collection('leaderboard').doc(user.uid), {
        groupId: targetGroup.id,
        groupWeekId: weekId,
        leagueId,
      });

      console.log(`  ✓ ${user.name} → группа ${targetGroup.id}`);
      ops++;
    }
  }

  // 5. Удаляем solo-группы (они опустеют)
  const soloGroups = [];
  for (const [gid, g] of groups) {
    if (g.memberCount === 1 && Object.keys(g.members).length === 1) {
      // Это solo-группа которую мы оставили (не добавляли юзеров)
      // Пропускаем — юзер уже перенесён, solo-группу оставим (она просто запустеет)
    }
  }

  console.log(`\nПрименяем изменения (${ops} пользователей)...`);
  await batch.commit();
  await lbBatch.commit();
  console.log('Готово! Все пользователи распределены по группам.');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
