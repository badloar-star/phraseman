#!/usr/bin/env node
/**
 * voice_missing_phrase_audio.mjs — доозвучить фразы, у которых НЕТ клипа.
 *
 * зачем: 24.08.2026 нашлись 58 произносимых строк без клипа — служебные связки
 * словаря («there is», «going to», «has to») и `alternatives` уроков. Они
 * всегда звучали системным голосом. Скрипт озвучивает их ТЕМ ЖЕ голосом и
 * моделью, что и остальной корпус (echo / gpt-4o-mini-tts), заливает в тот же
 * бакет и дописывает в .codex-tmp/tts-voicing/audio_url_map_gaps.json, откуда
 * build_map_ts.mjs пересобирает рантайм-карту.
 *
 * Голос ОБЯЗАН совпадать с корпусом — иначе новые фразы заговорят другим
 * тембром и разнобой вернётся. Меняешь голос корпуса — меняй и здесь.
 *
 * Безопасность:
 *   - Dry-run по умолчанию: печатает план, не тратит и не пишет.
 *   - --apply требует PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (трата OpenAI)
 *     и PHRASEMAN_ALLOW_UPLOAD=1 + FB_TOKEN (загрузка в Storage).
 *   - Идемпотентен: id стабилен по тексту, повторный прогон перезаписывает
 *     объект на месте и сирот не создаёт.
 *
 * Запуск:
 *   node scripts/voice_missing_phrase_audio.mjs                    # план
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 PHRASEMAN_ALLOW_UPLOAD=1 \
 *     FB_TOKEN=$(node .codex-tmp/tts-voicing/fb_token.mjs) \
 *     node scripts/voice_missing_phrase_audio.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const MANIFEST = path.join(TTS_DIR, 'manifest_missing_2026-08-24.json');
const AUDIO_DIR = path.join(TTS_DIR, 'audio_missing');
const GAPS_JSON = path.join(TTS_DIR, 'audio_url_map_gaps.json');

const APPLY = process.argv.includes('--apply');

// ── параметры корпуса: держать синхронно с scripts/regen_phrase_audio_storage.mjs
const VOICE = 'echo';
const MODEL = 'gpt-4o-mini-tts';
const SPEED = 0.92;
const SPEED_WORD = 0.90;
const WORD_SOURCES = new Set(['word', 'verb']);
const INSTRUCTIONS =
  'Read short English phrases for a language learner. ' +
  'Calm and steady, slightly slower than conversational, with clean articulation. ' +
  'Keep the tone even and grounded — no brightness, no theatrics.';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PREFIX = 'phrase-audio';
const CONCURRENCY = 4;
const MIN_VALID_BYTES = 500;

function objectName(id, source) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${PREFIX}/${source}/${safe}.mp3`;
}
function publicUrl(objName) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objName)}?alt=media`;
}
// Версия в URL считается от ТЕКСТА — правка текста меняет URL и обесценивает
// клиентский кэш ровно для этой фразы (см. phraseAudioCacheIdentity в рантайме).
function versionedPublicUrl(objName, text) {
  const version = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${publicUrl(objName)}&v=${version}`;
}
function localPath(id, source) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return path.join(AUDIO_DIR, source, `${safe}.mp3`);
}

// Ключ берём штатным хелпером: он знает про OPENAI_TTS_API_KEY (именно эта
// переменная в .env.local), про фолбэк на .env и про легаси-режим. Своя
// регулярка тут уже промахнулась мимо имени переменной.
const loadOpenAiKey = () => requireOpenAiTtsKey(ROOT);

if (!fs.existsSync(MANIFEST)) {
  console.error(`манифест не найден: ${path.relative(ROOT, MANIFEST)}`);
  console.error('сначала: node scripts/collect_missing_phrase_audio.mjs');
  process.exit(2);
}
const { items } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (!Array.isArray(items) || items.length === 0) {
  console.log('нечего озвучивать — манифест пуст.');
  process.exit(0);
}

const chars = items.reduce((sum, it) => sum + it.text.length, 0);
console.log(`фраз к озвучке: ${items.length}, символов: ${chars}`);
console.log(`голос: ${VOICE} / ${MODEL} (как у корпуса)`);
console.log(`оценка трат OpenAI: ~$${((chars / 1000) * 0.015).toFixed(3)}`);

if (!APPLY) {
  console.log('\nDRY-RUN. Ничего не сделано. Для запуска добавь --apply и переменные:');
  console.log('  PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 PHRASEMAN_ALLOW_UPLOAD=1 FB_TOKEN=...');
  process.exit(0);
}

if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
  console.error('ОТКАЗ: нужен PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (трата OpenAI).');
  process.exit(2);
}
if (process.env.PHRASEMAN_ALLOW_UPLOAD !== '1') {
  console.error('ОТКАЗ: нужен PHRASEMAN_ALLOW_UPLOAD=1 (загрузка в Storage).');
  process.exit(2);
}
const FB_TOKEN = process.env.FB_TOKEN;
if (!FB_TOKEN) {
  console.error('ОТКАЗ: нужен FB_TOKEN (node .codex-tmp/tts-voicing/fb_token.mjs).');
  process.exit(2);
}
const OPENAI_KEY = loadOpenAiKey();

// ── 1) генерация mp3 ────────────────────────────────────────────────────────
async function generateOne(it) {
  const abs = localPath(it.id, it.source);
  if (fs.existsSync(abs) && fs.statSync(abs).size > MIN_VALID_BYTES) return 'skipped';
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const speed = WORD_SOURCES.has(it.source) ? SPEED_WORD : SPEED;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, voice: VOICE, input: it.text,
          speed, instructions: INSTRUCTIONS, response_format: 'mp3',
        }),
      });
      if (r.status === 429 || r.status >= 500) throw new Error(`retryable ${r.status}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < MIN_VALID_BYTES) throw new Error(`too small: ${buf.length}b`);
      fs.writeFileSync(abs, buf);
      return 'made';
    } catch (e) {
      lastErr = e;
      if (attempt < 4) await new Promise((res) => setTimeout(res, 400 * attempt * attempt));
    }
  }
  throw new Error(`${it.id}: ${lastErr?.message ?? 'unknown'}`);
}

// ── 2) загрузка в Storage ───────────────────────────────────────────────────
async function uploadOne(it) {
  const abs = localPath(it.id, it.source);
  if (!fs.existsSync(abs)) throw new Error(`${it.id}: локальный mp3 отсутствует`);
  const body = fs.readFileSync(abs);
  const objName = objectName(it.id, it.source);
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(objName)}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FB_TOKEN}`,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public,max-age=31536000,immutable',
        },
        body,
      });
      if (r.status === 429 || r.status >= 500) throw new Error(`retryable ${r.status}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
      return objName;
    } catch (e) {
      lastErr = e;
      if (attempt < 4) await new Promise((res) => setTimeout(res, 400 * attempt * attempt));
    }
  }
  throw new Error(`${it.id}: upload ${lastErr?.message ?? 'unknown'}`);
}

/** Пул с ограниченной конкурентностью — не долбим API десятками запросов. */
async function runPool(list, worker, label) {
  const results = new Array(list.length);
  const failures = [];
  let cursor = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, list.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= list.length) return;
      try {
        results[i] = await worker(list[i]);
      } catch (e) {
        failures.push(e.message);
        results[i] = null;
      }
      done++;
      if (done % 10 === 0 || done === list.length) {
        console.log(`  ${label}: ${done}/${list.length}`);
      }
    }
  });
  await Promise.all(runners);
  return { results, failures };
}

