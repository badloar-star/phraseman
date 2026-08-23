// ════════════════════════════════════════════════════════════════════════════
// voice_trial_echo.mjs — пробный прогон выбранного голоса на РЕАЛЬНЫХ фразах.
//
// зачем: владелец выбрал голос echo вместо забракованного fable. Прежде чем
// переозвучивать все 4888 фраз, надо услышать echo не на пяти демо-строчках, а
// на настоящем материале из всех разделов приложения — слова, уроки, квизы,
// идиомы, глаголы, флешкарты. Если подача не подойдёт, переделывать 4888 файлов
// заново дорого по времени.
//
// Второй вопрос, который закрывает прогон: ПОДАЧА. Нынешняя инструкция
// («тёплый дружелюбный учитель, слегка медленно») могла быть частью проблемы —
// возможно, дело было не только в тембре fable, но и в наигранности. Поэтому
// каждая фраза озвучивается тремя вариантами подачи, и владелец выбирает.
//
// Фразы берутся из боевых карт (audio_url_map.json + gaps) — то есть ровно те,
// что звучат в приложении.
//
// Запуск: node scripts/voice_trial_echo.mjs [--count=50]
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const OUT_DIR = path.join(ROOT, '.codex-tmp', 'voice-trial-echo');

const VOICE = 'echo';
const MODEL = 'gpt-4o-mini-tts';

// Три подачи одного голоса. Различаются темпом и степенью «учительности».
const STYLES = [
  {
    id: 'A_neutral',
    label: 'Ровный диктор',
    speed: 1.0,
    instructions: [
      'Read short English phrases for a language-learning app.',
      'Neutral, clear, unhurried. Natural sentence intonation, nothing performed.',
      'Every word distinct — learners repeat after you.',
    ].join(' '),
  },
  {
    id: 'B_teacher',
    label: 'Учитель (как сейчас)',
    speed: 0.95,
    instructions: [
      'Speak as a warm, friendly English teacher. Clear, natural English.',
      'Calm, encouraging pace, slightly slow so a learner can follow every word.',
      'Friendly, not robotic.',
    ].join(' '),
  },
  {
    id: 'C_calm_slow',
    label: 'Спокойный, чуть медленнее',
    speed: 0.92,
    instructions: [
      'Read short English phrases for a language learner.',
      'Calm and steady, slightly slower than conversational, with clean articulation.',
      'Keep the tone even and grounded — no brightness, no theatrics.',
    ].join(' '),
  },
];

// Берём по нескольку фраз из каждого раздела: голос должен звучать хорошо и на
// одном слове, и на длинном предложении с вопросительной интонацией.
const PER_SOURCE = 6;

function loadCorpus() {
  const rows = [];
  for (const file of ['audio_url_map.json', 'audio_url_map_gaps.json']) {
    const full = path.join(TTS_DIR, file);
    if (!fs.existsSync(full)) continue;
    const obj = JSON.parse(fs.readFileSync(full, 'utf8'));
    for (const [id, rec] of Object.entries(obj)) {
      if (rec && typeof rec.text === 'string' && rec.text.trim()) {
        rows.push({ id, text: rec.text.trim(), source: rec.source || 'unknown' });
      }
    }
  }
  return rows;
}

function pickSample(rows, perSource) {
  const bySource = new Map();
  for (const row of rows) {
    if (!bySource.has(row.source)) bySource.set(row.source, []);
    bySource.get(row.source).push(row);
  }

  const picked = [];
  for (const [source, list] of [...bySource.entries()].sort()) {
    // Берём короткую, среднюю и длинную — детерминированно, без random,
    // чтобы повторный прогон дал тот же набор и его можно было сравнивать.
    const sorted = [...list].sort((a, b) => a.text.length - b.text.length || a.id.localeCompare(b.id));
    const step = Math.max(1, Math.floor(sorted.length / perSource));
    for (let i = 0, taken = 0; i < sorted.length && taken < perSource; i += step, taken += 1) {
      picked.push({ ...sorted[i], source });
    }
  }
  return picked;
}

async function tts(apiKey, text, style) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      instructions: style.instructions,
      response_format: 'mp3',
      speed: style.speed,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Выравнивание громкости — те же настройки, что пойдут в масс-прогон.
// Без него разные фразы звучат заметно разной громкостью прямо в приложении.
function normalize(inFile, outFile) {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', inFile,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:a', 'libmp3lame', '-b:a', '128k', outFile,
  ], { encoding: 'utf8' });
  return r.status === 0;
}

function meanVolume(file) {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(r.stderr || '');
  return m ? parseFloat(m[1]) : null;
}

async function main() {
  const apiKey = requireOpenAiTtsKey(ROOT);

  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const perSource = countArg ? Math.max(1, Math.ceil(Number(countArg.split('=')[1]) / 9)) : PER_SOURCE;

  const corpus = loadCorpus();
  if (corpus.length === 0) throw new Error('Корпус пуст — нет audio_url_map.json');

  const picked = pickSample(corpus, perSource);
  const totalFiles = picked.length * STYLES.length;
  const chars = picked.reduce((s, p) => s + p.text.length, 0) * STYLES.length;

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Голос: ${VOICE} · модель: ${MODEL}`);
  console.log(`Фраз: ${picked.length} × подач: ${STYLES.length} = ${totalFiles} файлов`);
  console.log(`Символов: ${chars} (~$${(chars * 12 / 1e6).toFixed(3)})\n`);

  const manifest = [];
  let done = 0;
  const failures = [];

  for (const style of STYLES) {
    const dir = path.join(OUT_DIR, style.id);
    fs.mkdirSync(dir, { recursive: true });

    for (const item of picked) {
      const raw = path.join(dir, `${item.id}.raw.mp3`);
      const final = path.join(dir, `${item.id}.mp3`);
      try {
        fs.writeFileSync(raw, await tts(apiKey, item.text, style));
        if (!normalize(raw, final)) throw new Error('ffmpeg loudnorm failed');
        fs.rmSync(raw, { force: true });

        const vol = meanVolume(final);
        if (vol !== null && vol < -60) throw new Error(`подозрительно тихо: ${vol} dB`);

        manifest.push({ style: style.id, id: item.id, source: item.source, text: item.text });
        done += 1;
        process.stdout.write(`\r  ${done}/${totalFiles}`);
      } catch (error) {
        failures.push(`${style.id}/${item.id}: ${error.message}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ voice: VOICE, model: MODEL, styles: STYLES, items: manifest }, null, 2),
    'utf8',
  );

  console.log(`\n\nГотово: ${done} файлов в ${path.relative(ROOT, OUT_DIR)}`);
  if (failures.length) {
    console.log(`Ошибок: ${failures.length}`);
    for (const f of failures.slice(0, 10)) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
