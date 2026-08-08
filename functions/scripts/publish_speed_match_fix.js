// зачем: коммит 347f8eb29 ("пары на скорость — плитка максимум 3 слова")
// исправил КОД, но боевой пул в Firestore ни разу не перегенерировался —
// все 400 документов mode=speed_match поколения tpool_20260801_v8 всё ещё
// несут старые полные предложения ("He is not a reporter.") вместо
// отдельных слов. Точечно заменяем ТОЛЬКО speed_match: остальные 3600
// заданий (guess_phrase/fill_gap/find_oddity/translate_build) детерминизм
// не меняет — тот же контент даёт те же taskId и те же бакеты, их не трогаем.
//
// Шаги: 1) собрать весь пул исправленным кодом (buildNewTournamentPool);
// 2) взять только speed_match-таски и их exposureBucket;
// 3) бэкапить старые 400 документов speed_match в NDJSON;
// 4) удалить старые, записать новые батчами;
// 5) поднять exposureBucketCounts.speed_match и revision в барьере —
//    остальные режимы барьера не трогаем.
//
// Запуск: node scripts/publish_speed_match_fix.js --service-account=../service-account.json [--apply]
// Без --apply — только бэкап + подсчёт, без записи в прод.

const path = require('node:path');
const fs = require('node:fs/promises');
const admin = require('firebase-admin');
const { buildNewTournamentPool } = require('../lib/functions/src/tournament_pool_v2_factory');
const { loadTournamentSourceDays, TOURNAMENT_SOURCE_PLANS } = require('../lib/functions/src/tournament_content_source');

