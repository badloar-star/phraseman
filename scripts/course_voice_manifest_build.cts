// @ts-nocheck
/**
 * Список озвучки курсов: «язык + текст + раздел + голос» → output/course-voice/manifest.json.
 *
 * зачем (владелец 11.11.2026): «давай пока только уроки (словари и всё остальное тоже) без пика»;
 * «хочу, чтобы они чередовались рандомно — одна фраза озвучивается так, другая другим голосом».
 * Скрипт НИЧЕГО не отправляет в сеть и не тратит символы: он только собирает список из тех же данных,
 * которые читает приложение (фразы уроков = примеры теории, словари, неправильные глаголы, предлоги).
 * Записывает его scripts/generate_course_voice_elevenlabs.mjs.
 *
 *   node_modules/.bin/tsx scripts/course_voice_manifest_build.cts
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TAG = '[COURSE-VOICE]';
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'course-voice');
const PICKS_FILE = path.join(ROOT, 'docs', 'work', 'mockups', 'voices-2026-11-11', 'picks.json');
const LANGS = ['en', 'es', 'de', 'fr', 'it'];

// зачем: модули данных приложения тянут за собой react-native / expo, которые вне телефона не грузятся.
// Нам нужны только чистые данные, поэтому всё нативное подменяется пустышкой — логика данных остаётся настоящей.
const stub = new Proxy(function () {}, { get: (_t, key) => (key === '__esModule' ? false : key === 'then' ? undefined : stub), apply: () => stub, construct: () => stub });
const STUB_ID = path.join(__dirname, '__course_voice_native_stub__');
require.cache[STUB_ID] = { id: STUB_ID, filename: STUB_ID, loaded: true, exports: stub, children: [], paths: [] };
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (/^(react|react-native|expo|firebase)($|[-/])|^@(react-native|expo|firebase|sentry)\//.test(request)) return STUB_ID;
  return resolveFilename.call(this, request, ...rest);
};
const realLog = console.log;
console.log = () => {}; // зачем: модули данных пишут по строке на каждый урок — в списке это шум

/** Та же нормализация, что app/phrase_audio_key.ts: по ней приложение вычислит имя файла из текста. */
function normalizeKey(text) { return String(text).trim().toLowerCase().replace(/\s+/g, ' '); }
function fileKey(lang, text) { return crypto.createHash('sha256').update(`${lang}\n${normalizeKey(text)}`).digest('hex').slice(0, 20); }

const items = new Map(); // `${lang}/${key}` → строка списка
const skipped = [];
function add(lang, rawText, section, lesson) {
  const text = String(rawText ?? '').replace(/\s+/g, ' ').trim();
  if (!text) { skipped.push({ lang, section, lesson, reason: 'пустой текст' }); return; }
  const key = fileKey(lang, text);
  const id = `${lang}/${key}`;
  const existing = items.get(id);
  // зачем: один и тот же текст в уроке, словаре и глаголах записывается ОДИН раз — приложение ищет запись по тексту
  if (existing) { if (!existing.sections.includes(section)) existing.sections.push(section); return; }
  items.set(id, { lang, key, text, sections: [section], lesson });
}

function loadPicks() {
  const picks = JSON.parse(fs.readFileSync(PICKS_FILE, 'utf8'));
  for (const lang of LANGS) {
    if (!Array.isArray(picks[lang]) || picks[lang].length === 0) throw new Error(`${TAG} в ${PICKS_FILE} нет голосов для языка ${lang}`);
  }
  return picks;
}

