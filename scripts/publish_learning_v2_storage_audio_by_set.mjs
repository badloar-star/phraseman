#!/usr/bin/env node
/**
 * Выкладка звука Learning V2 в Firebase Storage по списку записей приложения — ТОЛЬКО ДОБАВЛЕНИЕ.
 *
 * зачем (владелец 18.10: 06:54 «ВЫКЛАДКА ЗВУКА ДА», 07:29 «Сжатие звука и выкладку в облако делает наше Ядро»):
 * в сборке остаётся стартовый набор, остальное приложение догружает из Storage по пути из модуля. Старый
 * scripts/publish_learning_v2_factory_audio_pack.mjs брал только устаревший manifest.json. План — общий с переписью
 * (scripts/learning_v2_storage_audio_plan.mjs).
 *
 * Правила координатора 06:54 (слово владельца):
 * - объект уже есть, размер и sha256 совпали — пропуск;
 * - есть, но НЕ совпал — НЕ перезаписываем: в отчёт, итоговый код 2;
 * - ничего не удаляем, никакого --force; загрузка с ifGenerationMatch: 0 (сервер сам откажет, если объект появился);
 * - после загрузки — getMetadata: размер и sha256 обязаны совпасть.
 *
 * Запуск:
 *   node scripts/publish_learning_v2_storage_audio_by_set.mjs            — сухой прогон: план, локальная сверка, объём
 *   node scripts/publish_learning_v2_storage_audio_by_set.mjs --apply [--limit N]  — выкладка (N — пробная партия)
 *   node scripts/publish_learning_v2_storage_audio_by_set.mjs --verify   — только проверка, что всё на месте
 * Нужны учётные данные Google по умолчанию (ADC). Журнал: [V2-STORAGE-PUBLISH]. Отчёт: --report <файл.json>.
 */
import fs from "node:fs";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { STORAGE_AUDIO_BUCKET, STORAGE_AUDIO_PACK, loadStorageAudioPlan, localSourceProblem } from "./learning_v2_storage_audio_plan.mjs";

const LOG = "[V2-STORAGE-PUBLISH]";
const ROOT = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const verifyOnly = args.includes("--verify");
const argValue = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const limit = argValue("--limit") ? Number(argValue("--limit")) : Infinity;
const reportPath = argValue("--report");
const WORKERS = 8;
if (apply && verifyOnly) { console.error(`${LOG} СТОП: выбери одно — --apply или --verify`); process.exit(1); }
if (!(limit > 0)) { console.error(`${LOG} СТОП: --limit должен быть положительным, получено ${argValue("--limit")}`); process.exit(1); }

const plan = loadStorageAudioPlan(ROOT);
const totalBytes = plan.reduce((sum, entry) => sum + entry.byteSize, 0);
console.log(`${LOG} режим=${apply ? "apply" : verifyOnly ? "verify" : "dry-run"} pack=${STORAGE_AUDIO_PACK} записей=${plan.length} (${(totalBytes / 1048576).toFixed(2)} МБ) limit=${limit}`);

// Локальная сверка ВСЕГО плана до первого сетевого вызова: битый источник — стоп, ничего не выкладываем.
const broken = plan.map((entry) => ({ entry, problem: localSourceProblem(ROOT, entry) })).filter((row) => row.problem);
if (broken.length > 0) {
  for (const row of broken.slice(0, 10)) console.error(`${LOG} источник не годен ${row.entry.contentHash.slice(0, 12)} (${row.entry.source}): ${row.problem}`);
  console.error(`${LOG} СТОП: ${broken.length} источников не прошли локальную сверку — ничего не выложено`);
  process.exit(1);
}
console.log(`${LOG} локальная сверка: все ${plan.length} источников совпали по размеру и sha256`);
if (!apply && !verifyOnly) { console.log(`${LOG} сухой прогон — в Storage ничего не отправлено`); process.exit(0); }

