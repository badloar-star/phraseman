#!/usr/bin/env node
/**
 * revoice_all_phrases_echo.mjs — ПОЛНАЯ переозвучка корпуса фраз новым голосом.
 *
 * зачем: владелец забраковал голос fable и выбрал echo (подача «спокойный,
 * темп 0.92»). Надо переозвучить ВСЕ 4888 фраз и слов приложения.
 *
 * Чем отличается от regen_phrase_audio_storage.mjs: тот — «лекарь», он трогает
 * только фразы, где ТЕКСТ разошёлся с озвучкой (флаг AUDIO_SAYS_OLD), и
 * намеренно поёт тем же голосом, что и корпус. Здесь задача обратная: текст
 * не меняется вообще, меняется ГОЛОС — и потому переозвучивается всё подряд.
 * Боевой «лекарь» не трогаем: он продолжит лечить дрейф текста.
 *
 * Почему безопасно для живых пользователей: mp3 заливаются под ТЕМИ ЖЕ именами
 * объектов, что и сейчас. Storage перезаписывает файл по месту — старая озвучка
 * физически исчезает (владелец просил «старую удалять»), URL не меняется, и
 * установленные сборки продолжают работать без обновления. Окна, когда фразы
 * отваливаются в робота expo-speech, не возникает.
 *
 * Отличия по темпу: одиночные слова и глаголы читаются медленнее (0.90) — на
 * обычной скорости одно слово проскакивает за полсекунды и его не разобрать.
 *
 * Громкость выравнивается (loudnorm I=-16). В корпусе сейчас разброс до 20 dB,
 * из-за чего часть фраз в приложении звучит заметно тише прочих.
 *
 * Безопасность:
 *   - По умолчанию dry-run: печатает план, не тратит и не пишет.
 *   - --apply выполняет; трата OpenAI требует PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1,
 *     заливка — PHRASEMAN_ALLOW_UPLOAD=1 и токен Firebase.
 *   - Резерв: перед первой записью копирует карты в audio_url_map.backup-*.json.
 *   - Прогресс пишется в revoice_progress.json — прогон можно продолжить
 *     после обрыва, уже залитое не переозвучивается заново.
 *
 * Запуск:
 *   node scripts/revoice_all_phrases_echo.mjs                    # план
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 PHRASEMAN_ALLOW_UPLOAD=1 \
 *     node scripts/revoice_all_phrases_echo.mjs --apply
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

const pexec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const MAP_JSON = path.join(TTS_DIR, 'audio_url_map.json');
const GAPS_JSON = path.join(TTS_DIR, 'audio_url_map_gaps.json');
const WORK_DIR = path.join(TTS_DIR, 'revoice_echo');
const PROGRESS = path.join(TTS_DIR, 'revoice_progress.json');
const NULL = os.platform() === 'win32' ? 'NUL' : '/dev/null';

const APPLY = process.argv.includes('--apply');
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='));
  return a ? Number(a.split('=')[1]) : 0;
})();
const ONLY_SOURCE = (() => {
  const a = process.argv.find((x) => x.startsWith('--source='));
  return a ? a.split('=')[1] : '';
})();

// ── выбранная владельцем озвучка ────────────────────────────────────────────
const VOICE = 'echo';
const MODEL = 'gpt-4o-mini-tts';
const SPEED_PHRASE = 0.92;
const SPEED_WORD = 0.90;
// Разделы, где озвучивается одно слово, а не предложение.
const WORD_SOURCES = new Set(['word', 'verb']);

const INSTRUCTIONS = [
  'Read short English phrases for a language learner.',
  'Calm and steady, slightly slower than conversational, with clean articulation.',
  'Keep the tone even and grounded — no brightness, no theatrics.',
].join(' ');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PREFIX = 'phrase-audio';
const CONCURRENCY = 4;

function publicUrl(objName) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objName)}?alt=media`;
}
function versionedPublicUrl(objName, text) {
  const version = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${publicUrl(objName)}&v=${version}`;
}
function objectName(id, source) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${PREFIX}/${source}/${safe}.mp3`;
}

// ── 1) корпус ───────────────────────────────────────────────────────────────
function loadCorpus() {
  const items = [];
  for (const file of [MAP_JSON, GAPS_JSON]) {
    if (!fs.existsSync(file)) continue;
    const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [id, rec] of Object.entries(obj)) {
      if (!rec || typeof rec.text !== 'string' || !rec.text.trim()) continue;
      items.push({ id, text: rec.text.trim(), source: rec.source || 'unknown', mapFile: file });
    }
  }
  return items;
}

let corpus = loadCorpus();
if (ONLY_SOURCE) corpus = corpus.filter((c) => c.source === ONLY_SOURCE);

const progress = fs.existsSync(PROGRESS)
  ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8'))
  : { done: [], voice: VOICE };
const doneSet = new Set(progress.voice === VOICE ? progress.done : []);

let plan = corpus.filter((c) => !doneSet.has(c.id));
if (LIMIT > 0) plan = plan.slice(0, LIMIT);

const chars = plan.reduce((s, p) => s + p.text.length, 0);
const bySource = {};
for (const p of plan) bySource[p.source] = (bySource[p.source] || 0) + 1;

console.log(`Голос: ${VOICE} · модель: ${MODEL}`);
console.log(`Темп: фразы ${SPEED_PHRASE}, слова/глаголы ${SPEED_WORD}`);
console.log(`Корпус: ${corpus.length} · уже сделано: ${doneSet.size} · к работе: ${plan.length}`);
console.log(`Символов: ${chars} (~$${(chars * 12 / 1e6).toFixed(2)})`);
console.log('По разделам:', bySource);

if (!APPLY) {
  console.log('\nDry-run. Ничего не потрачено и не записано.');
  console.log('Запуск: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 PHRASEMAN_ALLOW_UPLOAD=1 node scripts/revoice_all_phrases_echo.mjs --apply');
  process.exit(0);
}
if (plan.length === 0) {
  console.log('\nНечего делать — всё уже переозвучено.');
  process.exit(0);
}

// ── 2) защита от случайной траты + доступы ──────────────────────────────────
if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
  console.error('\nНужен PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 — это платный вызов OpenAI.');
  process.exit(2);
}
const KEY = requireOpenAiTtsKey(ROOT);

const uploadEnabled = process.env.PHRASEMAN_ALLOW_UPLOAD === '1';
let token = process.env.FB_TOKEN || '';
if (uploadEnabled && !token) {
  const r = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'fb_token.mjs')], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
  });
  token = (r.stdout || '').trim();
}
if (uploadEnabled && !token) {
  console.error('Заливка запрошена, но нет токена Firebase.');
  process.exit(2);
}
if (!uploadEnabled) console.log('\nPHRASEMAN_ALLOW_UPLOAD != 1 — сгенерирую локально, но НЕ залью.');

// Резервная копия карт: тексты фраз существуют только здесь, потерять нельзя.
if (uploadEnabled) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  for (const file of [MAP_JSON, GAPS_JSON]) {
    if (!fs.existsSync(file)) continue;
    const backup = file.replace(/\.json$/, `.backup-${stamp}.json`);
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(file, backup);
      console.log(`Резерв: ${path.relative(ROOT, backup)}`);
    }
  }
}

fs.mkdirSync(WORK_DIR, { recursive: true });

// ── 3) синтез + выравнивание громкости + заливка ────────────────────────────
async function ttsOnce(text, speed) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, voice: VOICE, input: text,
      instructions: INSTRUCTIONS, response_format: 'mp3', speed,
    }),
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}: ${(await res.text()).slice(0, 140)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loudnorm(inFile, outFile) {
  await pexec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', inFile,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:a', 'libmp3lame', '-b:a', '128k', outFile,
  ]);
}

async function maxDb(file) {
  let stderr = '';
  try {
    const r = await pexec('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', NULL]);
    stderr = r.stderr || '';
  } catch (e) { stderr = (e && e.stderr) || ''; }
  const ms = [...stderr.matchAll(/max_volume:\s*(-?[\d.]+) dB/g)].map((m) => parseFloat(m[1]));
  return ms.length ? ms[ms.length - 1] : null;
}

async function uploadOne(objName, buf) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(objName)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public,max-age=31536000,immutable',
        },
        body: buf,
      });
      if (r.status === 429 || r.status >= 500) throw new Error('retryable ' + r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 140)}`);
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((res) => setTimeout(res, 600 * attempt));
    }
  }
}

const patched = new Map();
function loadMapObj(file) {
  if (!patched.has(file)) {
    patched.set(file, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
  }
  return patched.get(file);
}

let ok = 0, failed = 0, processed = 0;
const failures = [];
const started = Date.now();

function flushProgress() {
  fs.writeFileSync(PROGRESS, JSON.stringify({ voice: VOICE, done: [...doneSet] }), 'utf8');
  for (const [file, obj] of patched) fs.writeFileSync(file, JSON.stringify(obj, null, 0));
}

async function handle(item) {
  const speed = WORD_SOURCES.has(item.source) ? SPEED_WORD : SPEED_PHRASE;
  const dir = path.join(WORK_DIR, item.source);
  fs.mkdirSync(dir, { recursive: true });
  const raw = path.join(dir, `${item.id}.raw.mp3`);
  const final = path.join(dir, `${item.id}.mp3`);

  let audible = false;
  for (let attempt = 1; attempt <= 4 && !audible; attempt++) {
    try {
      fs.writeFileSync(raw, await ttsOnce(item.text, speed));
      await loudnorm(raw, final);
      const max = await maxDb(final);
      if (max != null && max > -30) audible = true;
      else await new Promise((r) => setTimeout(r, 400 * attempt));
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  fs.rmSync(raw, { force: true });
  if (!audible) throw new Error('тихий клип после ретраев');

  if (uploadEnabled) {
    const objName = objectName(item.id, item.source);
    await uploadOne(objName, fs.readFileSync(final));
    const mapObj = loadMapObj(item.mapFile);
    const prev = mapObj[item.id] || {};
    // Текст НЕ меняем — меняется только голос; url пересчитываем тем же способом.
    mapObj[item.id] = { ...prev, url: versionedPublicUrl(objName, item.text), source: item.source, text: item.text };
    doneSet.add(item.id);
  }
}

const queue = [...plan];
async function worker() {
  while (queue.length) {
    const item = queue.shift();
    try {
      await handle(item);
      ok += 1;
    } catch (e) {
      failed += 1;
      failures.push(`${item.source}/${item.id}: ${e.message}`);
    }
    processed += 1;
    if (processed % 25 === 0) {
      const rate = processed / ((Date.now() - started) / 1000);
      const left = Math.round((plan.length - processed) / Math.max(rate, 0.01) / 60);
      process.stdout.write(`\r  ${processed}/${plan.length} · ошибок ${failed} · осталось ~${left} мин   `);
      flushProgress();
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flushProgress();

console.log(`\n\n${'─'.repeat(58)}`);
console.log(`ГОТОВО: ${ok} переозвучено, ${failed} с ошибкой.`);
if (failures.length) {
  console.log('Первые ошибки:');
  for (const f of failures.slice(0, 15)) console.log(`  ${f}`);
}

// ── 4) пересборка рантайм-карты ─────────────────────────────────────────────
if (uploadEnabled && ok > 0) {
  const rebuild = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'build_map_ts.mjs')], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
  });
  process.stdout.write(rebuild.stdout || '');
  if (rebuild.status !== 0) console.error(rebuild.stderr || 'build_map_ts failed');
  console.log('\nДальше: прогнать audit_phrase_audio_sync.mjs и закоммитить карту.');
}

process.exit(failed > 0 ? 1 : 0);
