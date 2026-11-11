/**
 * Запись озвучки курсов по списку output/course-voice/manifest.json (его собирает course_voice_manifest_build.cts).
 *
 * зачем (владелец 11.11.2026): «давай пока только уроки (словари и всё остальное тоже) без пика» — прямая команда
 * на платную запись ≈251 тыс. символов выбранными им голосами. Один текст = один mp3 = один голос из списка языка.
 *
 * Возобновляемый: готовый mp3 не перезаписывается и символы повторно не тратятся.
 *   ALLOW_PAID_AUDIO=1 node scripts/generate_course_voice_elevenlabs.mjs [--dry-run] [--lesson=1] [--lang=es] [--limit=50]
 */
import { requireAllowPaidAudio } from './paid_audio_guard.mjs'; requireAllowPaidAudio('generate_course_voice_elevenlabs.mjs'); // зачем: платная озвучка запрещена без ALLOW_PAID_AUDIO=1 (владелец 05.11)
import fs from 'node:fs';
import path from 'node:path';

const TAG = '[COURSE-VOICE]';
const OUT_DIR = path.resolve('output/course-voice');
const AUDIO_DIR = path.join(OUT_DIR, 'audio');
const API = 'https://api.elevenlabs.io';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_64'; // зачем: записи не лежат в сборке и докачиваются — 64 кбит/с вдвое легче 128 при той же разборчивости речи
const SPEED = 0.9; // зачем: та же скорость, что в пробах, которые владелец прослушал и одобрил
const VOICE_SETTINGS = Object.freeze({ stability: 0.45, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: SPEED });
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 5;
const MIN_VALID_BYTES = 1024;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const arg = (name) => { const hit = args.find((a) => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : null; };
const ONLY_LESSON = arg('lesson') ? Number(arg('lesson')) : null;
const ONLY_LANG = arg('lang');
const LIMIT = arg('limit') ? Number(arg('limit')) : null;

function loadKey() {
  // зачем: в окружении этого ПК лежит ELEVENLABS_API_KEY другого кабинета (11.11 пробы ушли не туда).
  // Берём только ключ, который владелец дал для этой задачи; нет файла — отказ, а не тихая запись на чужой счёт.
  const file = path.resolve('.env.elevenlabs.local');
  if (!fs.existsSync(file)) throw new Error(`${TAG} нет файла ключа ${file}`);
  const match = fs.readFileSync(file, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m);
  if (!match) throw new Error(`${TAG} в ${file} нет строки ELEVENLABS_API_KEY=`);
  return match[1].trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const valid = (file) => fs.existsSync(file) && fs.statSync(file).size >= MIN_VALID_BYTES;

async function balance(key) {
  const response = await fetch(`${API}/v1/user/subscription`, { headers: { 'xi-api-key': key } });
  if (!response.ok) throw new Error(`${TAG} счёт не прочитан: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  const body = await response.json();
  return { used: body.character_count, limit: body.character_limit, left: body.character_limit - body.character_count };
}

async function synth(key, row, file) {
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(`${API}/v1/text-to-speech/${row.voiceId}?output_format=${OUTPUT_FORMAT}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: row.text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
        signal: AbortSignal.timeout(60000),
      });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < MIN_VALID_BYTES) { lastError = `слишком короткий ответ: ${bytes.length} байт`; }
        else {
          // зачем: пишем во временный файл и переименовываем — обрыв на полпути не оставит битый mp3, который повторный запуск примет за готовый
          fs.writeFileSync(`${file}.part`, bytes);
          fs.renameSync(`${file}.part`, file);
          return;
        }
      } else {
        lastError = `HTTP ${response.status} за ${Date.now() - started} мс: ${(await response.text()).slice(0, 200)}`;
        // зачем: 4xx кроме «слишком часто» повтором не лечится (нет денег, нет голоса, плохой текст) — не жжём попытки
        if (response.status < 500 && response.status !== 429 && response.status !== 409) throw Object.assign(new Error(lastError), { fatal: true });
      }
    } catch (error) {
      if (error.fatal) throw error;
      lastError = `${error.name}: ${error.message} (попытка ${attempt}, ${Date.now() - started} мс)`;
    }
    console.warn(`${TAG} повтор ${attempt}/${MAX_ATTEMPTS} ${row.lang}/${row.key} «${row.text.slice(0, 40)}»: ${lastError}`);
    await sleep(1500 * attempt * attempt);
  }
  throw new Error(lastError);
}

async function main() {
  const manifestFile = path.join(OUT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`${TAG} нет списка ${manifestFile} — сначала scripts/course_voice_manifest_build.cts`);
  let rows = JSON.parse(fs.readFileSync(manifestFile, 'utf8')).rows;
  if (ONLY_LANG) rows = rows.filter((row) => row.lang === ONLY_LANG);
  if (ONLY_LESSON) rows = rows.filter((row) => row.lesson === ONLY_LESSON && row.sections.includes('lesson'));
  if (LIMIT) rows = rows.slice(0, LIMIT);

  for (const lang of new Set(rows.map((row) => row.lang))) fs.mkdirSync(path.join(AUDIO_DIR, lang), { recursive: true });
  const fileOf = (row) => path.join(AUDIO_DIR, row.lang, `${row.key}.mp3`);
  const todo = rows.filter((row) => !valid(fileOf(row)));
  const todoChars = todo.reduce((sum, row) => sum + row.text.length, 0);
  console.log(`${TAG} в выборке: ${rows.length}, уже готово: ${rows.length - todo.length}, записать: ${todo.length} (${todoChars} символов), dryRun=${DRY_RUN}`);
  if (DRY_RUN || todo.length === 0) return;

  const key = loadKey();
  const before = await balance(key);
  console.log(`${TAG} счёт до: осталось ${before.left} из ${before.limit}`);
  if (before.left < todoChars) throw new Error(`${TAG} не хватает символов: нужно ${todoChars}, осталось ${before.left} — запись не начата`);

  const failed = [];
  let done = 0;
  let spent = 0;
  let cursor = 0;
  let stop = false;
  const started = Date.now();
  async function worker() {
    while (cursor < todo.length && !stop) {
      const row = todo[cursor];
      cursor += 1;
      try {
        await synth(key, row, fileOf(row));
        spent += row.text.length;
      } catch (error) {
        failed.push({ lang: row.lang, key: row.key, text: row.text, voice: row.voiceName, reason: String(error.message || error) });
        console.error(`${TAG} ОТКАЗ ${row.lang}/${row.key} «${row.text.slice(0, 40)}» (${row.voiceName}): ${error.message || error}`);
        // зачем: 20 отказов подряд по разным фразам — это не фраза, а счёт/ключ/сеть; дальше молотить бессмысленно
        if (failed.length >= 20 && failed.length > done) { stop = true; console.error(`${TAG} слишком много отказов — остановка`); }
      }
      done += 1;
      if (done % 250 === 0) console.log(`${TAG} ${done}/${todo.length}, символов ${spent}, отказов ${failed.length}, ${Math.round((Date.now() - started) / 1000)} с`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(path.join(OUT_DIR, 'failed.json'), JSON.stringify(failed, null, 1));
  const after = await balance(key);
  console.log(`${TAG} готово: записано ${done - failed.length}, отказов ${failed.length}, символов по списку ${spent}, со счёта ушло ${after.used - before.used}, осталось ${after.left}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => { console.error(`${TAG} аварийный выход: ${error.stack || error}`); process.exit(1); });