const app = initializeApp({ credential: applicationDefault(), projectId: "phraseman-ea0b3", storageBucket: STORAGE_AUDIO_BUCKET });
const bucket = getStorage(app).bucket(STORAGE_AUDIO_BUCKET);
const counts = { present: 0, uploaded: 0, missing: 0, mismatch: 0, error: 0, raced: 0 };
const problems = [];
const startedAt = Date.now();
let next = 0;
let uploadsLeft = limit;

const matches = (metadata, entry) => Number(metadata.size) === entry.byteSize && metadata.metadata?.sha256 === entry.contentHash;
const note = (state, entry, detail) => { counts[state] += 1; problems.push({ state, objectPath: entry.objectPath, contentHash: entry.contentHash, detail }); };

async function handle(entry) {
  const remote = bucket.file(entry.objectPath);
  const [exists] = await remote.exists();
  if (exists) {
    const [metadata] = await remote.getMetadata();
    if (matches(metadata, entry)) { counts.present += 1; return; }
    // зачем: правило 06:54 — несовпавший объект НЕ перезаписываем, только сообщаем координатору.
    const detail = `size=${metadata.size} sha=${String(metadata.metadata?.sha256).slice(0, 12)}`;
    console.warn(`${LOG} расхождение, не перезаписываю ${entry.objectPath}: ${detail}`);
    note("mismatch", entry, detail);
    return;
  }
  if (verifyOnly) { note("missing", entry, "нет в Storage"); return; }
  if (uploadsLeft <= 0) return;
  uploadsLeft -= 1;
  try {
    await remote.save(fs.readFileSync(entry.assetPath), {
      resumable: false,
      validation: "crc32c",
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType: "audio/mpeg",
        cacheControl: "private,max-age=31536000,immutable",
        metadata: { sha256: entry.contentHash, source: `learning-v2-${entry.source}` },
      },
    });
  } catch (error) {
    // 412 — объект появился между exists и save: ничего не перезаписано, сверяем ниже как «уже есть».
    if (error?.code !== 412) throw error;
    counts.raced += 1;
    console.warn(`${LOG} объект появился во время загрузки (412), сверяю ${entry.objectPath}`);
  }
  const [after] = await remote.getMetadata();
  if (!matches(after, entry)) { note("mismatch", entry, `после загрузки size=${after.size} sha=${String(after.metadata?.sha256).slice(0, 12)}`); return; }
  counts.uploaded += 1;
}

await Promise.all(Array.from({ length: WORKERS }, async () => {
  for (;;) {
    const index = next++;
    if (index >= plan.length) return;
    const entry = plan[index];
    try { await handle(entry); }
    catch (error) {
      const detail = error instanceof Error ? `${error.code ?? ""} ${error.message}`.trim().slice(0, 200) : String(error);
      console.warn(`${LOG} ошибка ${entry.objectPath}: ${detail}`);
      note("error", entry, detail);
    }
    const done = index + 1;
    if (done % 500 === 0) console.log(`${LOG} пройдено ${done}/${plan.length} есть=${counts.present} загружено=${counts.uploaded} ошибок=${counts.error} за ${Math.round((Date.now() - startedAt) / 1000)} с`);
  }
}));

const notUploaded = apply && limit !== Infinity ? plan.length - counts.present - counts.uploaded - counts.mismatch - counts.error : 0;
console.log(`${LOG} итог ${verifyOnly ? "VERIFY" : "APPLY"}: есть=${counts.present} загружено=${counts.uploaded} нет=${counts.missing} расхождений=${counts.mismatch} ошибок=${counts.error} гонок412=${counts.raced} отложено_лимитом=${notUploaded} за ${Math.round((Date.now() - startedAt) / 1000)} с`);
if (reportPath) {
  fs.writeFileSync(reportPath, `${JSON.stringify({ pack: STORAGE_AUDIO_PACK, mode: verifyOnly ? "verify" : "apply", checkedAt: new Date().toISOString(), total: plan.length, counts, problems }, null, 1)}\n`);
  console.log(`${LOG} отчёт: ${reportPath}`);
}
if (counts.mismatch > 0) { console.error(`${LOG} СТОП: ${counts.mismatch} расхождений — сообщить координатору, ничего не перезаписано`); process.exit(2); }
if (counts.error > 0 || counts.missing > 0) process.exit(1);