const TOURNAMENT_TASKS_COLLECTION = 'tournamentTasks';
const TOURNAMENT_POOL_BARRIER_COLLECTION = 'tournamentPrivateState';
const TOURNAMENT_POOL_BARRIER_DOC = 'task_pool_generation_v1';
const TOURNAMENT_POOL_BARRIER_KIND = 'tournament_task_pool_barrier_v1';
const MODE = 'speed_match';

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function initAdmin(serviceAccountPath) {
  const raw = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(raw),
    ...(raw.project_id ? { projectId: raw.project_id } : {}),
  });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const serviceAccountPath = path.resolve(argValue('service-account') ?? 'service-account.json');
  const outDir = path.resolve('.codex-tmp', 'speed-match-fix', new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(outDir, { recursive: true });

  console.log('Собираю пул детерминированным генератором...');
  const generated = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
  const newSpeedTasks = generated.tasks.filter((task) => task.mode === MODE);
  console.log(`Новых ${MODE} заданий: ${newSpeedTasks.length}`);
  console.log(`Новое число бакетов ${MODE}: ${generated.manifest.exposure.modeBucketCounts[MODE]}`);
  console.log(`Размер бакета (NEW_TOURNAMENT_POOL_EXPOSURE_BUCKET_SIZE): ${generated.manifest.exposure.bucketMaxTasks}`);
  const maxWords = Math.max(...newSpeedTasks.flatMap((task) => (
    (task.payload.items || []).map((item) => String(item.prompt || '').trim().split(/\s+/).length)
  )));
  console.log(`Максимум слов в prompt любого item: ${maxWords} (должно быть <= 3)`);
  if (maxWords > 3) throw new Error(`word_limit_violation:${maxWords}`);

  await initAdmin(serviceAccountPath);
  const db = admin.firestore();

  const barrierRef = db.collection(TOURNAMENT_POOL_BARRIER_COLLECTION).doc(TOURNAMENT_POOL_BARRIER_DOC);
  const barrierSnap = await barrierRef.get();
  const barrier = barrierSnap.data() || {};
  if (barrier.kind !== TOURNAMENT_POOL_BARRIER_KIND || barrier.state !== 'ready') {
    throw new Error('source_pool_barrier_not_ready');
  }
  if (barrier.generation !== generated.manifest.poolVersion) {
    throw new Error(`generation_mismatch:${barrier.generation}!=${generated.manifest.poolVersion}`);
  }
  console.log('Барьер текущий:', JSON.stringify(barrier));

  // guard-ok: одноразовый офлайн-скрипт публикации, не рантайм-путь; лимит
  // выше известного объёма (400) — если вырастет, скрипт должен явно упасть
  // на проверке ниже, а не молча обрезать выборку.
  const oldSnap = await db.collection(TOURNAMENT_TASKS_COLLECTION)
    .where('mode', '==', MODE)
    .where('poolVersion', '==', generated.manifest.poolVersion)
    .limit(2000)
    .get();
  if (oldSnap.size >= 2000) throw new Error('old_speed_match_count_suspiciously_high_check_limit');
  console.log(`Старых ${MODE} документов найдено: ${oldSnap.size}`);

  const backupPath = path.join(outDir, 'old-speed-match-backup.ndjson');
  const backupNdjson = oldSnap.docs.map((doc) => JSON.stringify({ id: doc.id, data: doc.data() })).join('\n') + '\n';
  await fs.writeFile(backupPath, backupNdjson, 'utf8');
  console.log('Бэкап старых записан:', backupPath);

  const newPoolPath = path.join(outDir, 'new-speed-match.ndjson');
  await fs.writeFile(
    newPoolPath,
    newSpeedTasks.map((task) => JSON.stringify({ id: task.taskId, data: task })).join('\n') + '\n',
    'utf8',
  );
  console.log('Новый пул записан:', newPoolPath);

  const oldIds = new Set(oldSnap.docs.map((doc) => doc.id));
  const newIds = new Set(newSpeedTasks.map((task) => task.taskId));
  const toDelete = [...oldIds].filter((id) => !newIds.has(id));
  const toWrite = newSpeedTasks;
  console.log(`К удалению (старых, не совпадающих ни с одним новым id): ${toDelete.length}`);
  console.log(`К записи (новых): ${toWrite.length}`);

  if (!apply) {
    console.log('\n--apply не передан — прод не тронут. Проверьте бэкап/новый пул в', outDir);
    process.exit(0);
  }

  const BATCH_SIZE = 400;
  for (let offset = 0; offset < toDelete.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    for (const id of toDelete.slice(offset, offset + BATCH_SIZE)) {
      batch.delete(db.collection(TOURNAMENT_TASKS_COLLECTION).doc(id));
    }
    await batch.commit();
  }
  console.log('Старые документы удалены.');

  for (let offset = 0; offset < toWrite.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    for (const task of toWrite.slice(offset, offset + BATCH_SIZE)) {
      batch.set(db.collection(TOURNAMENT_TASKS_COLLECTION).doc(task.taskId), task);
    }
    await batch.commit();
  }
  console.log('Новые документы записаны.');

  const nextExposureBucketCounts = {
    ...barrier.exposureBucketCounts,
    [MODE]: generated.manifest.exposure.modeBucketCounts[MODE],
  };
  // зачем: exposureLayoutHash — непрозрачный версионирующий токен (сверяется
  // побитово между чтением и коммитом транзакции, tournaments.ts
  // sameTournamentPoolBarrierToken), а не проверяемый чек-сум содержимого —
  // формат требует только 64 hex-символа. Меняем его КАЖДЫЙ раз при смене
  // bucket-раскладки (даже одного режима), иначе клиент с закэшированным
  // старым токеном может внутри транзакции упереться в
  // tournament_pool_generation_changed при коммите комнаты, созданной
  // между чтением и записью барьера.
  const crypto = require('node:crypto');
  const nextExposureLayoutHash = crypto.createHash('sha256')
    .update(JSON.stringify(nextExposureBucketCounts) + String(Number(barrier.revision || 0) + 1))
    .digest('hex');
  await barrierRef.set({
    ...barrier,
    exposureBucketCounts: nextExposureBucketCounts,
    exposureLayoutHash: nextExposureLayoutHash,
    revision: Number(barrier.revision || 0) + 1,
    releasedAt: new Date().toISOString(),
  }, { merge: true });
  console.log('Барьер обновлён. speed_match bucket count:', nextExposureBucketCounts[MODE]);
  console.log('Новый exposureLayoutHash:', nextExposureLayoutHash);

  console.log('\nГотово.');
  process.exit(0);
}

main().catch((error) => {
  console.error('ERR:', error.message);
  process.exit(1);
});
