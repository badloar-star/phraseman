/**
 * gen_ui_sounds.cjs — оффлайн-генератор ВРЕМЕННЫХ UI-звуков FeedbackKit.
 *
 * Спек feedback-kit.md §3: покупной студийный пак вставляется дроп-ином (замена
 * файлов по фиксированным именам), а до тех пор /build не должен блокироваться —
 * этот скрипт синтезирует те же слои (FM-колокола + реверб + мягкий клип), что
 * в макете, и пишет WAV прямо в assets/audio/ui/.
 *
 * ЧИСТЫЙ Node: НОЛЬ зависимостей (ни ffmpeg, ни npm-пакетов). Только осцилляторы,
 * one-pole фильтры, экспоненциальные огибающие и примитивная реверб-имитация
 * (несколько затухающих задержанных копий) + мягкий tanh-клип.
 *
 * Формат: WAV PCM 16-bit mono. Основной sample rate 22050 Гц; гроза рендерится
 * на пониженном рейте (см. THUNDER_SR) ради размера — суммарно ≤2.5 МБ.
 *
 * Запуск: node scripts/gen_ui_sounds.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SR = 22050;            // базовый sample rate
const THUNDER_SR = 16000;   // гроза/раскаты — ниже рейт (экономия размера, звук низкочастотный)
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'ui');

// ─── Буфер сэмплов (моно, float −1..1) ────────────────────────────────────────
class Signal {
  constructor(durationSec, sr = SR) {
    this.sr = sr;
    this.n = Math.max(1, Math.round(durationSec * sr));
    this.data = new Float64Array(this.n);
  }
  // Добавить значение в сэмпл i (с защитой границ).
  add(i, v) {
    if (i >= 0 && i < this.n) this.data[i] += v;
  }
  get(i) {
    return i >= 0 && i < this.n ? this.data[i] : 0;
  }
}

// ─── Огибающие ────────────────────────────────────────────────────────────────
// Экспоненциальный «pluck»: мгновенная атака, экспоненциальный хвост.
function envExp(t, decaySec) {
  return Math.exp(-t / decaySec);
}
// Атака+спад (AD): линейный подъём, экспоненциальный спад.
function envAD(t, attackSec, decaySec) {
  if (t < attackSec) return t / attackSec;
  return Math.exp(-(t - attackSec) / decaySec);
}

// ─── Осцилляторы ──────────────────────────────────────────────────────────────
function sine(phase) {
  return Math.sin(phase);
}

// FM-колокол: несущая + модулятор (соотношение ratio), индекс падает с огибающей.
// Даёт «колокольно-металлический» тон, как в макете (FM-bell).
function fmBell(sig, startSec, durSec, freq, opts = {}) {
  const {
    ratio = 1.4,        // соотношение модулятора к несущей (нецелое → колокольность)
    index = 3.2,        // глубина модуляции в старте
    decay = 0.5,        // спад амплитуды
    modDecay = 0.35,    // спад индекса модуляции
    gain = 0.9,
    attack = 0.002,
  } = opts;
  const start = Math.round(startSec * sig.sr);
  const nn = Math.round(durSec * sig.sr);
  const wc = (2 * Math.PI * freq) / sig.sr;
  const wm = wc * ratio;
  for (let k = 0; k < nn; k++) {
    const t = k / sig.sr;
    const amp = envAD(t, attack, decay);
    if (amp < 0.0002) break;
    const modIndex = index * Math.exp(-t / modDecay);
    const sample = Math.sin(wc * k + modIndex * Math.sin(wm * k));
    sig.add(start + k, sample * amp * gain);
  }
}

// Чистый затухающий синус (для суб-баса/низов).
function tone(sig, startSec, durSec, freq, opts = {}) {
  const { decay = 0.4, gain = 0.5, attack = 0.003, freqEnd = null } = opts;
  const start = Math.round(startSec * sig.sr);
  const nn = Math.round(durSec * sig.sr);
  let phase = 0;
  for (let k = 0; k < nn; k++) {
    const t = k / sig.sr;
    const amp = envAD(t, attack, decay);
    if (amp < 0.0002 && t > attack) break;
    const f = freqEnd == null ? freq : freq + (freqEnd - freq) * (t / durSec);
    phase += (2 * Math.PI * f) / sig.sr;
    sig.add(start + k, sine(phase) * amp * gain);
  }
}

// ─── Шум + one-pole фильтры ───────────────────────────────────────────────────
// Детерминированный PRNG (mulberry32) — стабильный результат между прогонами.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let tt = Math.imul(a ^ (a >>> 15), 1 | a);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}

// Отфильтрованный шум с огибающей. lp/hp — коэффициенты one-pole (0..1).
function noiseBurst(sig, startSec, durSec, opts = {}) {
  const {
    gain = 0.4,
    attack = 0.004,
    decay = 0.2,
    lp = 0.35,       // one-pole lowpass (доля нового сэмпла); меньше = глуше
    hp = 0.0,        // one-pole highpass (0 = выкл)
    seed = 12345,
  } = opts;
  const rng = makeRng(seed);
  const start = Math.round(startSec * sig.sr);
  const nn = Math.round(durSec * sig.sr);
  let lpState = 0;
  let hpPrevIn = 0;
  let hpPrevOut = 0;
  for (let k = 0; k < nn; k++) {
    const t = k / sig.sr;
    const amp = envAD(t, attack, decay);
    if (amp < 0.0002 && t > attack) break;
    let s = rng() * 2 - 1;
    // lowpass
    lpState += lp * (s - lpState);
    s = lpState;
    // highpass (one-pole)
    if (hp > 0) {
      const out = hp * (hpPrevOut + s - hpPrevIn);
      hpPrevIn = s;
      hpPrevOut = out;
      s = out;
    }
    sig.add(start + k, s * amp * gain);
  }
}

// ─── Реверб-имитация: несколько затухающих задержанных копий ──────────────────
function applyReverb(sig, opts = {}) {
  const {
    taps = [0.037, 0.061, 0.089, 0.127], // задержки в секундах
    decay = 0.45,                        // множитель первой копии
    falloff = 0.6,                       // ослабление каждой следующей копии
    mix = 0.5,
  } = opts;
  const dry = Float64Array.from(sig.data);
  for (let ti = 0; ti < taps.length; ti++) {
    const delay = Math.round(taps[ti] * sig.sr);
    const g = decay * Math.pow(falloff, ti) * mix;
    for (let i = sig.n - 1; i >= delay; i--) {
      sig.data[i] += dry[i - delay] * g;
    }
  }
}

// ─── Мягкий клиппер (tanh) + нормализация ─────────────────────────────────────
function softClip(sig, drive = 1.0) {
  for (let i = 0; i < sig.n; i++) {
    sig.data[i] = Math.tanh(sig.data[i] * drive);
  }
}

function normalize(sig, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < sig.n; i++) {
    const a = Math.abs(sig.data[i]);
    if (a > max) max = a;
  }
  if (max < 1e-6) return;
  const g = peak / max;
  for (let i = 0; i < sig.n; i++) sig.data[i] *= g;
}

// Короткий фейд по краям — убирает щелчки на старте/стопе.
function edgeFade(sig, ms = 4) {
  const f = Math.max(1, Math.round((ms / 1000) * sig.sr));
  for (let i = 0; i < f && i < sig.n; i++) {
    const g = i / f;
    sig.data[i] *= g;
    sig.data[sig.n - 1 - i] *= g;
  }
}

// ─── WAV-энкодер (PCM 16-bit mono) ────────────────────────────────────────────
function encodeWav(sig) {
  const bytesPerSample = 2;
  const dataLen = sig.n * bytesPerSample;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);          // PCM chunk size
  buf.writeUInt16LE(1, 20);           // audio format = PCM
  buf.writeUInt16LE(1, 22);           // mono
  buf.writeUInt32LE(sig.sr, 24);
  buf.writeUInt32LE(sig.sr * bytesPerSample, 28); // byte rate
  buf.writeUInt16LE(bytesPerSample, 32);          // block align
  buf.writeUInt16LE(16, 34);          // bits per sample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataLen, 40);
  let off = 44;
  for (let i = 0; i < sig.n; i++) {
    let v = sig.data[i];
    if (v > 1) v = 1;
    else if (v < -1) v = -1;
    buf.writeInt16LE(Math.round(v * 32767), off);
    off += 2;
  }
  return buf;
}

function finish(sig, { clip = 1.0, peak = 0.9, fade = 4 } = {}) {
  if (clip) softClip(sig, clip);
  normalize(sig, peak);
  edgeFade(sig, fade);
  return sig;
}

// ─── Определения звуков ───────────────────────────────────────────────────────
// Пентатоника C5..C7 для лесенки (11 нот) и звёзд.
const NOTE = {
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0,
  C7: 2093.0,
};
const LADDER_FREQS = [
  NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5,
  NOTE.C6, NOTE.D6, NOTE.E6, NOTE.G6, NOTE.A6, NOTE.C7,
];

function genTap() {
  const s = new Signal(0.05);
  // очень короткий высокий клик
  tone(s, 0, 0.04, 1800, { decay: 0.012, gain: 0.6, attack: 0.001 });
  noiseBurst(s, 0, 0.02, { gain: 0.15, decay: 0.01, lp: 0.6, seed: 7 });
  return finish(s, { clip: 1.1, peak: 0.7, fade: 2 });
}

function genPop() {
  const s = new Signal(0.08);
  // «плитка легла»: короткий бендящий тон + мягкий щелчок
  tone(s, 0, 0.06, 420, { freqEnd: 620, decay: 0.05, gain: 0.5, attack: 0.002 });
  noiseBurst(s, 0, 0.02, { gain: 0.12, decay: 0.012, lp: 0.4, seed: 21 });
  return finish(s, { clip: 1.1, peak: 0.85, fade: 3 });
}

function genCorrect() {
  const s = new Signal(0.62);
  // «дин-дон»: два FM-колокола (кварта вверх), реверб-хвост
  fmBell(s, 0.0, 0.42, NOTE.E6, { ratio: 1.5, index: 3.0, decay: 0.28, gain: 0.85 });
  fmBell(s, 0.09, 0.5, NOTE.A6, { ratio: 1.5, index: 2.6, decay: 0.34, gain: 0.75 });
  applyReverb(s, { taps: [0.05, 0.08, 0.12, 0.17], decay: 0.4, mix: 0.5 });
  return finish(s, { clip: 1.0, peak: 0.9, fade: 6 });
}

function genWrong() {
  const s = new Signal(0.32);
  // мягкий низкий «туп»: синус 160→82Гц + чуть глухого шума, БЕЗ резкости
  tone(s, 0, 0.3, 160, { freqEnd: 82, decay: 0.16, gain: 0.7, attack: 0.006 });
  tone(s, 0, 0.28, 240, { freqEnd: 120, decay: 0.1, gain: 0.22, attack: 0.008 });
  noiseBurst(s, 0, 0.14, { gain: 0.12, decay: 0.09, lp: 0.16, seed: 33 });
  applyReverb(s, { taps: [0.04, 0.07], decay: 0.3, mix: 0.35 });
  return finish(s, { clip: 0.9, peak: 0.85, fade: 6 });
}

function genLadder(freq) {
  const s = new Signal(0.5);
  fmBell(s, 0, 0.4, freq, { ratio: 1.5, index: 2.6, decay: 0.3, gain: 0.85 });
  applyReverb(s, { taps: [0.05, 0.09, 0.14], decay: 0.35, mix: 0.42 });
  return finish(s, { clip: 1.0, peak: 0.9, fade: 5 });
}

function genSpark() {
  const s = new Signal(0.42);
  // стеклянное арпеджио: три быстрые высокие ноты
  fmBell(s, 0.0, 0.22, NOTE.C6, { ratio: 2.0, index: 2.4, decay: 0.16, gain: 0.6 });
  fmBell(s, 0.07, 0.24, NOTE.E6, { ratio: 2.0, index: 2.4, decay: 0.16, gain: 0.6 });
  fmBell(s, 0.14, 0.3, NOTE.G6, { ratio: 2.0, index: 2.2, decay: 0.2, gain: 0.65 });
  applyReverb(s, { taps: [0.04, 0.08, 0.13], decay: 0.4, mix: 0.5 });
  return finish(s, { clip: 1.0, peak: 0.88, fade: 5 });
}

function genCrack() {
  const s = new Signal(0.35);
  // резкий ближний разряд: широкополосный импульс + короткий сизл
  noiseBurst(s, 0, 0.05, { gain: 0.9, decay: 0.03, lp: 0.85, hp: 0.4, seed: 101 });
  noiseBurst(s, 0.01, 0.3, { gain: 0.4, decay: 0.16, lp: 0.55, hp: 0.2, seed: 202 });
  tone(s, 0, 0.08, 90, { decay: 0.05, gain: 0.5 }); // низовой удар
  return finish(s, { clip: 0.95, peak: 0.95, fade: 3 });
}

function genRumble(sr = THUNDER_SR) {
  const s = new Signal(1.2, sr);
  // средний раскат: фильтрованный шум с затуханием + суб
  noiseBurst(s, 0, 1.15, { gain: 0.6, attack: 0.06, decay: 0.5, lp: 0.12, seed: 303 });
  noiseBurst(s, 0.2, 0.9, { gain: 0.35, attack: 0.1, decay: 0.4, lp: 0.08, seed: 404 });
  tone(s, 0.02, 0.9, 55, { decay: 0.5, gain: 0.5, attack: 0.03 });
  applyReverb(s, { taps: [0.08, 0.15, 0.24, 0.33], decay: 0.5, mix: 0.55 });
  return finish(s, { clip: 0.85, peak: 0.9, fade: 20 });
}

function genThunder(sr = THUNDER_SR) {
  const s = new Signal(2.4, sr);
  // полный раскат: крак → сизл → 2-3 волны rumble + суб 55Гц
  noiseBurst(s, 0.0, 0.06, { gain: 0.9, decay: 0.04, lp: 0.85, hp: 0.35, seed: 501 });
  noiseBurst(s, 0.03, 0.45, { gain: 0.45, decay: 0.25, lp: 0.5, hp: 0.15, seed: 502 }); // сизл
  // волны раската
  noiseBurst(s, 0.35, 1.1, { gain: 0.55, attack: 0.08, decay: 0.5, lp: 0.12, seed: 503 });
  noiseBurst(s, 0.9, 1.2, { gain: 0.5, attack: 0.12, decay: 0.55, lp: 0.1, seed: 504 });
  noiseBurst(s, 1.5, 0.9, { gain: 0.32, attack: 0.14, decay: 0.45, lp: 0.08, seed: 505 });
  // суб-бас
  tone(s, 0.05, 1.6, 55, { decay: 0.7, gain: 0.55, attack: 0.03 });
  tone(s, 0.8, 1.4, 48, { decay: 0.6, gain: 0.4, attack: 0.05 });
  applyReverb(s, { taps: [0.09, 0.17, 0.27, 0.39], decay: 0.55, mix: 0.6 });
  return finish(s, { clip: 0.82, peak: 0.95, fade: 24 });
}

function genThunderFar(sr = THUNDER_SR) {
  const s = new Signal(1.4, sr);
  // дальняя зарница: тихий, глухой rumble без ближнего крака
  noiseBurst(s, 0, 1.3, { gain: 0.4, attack: 0.12, decay: 0.55, lp: 0.07, seed: 601 });
  tone(s, 0.05, 1.0, 52, { decay: 0.55, gain: 0.32, attack: 0.05 });
  applyReverb(s, { taps: [0.1, 0.2, 0.32], decay: 0.5, mix: 0.6 });
  return finish(s, { clip: 0.8, peak: 0.6, fade: 22 });
}

function genFizzle() {
  const s = new Signal(0.42);
  // «остывание» серии: нисходящий глайд + сизл, гаснет
  tone(s, 0, 0.38, 900, { freqEnd: 220, decay: 0.22, gain: 0.4, attack: 0.004 });
  noiseBurst(s, 0, 0.36, { gain: 0.28, decay: 0.2, lp: 0.4, hp: 0.25, seed: 701 });
  applyReverb(s, { taps: [0.05, 0.09], decay: 0.3, mix: 0.35 });
  return finish(s, { clip: 0.95, peak: 0.8, fade: 5 });
}

function genWhoosh() {
  const s = new Signal(0.32);
  // переход: bandpass-шум со свипом (быстрый проезд)
  const sr = SR;
  const rng = makeRng(808);
  const nn = Math.round(0.3 * sr);
  let bp1 = 0, bp2 = 0;
  for (let k = 0; k < nn; k++) {
    const t = k / sr;
    const amp = envAD(t, 0.08, 0.14);
    const raw = rng() * 2 - 1;
    // свип центра bandpass 400→2200Гц через переменный one-pole lowpass
    const cut = 0.06 + 0.5 * (t / 0.3);
    bp1 += cut * (raw - bp1);      // lowpass
    bp2 += 0.25 * (bp1 - bp2);     // второй полюс
    const band = bp1 - bp2;        // грубый bandpass
    s.add(k, band * amp * 0.9);
  }
  applyReverb(s, { taps: [0.03, 0.06], decay: 0.25, mix: 0.3 });
  return finish(s, { clip: 1.0, peak: 0.82, fade: 6 });
}

function genStar(freq) {
  const s = new Signal(0.7);
  fmBell(s, 0, 0.55, freq, { ratio: 1.5, index: 2.8, decay: 0.4, gain: 0.85 });
  fmBell(s, 0.0, 0.5, freq * 2, { ratio: 1.5, index: 2.0, decay: 0.3, gain: 0.28 });
  applyReverb(s, { taps: [0.06, 0.11, 0.17, 0.25], decay: 0.42, mix: 0.55 });
  return finish(s, { clip: 1.0, peak: 0.9, fade: 6 });
}

function genMedal() {
  const s = new Signal(0.82);
  // «падение медали»: два тёплых колокола с лёгким запаздыванием + суб-звон
  fmBell(s, 0.0, 0.6, NOTE.C6, { ratio: 1.5, index: 3.0, decay: 0.42, gain: 0.85 });
  fmBell(s, 0.12, 0.62, NOTE.G6, { ratio: 1.5, index: 2.6, decay: 0.44, gain: 0.7 });
  tone(s, 0.0, 0.4, NOTE.C5 / 2, { decay: 0.3, gain: 0.25, attack: 0.006 });
  applyReverb(s, { taps: [0.07, 0.13, 0.2, 0.29], decay: 0.5, mix: 0.6 });
  return finish(s, { clip: 1.0, peak: 0.92, fade: 6 });
}

function genChord() {
  const s = new Signal(1.2);
  // финальный аккорд: арпеджио из 5 колоколов (C-мажор с добавленной ноной)
  const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
  for (let i = 0; i < notes.length; i++) {
    fmBell(s, i * 0.055, 0.95 - i * 0.05, notes[i], {
      ratio: 1.5,
      index: 2.6,
      decay: 0.55 - i * 0.04,
      gain: 0.62,
    });
  }
  applyReverb(s, { taps: [0.08, 0.15, 0.24, 0.35, 0.47], decay: 0.55, mix: 0.62 });
  return finish(s, { clip: 0.98, peak: 0.93, fade: 8 });
}

function genTick() {
  const s = new Signal(0.02);
  tone(s, 0, 0.016, 2400, { decay: 0.006, gain: 0.5, attack: 0.0005 });
  return finish(s, { clip: 1.1, peak: 0.55, fade: 1 });
}

// ─── Манифест: имя → генератор ────────────────────────────────────────────────
function buildManifest() {
  const items = {
    'tap.wav': genTap,
    'pop.wav': genPop,
    'correct.wav': genCorrect,
    'wrong.wav': genWrong,
    'spark.wav': genSpark,
    'crack.wav': genCrack,
    'rumble.wav': () => genRumble(),
    'thunder.wav': () => genThunder(),
    'thunder_far.wav': () => genThunderFar(),
    'fizzle.wav': genFizzle,
    'whoosh.wav': genWhoosh,
    'star_1.wav': () => genStar(1046.5),
    'star_2.wav': () => genStar(1318.51),
    'star_3.wav': () => genStar(1567.98),
    'medal.wav': genMedal,
    'chord.wav': genChord,
    'tick.wav': genTick,
  };
  // Лесенка ladder_00..ladder_10 (11 нот).
  for (let i = 0; i < LADDER_FREQS.length; i++) {
    const name = `ladder_${String(i).padStart(2, '0')}.wav`;
    const freq = LADDER_FREQS[i];
    items[name] = () => genLadder(freq);
  }
  return items;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = buildManifest();
  const names = Object.keys(manifest).sort();
  let total = 0;
  const rows = [];
  for (const name of names) {
    const sig = manifest[name]();
    const wav = encodeWav(sig);
    fs.writeFileSync(path.join(OUT_DIR, name), wav);
    total += wav.length;
    rows.push({ name, bytes: wav.length });
  }
  // Отчёт.
  const kb = (b) => (b / 1024).toFixed(1) + ' KB';
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(18)} ${kb(r.bytes).padStart(10)}`);
  }
  const mb = (total / (1024 * 1024)).toFixed(2);
  console.log(`\n  ${names.length} files, total ${mb} MB -> ${path.relative(path.join(__dirname, '..'), OUT_DIR)}`);
  if (total > 2.5 * 1024 * 1024) {
    console.error(`\n  WARNING: total ${mb} MB exceeds 2.5 MB budget (spec §3). Shorten tails / lower sample rate.`);
    process.exitCode = 1;
  }
}

main();
