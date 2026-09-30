// зачем: D131 / PM-288 — СУХОЙ прогон, ничего не пишет.
//
// До PM-288 сборка набора из видео (`buildVideoPackDoc`) теряла `startSec`
// фраз: таймкод жил в опубликованной версии `video_phrase_sets/{id}/versions/{v}`,
// а в карточки `community_packs/video_{id}` не попадал. Скрипт показывает,
// у каких наборов таймкоды есть в фразах, но нет на карточках.
//
// Починка — НЕ этим скриптом: после деплоя функций владелец жмёт в админке
// существующий «Собрать наборы из видео» (callable `adminBackfillVideoPacks`),
// он пересобирает карточки уже новой `buildVideoPackDoc` и бережёт лайки.
// Режима --apply здесь нет намеренно (D91: без записей в прод из скриптов).
//
// Запуск (нужны права чтения прод-Firestore через ADC):
//   node scripts/video_pack_start_sec_dry_run.mjs
import admin from 'firebase-admin';

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const TAG = '[VIDEO-SEEK][dry-run]';

if (process.argv.includes('--apply')) {
  console.error(`${TAG} --apply не поддерживается: это только сухой прогон. Пересборка — кнопкой бэкфилла наборов в админке после деплоя.`);
  process.exit(2);
}

const PAGE = 100;
let cursor = null;
let scanned = 0;
let timedSets = 0;
const needsBackfill = [];
const skipped = [];

for (;;) {
  let query = db.collection('video_phrase_sets').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  if (page.empty) break;
  for (const doc of page.docs) {
    scanned += 1;
    const id = doc.id;
    const activeVersion = String(doc.data()?.activeVersion ?? '').trim();
    if (!activeVersion) { skipped.push(`${id}: нет активной версии`); continue; }
    try {
      const version = await doc.ref.collection('versions').doc(activeVersion).get();
      const phrases = Array.isArray(version.data()?.phrases) ? version.data().phrases : [];
      const timed = phrases.filter((p) => typeof p?.startSec === 'number');
      if (timed.length === 0) { skipped.push(`${id}: в фразах нет таймкодов (${phrases.length} фраз)`); continue; }
      timedSets += 1;
      const pack = await db.collection('community_packs').doc(`video_${id}`).get();
      if (!pack.exists) { needsBackfill.push(`${id}: набора video_${id} нет вовсе (${timed.length}/${phrases.length} с таймкодом)`); continue; }
      const cards = Array.isArray(pack.data()?.cards) ? pack.data().cards : [];
      const cardTimed = cards.filter((c) => typeof c?.videoStartSec === 'number').length;
      if (cardTimed < timed.length) {
        needsBackfill.push(`${id}: таймкодов в фразах ${timed.length}, на карточках ${cardTimed} (карточек ${cards.length})`);
      }
    } catch (error) {
      // Немой catch запрещён: один битый ролик не обрывает прогон, но причина видна.
      skipped.push(`${id}: чтение отказало — ${String(error)}`);
    }
  }
  if (page.docs.length < PAGE) break;
  cursor = page.docs[page.docs.length - 1];
}

console.log(`${TAG} просмотрено роликов: ${scanned}, с таймкодами в фразах: ${timedSets}, нужна пересборка набора: ${needsBackfill.length}`);
for (const line of needsBackfill) console.log(`  ПЕРЕСОБРАТЬ ${line}`);
for (const line of skipped) console.log(`  пропуск ${line}`);
console.log(`${TAG} это был сухой прогон, записей нет.`);
process.exit(0);
