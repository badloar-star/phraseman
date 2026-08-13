import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sampleRate = 44100;
const twoPi = Math.PI * 2;

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function env(t, duration, attack = 0.015, release = 0.12, curve = 1.4) {
  if (t < 0 || t > duration) return 0;
  const a = attack <= 0 ? 1 : clamp(t / attack, 0, 1);
  const r = release <= 0 ? 1 : clamp((duration - t) / release, 0, 1);
  return Math.pow(Math.min(a, r), curve);
}

function addTone(buffer, {
  start = 0,
  duration,
  freq,
  amp = 0.2,
  harmonics = [1],
  harmonicAmps = [1],
  attack = 0.015,
  release = 0.12,
  decay = 0,
  vibrato = 0,
  vibratoRate = 5,
}) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(buffer.length, Math.floor((start + duration) * sampleRate));
  for (let i = startIndex; i < endIndex; i++) {
    const localT = i / sampleRate - start;
    const vib = vibrato ? 1 + Math.sin(twoPi * vibratoRate * localT) * vibrato : 1;
    const e = env(localT, duration, attack, release) * (decay ? Math.exp(-decay * localT) : 1);
    let s = 0;
    for (let h = 0; h < harmonics.length; h++) {
      s += Math.sin(twoPi * freq * harmonics[h] * vib * localT) * (harmonicAmps[h] ?? 0);
    }
    buffer[i] += s * amp * e;
  }
}

function addBell(buffer, start, note, amp = 0.24, duration = 0.8) {
  const freq = typeof note === 'number' && note < 140 ? midi(note) : note;
  addTone(buffer, {
    start,
    duration,
    freq,
    amp,
    harmonics: [1, 2.01, 3.98, 6.02],
    harmonicAmps: [1, 0.45, 0.22, 0.1],
    attack: 0.004,
    release: Math.min(0.5, duration * 0.65),
    decay: 2.8,
  });
}

function addHarp(buffer, start, note, amp = 0.2, duration = 0.6) {
  const freq = typeof note === 'number' && note < 140 ? midi(note) : note;
  addTone(buffer, {
    start,
    duration,
    freq,
    amp,
    harmonics: [1, 2, 3, 4, 5],
    harmonicAmps: [1, 0.5, 0.28, 0.14, 0.07],
    attack: 0.003,
    release: Math.min(0.34, duration * 0.6),
    decay: 4.1,
  });
}

function addString(buffer, start, note, amp = 0.18, duration = 1.2) {
  const freq = typeof note === 'number' && note < 140 ? midi(note) : note;
  addTone(buffer, {
    start,
    duration,
    freq,
    amp,
    harmonics: [1, 2, 3],
    harmonicAmps: [1, 0.35, 0.14],
    attack: 0.12,
    release: 0.36,
    vibrato: 0.004,
    vibratoRate: 4.8,
  });
}

function addHorn(buffer, start, note, amp = 0.18, duration = 1.1) {
  const freq = typeof note === 'number' && note < 140 ? midi(note) : note;
  addTone(buffer, {
    start,
    duration,
    freq,
    amp,
    harmonics: [1, 2, 3],
    harmonicAmps: [1, 0.28, 0.09],
    attack: 0.08,
    release: 0.24,
    vibrato: 0.002,
    vibratoRate: 5.5,
  });
}

function addLowPulse(buffer, start, amp = 0.28, duration = 0.35) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(buffer.length, Math.floor((start + duration) * sampleRate));
  const rnd = makeRandom(91 + Math.floor(start * 1000));
  for (let i = startIndex; i < endIndex; i++) {
    const t = i / sampleRate - start;
    const drop = 92 - 45 * (t / duration);
    const body = Math.sin(twoPi * drop * t);
    const click = (rnd() * 2 - 1) * Math.exp(-70 * t);
    buffer[i] += (body * 0.82 + click * 0.18) * amp * Math.exp(-7 * t);
  }
}

function addShimmer(buffer, start, duration, amp = 0.08, seed = 7) {
  const rnd = makeRandom(seed);
  const count = Math.max(8, Math.floor(duration * 18));
  for (let i = 0; i < count; i++) {
    const t = start + rnd() * duration;
    const note = 84 + Math.floor(rnd() * 24);
    addBell(buffer, t, note, amp * (0.55 + rnd() * 0.45), 0.18 + rnd() * 0.28);
  }
}

function motif(buffer, start, amp = 0.22, notes = [72, 79, 76]) {
  addBell(buffer, start, notes[0], amp, 0.65);
  addHarp(buffer, start + 0.17, notes[1], amp * 0.82, 0.58);
  addBell(buffer, start + 0.36, notes[2], amp * 0.9, 0.75);
}

function addWarmChord(buffer, start, notes, amp = 0.13, duration = 1.2) {
  notes.forEach((note, index) => {
    addString(buffer, start + index * 0.018, note, amp, duration);
  });
}

function normalize(buffer) {
  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0.94 ? 0.94 / peak : 1;
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = clamp(buffer[i] * gain, -1, 1);
  }
}

