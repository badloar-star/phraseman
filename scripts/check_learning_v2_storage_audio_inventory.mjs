#!/usr/bin/env node
/**
 * Перепись звука Learning V2 в Firebase Storage — ТОЛЬКО ЧТЕНИЕ (exists + getMetadata), ничего не загружает.
 *
 * зачем (слово владельца 18.10 ~06:15, чат Ревизора; координатор 06:45): звук V2 больше не едет в сборке целиком —
 * в наборе сборки только первые занятия, остальное приложение догружает из Storage. Сторож полноты
 * (tests/learning_v2_released_audio_completeness_guard.test.ts) в jest не может ходить в сеть, поэтому опирается на
 * снимок: scripts/learning_v2_storage_audio_inventory.v1.json — какие записи ПРОВЕРЕННО лежат в Storage (размер и sha256
 * совпали). Снимок обновляет только этот скрипт; выкладка в Storage — отдельный шаг, только по слову владельца.
 *
 * Кандидаты — все слышимые записи, которые может запросить приложение: старый манифест factory-production-v1
 * и таблица «один голос» (app/learning_v2_factory_single_voice_v1.generated.ts), без тихих
 * (app/learning_v2_factory_silent_audio_v1.json) — тот же набор, что строит рантайм learning_v2_factory_production_audio_v1.
 * Путь объекта — как у клиента: learning-v2/voice-audio/<pack>/<hash transcript>/<hash voice>/<contentHash>.mp3.
 *
 * Запуск: node scripts/check_learning_v2_storage_audio_inventory.mjs [--write]
 *   без --write — только печать итога по урокам; с --write — обновить снимок.
 * Нужны учётные данные Google по умолчанию (gcloud auth application-default login). Логи: [V2-STORAGE-CENSUS].
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const ROOT = process.cwd();
const LOG = "[V2-STORAGE-CENSUS]";
const BUCKET = "phraseman-ea0b3.firebasestorage.app";
const INVENTORY = path.join(ROOT, "scripts/learning_v2_storage_audio_inventory.v1.json");
const write = process.argv.includes("--write");
// Клиент считает hashCanonicalBody; для объекта с одним строковым ключом это ровно sha256(JSON.stringify(...)).
const hash = (value) => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
const pack = hash({ schemaVersion: "learning-v2-factory-production-audio-pack.v1" });

const silent = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "app/learning_v2_factory_silent_audio_v1.json"), "utf8")).entries.map((entry) => entry.contentHash));
const candidates = new Map();
const add = (entry, source) => {
  if (silent.has(entry.contentHash) || candidates.has(entry.contentHash)) return;
  candidates.set(entry.contentHash, { transcript: entry.transcript, voiceId: entry.voiceId, contentHash: entry.contentHash, byteSize: Number(entry.byteSize), source });
};
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/audio/learning-v2/factory-production-v1/manifest.json"), "utf8"));
for (const entry of manifest.entries) add(entry, "manifest");
const singleVoice = fs.readFileSync(path.join(ROOT, "app/learning_v2_factory_single_voice_v1.generated.ts"), "utf8");
for (const match of singleVoice.matchAll(/transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([a-z]+)" as const, contentHash: "([0-9a-f]{64})", byteSize: (\d+)/gu)) {
  add({ transcript: JSON.parse(match[1]), voiceId: match[2], contentHash: match[3], byteSize: match[4] }, "single-voice");
}
// Урок — по первому появлению записи в таблице голосов (ключ lesson/session/kind/index); для итога по урокам.
const voiceTable = JSON.parse(fs.readFileSync(path.join(ROOT, "content/learning-v2-course/audio/en/single-voice-v1.json"), "utf8"));
const lessonOf = new Map();
for (const [key, assignment] of Object.entries(voiceTable.assignments)) {
  for (const clip of assignment.clips ?? []) if (!lessonOf.has(clip.contentHash)) lessonOf.set(clip.contentHash, key.split("/")[0]);
}
console.log(`${LOG} pack=${pack} кандидатов=${candidates.size} (тихих исключено ${silent.size})`);

const app = initializeApp({ credential: applicationDefault(), projectId: "phraseman-ea0b3", storageBucket: BUCKET });
const bucket = getStorage(app).bucket(BUCKET);
const entries = [...candidates.values()];
const results = [];
let next = 0;
let errors = 0;
await Promise.all(Array.from({ length: 16 }, async () => {
  for (;;) {
    const index = next++;
    if (index >= entries.length) return;
    const entry = entries[index];
    const objectPath = ["learning-v2/voice-audio", pack, hash({ transcript: entry.transcript }), hash({ voiceId: entry.voiceId }), `${entry.contentHash}.mp3`].join("/");
    let state = "missing";
    try {
      const [exists] = await bucket.file(objectPath).exists();
      if (exists) {
        const [metadata] = await bucket.file(objectPath).getMetadata();
        state = Number(metadata.size) === entry.byteSize && metadata.metadata?.sha256 === entry.contentHash
          ? "present"
          : `mismatch size=${metadata.size} sha=${String(metadata.metadata?.sha256).slice(0, 12)}`;
      }
    } catch (error) {
      errors += 1;
      state = `error ${error instanceof Error ? error.message : String(error)}`;
      console.warn(`${LOG} ошибка чтения ${objectPath}: ${state}`);
    }
    if (state.startsWith("mismatch")) console.warn(`${LOG} расхождение ${objectPath}: ${state}`);
    results.push({ ...entry, lesson: lessonOf.get(entry.contentHash) ?? "manifest", state });
    if (results.length % 1000 === 0) console.log(`${LOG} проверено ${results.length}/${entries.length}`);
  }
}));

const byLesson = {};
for (const result of results) {
  const bucketRow = (byLesson[result.lesson] ??= { present: 0, missing: 0, other: 0, missingBytes: 0 });
  if (result.state === "present") bucketRow.present += 1;
  else if (result.state === "missing") { bucketRow.missing += 1; bucketRow.missingBytes += result.byteSize; }
  else bucketRow.other += 1;
}
for (const lesson of Object.keys(byLesson).sort()) {
  const row = byLesson[lesson];
  console.log(`${LOG} ${lesson}: есть=${row.present} нет=${row.missing} (${(row.missingBytes / 1048576).toFixed(2)} МБ) иное=${row.other}`);
}
const present = results.filter((result) => result.state === "present").map((result) => result.contentHash).sort();
console.log(`${LOG} итого: есть=${present.length} из ${results.length}, ошибок чтения=${errors}`);
if (errors > 0) {
  // Немой частичный снимок опаснее старого: при ошибках сети снимок НЕ перезаписываем.
  console.error(`${LOG} СТОП: ${errors} ошибок чтения — снимок не обновлён`);
  process.exit(1);
}
if (!write) {
  console.log(`${LOG} без --write снимок не тронут`);
  process.exit(0);
}
const body = {
  schemaVersion: "learning-v2-storage-audio-inventory.v1",
  bucket: BUCKET,
  pack,
  checkedAt: new Date().toISOString(),
  candidates: results.length,
  presentContentHashes: present,
};
fs.writeFileSync(`${INVENTORY}.tmp`, `${JSON.stringify(body, null, 1)}\n`);
fs.renameSync(`${INVENTORY}.tmp`, INVENTORY);
console.log(`${LOG} снимок записан: ${path.relative(ROOT, INVENTORY)} (${present.length} записей)`);
