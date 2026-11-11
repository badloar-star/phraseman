#!/usr/bin/env node
/*
 * Копирует src/generated/*.json в собранный lib/.
 *
 * зачем: tsc переносит только .ts→.js, а генератору турнирных заданий нужен
 * tournament_content.json рядом с скомпилированным модулем. Без этой копии
 * в облаке require('./generated/tournament_content.json') не найдёт файл и
 * генерация молча вернёт ноль заданий.
 */
const fs = require('node:fs');
const path = require('node:path');

const from = path.resolve(__dirname, '..', 'src', 'generated');
const to = path.resolve(__dirname, '..', 'lib', 'functions', 'src', 'generated');

if (!fs.existsSync(from)) {
  console.warn('[assets] src/generated отсутствует — пропускаю');
  process.exit(0);
}
fs.mkdirSync(to, { recursive: true });

let copied = 0;
for (const file of fs.readdirSync(from)) {
  if (!file.endsWith('.json')) continue;
  fs.copyFileSync(path.join(from, file), path.join(to, file));
  const mb = (fs.statSync(path.join(to, file)).size / 1024 / 1024).toFixed(2);
  console.log(`[assets] ${file} → lib (${mb} МБ)`);
  copied += 1;
}
console.log(`[assets] скопировано файлов: ${copied}`);

/*
 * Multilingual-контент Шпиля (PM-272, es/de/fr прямая публикация, владелец
 * 2026-09-24) — похожие грабли, но НЕ идентичные tournament_content.json
 * выше: тот файл создаётся ВНЕ этого скрипта (в .gitignore, руками/другим
 * процессом) и только копируется в lib/. Здесь источник (.jsonl) ЕСТЬ в
 * репозитории и детерминирован — поэтому генерируем .json сразу в ДВА места:
 * src/generated/ (оттуда require() резолвит его при `ts-jest` — тесты
 * запускаются из src/, не из lib/, см. jest.config.js roots: ['<rootDir>/src'])
 * и lib/generated/ (прод-рантайм после tsc). `.jsonl` не проходит
 * resolveJsonModule (он только для .json), поэтому конвертируем построчный
 * файл в один .json-массив, который читает ленивый require() в
 * spire_pack_build.ts::loadMultilingualRows — тот же приём, что
 * sourceDays()/tournament_content.json.
 *
 * src/generated/spire_multilingual_*.json — тоже в .gitignore (см. ниже):
 * производный от content/arena-multilingual/generated/{lang}/tasks.jsonl,
 * который И ЕСТЬ источник правды и уже в git.
 */
const multilingualLangs = ['es', 'de', 'fr', 'it'];
const multilingualSrcTo = path.resolve(__dirname, '..', 'src', 'generated');
const multilingualLibTo = path.resolve(__dirname, '..', 'lib', 'functions', 'src', 'generated');
let multilingualCopied = 0;
for (const lang of multilingualLangs) {
  const jsonlPath = path.resolve(__dirname, '..', '..', 'content', 'arena-multilingual', 'generated', lang, 'tasks.jsonl');
  const manifestPath = path.resolve(__dirname, '..', '..', 'content', 'arena-multilingual', 'generated', lang, 'manifest.json');
  if (!fs.existsSync(jsonlPath) || !fs.existsSync(manifestPath)) {
    for (const destination of [multilingualSrcTo, multilingualLibTo]) {
      const stale = path.join(destination, `spire_multilingual_${lang}.json`);
      if (fs.existsSync(stale)) fs.rmSync(stale);
    }
    throw new Error(`[assets] обязательный источник Шпиля отсутствует: content/arena-multilingual/generated/${lang}/tasks.jsonl или manifest.json`);
  }
  const rows = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const json = JSON.stringify({ schemaVersion: 'spire-multilingual-bundle-v1', manifest, rows });
  for (const to of [multilingualSrcTo, multilingualLibTo]) {
    fs.mkdirSync(to, { recursive: true });
    fs.writeFileSync(path.join(to, `spire_multilingual_${lang}.json`), json);
  }
  const mb = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`[assets] spire_multilingual_${lang}.json → src+lib (${mb} МБ, ${rows.length} заданий)`);
  multilingualCopied += 1;
}
console.log(`[assets] multilingual-пулов Шпиля собрано: ${multilingualCopied}/${multilingualLangs.length}`);

