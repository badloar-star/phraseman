/**
 * Пробы голосов владельца: одна короткая фраза на каждом языке голоса → mp3 + data.js для макета прослушивания.
 *
 * зачем (владелец 11.11): «посмотрим красивые голоса мои созданные и ты сгенерируешь примеры … на всех языках,
 * сделаешь мне макет; когда одобрю — выберем, что озвучить». Это ТОЛЬКО пробы (≈6 тыс. символов), не озвучка разделов.
 *
 * Запуск возобновляемый: готовый mp3 не перегенерируется. Ключ — ELEVENLABS_API_KEY из .env.elevenlabs.local.
 *   ALLOW_PAID_AUDIO=1 node scripts/generate_voice_audition_elevenlabs.mjs [--dry-run]
 */
import { requireAllowPaidAudio } from './paid_audio_guard.mjs'; requireAllowPaidAudio('generate_voice_audition_elevenlabs.mjs'); // зачем: платная озвучка запрещена без ALLOW_PAID_AUDIO=1 (владелец 05.11)
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const TAG = '[VOICE-AUDITION]';
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = path.resolve('docs/work/mockups/voices-2026-11-11');
const AUDIO_DIR = path.join(OUT_DIR, 'audio');
const MODEL_ID = 'eleven_multilingual_v2';
const SPEED = 0.9;
const CONCURRENCY = 3;
const API = 'https://api.elevenlabs.io';

const PHRASES = Object.freeze({
  en: 'Hello! Nice to meet you. I would like a cup of coffee, please.',
  es: '¡Hola! Mucho gusto. Quisiera una taza de café, por favor.',
  de: 'Hallo! Freut mich. Ich hätte gern eine Tasse Kaffee, bitte.',
  fr: "Bonjour ! Enchanté. Je voudrais une tasse de café, s'il vous plaît.",
  it: 'Ciao! Piacere. Vorrei una tazza di caffè, per favore.',
  ru: 'Привет! Приятно познакомиться. Сегодня учимся заказывать кофе.',
});

// зачем: у голосов-«учителей» метка языка одна (ru), а задуманы они на два языка — русское объяснение + фраза курса.
// Голоса без метки языка разнесены по названию, которое дал владелец.
const LANG_OVERRIDES = Object.freeze({
  hCaquEt6XTZkyhitt1eA: ['ru', 'it'], lEO6LK8RUTg5CBFkSneR: ['ru', 'it'], qHLfSs2uv0gvL06zdEg1: ['ru', 'it'], XJk4hLSOh68ENrF08ds5: ['ru', 'it'],
  p6OO0VqvaKXKtqxlC7zo: ['ru', 'es'], sY8FdhiAeGgUJjX1DNb7: ['ru', 'es'],
  MVBysEfrfdIo072iGL9r: ['ru', 'fr'], n7DVgxY2U3cYylE7pTcG: ['ru', 'fr'],
  QDl4VCj768MZ9Rmuf307: ['ru', 'en'],
  sYm6l7naj8sQzyIZ5ve7: ['ru', 'de'], '19ee4BoFTaUMwencWYa3': ['ru', 'de'], tYzoKwO6U4F5i7SXVLe2: ['ru', 'de'],
  '7IzD0NdVYZHSSeHMnews': ['en'], lq3s8hISsqZYjEcXeoMf: ['en'], PVLsARhYaNC7VAng8wyJ: ['en'],
  Lxa3qPX751ziQkJzKCgY: ['ru'],
  jKmEdN38rgRGOP3FKdW1: ['en'],
});

function loadKey() {
  // зачем: в окружении машины уже лежит ELEVENLABS_API_KEY ДРУГОГО аккаунта (11.11: пробы ушли не в тот кабинет —
  // 30 чужих голосов вместо 61 своего). Файл с ключом, который владелец дал для этой задачи, главнее окружения.
  const file = path.resolve('.env.elevenlabs.local');
  if (fs.existsSync(file)) {
    const match = fs.readFileSync(file, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (match) { console.log(`${TAG} ключ: из .env.elevenlabs.local`); return match[1].trim(); }
    console.warn(`${TAG} в ${file} нет строки ELEVENLABS_API_KEY= — беру ключ из окружения`);
  }
  const fromEnv = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!fromEnv) throw new Error(`${TAG} нет ключа: ни ${file}, ни ELEVENLABS_API_KEY`);
  console.log(`${TAG} ключ: из окружения`);
  return fromEnv;
}

async function api(key, url, init = {}) {
  const started = Date.now();
  const response = await fetch(API + url, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${TAG} ${init.method || 'GET'} ${url} → HTTP ${response.status} за ${Date.now() - started} мс: ${body}`);
  }
  return response;
}

async function listOwnVoices(key) {
  const voices = [];
  let token = '';
  for (;;) {
    const page = await (await api(key, `/v2/voices?category=generated&page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ''}`)).json();
    voices.push(...page.voices);
    if (!page.has_more) break;
    token = page.next_page_token;
  }
  // зачем: владелец просил именно «мои созданные» — фильтр стоит в самом запросе: общий список на второй странице
  // отдавал другой порядок и терял половину голосов (11.11: 30 из 61).
  return voices.filter((voice) => voice.category === 'generated');
}

function langsFor(voice) {
  const override = LANG_OVERRIDES[voice.voice_id];
  if (override) return override;
  const label = (voice.labels || {}).language;
  return PHRASES[label] ? [label] : ['en'];
}

async function synth(key, voiceId, lang, file) {
  if (fs.existsSync(file) && fs.statSync(file).size >= 1024) return 0;
  const text = PHRASES[lang];
  if (DRY_RUN) return text.length;
  const response = await api(key, `/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID, language_code: undefined, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: SPEED } }),
  });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return text.length;
}

async function main() {
  const key = loadKey();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const voices = await listOwnVoices(key);
  const jobs = voices.flatMap((voice) => langsFor(voice).map((lang) => ({ voice, lang, file: path.join(AUDIO_DIR, `${voice.voice_id}_${lang}.mp3`) })));
  console.log(`${TAG} голосов: ${voices.length}, проб: ${jobs.length}, dryRun=${DRY_RUN}`);

  let spent = 0;
  const failed = [];
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      try {
        const used = await synth(key, job.voice.voice_id, job.lang, job.file);
        spent += used; // зачем: «spent += await» теряло прибавки параллельных потоков
      } catch (error) {
        failed.push({ name: job.voice.name, lang: job.lang, reason: String(error.message || error) });
        console.error(`${TAG} ОТКАЗ ${job.voice.name} / ${job.lang}: ${error.message || error}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const data = voices.map((voice) => ({
    id: voice.voice_id,
    name: voice.name.trim(),
    description: (voice.description || '').trim(),
    created: voice.created_at_unix ? new Date(voice.created_at_unix * 1000).toISOString().slice(0, 10) : '',
    langs: langsFor(voice).filter((lang) => fs.existsSync(path.join(AUDIO_DIR, `${voice.voice_id}_${lang}.mp3`))),
  }));
  if (!DRY_RUN) fs.writeFileSync(path.join(OUT_DIR, 'data.js'), `window.AUDITION = ${JSON.stringify({ model: MODEL_ID, speed: SPEED, phrases: PHRASES, voices: data }, null, 1)};\n`);
  console.log(`${TAG} готово: потрачено символов ≈ ${spent}, отказов: ${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => { console.error(`${TAG} аварийный выход: ${error.stack || error}`); process.exit(1); });
