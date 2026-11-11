#!/usr/bin/env node
/**
 * Перезапись 12 реплик сцен знакомства при первом запуске голосами курса.
 *
 * зачем (владелец 11.11.2026, ночь: знакомство «говорит прежним голосом» → «Перезаписать новыми»; приёмка —
 * «Дам послушать»): реплики сцен (components/onboarding_aha/aha_scenes.ts) звучат файлами из сборки и подсвечиваются
 * по словам. Поэтому вместе с записью нужны новые времена слов — берём их у ElevenLabs (запись с разметкой).
 * Скрипт пишет ТОЛЬКО в output/course-voice/onboarding/ — на слух владельцу. Файлы сборки и времена слов в сценах
 * он не трогает: замена в приложении — отдельным шагом после слов владельца «чисто».
 *
 *   ALLOW_PAID_AUDIO=1 node scripts/generate_onboarding_voice_elevenlabs.mjs [--dry-run]
 */
import { requireAllowPaidAudio } from './paid_audio_guard.mjs'; requireAllowPaidAudio('generate_onboarding_voice_elevenlabs.mjs'); // зачем: платная озвучка запрещена без ALLOW_PAID_AUDIO=1 (владелец 05.11)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';

const TAG = '[ONBOARDING-VOICE]';
const OUT_DIR = path.resolve('output/course-voice/onboarding');
const SCENES_FILE = path.resolve('components/onboarding_aha/aha_scenes.ts');
const PICKS_FILE = path.resolve('docs/work/mockups/voices-2026-11-11/picks.json');
const API = 'https://api.elevenlabs.io';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128'; // зачем: эти 12 файлов лежат в сборке и звучат первыми в жизни приложения — качество как у прежних
// те же настройки и тот же признак брака, что у озвучки курса (scripts/generate_course_voice_elevenlabs.mjs)
const VOICE_SETTINGS = Object.freeze({ stability: 0.75, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 0.9 });
const QA_HEAD_MAX_DB = -35;
const QA_MIN_MAX_DB = -55;
const QA_TRIES = 4;
const DRY_RUN = process.argv.includes('--dry-run');

function loadKey() {
  // зачем: в окружении этого ПК лежит ключ другого кабинета — берём только файл, который владелец дал для этой задачи
  const file = path.resolve('.env.elevenlabs.local');
  if (!fs.existsSync(file)) throw new Error(`${TAG} нет файла ключа ${file}`);
  const match = fs.readFileSync(file, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m);
  if (!match) throw new Error(`${TAG} в ${file} нет строки ELEVENLABS_API_KEY=`);
  return match[1].trim();
}

/** Реплики сцен в порядке файла: у каждой сцены сначала hear (собеседник), затем say (ответ). */
function loadLines() {
  const source = fs.readFileSync(SCENES_FILE, 'utf8');
  const lines = [];
  const sceneRe = /^ {2}(\w+): \{\s*\n\s*id: '(\w+)'/gm;
  const starts = [...source.matchAll(sceneRe)].map((m) => ({ id: m[2], at: m.index }));
  starts.forEach((scene, index) => {
    const body = source.slice(scene.at, starts[index + 1]?.at ?? source.length);
    for (const [part, suffix] of [['hear', 'a'], ['say', 'b']]) {
      const match = body.match(new RegExp(`\\b${part}: \\{\\s*\\n\\s*text: (['"])(.*?)\\1,`));
      if (!match) throw new Error(`${TAG} в сцене ${scene.id} не найдена реплика ${part}`);
      lines.push({ scene: scene.id, part, file: `${scene.id}_${suffix}`, text: match[2] });
    }
  });
  if (lines.length !== 12) throw new Error(`${TAG} ожидалось 12 реплик, найдено ${lines.length}`);
  return lines;
}

function measure(bytes) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], { input: bytes, maxBuffer: 1 << 26 });
  if (result.error) throw new Error(`${TAG} ffmpeg не запустился: ${result.error.message}`);
  const pcm = new Int16Array(result.stdout.buffer, result.stdout.byteOffset, result.stdout.length >> 1);
  const levels = [];
  for (let i = 0; i + 320 <= pcm.length; i += 320) {
    let sum = 0;
    for (let j = 0; j < 320; j += 1) sum += pcm[i + j] * pcm[i + j];
    levels.push(10 * Math.log10(sum / 320 / (32768 * 32768) + 1e-12));
  }
  if (levels.length < 3) return null;
  const head = Math.min(levels[0], levels[1]);
  const min = Math.min(...levels);
  return { head, min, durationMs: Math.round((pcm.length / 16000) * 1000), clean: head <= QA_HEAD_MAX_DB && min <= QA_MIN_MAX_DB };
}

