#!/usr/bin/env node
/*
 * Перенос независимо принятых заданий Кодекса старых видов (угадай фразу / пропуск / найди лишнее) в репозиторий.
 *
 * зачем (владелец 11.11.2026: «Только проверенные 1 750» → «Добавить к нынешним»): задания лежали вне проекта, в Пик не
 * попадало ни одно. Скрипт читает папку автора ТОЛЬКО на чтение и кладёт в content/spire-quality/{lang}/tasks.jsonl узкую
 * форму — без редакторских пометок. Оттуда файл попадает в бандл функций (functions/scripts/copy_generated_assets.js),
 * а сборщик недели дописывает эти задания к нынешнему пулу языка (functions/src/spire_pack_build.ts).
 *
 * Запуск:  node scripts/import_peak_quality_pool.mjs "<реестр PEAK-EDITORIAL-CURRENT-MANIFEST-*.json>"
 *
 * Что берётся: только батчи из реестра приёмки автора, и только если байты файла совпадают с отпечатком из реестра.
 * Что откладывается (причина — в манифесте, не молча):
 *   - no_russian_texts — у задания нет русского условия или русского разбора каждого неверного варианта;
 *   - pairs_mode       — задания «пары»: у автора четыре пары, серверное правило требует ровно шесть;
 *   - shape            — не четыре варианта, ключ вне границ, пустые строки;
 *   - no_difficulty    — автор не указал трудность задания;
 *   - too_long         — условие, вариант или разбор длиннее серверного предела.
 * Языковую приёмку скрипт НЕ делает и не заменяет.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['en', 'es', 'de', 'fr', 'it'];
const CHOICE_MODES = new Set(['guess_phrase', 'fill_gap', 'find_oddity']);
const SCHEMA = 'peak-quality-runtime-v1';
// те же пределы, что TOURNAMENT_TASK_LIMITS на сервере: длинная строка была бы отброшена уже при сборке недели
const PHRASE_BYTES = 512;
const ANSWER_BYTES = 1024;
const EXPLANATION_BYTES = 1024;
const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, '..', 'content', 'spire-quality');

const registryPath = process.argv[2];
if (!registryPath || !fs.existsSync(registryPath)) {
  console.error('[peak-quality-import] не задан или не найден реестр приёмки автора');
  process.exit(1);
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** Русские тексты батча: { id → { prompt, correctFeedback?, wrong[] } }. У автора два вида файла. */
function russianTexts(dir, candidatesFile) {
  const version = /-v(\d+)\.json$/u.exec(candidatesFile)?.[1];
  const files = fs.readdirSync(dir).filter((name) => /^ui-.*-v\d+\.json$/u.test(name));
  if (files.length === 0) return { file: null, byId: {} };
  // версия текстов та же, что у принятых заданий; иначе самая свежая
  const same = files.find((name) => name.endsWith(`-v${version}.json`));
  const file = same ?? files.sort((a, b) => Number(/-v(\d+)\.json$/u.exec(b)[1]) - Number(/-v(\d+)\.json$/u.exec(a)[1]))[0];
  const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const byId = {};
  if (raw.ru && typeof raw.ru === 'object') {
    for (const [id, entry] of Object.entries(raw.ru)) byId[id] = entry;
  } else if (raw.entries && typeof raw.entries === 'object') {
    for (const [id, entry] of Object.entries(raw.entries)) if (entry?.ru) byId[id] = entry.ru;
  }
  return { file, byId };
}

function difficultyOf(record) {
  const raw = record.difficulty ?? record.tier;
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/^D/iu, ''));
  return Number.isInteger(value) && value >= 1 && value <= 3 ? value : null;
}

/** Номер в пространстве имён, которое сервер уже считает номером своего языка (жалобы, список снятых). */
function runtimeId(lang, candidateId) {
  const tail = String(candidateId).replace(/^peak-quality-[a-z]{2}-/u, '');
  return lang === 'en' ? `spire-en-pq-${tail}` : `arena-${lang}-pq-${tail}`;
}

