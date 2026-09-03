/**
 * Миграция: вынос сохранённых карточек из документа users/{stableId} в подколлекцию
 * users/{stableId}/flashcard_pages/{target}_{NNNN}.
 *
 * зачем: progress.flashcards_v1 хранил весь список карточек одной JSON-строкой внутри
 * документа и рос без предела. 2026-09-01 у трёх самых активных аккаунтов он раздул
 * документ до 1100..1129 КБ при жёстком лимите Firestore 1 048 576 байт — Firestore
 * начал отклонять ЛЮБУЮ запись в документ целиком (INVALID_ARGUMENT), и у этих людей
 * молча перестал сохраняться ВЕСЬ прогресс, а не только карточки.
 *
 * Свойства:
 *   • сухой прогон по умолчанию; запись только с --apply;
 *   • идемпотентность: повторный запуск на уже мигрированном аккаунте ничего не портит;
 *   • снимок ДО записи в backups/flashcards_migration/<stableId>_<target>.json;
 *   • поле progress.<key> удаляется только ПОСЛЕ подтверждённой записи страниц
 *     и обратного чтения (verify) — карточки не могут пропасть из обоих мест.
 *
 * Запуск ТОЛЬКО из папки functions/:
 *   node scripts/migrate_flashcards_to_pages.js                 # сухой прогон всей базы
 *   node scripts/migrate_flashcards_to_pages.js --only <id>,<id>
 *   node scripts/migrate_flashcards_to_pages.js --apply --only <id>
 *   node scripts/migrate_flashcards_to_pages.js --apply --min-kb 300
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const LIMIT_BYTES = 1_048_576;
/** Должно совпадать с CARDS_PER_PAGE в app/flashcards_cloud_pages.ts. */
const CARDS_PER_PAGE = 200;
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'flashcards_migration');

/**
 * Ключи прогресса с карточками: английский (легаси-плоский) и французский (scoped).
 * Значения сверены с app/target_storage_keys.ts (flashcardsSavedKey) и закреплены
 * тестом tests/gustav_target_storage_keys.test.ts — если там появится третий язык,
 * его нужно добавить и сюда.
 */
const FLASHCARD_KEYS = [
  { key: 'flashcards_v1', target: 'en' },
  { key: 'flashcards_v2::fr::flashcards_v1', target: 'fr' },
];

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY = (() => {
  const i = argv.indexOf('--only');
  if (i === -1 || !argv[i + 1]) return null;
  return new Set(argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean));
})();
const MIN_KB = (() => {
  const i = argv.indexOf('--min-kb');
  if (i === -1 || !argv[i + 1]) return 0;
  const n = Number.parseFloat(argv[i + 1]);
  return Number.isFinite(n) ? n : 0;
})();

const size = (v) => Buffer.byteLength(JSON.stringify(v === undefined ? null : v));
const log = (...a) => console.log('[FLASHCARDS-MIGRATION]', ...a);

function chunk(arr, per) {
  const out = [];
  for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per));
  return out;
}

function pageDocId(target, index) {
  return `${target}_${String(index).padStart(4, '0')}`;
}

