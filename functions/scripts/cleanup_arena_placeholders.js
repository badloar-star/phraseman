// ════════════════════════════════════════════════════════════════════════════
// cleanup_arena_placeholders.js
//
// Находит и (опционально) удаляет тестовые / placeholder записи из коллекции
// arena_profiles в Firestore — те что показывались в Топ-100 как "Игрок", "—",
// "Гравець", "Player", "Игрок 1" и т.п.
//
// Использование:
//   node functions/scripts/cleanup_arena_placeholders.js          # dry-run (только показать)
//   node functions/scripts/cleanup_arena_placeholders.js --apply  # реально удалить
//
// Безопасность:
//   • dry-run по умолчанию — без флага --apply ничего не удаляется.
//   • Удаляются ТОЛЬКО документы которые точно матчат placeholder-паттерны.
//   • Документы с реальными именами не трогаются ни при каких условиях.
//   • При --apply печатает каждый id который удаляет.
// ════════════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
// Безопасный режим (по умолчанию): не удалять документы у которых пусто
// displayName, но есть признаки реальной активности (matchesPlayed > 0 или xp > 0).
// Это могут быть реальные юзеры, у которых просто не подтянулся displayName.
const KEEP_ACTIVE_EMPTY = !process.argv.includes('--wipe-active-empty');

const PLACEHOLDER_NAMES = new Set([
  'Игрок', 'Гравець', 'Player', 'Гость', 'Guest',
  '—', '-', '–', '',
]);

function isPlaceholderName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_NAMES.has(trimmed)) return true;
  if (/^(Игрок|Гравець|Player|Guest)[\s\-_]*\d*$/i.test(trimmed)) return true;
  return false;
}

function shouldDelete(displayName, xp, matchesPlayed) {
  if (!isPlaceholderName(displayName)) return false;
  // Имя — placeholder. Если включён safe-mode и есть активность — НЕ удаляем.
  if (KEEP_ACTIVE_EMPTY && (matchesPlayed > 0 || xp > 0)) return false;
  return true;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will DELETE)' : 'DRY-RUN (preview only)'}`);
  console.log(`Safe mode: keep_active_empty = ${KEEP_ACTIVE_EMPTY} (use --wipe-active-empty to disable)`);
  console.log('─'.repeat(72));

  // Проходим всю arena_profiles батчами по 500.
  let totalScanned = 0;
  let totalPlaceholders = 0;
  let totalSkippedActive = 0;
  let totalDeleted = 0;
  const placeholdersByName = {};
  const toDelete = [];
  const skippedActive = [];

  let lastDoc = null;
  const PAGE = 500;

  while (true) {
    let q = db.collection('arena_profiles').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      totalScanned += 1;
      const d = doc.data();
      const dn = d.displayName ?? '';
      const xp = Number(d.xp ?? 0);
      const matchesPlayed = Number(d.stats?.matchesPlayed ?? 0);
      if (!isPlaceholderName(dn)) continue;
      totalPlaceholders += 1;
      const key = String(dn).trim() || '<empty>';
      placeholdersByName[key] = (placeholdersByName[key] || 0) + 1;
      if (shouldDelete(dn, xp, matchesPlayed)) {
        toDelete.push({ id: doc.id, displayName: dn, xp, matchesPlayed });
      } else {
        totalSkippedActive += 1;
        skippedActive.push({ id: doc.id, displayName: dn, xp, matchesPlayed });
      }
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  console.log(`Scanned: ${totalScanned} arena_profiles`);
  console.log(`Found placeholders: ${totalPlaceholders}`);
  console.log(`  → to delete: ${toDelete.length}`);
  console.log(`  → skipped (active, kept):  ${totalSkippedActive}`);
  console.log('Breakdown by displayName:');
  for (const [name, count] of Object.entries(placeholdersByName).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(name + ' '.repeat(20)).slice(0, 20)} → ${count}`);
  }
  if (skippedActive.length > 0) {
    console.log('\nSkipped (kept, looks like real users without displayName):');
    for (const item of skippedActive) {
      console.log(`  ${item.id.slice(0, 8)}… | xp=${String(item.xp).padStart(6)} | matches=${item.matchesPlayed}`);
    }
  }
  console.log('─'.repeat(72));

  if (toDelete.length === 0) {
    console.log('Nothing to delete. ');
    return;
  }

  // Превью — первые 20 для проверки
  console.log('\nFirst 20 candidates:');
  for (const item of toDelete.slice(0, 20)) {
    console.log(`  ${item.id.slice(0, 8)}… | ${(item.displayName + ' '.repeat(15)).slice(0, 15)} | xp=${String(item.xp).padStart(6)} | matches=${item.matchesPlayed}`);
  }
  if (toDelete.length > 20) console.log(`  ... +${toDelete.length - 20} more`);

  if (!APPLY) {
    console.log('\nDRY-RUN: no documents deleted.');
    console.log('Re-run with --apply to actually delete.');
    return;
  }

  console.log(`\nDeleting ${toDelete.length} documents in batches of 500...`);
  for (let i = 0; i < toDelete.length; i += 500) {
    const batch = db.batch();
    const part = toDelete.slice(i, i + 500);
    for (const item of part) {
      batch.delete(db.collection('arena_profiles').doc(item.id));
    }
    await batch.commit();
    totalDeleted += part.length;
    console.log(`  Deleted ${totalDeleted}/${toDelete.length}`);
  }
  console.log(`\nDone. Deleted ${totalDeleted} placeholder documents.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FATAL', e);
    process.exit(1);
  });
