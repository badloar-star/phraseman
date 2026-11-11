// @ts-nocheck
/**
 * Готовит записи озвучки курса к выгрузке: раскладывает mp3 под именами, которые приложение вычисляет из текста,
 * и пишет в сборку список «какие фразы записаны» (modules/audio/course-voice-index/<язык>.json).
 *
 * зачем (владелец 11.11.2026, «чисто, дальше»): записи одобрены на слух — подключаем к приложению. Скрипт в сеть
 * не ходит и символы не тратит; выгружает scripts/course_voice_upload.cjs.
 *
 *   node_modules/.bin/tsx scripts/course_voice_publish_build.cts
 */
const fs = require('fs');
const path = require('path');
const { courseVoiceKey, COURSE_VOICE_LANGS, COURSE_VOICE_GENERATION } = require('../modules/audio/course_voice_key.ts');

const TAG = '[COURSE-VOICE]';
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'course-voice');
const PUBLISH_DIR = path.join(OUT_DIR, 'publish', COURSE_VOICE_GENERATION);
const INDEX_DIR = path.join(ROOT, 'modules', 'audio', 'course-voice-index');
const MIN_VALID_BYTES = 1024;

function main() {
  const rows = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8')).rows;
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  let bytes = 0;
  for (const lang of COURSE_VOICE_LANGS) {
    const dir = path.join(PUBLISH_DIR, lang);
    fs.mkdirSync(dir, { recursive: true });
    const byKey = new Map();
    const shortKeys = new Set();
    for (const row of rows.filter((r) => r.lang === lang)) {
      const source = path.join(OUT_DIR, 'audio', lang, `${row.key}.mp3`);
      // зачем: в список «записано» попадает только то, что реально лежит на диске — иначе приложение пошло бы за файлом, которого нет
      if (!fs.existsSync(source) || fs.statSync(source).size < MIN_VALID_BYTES) throw new Error(`${TAG} нет записи для «${row.text}» (${lang}): ${source}`);
      const key = courseVoiceKey(lang, row.text);
      if (!key) throw new Error(`${TAG} пустой ключ для «${row.text}» (${lang})`);
      if (byKey.has(key)) throw new Error(`${TAG} совпадение ключа ${key}: «${byKey.get(key)}» и «${row.text}» (${lang}) — нужен другой ключ, иначе одна фраза зазвучит чужой записью`);
      byKey.set(key, row.text);
      shortKeys.add(key.slice(0, 8));
      const target = path.join(dir, `${key}.mp3`);
      if (!fs.existsSync(target) || fs.statSync(target).size !== fs.statSync(source).size) fs.copyFileSync(source, target);
      bytes += fs.statSync(source).size;
    }
    const keys = [...shortKeys].sort().join('');
    fs.writeFileSync(path.join(INDEX_DIR, `${lang}.json`), `${JSON.stringify({ schema: 'phraseman.course-voice-index/1', lang, count: byKey.size, keys })}\n`);
    console.log(`${TAG} ${lang}: записей ${byKey.size}, коротких ключей ${shortKeys.size}, список ${keys.length} знаков`);
  }
  console.log(`${TAG} к выгрузке: ${PUBLISH_DIR}, ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
}

try { main(); } catch (error) { console.error(`${TAG} аварийный выход: ${error?.stack || error}`); process.exit(1); }