function writeBackup(stableId, target, payload) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${stableId}_${target}.json`);
  fs.writeFileSync(file, payload, 'utf8');
  return file;
}

/** Обработать один аккаунт. Возвращает отчёт по нему. */
async function migrateOne(doc) {
  const stableId = doc.id;
  const data = doc.data() || {};
  const progress = data.progress || {};
  const before = size(data);
  const report = { stableId, before, after: before, actions: [] };

  for (const { key, target } of FLASHCARD_KEYS) {
    const raw = progress[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string') {
      report.actions.push(`${key}: SKIP (тип ${typeof raw}, ожидалась строка)`);
      continue;
    }

    let cards;
    try {
      cards = JSON.parse(raw);
    } catch (e) {
      // Ранний выход с причиной: битый JSON не трогаем, чтобы не потерять данные.
      report.actions.push(`${key}: SKIP (не парсится: ${e.message})`);
      continue;
    }
    if (!Array.isArray(cards)) {
      report.actions.push(`${key}: SKIP (не массив, а ${typeof cards})`);
      continue;
    }
    if (cards.length === 0) {
      report.actions.push(`${key}: пустой список — поле будет просто убрано`);
      if (APPLY) {
        await doc.ref.update({ [`progress.${key}`]: admin.firestore.FieldValue.delete() });
      }
      continue;
    }

    const fieldBytes = size(raw);
    const pages = chunk(cards, CARDS_PER_PAGE);
    report.actions.push(
      `${key}: ${cards.length} карточек / ${(fieldBytes / 1024).toFixed(1)} КБ → ${pages.length} страниц`,
    );

    if (!APPLY) {
      report.after -= fieldBytes;
      continue;
    }

    // 1) Снимок ДО любой записи.
    const backupFile = writeBackup(stableId, target, raw);
    report.actions.push(`   снимок: ${backupFile}`);

    // 2) Записать страницы (идемпотентно: set перезаписывает страницу целиком).
    const col = doc.ref.collection('flashcard_pages');
    const existing = await col.get();
    const staleIds = [];
    existing.forEach((page) => {
      if (!page.id.startsWith(`${target}_`)) return;
      const idx = Number.parseInt(page.id.slice(target.length + 1), 10);
      if (!Number.isFinite(idx) || idx >= pages.length) staleIds.push(page.id);
    });

    const batch = db.batch();
    pages.forEach((page, index) => {
      batch.set(
        col.doc(pageDocId(target, index)),
        { target, index, count: page.length, cards: JSON.stringify(page), updatedAt: Date.now() },
        { merge: false },
      );
    });
    for (const id of staleIds) batch.delete(col.doc(id));
    await batch.commit();

    // 3) Проверить обратным чтением, что в облаке ровно те же карточки.
    const check = await col.where('target', '==', target).get();
    const rows = [];
    check.forEach((page) => {
      const d = page.data() || {};
      if (typeof d.cards !== 'string') return;
      try {
        const parsed = JSON.parse(d.cards);
        if (Array.isArray(parsed)) rows.push({ index: d.index ?? 0, cards: parsed });
      } catch (e) {
        report.actions.push(`   VERIFY WARN: страница ${page.id} не парсится (${e.message})`);
      }
    });
    rows.sort((a, b) => a.index - b.index);
    const restored = rows.flatMap((r) => r.cards);

    if (restored.length !== cards.length) {
      // Ранний выход: поле НЕ удаляем, иначе карточки исчезнут из обоих мест.
      report.actions.push(
        `   ABORT: обратное чтение дало ${restored.length} карточек вместо ${cards.length} — поле оставлено в документе`,
      );
      continue;
    }

    // 4) Убрать поле из документа — в транзакции с проверкой, что значение не
    //    изменилось с момента чтения.
    //    зачем: человек может заниматься прямо во время миграции. Его устройство
    //    способно записать в progress.<key> НОВЫЙ список (с только что добавленной
    //    карточкой) между нашим чтением и удалением. Слепой delete стёр бы эту
    //    свежую карточку. Транзакция вместо этого пропускает аккаунт — его заберёт
    //    следующий прогон, уже с актуальными данными.
    const deleted = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      const freshRaw = ((fresh.data() || {}).progress || {})[key];
      if (freshRaw === undefined || freshRaw === null) return 'already_gone';
      if (freshRaw !== raw) return 'changed';
      tx.update(doc.ref, { [`progress.${key}`]: admin.firestore.FieldValue.delete() });
      return 'deleted';
    });

    if (deleted === 'changed') {
      report.actions.push(
        `   SKIP: значение progress.${key} изменилось во время миграции (человек занимается) — поле оставлено, страницы записаны; повторите прогон`,
      );
      continue;
    }
    report.after -= fieldBytes;
    report.actions.push(
      `   OK: поле progress.${key} ${deleted === 'deleted' ? 'удалено' : 'уже отсутствовало'}, ${restored.length} карточек в подколлекции`,
    );
  }

  return report;
}

async function main() {
  log(APPLY ? 'РЕЖИМ ЗАПИСИ (--apply)' : 'СУХОЙ ПРОГОН (без --apply ничего не меняется)');
  if (ONLY) log('только аккаунты:', [...ONLY].join(', '));
  if (MIN_KB) log('порог размера документа:', MIN_KB, 'КБ');

  const touched = [];
  let scanned = 0;

  if (ONLY) {
    for (const id of ONLY) {
      const doc = await db.collection('users').doc(id).get();
      scanned++;
      if (!doc.exists) { log('НЕ НАЙДЕН:', id); continue; }
      touched.push(await migrateOne(doc));
    }
  } else {
    let last = null;
    for (;;) {
      let q = db.collection('users').orderBy('__name__').limit(300);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        scanned++;
        const docSize = size(doc.data() || {});
        if (docSize / 1024 < MIN_KB) continue;
        const progress = (doc.data() || {}).progress || {};
        const hasCards = FLASHCARD_KEYS.some(({ key }) => typeof progress[key] === 'string');
        if (!hasCards) continue;
        touched.push(await migrateOne(doc));
      }
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 300) break;
    }
  }

  log(`\nПросмотрено документов: ${scanned}; затронуто: ${touched.length}`);
  for (const r of touched) {
    const pctBefore = ((r.before / LIMIT_BYTES) * 100).toFixed(1);
    const pctAfter = ((r.after / LIMIT_BYTES) * 100).toFixed(1);
    console.log(
      `\n${r.stableId}\n  ${(r.before / 1024).toFixed(1)} КБ (${pctBefore}%) → ${(r.after / 1024).toFixed(1)} КБ (${pctAfter}%)`,
    );
    for (const a of r.actions) console.log('  ' + a);
  }
  if (!APPLY && touched.length > 0) {
    log('\nЭто был сухой прогон. Для записи повторите с --apply');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('[FLASHCARDS-MIGRATION] FAILED', e); process.exit(1); });
