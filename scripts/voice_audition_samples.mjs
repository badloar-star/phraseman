// ════════════════════════════════════════════════════════════════════════════
// voice_audition_samples.mjs — «прослушка» голосов OpenAI перед переозвучкой.
//
// зачем: владелец забраковал текущий голос фраз (fable, модель tts-1-hd) и
// хочет заменить озвучку всех 4888 фраз/слов приложения. Переозвучивать такой
// объём «вслепую» нельзя — если голос не подойдёт, работа повторяется целиком.
// Поэтому сначала генерируем одни и те же эталонные фразы КАЖДЫМ голосом на
// новой модели, владелец слушает и выбирает ушами, и только потом идёт масс-прогон.
//
// Фразы взяты реальные — из разных разделов приложения (слово, урок, идиома,
// вопрос, длинная фраза), чтобы слышать голос на том материале, который в
// приложении и звучит, а не на нейтральном тексте.
//
// Запуск:
//   node scripts/voice_audition_samples.mjs            # все голоса
//   node scripts/voice_audition_samples.mjs ash coral  # только указанные
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, '.codex-tmp', 'voice-audition');

// gpt-4o-mini-tts — актуальная модель; tts-1-hd (нынешняя у фраз) устарела и
// заметно беднее по интонации. Цена ниже, качество выше.
const MODEL = 'gpt-4o-mini-tts';

const ALL_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo',
  'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse',
];

// Инструкция голосу: ровный дикторский тон для учебного материала.
// Без этого модель склонна «играть», что для повторяющихся упражнений утомляет.
const INSTRUCTIONS = [
  'You are voicing short English phrases for a language-learning app.',
  'Speak clearly and naturally at a slightly measured pace, with neutral warmth.',
  'Do not dramatize, do not add emotion beyond the sentence itself.',
  'Pronounce every word distinctly — learners repeat after you.',
].join(' ');

// Реальные строки из приложения: слово, короткая учебная фраза, вопрос,
// идиома и длинное предложение — весь диапазон, который придётся озвучивать.
const SAMPLES = [
  { id: '1_word', text: 'available' },
  { id: '2_lesson', text: 'I am not from here.' },
  { id: '3_question', text: 'Excuse me, do you speak English?' },
  { id: '4_idiom', text: 'a blessing in disguise' },
  { id: '5_long', text: 'The second hotel is more expensive than the first.' },
];

function selectedVoices() {
  const asked = process.argv.slice(2).map((v) => v.toLowerCase());
  if (asked.length === 0) return ALL_VOICES;
  const unknown = asked.filter((v) => !ALL_VOICES.includes(v));
  if (unknown.length > 0) {
    throw new Error(`Неизвестные голоса: ${unknown.join(', ')}. Доступны: ${ALL_VOICES.join(', ')}`);
  }
  return asked;
}

async function synthesize(apiKey, voice, text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`TTS ${voice} → HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const apiKey = requireOpenAiTtsKey(ROOT);
  const voices = selectedVoices();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const totalChars = SAMPLES.reduce((sum, s) => sum + s.text.length, 0) * voices.length;
  console.log(`Голосов: ${voices.length} × фраз: ${SAMPLES.length} = ${voices.length * SAMPLES.length} файлов`);
  console.log(`Символов: ${totalChars} (~$${(totalChars * 12 / 1e6).toFixed(4)})`);
  console.log(`Папка: ${path.relative(ROOT, OUT_DIR)}\n`);

  const failures = [];

  for (const voice of voices) {
    const voiceDir = path.join(OUT_DIR, voice);
    fs.mkdirSync(voiceDir, { recursive: true });

    for (const sample of SAMPLES) {
      const target = path.join(voiceDir, `${sample.id}.mp3`);
      try {
        const audio = await synthesize(apiKey, voice, sample.text);
        fs.writeFileSync(target, audio);
        process.stdout.write(`  ${voice}/${sample.id}.mp3  ${(audio.length / 1024).toFixed(0)} КБ\n`);
      } catch (error) {
        failures.push(`${voice}/${sample.id}: ${error.message}`);
        process.stdout.write(`  ${voice}/${sample.id}  ОШИБКА\n`);
      }
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'README.txt'),
    [
      'Демо-сэмплы голосов OpenAI для переозвучки фраз приложения.',
      `Модель: ${MODEL}`,
      '',
      'Файлы в каждой папке голоса:',
      ...SAMPLES.map((s) => `  ${s.id}.mp3 — "${s.text}"`),
      '',
      'Текущий голос приложения — fable (для сравнения он тоже сгенерирован).',
    ].join('\n'),
    'utf8',
  );

  console.log(`\nГотово. Файлов: ${voices.length * SAMPLES.length - failures.length}`);
  if (failures.length > 0) {
    console.log(`Ошибок: ${failures.length}`);
    for (const f of failures) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
