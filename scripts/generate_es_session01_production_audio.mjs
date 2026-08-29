/**
 * Generates the 24 real mp3 files (6 Spanish transcripts x 4 voices) needed
 * for the mode-native rewrite of es_episode_01_session_01, matching the exact
 * schema course_session_audio_child_v1.ts enforces (SHA-256 contentHash, not
 * MD5 — that schema requires /^[a-f0-9]{64}$/, the old generate_audio.mjs's
 * md5 output would fail HASH_RE immediately).
 *
 * зачем model=gpt-4o-mini-tts, не tts-1-hd (владелец, 2026-08-27, вторая
 * генерация после жалобы «звучит совсем не то, что написано»): /v1/audio/
 * speech не имеет параметра "язык" вообще — произношение модель определяет
 * ТОЛЬКО по input-тексту. Короткие слова без диакритики (es, soy, verdad)
 * не давали модели ни одного явного испанского сигнала и звучали как
 * английские/неоднозначные. tts-1-hd не поддерживает никакого способа это
 * поправить, не меняя сам input (а input — это то, что реально записывается
 * и должно звучать как ответ ученику, менять нельзя). gpt-4o-mini-tts —
 * единственная модель того же эндпоинта, поддерживающая instructions:
 * произносимый текст (input) остаётся БУКВАЛЬНО тем же словом/фразой,
 * instructions только задаёт акцент/язык/темп модели поверх него.
 *
 * зачем темп задан СЛОВАМИ в instructions, а не отдельным API-параметром
 * speed (владелец, 2026-08-27, прямое указание): у /v1/audio/speech есть
 * числовой speed (0.25–4.0), но для gpt-4o-mini-tts естественнее и точнее
 * управлять темпом тем же текстовым instructions, что и акцентом — модель
 * гибче реагирует на словесное описание темпа, чем на жёсткий множитель.
 * Прошлая генерация вообще не задавала темп (по умолчанию — быстро и
 * невнятно), отсюда жалоба владельца.
 *
 * Run: OPENAI_TTS_API_KEY=sk-... node scripts/generate_es_session01_production_audio.mjs
 * (PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 required — see openai-dev-guard.mjs)
 *
 * Output: assets/audio/learning-v2/es-session1-production-v1/<transcript-slug>-<voice>.mp3
 * Then prints the entries array ready to paste into
 * app/learning_v2_es_session1_production_audio_v1.ts (written by hand after,
 * mirroring learning_v2_session1_production_audio_v1.ts's exact shape).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

const API_KEY = requireOpenAiTtsKey(process.cwd());
const MODEL = 'gpt-4o-mini-tts';
const INSTRUCTIONS =
  'Speak in clear, neutral Latin American Spanish (es-419/es-MX), the way a ' +
  'patient language teacher pronounces a single vocabulary word or short ' +
  'phrase for a beginner. Never read the text as English or any other ' +
  'language. Speak noticeably slower than normal conversational pace — ' +
  'deliberate and unhurried, with every syllable clearly separated, as if ' +
  'reading it for someone hearing the word for the very first time.';
const VOICES = ['ash', 'onyx', 'nova', 'coral'];
const OUTPUT_DIR = path.resolve('assets/audio/learning-v2/es-session1-production-v1');

// Every distinct transcript the ES session01 mode-native payload references:
// 4 words (es, soy, fácil, verdad) + 2 phrases (Es fácil, Es verdad).
// zachем: exact set matches ES_EPISODE_01_SESSION_01_VOCABULARY_V1 targets
// and the two phrases kept in es_episode_01_session_01_v1.ts.
const TRANSCRIPTS = ['es', 'soy', 'fácil', 'verdad', 'Es fácil', 'Es verdad'];

function slug(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const jobs = [];
for (const transcript of TRANSCRIPTS) {
  for (const voice of VOICES) {
    jobs.push({ transcript, voice, filename: `${slug(transcript)}-${voice}.mp3` });
  }
}

const totalChars = jobs.reduce((s, j) => s + j.transcript.length, 0);
const estimatedCost = (totalChars / 1000) * 0.030;
console.log(`Jobs: ${jobs.length} (${TRANSCRIPTS.length} transcripts x ${VOICES.length} voices)`);
console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);
requireOpenAiDevSpendGuard({
  action: 'OpenAI TTS generation for ES session01 mode-native audio',
  estimatedCostUsd: estimatedCost,
  units: jobs.length,
});

async function generateOne(job) {
  const filepath = path.join(OUTPUT_DIR, job.filename);
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice: job.voice,
      input: job.transcript,
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  return { ...job, byteSize: buffer.length, contentHash };
}

const results = [];
for (const job of jobs) {
  const result = await generateOne(job);
  results.push(result);
  console.log(`OK ${job.filename} (${result.byteSize}B, sha256=${result.contentHash.slice(0, 16)}...)`);
}

console.log('\n=== ENTRIES for es_episode_01_session_01_production_audio_v1.ts ===\n');
for (const r of results) {
  console.log(
    `  { transcript: ${JSON.stringify(r.transcript)}, voiceId: "${r.voice}", contentHash: "${r.contentHash}", byteSize: ${r.byteSize}, assetModule: require("../assets/audio/learning-v2/es-session1-production-v1/${r.filename}") },`,
  );
}
