// ════════════════════════════════════════════════════════════════════════════
// export_plan_content_packs.mjs — Фаза 1 «Бандл-диеты» (docs/plans/2026-08-24-
// bundle-diet-plan.md): выносим app/plan_content_{mitap,gavan,impuls,echo,
// voyazh}.ts (~19 МБ TS) из JS-бандла в серверный course-pack.
//
// зачем: владелец хочет супермалый бандл; рантайм-инфраструктура уже включена
// (VERIFIED_COURSE_PACK_REMOTE_ENABLED=true), не хватало экспортёра пака.
//
// Что делает:
//   1. Читает ВСЕ авторские дни планов из app/plan_content_<plan>.ts напрямую
//      (реестр опустошён финалом Ф1 — контент больше не едет в бандл).
//   2. Пишет пак: manifest.json (CoursePackManifest, совместим с
//      buildCoursePackCacheKey) + index.json (PlanContentPackIndex) +
//      plans/<planId>/day-NNN.json ({contentHash, content} — ровно формат
//      readVerifiedCoursePackDay / rowPathFor).
//   3. sha256 каждого дня — через ТУ ЖЕ каноникализацию, что у рантайм-
//      верификатора (canonicalCoursePackContent в app/course_pack_remote_
//      loader.ts). Расхождение = «корректный» день падал бы на девайсе.
//   4. Самопроверка после записи: перечитать с диска, повторить хэши, сверить
//      количество дней 1:1 с реестром, провалидировать index и manifest.
//
// Запуск:  node scripts/export_plan_content_packs.mjs
//   --content-version release.20260824.abcd1234   (default: release.<дата>.<граф-хэш8>)
//   --out-dir .codex-tmp/plan-content/release-pack/<contentVersion>  (default)
//
// Дальше пак выгружается скриптом upload_plan_content_pack_to_storage.mjs.
// ════════════════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// tsx CJS-хук: даёт require() TS-модулей приложения, включая внутренние
// require('./plan_content_mitap') в реестре — тот же путь, что у npx tsx.
const require = createRequire(import.meta.url);
require('tsx/cjs');

// зачем (ФИНАЛ Ф1, 2026-08-24): plan_content_registry БОЛЬШЕ НЕ содержит
// контента — 5 require выпилены, чтобы 19 МБ не ехали в JS-бандл. Экспортёр
// обязан продолжать работать (им пересобирается пак при правках контента),
// поэтому читаем исходные файлы планов НАПРЯМУЮ. Это единственное место в
// репозитории, которому нужен весь контент сразу, и оно не входит в приложение.
const PLAN_SOURCES = [
  ['mitap', 'MITAP_CONTENT_DAYS'],
  ['gavan', 'GAVAN_CONTENT_DAYS'],
  ['impuls', 'IMPULS_CONTENT_DAYS'],
  ['echo', 'ECHO_CONTENT_DAYS'],
  ['voyazh', 'VOYAZH_CONTENT_DAYS'],
];

function loadAllPlanContentDays() {
  const all = [];
  for (const [planId, exportName] of PLAN_SOURCES) {
    const mod = require(`../app/plan_content_${planId}.ts`);
    const days = mod[exportName];
    if (!Array.isArray(days) || days.length === 0) {
      throw new Error(`plan_content_${planId}.ts не отдал ${exportName}`);
    }
    all.push(...days);
  }
  return all;
}
const { validatePlanContentDay } = require('../app/plan_content_schema.ts');
const {
  COURSE_PACK_SCHEMA_VERSION,
  buildCoursePackCacheKey,
  validateCoursePackManifest,
} = require('../app/course_pack_manifest.ts');

const STUDY_TARGET = 'en';
const SOURCE_LOCALE = 'ru';
const PACK_TEMP_ROOT = path.join(ROOT, '.codex-tmp', 'plan-content');
const PLAN_CONTENT_DAY_SCHEMA_VERSION = 'plan-content-day-v1';
const PLAN_CONTENT_INDEX_SCHEMA_VERSION = 'plan-content-index-v1';