function convert(record, lang, ru) {
  const mode = text(record.mode);
  if (mode === 'speed_match') return { skip: 'pairs_mode' };
  if (!CHOICE_MODES.has(mode)) return { skip: 'shape' };
  const options = Array.isArray(record.options) ? record.options.map(text) : [];
  const correctIndex = record.correct;
  const difficulty = difficultyOf(record);
  if (options.length !== 4 || options.some((o) => !o) || new Set(options).size !== 4
    || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return { skip: 'shape' };
  // зачем: трудность решает, на какой этаж попадёт задание; у автора её нет — не выдумываем
  if (difficulty === null) return { skip: 'no_difficulty' };
  const phrase = text(ru?.prompt);
  const wrong = Array.isArray(ru?.wrong) ? ru.wrong : [];
  const reasons = options.map((_, index) => {
    if (index === correctIndex) return '';
    const entry = wrong.find((w) => w && w.optionIndex === index);
    return text(entry?.reason);
  });
  if (!phrase || reasons.some((reason, index) => index !== correctIndex && !reason)) return { skip: 'no_russian_texts' };
  const ruleNote = text(ru?.correctFeedback) || `Верный вариант — «${options[correctIndex]}».`;
  if (bytes(phrase) > PHRASE_BYTES || options.some((o) => bytes(o) > ANSWER_BYTES)
    || bytes(ruleNote) > EXPLANATION_BYTES || reasons.some((r) => bytes(r) > EXPLANATION_BYTES)) return { skip: 'too_long' };
  return {
    row: {
      schema: SCHEMA,
      taskId: runtimeId(lang, record.candidateId),
      authorId: String(record.candidateId),
      lang,
      mode,
      difficulty,
      phrase,
      options,
      correctIndex,
      ruleNote,
      wrongOptionReasons: reasons,
    },
  };
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const rowsByLang = Object.fromEntries(LANGS.map((lang) => [lang, []]));
const skipped = {};
const sources = [];
const seenIds = new Set();
let failed = false;

for (const entry of registry) {
  const lang = entry.language;
  const label = `${lang}-b${entry.batch}`;
  if (!LANGS.includes(lang) || !fs.existsSync(entry.path)) {
    console.error(`[peak-quality-import] ОТКАЗ ${label}: нет файла или чужой язык`);
    failed = true;
    continue;
  }
  const buffer = fs.readFileSync(entry.path);
  const actual = sha256(buffer);
  if (actual !== String(entry.sha256).toLowerCase()) {
    // зачем: приёмка привязана к байтам; файл, изменённый после приёмки, принятым не считается
    console.error(`[peak-quality-import] ОТКАЗ ${label}: файл изменён после приёмки (sha256 ${actual.slice(0, 12)} ≠ реестр)`);
    failed = true;
    continue;
  }
  const parsed = JSON.parse(buffer.toString('utf8'));
  const records = Array.isArray(parsed) ? parsed : (parsed.candidates ?? []);
  const ui = russianTexts(path.dirname(entry.path), path.basename(entry.path));
  let taken = 0;
  for (const record of records) {
    const recordLang = record.lang ?? record.language;
    if (recordLang !== lang || !record.candidateId) {
      skipped.shape = (skipped.shape ?? 0) + 1;
      continue;
    }
    const result = convert(record, lang, ui.byId[record.candidateId]);
    if (result.skip) {
      skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
      continue;
    }
    if (seenIds.has(result.row.taskId)) {
      skipped.duplicate_id = (skipped.duplicate_id ?? 0) + 1;
      continue;
    }
    seenIds.add(result.row.taskId);
    rowsByLang[lang].push(result.row);
    taken += 1;
  }
  sources.push({ batch: label, file: path.basename(entry.path), sha256: actual, records: records.length, taken, russianTexts: ui.file });
}

if (failed) {
  console.error('[peak-quality-import] перенос остановлен: файлы выше не прошли сверку с реестром');
  process.exit(1);
}

const manifest = { schema: 'spire-quality-pool-manifest-v1', rowSchema: SCHEMA, registry: path.basename(registryPath), langs: {}, skipped, sources };
for (const lang of LANGS) {
  const rows = rowsByLang[lang].sort((a, b) => (a.taskId < b.taskId ? -1 : 1));
  const body = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
  fs.mkdirSync(path.join(outRoot, lang), { recursive: true });
  fs.writeFileSync(path.join(outRoot, lang, 'tasks.jsonl'), body);
  const cells = {};
  for (const row of rows) cells[`${row.mode}:${row.difficulty}`] = (cells[`${row.mode}:${row.difficulty}`] ?? 0) + 1;
  manifest.langs[lang] = { tasks: rows.length, sha256: sha256(Buffer.from(body, 'utf8')), cells };
  console.log(`[peak-quality-import] ${lang}: ${rows.length} заданий`);
}
fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`[peak-quality-import] отложено: ${JSON.stringify(skipped)}`);
