/**
 * План выкладки звука Learning V2 в Firebase Storage: какие объекты, по какому пути, из какого локального файла.
 *
 * зачем (владелец 18.10 07:29 через координатора: «Сжатие звука и выкладку в облако делает наше Ядро»): приложение
 * догружает звук по сети (app/learning_v2_remote_audio_v1.ts) ровно по пути из модуля. Старый publish брал устаревший
 * factory-production-v1/manifest.json и не знал записей «одного голоса», поэтому 4255 файлов набора отвечали 404.
 * Кандидаты — тот же список, что у переписи (scripts/check_learning_v2_storage_audio_inventory.mjs) и у рантайма:
 * старый манифест + модуль «один голос», без тихих. Чистые функции — их проверяет tests/learning_v2_storage_audio_plan.test.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const STORAGE_AUDIO_BUCKET = "phraseman-ea0b3.firebasestorage.app";
// Клиент считает hashCanonicalBody; для объекта с одним строковым ключом это ровно sha256(JSON.stringify(...)).
export const canonicalHash = (value) => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
export const STORAGE_AUDIO_PACK = canonicalHash({ schemaVersion: "learning-v2-factory-production-audio-pack.v1" });

/** Путь объекта — та же формула, что fileInputForEntry в app/learning_v2_factory_production_audio_v1.ts. */
export function storageObjectPathFor(entry) {
  return ["learning-v2/voice-audio", STORAGE_AUDIO_PACK, canonicalHash({ transcript: entry.transcript }), canonicalHash({ voiceId: entry.voiceId }), `${entry.contentHash}.mp3`].join("/");
}

const SINGLE_VOICE_ROW =
  /transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([a-z]+)" as const, contentHash: "([0-9a-f]{64})", byteSize: (\d+), assetPath: ("(?:[^"\\]|\\.)*")/gu;

/** Список объектов: { transcript, voiceId, contentHash, byteSize, assetPath, source, objectPath }, без тихих и без повторов хеша. */
export function buildStorageAudioPlan({ manifestEntries, singleVoiceModuleText, silentHashes }) {
  const plan = new Map();
  const add = (entry, source) => {
    if (silentHashes.has(entry.contentHash) || plan.has(entry.contentHash)) return;
    const row = { transcript: entry.transcript, voiceId: entry.voiceId, contentHash: entry.contentHash, byteSize: Number(entry.byteSize), assetPath: entry.assetPath, source };
    plan.set(entry.contentHash, { ...row, objectPath: storageObjectPathFor(row) });
  };
  for (const entry of manifestEntries) add(entry, "manifest");
  for (const match of singleVoiceModuleText.matchAll(SINGLE_VOICE_ROW))
    add({ transcript: JSON.parse(match[1]), voiceId: match[2], contentHash: match[3], byteSize: match[4], assetPath: JSON.parse(match[5]) }, "single-voice");
  return [...plan.values()];
}

/** Читает входы плана из рабочей копии. */
export function loadStorageAudioPlan(root) {
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const silentHashes = new Set(JSON.parse(read("app/learning_v2_factory_silent_audio_v1.json")).entries.map((entry) => entry.contentHash));
  const manifestEntries = JSON.parse(read("assets/audio/learning-v2/factory-production-v1/manifest.json")).entries;
  return buildStorageAudioPlan({ manifestEntries, singleVoiceModuleText: read("app/learning_v2_factory_single_voice_v1.generated.ts"), silentHashes });
}

/** Локальная проверка источника ДО загрузки: файл есть, размер и sha256 совпали. Возвращает причину отказа или null. */
export function localSourceProblem(root, entry) {
  const absolute = path.resolve(root, entry.assetPath ?? "");
  if (!entry.assetPath || !fs.existsSync(absolute)) return `нет файла ${entry.assetPath}`;
  const bytes = fs.readFileSync(absolute);
  if (bytes.byteLength !== entry.byteSize) return `размер ${bytes.byteLength} ≠ ${entry.byteSize}`;
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== entry.contentHash) return `sha256 ${sha.slice(0, 12)} ≠ ${entry.contentHash.slice(0, 12)}`;
  return null;
}

/** Только фактические ссылки материалов приложения. Устаревший снимок запрещён. */
export function loadRuntimeAudioSelection(root, selectionPath) {
  if (!selectionPath) throw new Error("Audio publication requires --selection <runtime-reference-report.json>");
  const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
  if (selection.schemaVersion !== "learning-v2-runtime-audio-selection.v1" ||
      !selection.inputDigests || !selection.required || !Array.isArray(selection.problems) || selection.problems.length)
    throw new Error("Audio selection is incomplete or has unresolved problems");
  const availability = fs.readFileSync(path.join(root, "app/learning_v2_bundle_availability_v1.generated.ts"), "utf8");
  const ceiling = Number(/LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = (\d+);/.exec(availability)?.[1]);
  if (!ceiling || selection.ceiling !== ceiling || selection.builtSessions !== ceiling)
    throw new Error("Audio selection does not cover every available session");
  const inputs = Object.entries(selection.inputDigests);
  if (!inputs.length) throw new Error("Audio selection has no source snapshot");
  for (const [relative, expected] of inputs) {
    const absolute = path.resolve(root, relative);
    if (path.relative(root, absolute).startsWith("..") || !fs.existsSync(absolute))
      throw new Error("Audio selection source missing: " + relative);
    const actual = createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    if (actual !== expected) throw new Error("Audio selection is stale: " + relative);
  }
  const required = new Set(Object.keys(selection.required));
  if (!required.size || [...required].some(hash => !/^[0-9a-f]{64}$/.test(hash)))
    throw new Error("Invalid audio selection hashes");
  return required;
}

export function selectStorageAudioPlan(plan, required) {
  const selected = plan.filter(entry => required.has(entry.contentHash));
  const available = new Set(selected.map(entry => entry.contentHash));
  const missing = [...required].filter(hash => !available.has(hash));
  if (missing.length) throw new Error("Selected audio has no local entry: " + missing.join(","));
  return selected;
}