// ОБЯЗАНО быть по-байтово идентично canonicalCoursePackContent в
// app/course_pack_remote_loader.ts (рантайм-верификатор считает sha256 по этой
// же строке через expo-crypto). Тест contract пиннит оба источника друг к другу.
function canonicalCoursePackContent(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalCoursePackContent).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalCoursePackContent(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function readArg(flag) {
  const withEq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (withEq) return withEq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

function hashDay(day) {
  return sha256Hex(canonicalCoursePackContent(day));
}

function rowPathFor(planId, dayIndex) {
  // Обязан по-байтово совпадать с rowPathFor в app/plan_content_remote_readiness.ts.
  return `plans/${planId}/day-${String(dayIndex).padStart(3, '0')}.json`;
}

/**
 * Стабильная ISO-метка, выведенная из хэша графа контента: один и тот же контент
 * всегда даёт одну и ту же метку, разный контент — разные. Не «время сборки»,
 * а идентификатор версии контента в формате времени (поле обязано парситься
 * как дата: этого требует validateCreatedAt в course_pack_manifest.ts).
 */
function deterministicStamp(graphHash) {
  // Берём 8 hex-символов графа как смещение в секундах от эпохи пака.
  const epoch = Date.parse('2026-01-01T00:00:00.000Z');
  const offsetSec = parseInt(graphHash.slice(0, 8), 16) % (365 * 24 * 3600);
  return new Date(epoch + offsetSec * 1000).toISOString();
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// ── 1. Данные из реестра (единственный источник правды рантайма) ────────────
const days = [...loadAllPlanContentDays()].sort(
  (a, b) => a.planId.localeCompare(b.planId) || a.dayIndex - b.dayIndex,
);
if (days.length === 0) fail('registry returned zero authored plan days');

const perPlan = new Map();
for (const day of days) {
  perPlan.set(day.planId, (perPlan.get(day.planId) ?? 0) + 1);
  const issues = validatePlanContentDay(day);
  if (issues.length > 0) {
    fail(`${day.planId} day ${day.dayIndex} failed schema validation: ` +
      issues.slice(0, 5).map((i) => `${i.code}: ${i.detail}`).join('; '));
  }
}

const graph = days.map((day) => ({ planId: day.planId, dayIndex: day.dayIndex, contentHash: hashDay(day) }));
const sourceGraphHash = sha256Hex(JSON.stringify(graph));

const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const contentVersion = readArg('--content-version') ?? `release.${dateToken}.${sourceGraphHash.slice(0, 8)}`;
if (!/^[A-Za-z0-9._-]+$/.test(contentVersion)) fail(`contentVersion has illegal characters: ${contentVersion}`);

const outputDir = path.resolve(ROOT, readArg('--out-dir') ?? path.join(PACK_TEMP_ROOT, 'release-pack', contentVersion));
if (outputDir !== PACK_TEMP_ROOT && !outputDir.startsWith(`${PACK_TEMP_ROOT}${path.sep}`)) {
  fail(`--out-dir must stay under ${path.relative(ROOT, PACK_TEMP_ROOT)} (gitignored temp root)`);
}

// зачем: пак ОБЯЗАН быть воспроизводимым — пересборка того же контента должна
// давать тот же sha256, иначе меняется cacheKey и все устройства перекачивают
// те же 25 МБ заново. Время сборки в байтах это ломало, поэтому generatedAt
// детерминирован: либо задан флагом, либо выведен из хэша графа контента.
// (На contentHash дня это не влияло и раньше — он считается только от content.)
const generatedAt = readArg('--generated-at') ?? deterministicStamp(sourceGraphHash);
const appVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
if (!/^[A-Za-z0-9._-]+$/.test(String(appVersion))) fail(`package.json version unusable as minAppVersion: ${appVersion}`);

// ── 2. Запись пака ──────────────────────────────────────────────────────────
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const indexEntries = [];
for (const [i, day] of days.entries()) {
  const relativePath = rowPathFor(day.planId, day.dayIndex);
  const artifact = {
    schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
    studyTarget: STUDY_TARGET,
    sourceLocale: SOURCE_LOCALE,
    contentVersion,
    contentHash: graph[i].contentHash,
    // Контент по-байтово равен тому, что уже живёт в проде внутри бандла и
    // закрыт его контрактными тестами — поэтому approved/passed, а не shadow.
    reviewStatus: 'approved',
    localeGateStatus: 'passed',
    generatedBy: 'export_plan_content_packs',
    generatedAt,
    sourceGraphHash,
    content: day,
  };
  const absolute = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  indexEntries.push({
    planId: day.planId,
    dayIndex: day.dayIndex,
    path: relativePath,
    contentHash: graph[i].contentHash,
    sourceLocale: SOURCE_LOCALE,
    studyTarget: STUDY_TARGET,
    reviewStatus: 'approved',
    localeGateStatus: 'passed',
    schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
  });
}

const index = {
  schemaVersion: PLAN_CONTENT_INDEX_SCHEMA_VERSION,
  studyTarget: STUDY_TARGET,
  sourceLocale: SOURCE_LOCALE,
  contentVersion,
  entries: indexEntries,
};
validateIndexOrFail(index);
fs.writeFileSync(path.join(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

// Инлайн-валидация индекса (в этом дереве нет отдельного модуля-валидатора):
// уникальность planId:dayIndex, безопасные json-пути, 64-hex хэши.
function validateIndexOrFail(candidate) {
  if (candidate.schemaVersion !== PLAN_CONTENT_INDEX_SCHEMA_VERSION) fail('index schemaVersion drifted');
  if (!Array.isArray(candidate.entries) || candidate.entries.length === 0) fail('index has no entries');
  const seen = new Set();
  for (const entry of candidate.entries) {
    const key = `${entry.planId}:${entry.dayIndex}`;
    if (seen.has(key)) fail(`index duplicates ${key}`);
    seen.add(key);
    if (!/^[A-Za-z0-9_-]+$/.test(entry.planId)) fail(`unsafe planId: ${entry.planId}`);
    if (!Number.isSafeInteger(entry.dayIndex) || entry.dayIndex <= 0) fail(`bad dayIndex for ${entry.planId}`);
    if (!/^[A-Za-z0-9._/-]+\.json$/.test(entry.path) || entry.path.includes('..') || entry.path.startsWith('/')) {
      fail(`unsafe row path: ${entry.path}`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.contentHash)) fail(`bad contentHash at ${entry.path}`);
  }
}

// Целопаковый sha256 — той же схемой, что plan_content_course_pack_manifest_wrap.ts
// (сортированные файлы, имя\0содержимое\0), чтобы паритет-тулинг мог сверять.
function hashPackFiles(dir, entryPaths) {
  const files = ['index.json', ...entryPaths].sort();
  const hash = createHash('sha256');
  let byteSize = 0;
  for (const relative of files) {
    const content = fs.readFileSync(path.join(dir, relative));
    byteSize += content.byteLength;
    hash.update(relative.replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), byteSize };
}

const packDigest = hashPackFiles(outputDir, indexEntries.map((e) => e.path));
const manifest = {
  packId: `${STUDY_TARGET}.${SOURCE_LOCALE}.plan_content.${contentVersion}`,
  studyTarget: STUDY_TARGET,
  sourceLocale: SOURCE_LOCALE,
  surface: 'plan_content',
  schemaVersion: COURSE_PACK_SCHEMA_VERSION,
  contentVersion,
  minAppVersion: String(appVersion),
  sha256: packDigest.sha256,
  byteSize: packDigest.byteSize,
  createdAt: generatedAt,
  dependencies: [],
  entryIndex: 'index.json',
};
const manifestValidation = validateCoursePackManifest(manifest);
if (!manifestValidation.ok) fail(`manifest failed validation: ${manifestValidation.errors.join('; ')}`);
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

// ── 3. Самопроверка с диска (never trust your own write) ────────────────────
const persistedManifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8'));
const persistedManifestValidation = validateCoursePackManifest(persistedManifest);
if (!persistedManifestValidation.ok) fail('persisted manifest failed validation');
const persistedIndex = JSON.parse(fs.readFileSync(path.join(outputDir, 'index.json'), 'utf8'));
validateIndexOrFail(persistedIndex);
if (persistedIndex.entries.length !== days.length) fail('persisted index entry count != registry day count');

for (const entry of persistedIndex.entries) {
  if (entry.path !== rowPathFor(entry.planId, entry.dayIndex)) {
    fail(`row path drifted from rowPathFor convention: ${entry.path}`);
  }
  const artifact = JSON.parse(fs.readFileSync(path.join(outputDir, entry.path), 'utf8'));
  const recomputed = hashDay(artifact.content);
  if (recomputed !== artifact.contentHash || recomputed !== entry.contentHash) {
    fail(`hash mismatch after write at ${entry.path}`);
  }
}

const cacheKey = buildCoursePackCacheKey(persistedManifest);

// ── Отчёт ───────────────────────────────────────────────────────────────────
console.log('Plan content release pack export: PASS');
console.log(`Output:          ${path.relative(ROOT, outputDir)}`);
console.log(`Content version: ${contentVersion}`);
console.log(`Pack sha256:     ${manifest.sha256}`);
console.log(`Pack bytes:      ${(manifest.byteSize / 1048576).toFixed(2)} MB (JSON, до CDN-сжатия)`);
console.log(`Cache key:       ${cacheKey}`);
console.log(`Days:            ${days.length} (${[...perPlan.entries()].map(([p, n]) => `${p}:${n}`).join(', ')})`);
console.log('');
console.log('Next: node scripts/upload_plan_content_pack_to_storage.mjs --pack-dir ' + path.relative(ROOT, outputDir));
