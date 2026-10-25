/**
 * Переводы ПЕРВОЙ реплики сценарных Диалогов V2 на язык интерфейса — таблица ВНЕ пакета.
 *
 * зачем (жалоба владельца 25.10 «в диалогах нет кнопки ПЕРЕВЕСТИ»; координатор: «Перевести» у каждого сообщения):
 * ответы собеседника переводятся разбором хода, а у первой реплики (content.opening) перевода нет. Класть его в пакет
 * нельзя без выкладки сервера: пакеты закреплены хэшем (packSha256, пины манифеста), а проверка пакета в 2.0.0 требует
 * ровно 2 поля в opening. Поэтому перевод живёт в бандле приложения отдельной таблицей, а запись хранит исходник:
 * изменилась реплика в пакете — перевод считается устаревшим и не показывается.
 *
 *   node scripts/dialogue_v2_opening_translations.mjs --sources   → content/dialogues-v2/ui-copy/opening-translations/sources.v1.json
 *        (все первые реплики встроенного выпуска: ключ <studyTarget>:<scenarioId> → исходник; работа для Переводчика)
 *   node scripts/dialogue_v2_opening_translations.mjs --build     → shared/generated/dialogue_v2_opening_translations.<uiLang>.json
 *        (из content/dialogues-v2/ui-copy/opening-translations/<uiLang>.v1.json: { "<key>": "<перевод>" }; нет файла — пустая таблица)
 *   node scripts/dialogue_v2_opening_translations.mjs --check     → падает, если сборка разошлась с файлами в shared/generated
 */
import fs from 'node:fs';
import path from 'node:path';

const LOG = '[DIALOGUE-V2-OPENING-TR]';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const RELEASE_PATH = 'functions/src/generated/dialogue_v2_server_release.json';
const WORK_DIR = 'content/dialogues-v2/ui-copy/opening-translations';
const SOURCES_PATH = `${WORK_DIR}/sources.v1.json`;
const OUTPUT_SCHEMA = 'dialogue-v2-opening-translations.v1';
const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const MAX_LENGTH = 800;
const UNSAFE_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/u;

const abs = (relative) => path.join(ROOT, relative);
const readJson = (relative) => JSON.parse(fs.readFileSync(abs(relative), 'utf8'));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(abs(relative)), { recursive: true });
  fs.writeFileSync(abs(relative), `${JSON.stringify(value, null, 2)}\n`);
};

/** Все первые реплики встроенного выпуска: { "<studyTarget>:<scenarioId>": { studyTarget, text } }. */
export function collectOpeningSources(release) {
  const packets = release?.release?.packets;
  if (!packets || typeof packets !== 'object') throw new Error(`${LOG} release.packets missing`);
  const out = {};
  for (const packet of Object.values(packets)) {
    const target = packet?.studyTarget;
    const scenarioId = packet?.scenario?.id;
    const text = packet?.content?.opening?.text;
    if (typeof target !== 'string' || typeof scenarioId !== 'string' || typeof text !== 'string' || !text.trim()) continue;
    out[`${target}:${scenarioId}`] = { studyTarget: target, text: text.trim() };
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/** Таблица языка: только записи с исходником из выпуска, непустым безопасным переводом и не на языке изучения. */
export function buildOpeningTable(uiLang, sources, translations) {
  const entries = {};
  const problems = [];
  for (const [key, value] of Object.entries(translations ?? {})) {
    const source = sources[key];
    if (!source) { problems.push(`${key}: нет такой реплики в выпуске`); continue; }
    if (source.studyTarget === uiLang) { problems.push(`${key}: язык интерфейса = язык изучения`); continue; }
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length > MAX_LENGTH || UNSAFE_RE.test(text)) { problems.push(`${key}: перевод пустой/длинный/с управляющими символами`); continue; }
    if (text === source.text) { problems.push(`${key}: перевод совпадает с исходником`); continue; }
    entries[key] = { source: source.text, text };
  }
  return { table: { schemaVersion: OUTPUT_SCHEMA, uiLang, entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) }, problems };
}

function outputPath(uiLang) {
  return `shared/generated/dialogue_v2_opening_translations.${uiLang}.json`;
}

function main() {
  const mode = process.argv[2];
  const sources = collectOpeningSources(readJson(RELEASE_PATH));
  if (mode === '--sources') {
    writeJson(SOURCES_PATH, { schemaVersion: 'dialogue-v2-opening-sources.v1', note: 'Переводить text на язык интерфейса; файл перевода <uiLang>.v1.json = { "<key>": "<перевод>" }', entries: sources });
    console.log(LOG, JSON.stringify({ event: 'sources_written', count: Object.keys(sources).length, path: SOURCES_PATH }));
    return;
  }
  if (mode !== '--build' && mode !== '--check') {
    console.error(`${LOG} usage: --sources | --build | --check`);
    process.exitCode = 2;
    return;
  }
  let failed = false;
  for (const uiLang of UI_LANGS) {
    const inputPath = `${WORK_DIR}/${uiLang}.v1.json`;
    const translations = fs.existsSync(abs(inputPath)) ? readJson(inputPath) : {};
    const { table, problems } = buildOpeningTable(uiLang, sources, translations);
    for (const problem of problems) console.warn(LOG, JSON.stringify({ event: 'entry_rejected', uiLang, problem }));
    const expected = `${JSON.stringify(table, null, 2)}\n`;
    if (mode === '--build') {
      writeJson(outputPath(uiLang), table);
      console.log(LOG, JSON.stringify({ event: 'built', uiLang, entries: Object.keys(table.entries).length, rejected: problems.length }));
    } else {
      const current = fs.existsSync(abs(outputPath(uiLang))) ? fs.readFileSync(abs(outputPath(uiLang)), 'utf8').replace(/\r\n/g, '\n') : null;
      if (current !== expected) { failed = true; console.error(LOG, JSON.stringify({ event: 'stale', uiLang, path: outputPath(uiLang) })); }
    }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) main();