function writeWav(filePath, samples) {
  normalize(samples);
  const bytesPerSample = 2;
  const dataBytes = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.round(clamp(samples[i], -1, 1) * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

const sounds = [
  ['assets/sounds/ui/answer_correct.wav', 0.24, b => {
    addHarp(b, 0.015, 84, 0.22, 0.2);
    addBell(b, 0.055, 91, 0.14, 0.18);
  }],
  ['assets/sounds/ui/answer_wrong.wav', 0.34, b => {
    addTone(b, { start: 0.02, duration: 0.28, freq: midi(55), amp: 0.16, harmonics: [1, 2], harmonicAmps: [1, 0.25], attack: 0.03, release: 0.15 });
    addTone(b, { start: 0.08, duration: 0.22, freq: midi(52), amp: 0.12, harmonics: [1, 2], harmonicAmps: [1, 0.2], attack: 0.02, release: 0.14 });
  }],
  ['assets/sounds/ui/pack_card_reveal.wav', 0.38, b => {
    addHarp(b, 0.02, 79, 0.18, 0.22);
    addBell(b, 0.08, 91, 0.11, 0.2);
    addShimmer(b, 0.05, 0.25, 0.025, 22);
  }],
  ['assets/sounds/reward/achievement_unlocked.wav', 1.16, b => {
    motif(b, 0.02, 0.22, [76, 83, 88]);
    addWarmChord(b, 0.25, [60, 64, 67], 0.12, 0.8);
    addShimmer(b, 0.18, 0.68, 0.045, 31);
  }],
  ['assets/sounds/reward/shards_earned_small.wav', 0.54, b => {
    addBell(b, 0.02, 88, 0.18, 0.36);
    addBell(b, 0.11, 95, 0.12, 0.34);
    addShimmer(b, 0.08, 0.32, 0.028, 41);
  }],
  ['assets/sounds/reward/shards_earned_medium.wav', 0.84, b => {
    [84, 88, 91, 96].forEach((n, i) => addHarp(b, 0.03 + i * 0.08, n, 0.15, 0.42));
    addBell(b, 0.34, 100, 0.12, 0.4);
    addShimmer(b, 0.12, 0.55, 0.035, 42);
  }],
  ['assets/sounds/reward/shards_earned_large.wav', 1.28, b => {
    [76, 83, 88, 91, 95].forEach((n, i) => addHarp(b, 0.04 + i * 0.09, n, 0.16, 0.55));
    addWarmChord(b, 0.36, [60, 64, 67], 0.08, 0.78);
    addShimmer(b, 0.18, 0.85, 0.045, 43);
  }],
  ['assets/sounds/reward/lesson_completed.wav', 1.54, b => {
    motif(b, 0.04, 0.18, [72, 79, 84]);
    addWarmChord(b, 0.28, [55, 60, 64, 67], 0.12, 1.05);
    addHarp(b, 0.8, 88, 0.1, 0.45);
  }],
  ['assets/sounds/ceremony/level_up.wav', 2.24, b => {
    motif(b, 0.08, 0.22, [72, 79, 84]);
    addWarmChord(b, 0.35, [48, 55, 60, 64, 67], 0.13, 1.55);
    addHorn(b, 0.72, 55, 0.12, 1.1);
    addShimmer(b, 0.32, 1.35, 0.045, 51);
  }],
  ['assets/sounds/ceremony/premium_activated.wav', 4.24, b => {
    addWarmChord(b, 0.05, [48, 55, 60, 64], 0.1, 3.4);
    motif(b, 0.28, 0.2, [72, 79, 84]);
    addHorn(b, 1.02, 55, 0.15, 1.9);
    addHorn(b, 1.35, 60, 0.12, 1.6);
    addBell(b, 2.7, 91, 0.16, 0.8);
    addShimmer(b, 1.2, 2.4, 0.035, 61);
  }],
  ['assets/sounds/ceremony/theme_gold_unlocked.wav', 2.84, b => {
    addWarmChord(b, 0.12, [52, 59, 64, 67], 0.12, 2.0);
    [76, 83, 88, 95].forEach((n, i) => addBell(b, 0.22 + i * 0.22, n, 0.16, 0.72));
    addHorn(b, 1.1, 59, 0.12, 1.05);
    addShimmer(b, 0.45, 1.8, 0.048, 71);
  }],
  ['assets/sounds/ceremony/league_chest_open.wav', 2.44, b => {
    addLowPulse(b, 0.04, 0.18, 0.28);
    [60, 67, 72, 76, 79].forEach((n, i) => addHarp(b, 0.2 + i * 0.09, n, 0.14, 0.62));
    addWarmChord(b, 0.62, [48, 55, 60, 64], 0.11, 1.35);
    addShimmer(b, 0.55, 1.5, 0.04, 72);
  }],
];

for (const [relativePath, duration, build] of sounds) {
  const buffer = new Float64Array(Math.ceil(duration * sampleRate));
  build(buffer);
  const out = path.join(root, relativePath);
  writeWav(out, buffer);
  console.log(`generated ${relativePath}`);
}