console.log('\n1/3 генерация mp3…');
const gen = await runPool(items, generateOne, 'сгенерировано');
if (gen.failures.length > 0) {
  console.error(`\nОШИБКИ генерации (${gen.failures.length}):`);
  for (const f of gen.failures.slice(0, 10)) console.error('  -', f);
  console.error('Ничего не загружено, карта не тронута. Исправь и повтори.');
  process.exit(1);
}
const made = gen.results.filter((r) => r === 'made').length;
console.log(`   новых: ${made}, уже были: ${gen.results.length - made}`);

console.log('\n2/3 загрузка в Storage…');
const up = await runPool(items, uploadOne, 'загружено');
if (up.failures.length > 0) {
  console.error(`\nОШИБКИ загрузки (${up.failures.length}):`);
  for (const f of up.failures.slice(0, 10)) console.error('  -', f);
  console.error('Карта НЕ обновлена — она отражала бы несуществующие файлы.');
  process.exit(1);
}

console.log('\n3/3 обновление audio_url_map_gaps.json…');
const gaps = fs.existsSync(GAPS_JSON) ? JSON.parse(fs.readFileSync(GAPS_JSON, 'utf8')) : {};
const before = Object.keys(gaps).length;
for (const it of items) {
  const objName = objectName(it.id, it.source);
  gaps[it.id] = {
    url: versionedPublicUrl(objName, it.text),
    source: it.source,
    text: it.text,
  };
}
fs.writeFileSync(GAPS_JSON, JSON.stringify(gaps, null, 1));
console.log(`   записей: ${before} → ${Object.keys(gaps).length}`);

console.log('\nГОТОВО. Дальше пересобери рантайм-карту:');
console.log('  node .codex-tmp/tts-voicing/build_map_ts.mjs');
console.log('  node scripts/compact_audio_url_maps.mjs');
