// ════════════════════════════════════════════════════════════════════════════
// fix_tournament_season_names.js
//
// Чинит записи недельного рейтинга турниров, где вместо ника игрока стоит
// заглушка «Player».
//
// зачем: сервер при входе в турнир искал имя в users/{uid}, а настоящий ник
// лежит в leaderboard/{uid} (туда его пишет онбординг и синк XP). Поле не
// совпадало, поэтому в tournamentSeasons/{weekId}/entries/{uid} уезжала
// заглушка — и её видели ВСЕ игроки в таблице сезона. Код починен
// 2026-07-27, но уже записанные строки сами не исправятся.
//
// Использование:
//   node functions/scripts/fix_tournament_season_names.js          # dry-run
//   node functions/scripts/fix_tournament_season_names.js --apply  # записать
//   node functions/scripts/fix_tournament_season_names.js --week 2026-W31
//
// Безопасность:
//   • dry-run по умолчанию — без --apply НИЧЕГО не пишется;
//   • трогаются ТОЛЬКО документы с именем-заглушкой, реальные ники не
//     переписываются ни при каких условиях;
//   • очки (points), места и счётчики турниров НЕ меняются — правится только
//     name и, если найден, avatar;
//   • если настоящего ника нет ни в leaderboard, ни в users — документ
//     пропускается: пустое имя хуже заглушки.
//
// Стоимость: по одному чтению на запись рейтинга + батч профилей пачками
// по 30 (documentId in). Записи — батчами по 400.
// ════════════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const weekArgIndex = process.argv.indexOf('--week');
const ONLY_WEEK = weekArgIndex >= 0 ? process.argv[weekArgIndex + 1] : null;

/** Имена, которые считаем заглушкой. Совпадает с cleanup_arena_placeholders. */
const PLACEHOLDER_NAMES = new Set(['Игрок', 'Гравець', 'Player', 'Гость', 'Guest', '—', '-', '–', '']);

function isPlaceholderName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_NAMES.has(trimmed)) return true;
  return /^(Игрок|Гравець|Player|Guest)[\s\-_]*\d*$/i.test(trimmed);
}

/** Настоящий ник: сначала лидерборд, потом users — тот же порядок, что в коде. */
function realNameFrom(leaderboard, user) {
  const candidates = [leaderboard?.name, user?.name, user?.displayName];
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim();
    if (trimmed && !isPlaceholderName(trimmed)) return trimmed.slice(0, 48);
  }
  return null;
}

function realAvatarFrom(leaderboard, user) {
  const candidates = [leaderboard?.avatar, user?.avatar_emoji, user?.avatar];
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim();
    if (trimmed) return trimmed.slice(0, 16);
  }
  return null;
}

/** Читает профили пачками: documentId() in принимает максимум 30 значений. */
async function loadProfiles(collection, uids) {
  const found = new Map();
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    // guard-ok: пачка по documentId — это и есть батч вместо N чтений; цикл
    // здесь обязателен, потому что Firestore принимает максимум 30 id за раз.
    const snap = await db.collection(collection)
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    snap.docs.forEach((doc) => found.set(doc.id, doc.data() || {}));
  }
  return found;
}

async function main() {
  console.log(APPLY ? '=== РЕЖИМ ЗАПИСИ (--apply) ===' : '=== DRY-RUN (ничего не пишется) ===');

  // listDocuments(), а НЕ get(): документ недели существует только как
  // контейнер подколлекции entries и своих полей не имеет — обычный запрос
  // такие документы не возвращает, и скрипт молча находил бы «0 недель».
  // guard-ok: разовый админ-скрипт миграции, полный обход здесь — цель.
  const weekRefs = await db.collection('tournamentSeasons').listDocuments();
  const weekIds = weekRefs
    .map((ref) => ref.id)
    .filter((id) => !ONLY_WEEK || id === ONLY_WEEK);

  if (weekIds.length === 0) {
    console.log('Недель не найдено. Нечего чинить.');
    return;
  }
  console.log(`Недель к проверке: ${weekIds.length}${ONLY_WEEK ? ` (только ${ONLY_WEEK})` : ''}\n`);

  let totalBroken = 0;
  let totalFixed = 0;
  let totalSkipped = 0;

  for (const weekId of weekIds) {
    // guard-ok: см. выше — миграции нужен полный список записей недели.
    const entriesSnap = await db.collection('tournamentSeasons').doc(weekId)
      .collection('entries').get();

    const broken = entriesSnap.docs.filter((doc) => isPlaceholderName(doc.data()?.name));
    if (broken.length === 0) {
      console.log(`${weekId}: чисто (${entriesSnap.size} записей)`);
      continue;
    }
    totalBroken += broken.length;
    console.log(`${weekId}: заглушек ${broken.length} из ${entriesSnap.size}`);

    const uids = broken.map((doc) => doc.id);
    const [leaderboards, users] = await Promise.all([
      loadProfiles('leaderboard', uids),
      loadProfiles('users', uids),
    ]);

    let batch = db.batch();
    let pending = 0;

    for (const doc of broken) {
      const uid = doc.id;
      const name = realNameFrom(leaderboards.get(uid), users.get(uid));
      if (!name) {
        totalSkipped += 1;
        console.log(`  ⏭  ${uid}: настоящего ника нет нигде — пропускаем`);
        continue;
      }
      const avatar = realAvatarFrom(leaderboards.get(uid), users.get(uid));
      const patch = avatar ? { name, avatar } : { name };
      console.log(`  ✔  ${uid}: "${doc.data()?.name}" → "${name}"${avatar ? ` (аватар ${avatar})` : ''}`);
      totalFixed += 1;

      if (APPLY) {
        batch.set(doc.ref, patch, { merge: true });
        pending += 1;
        // Лимит батча Firestore — 500 операций, берём с запасом.
        if (pending >= 400) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
    }
    if (APPLY && pending > 0) await batch.commit();
  }

  console.log('\n─────────────────────────────');
  console.log(`Найдено заглушек: ${totalBroken}`);
  console.log(`${APPLY ? 'Исправлено' : 'Будет исправлено'}: ${totalFixed}`);
  console.log(`Пропущено (нет ника): ${totalSkipped}`);
  if (!APPLY && totalFixed > 0) {
    console.log('\nЗапустить реально: node functions/scripts/fix_tournament_season_names.js --apply');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  });