function collect() {
  for (const lang of LANGS) {
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      const file = path.join(ROOT, 'modules', 'classic-courses', lang, `lessons-${String(lesson).padStart(2, '0')}.json`);
      for (const phrase of JSON.parse(fs.readFileSync(file, 'utf8')).phrases) add(lang, phrase.target, 'lesson', lesson);
    }
  }
  const words = require(path.join(ROOT, 'app', 'classic_lesson_words.ts'));
  for (const lang of LANGS) for (let lesson = 1; lesson <= 32; lesson += 1) for (const word of words.classicLessonWordBank(lang, lesson)) add(lang, word.en, 'words', lesson);

  const verbsEn = require(path.join(ROOT, 'app', 'irregular_verbs_data.ts')).IRREGULAR_VERBS_BY_LESSON;
  const classicVerbs = require(path.join(ROOT, 'app', 'classic_irregular_verbs.ts'));
  for (const lang of LANGS) {
    const byLesson = lang === 'en' ? verbsEn : classicVerbs.classicIrregularVerbsByLesson(lang);
    for (const [lesson, list] of Object.entries(byLesson)) for (const verb of list) for (const form of [verb.base, verb.past, verb.pp]) add(lang, form, 'verbs', Number(lesson));
  }

  // зачем: экран предлогов говорит только по-английски (preposition_drill.tsx → speakSentenceEn, 'en-US'),
  // произносит шаблон с подставленным верным предлогом — собираем ровно ту же строку.
  const preps = require(path.join(ROOT, 'app', 'lesson_prepositions.ts'));
  for (let lesson = 1; lesson <= 32; lesson += 1) {
    const pack = preps.getLessonPrepositionPack(lesson, 'en');
    for (const item of pack?.items ?? []) add('en', String(item.sentenceTemplate).replace(/__/g, item.correct), 'prepositions', lesson);
  }

  // зачем (владелец 11.11.2026, ночь: «Пик и фразу дня» — после счёта 348 + 880 фраз): задания Пика «на слух» и
  // «диктант» есть только в английском (functions/src/spire_listen_draft_pool.ts), произносится поле phrase.
  // Раздел идёт ПОСЛЕ курса: фраза, уже записанная для урока, второй раз не записывается.
  const peak = JSON.parse(fs.readFileSync(path.join(ROOT, 'functions', 'src', 'generated', 'spire_listen_draft_en.json'), 'utf8')).rows;
  for (const row of peak) add('en', row?.payload?.phrase, 'peak', 0);

  // Фраза дня: произносится само выражение (components/DailyPhraseCard.tsx → phrase.english).
  // en — каталог идиом; es/de/it — наборы в сборке; fr — принятые авторские наборы (в приложение приходят с сервера).
  for (const idiom of require(path.join(ROOT, 'app', 'idioms_data.ts')).IDIOMS) add('en', idiom.english, 'daily', 0);
  for (const lang of ['es', 'de', 'it']) {
    const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'daily_phrase_packs', `${lang}.dpk`), 'utf8'));
    for (const entry of pack.entries) add(lang, entry.targetText, 'daily', 0);
  }
  const frDir = path.join(ROOT, 'content', 'daily-phrases', 'fr', 'authoring');
  for (const file of fs.readdirSync(frDir).filter((name) => name.endsWith('.json')).sort()) {
    for (const row of JSON.parse(fs.readFileSync(path.join(frDir, file), 'utf8')).rows ?? []) add('fr', row.targetText, 'daily', 0);
  }
}

function main() {
  const picks = loadPicks();
  collect();
  const rows = [...items.values()].map((row) => {
    const voices = picks[row.lang];
    // зачем: «чередовались рандомно». Голос берётся из хэша текста: для ученика порядок случайный, а повторный
    // запуск даёт фразе тот же голос — готовая запись не перезаписывается другим голосом и символы не тратятся дважды.
    const voice = voices[parseInt(crypto.createHash('sha256').update(`voice\n${row.lang}\n${row.text}`).digest('hex').slice(0, 8), 16) % voices.length];
    return { ...row, voiceId: voice.id, voiceName: voice.name };
  });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), rows }));
  // зачем: страница прослушивания (output/course-voice/index.html) открывается без сборки — ей нужен тот же список обычным скриптом
  fs.writeFileSync(path.join(OUT_DIR, 'data.js'), `window.COURSE_VOICE = ${JSON.stringify(rows.map((row) => [row.lang, row.key, row.text, row.sections, row.lesson, row.voiceName]))};\n`);

  const summary = {};
  for (const row of rows) {
    const lang = (summary[row.lang] ||= { rows: 0, chars: 0, bySection: {}, byVoice: {} });
    lang.rows += 1; lang.chars += row.text.length;
    lang.bySection[row.sections[0]] = (lang.bySection[row.sections[0]] || 0) + 1;
    lang.byVoice[row.voiceName] = (lang.byVoice[row.voiceName] || 0) + 1;
  }
  const total = rows.reduce((sum, row) => sum + row.text.length, 0);
  realLog(`${TAG} строк: ${rows.length}, символов: ${total}, пропущено пустых: ${skipped.length}`);
  realLog(JSON.stringify(summary, null, 1));
  if (skipped.length) realLog(`${TAG} пропуски:`, JSON.stringify(skipped.slice(0, 20)));
}

try { main(); } catch (error) { console.error(`${TAG} аварийный выход: ${error?.stack || error}`); process.exit(1); }