/** Времена слов из посимвольной разметки: слово = кусок текста между пробелами, как в timings сцен. */
function wordTimings(text, alignment) {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (chars.join('') !== text) throw new Error(`${TAG} разметка не совпала с текстом: «${chars.join('')}» ≠ «${text}»`);
  const out = [];
  let index = 0;
  for (const word of text.split(' ')) {
    const from = index;
    const to = index + word.length - 1;
    out.push({ word, startMs: Math.round(starts[from] * 1000), endMs: Math.round(ends[to] * 1000) });
    index += word.length + 1;
  }
  return out;
}

async function record(key, line) {
  let best = null;
  for (let take = 1; take <= QA_TRIES; take += 1) {
    const response = await fetch(`${API}/v1/text-to-speech/${line.voiceId}/with-timestamps?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: line.text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`${TAG} ${line.file}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    const body = await response.json();
    const bytes = Buffer.from(body.audio_base64, 'base64');
    const quality = measure(bytes);
    const score = quality ? Math.max(quality.head - QA_HEAD_MAX_DB, quality.min - QA_MIN_MAX_DB) : Infinity;
    if (!best || score < best.score) best = { bytes, quality, score, take, alignment: body.alignment };
    if (quality?.clean) break;
  }
  return best;
}

async function main() {
  const picks = JSON.parse(fs.readFileSync(PICKS_FILE, 'utf8')).en;
  if (!Array.isArray(picks) || picks.length < 2) throw new Error(`${TAG} в ${PICKS_FILE} нужно минимум два английских голоса`);
  const lines = loadLines().map((line) => {
    // зачем: в сцене два человека — собеседник и ответ; голос собеседника берётся из хэша сцены, ответ — следующим
    // голосом по кругу, чтобы два участника никогда не звучали одним голосом
    const base = parseInt(crypto.createHash('sha256').update(`onboarding\n${line.scene}`).digest('hex').slice(0, 8), 16) % picks.length;
    const voice = picks[(base + (line.part === 'say' ? 1 : 0)) % picks.length];
    return { ...line, voiceId: voice.id, voiceName: voice.name };
  });
  const chars = lines.reduce((sum, line) => sum + line.text.length, 0);
  console.log(`${TAG} реплик: ${lines.length}, символов: ${chars}, dryRun=${DRY_RUN}`);
  for (const line of lines) console.log(`${TAG} ${line.file} · ${line.voiceName} · «${line.text}»`);
  if (DRY_RUN) return;

  const key = loadKey();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  for (const line of lines) {
    const best = await record(key, line);
    fs.writeFileSync(path.join(OUT_DIR, `${line.file}.mp3`), best.bytes);
    const timings = wordTimings(line.text, best.alignment);
    report.push({ file: line.file, scene: line.scene, part: line.part, text: line.text, voiceName: line.voiceName, takes: best.take, clean: !!best.quality?.clean, durationMs: best.quality?.durationMs ?? null, timings });
    console.log(`${TAG} записано ${line.file}: дублей ${best.take}, чисто=${!!best.quality?.clean}, длительность ${best.quality?.durationMs} мс`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'timings.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(OUT_DIR, 'data.js'), `window.ONBOARDING_VOICE = ${JSON.stringify(report.map((r) => [r.file, r.text, r.voiceName, r.clean, r.scene, r.part]))};\n`);
  console.log(`${TAG} готово: ${report.length} файлов в ${OUT_DIR}, под подозрением: ${report.filter((r) => !r.clean).length}`);
}

main().catch((error) => { console.error(`${TAG} аварийный выход: ${error?.stack || error}`); process.exit(1); });