/*
 * PM-286 (координатор 01.10, Q34 (а)): черновик Шпиля «на слух»/«диктант» из
 * Learning V2 — только en. Источник .jsonl в git, производный .json в
 * .gitignore, читает spire_pack_build.ts::loadListenDraftPool. Нет источника —
 * не роняем сборку: пакет en соберётся без звука, сборщик напишет причину.
 */
const listenDraftLangs = ['en'];
for (const lang of listenDraftLangs) {
  const jsonlPath = path.resolve(__dirname, '..', '..', 'content', 'arena-multilingual', 'generated', lang, 'spire_listen_dictate_draft.jsonl');
  if (!fs.existsSync(jsonlPath)) {
    console.warn(`[assets] черновик на слух ${lang} отсутствует — пакет ${lang} соберётся без звука`);
    continue;
  }
  const rows = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const json = JSON.stringify({ schemaVersion: 'spire-listen-draft-bundle-v1', rows });
  for (const to of [multilingualSrcTo, multilingualLibTo]) {
    fs.mkdirSync(to, { recursive: true });
    fs.writeFileSync(path.join(to, `spire_listen_draft_${lang}.json`), json);
  }
  console.log(`[assets] spire_listen_draft_${lang}.json → src+lib (${rows.length} заданий)`);
}

/*
 * Пик, двенадцать новых механик (владелец 11.11.2026): пул из content/spire-expanded/{lang}/tasks.jsonl
 * (его кладёт scripts/import_peak_expanded_pool.mjs) → spire_expanded_{lang}.json. Читает
 * spire_pack_build.ts::loadExpandedPool. Нет источника — сборку не роняем: Пик работает как раньше,
 * накладка новых механик для языка просто не собирается, сборщик напишет причину.
 */
const expandedLangs = ['en', 'es', 'de', 'fr', 'it'];
for (const lang of expandedLangs) {
  const jsonlPath = path.resolve(__dirname, '..', '..', 'content', 'spire-expanded', lang, 'tasks.jsonl');
  if (!fs.existsSync(jsonlPath)) {
    // зачем: устаревшая копия не должна пережить удаление источника — иначе снятый пул продолжит уходить в облако
    for (const dir of [multilingualSrcTo, multilingualLibTo]) {
      const stale = path.join(dir, `spire_expanded_${lang}.json`);
      if (fs.existsSync(stale)) fs.rmSync(stale);
    }
    console.warn(`[assets] пул новых механик ${lang} отсутствует — накладка ${lang} не соберётся`);
    continue;
  }
  const rows = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const json = JSON.stringify({ schemaVersion: 'spire-expanded-bundle-v1', rows });
  for (const to of [multilingualSrcTo, multilingualLibTo]) {
    fs.mkdirSync(to, { recursive: true });
    fs.writeFileSync(path.join(to, `spire_expanded_${lang}.json`), json);
  }
  console.log(`[assets] spire_expanded_${lang}.json → src+lib (${rows.length} заданий)`);
}

/*
 * Пик, добавка к пулу (владелец 11.11.2026: «Добавить к нынешним»): независимо принятые задания видов «выбор» из
 * content/spire-quality/{lang}/tasks.jsonl (кладёт scripts/import_peak_quality_pool.mjs) → spire_quality_{lang}.json.
 * Читает spire_pack_build.ts::loadQualityPool. Нет источника — сборку не роняем, устаревшую копию убираем.
 */
for (const lang of expandedLangs) {
  const jsonlPath = path.resolve(__dirname, '..', '..', 'content', 'spire-quality', lang, 'tasks.jsonl');
  if (!fs.existsSync(jsonlPath)) {
    for (const dir of [multilingualSrcTo, multilingualLibTo]) {
      const stale = path.join(dir, `spire_quality_${lang}.json`);
      if (fs.existsSync(stale)) fs.rmSync(stale);
    }
    console.warn(`[assets] добавка к пулу Пика ${lang} отсутствует — набор соберётся без неё`);
    continue;
  }
  const rows = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const json = JSON.stringify({ schemaVersion: 'spire-quality-bundle-v1', rows });
  for (const to of [multilingualSrcTo, multilingualLibTo]) {
    fs.mkdirSync(to, { recursive: true });
    fs.writeFileSync(path.join(to, `spire_quality_${lang}.json`), json);
  }
  console.log(`[assets] spire_quality_${lang}.json → src+lib (${rows.length} заданий)`);
}
