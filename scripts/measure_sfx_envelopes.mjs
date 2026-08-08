// зачем: владелец хочет анимации, повторяющие форму звуковой волны.
// Читаем PCM каждого WAV, считаем огибающую (RMS по окнам) + характеристики
// атаки/спада/пиков — это станет входными данными для таймингов анимаций.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2];
const OUT = process.argv[3];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.toLowerCase().endsWith('.wav')) out.push(p);
  }
  return out;
}

function parseWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let pos = 12;
  let fmt = null;
  let dataOffset = -1;
  let dataLength = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, buf.length - body);
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || dataOffset < 0) throw new Error('missing fmt/data chunk');
  return { fmt, dataOffset, dataLength };
}

// Читаем сэмплы как моно float [-1..1]
function readMono({ fmt, dataOffset, dataLength }, buf) {
  const { channels, bitsPerSample, audioFormat } = fmt;
  const bytesPerSample = bitsPerSample / 8;
  const frameBytes = bytesPerSample * channels;
  const frames = Math.floor(dataLength / frameBytes);
  const mono = new Float32Array(frames);

  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const o = dataOffset + f * frameBytes + c * bytesPerSample;
      let v = 0;
      if (audioFormat === 3 && bitsPerSample === 32) v = buf.readFloatLE(o);
      else if (bitsPerSample === 16) v = buf.readInt16LE(o) / 32768;
      else if (bitsPerSample === 24) {
        const raw = buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
        v = (raw & 0x800000 ? raw - 0x1000000 : raw) / 8388608;
      } else if (bitsPerSample === 32) v = buf.readInt32LE(o) / 2147483648;
      else if (bitsPerSample === 8) v = (buf[o] - 128) / 128;
      sum += v;
    }
    mono[f] = sum / channels;
  }
  return mono;
}

const BUCKETS = 64; // разрешение огибающей для анимации

function analyze(file) {
  const buf = readFileSync(file);
  const meta = parseWav(buf);
  const mono = readMono(meta, buf);
  const sr = meta.fmt.sampleRate;
  const frames = mono.length;
  const durationMs = Math.round((frames / sr) * 1000);

  // пиковая амплитуда и true-ish peak
  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(mono[i]));

  // Огибающая: RMS по BUCKETS окнам
  const env = new Array(BUCKETS).fill(0);
  const per = frames / BUCKETS;
  for (let b = 0; b < BUCKETS; b++) {
    const s = Math.floor(b * per);
    const e = Math.max(s + 1, Math.floor((b + 1) * per));
    let acc = 0;
    let n = 0;
    for (let i = s; i < e && i < frames; i++) { acc += mono[i] * mono[i]; n++; }
    env[b] = n ? Math.sqrt(acc / n) : 0;
  }
  const envMax = Math.max(...env, 1e-9);
  const envNorm = env.map((v) => +(v / envMax).toFixed(4));

  // Характеристики огибающей
  const peakBucket = envNorm.indexOf(Math.max(...envNorm));
  const attackMs = Math.round((peakBucket / BUCKETS) * durationMs);

  // Спад: с какого момента огибающая окончательно ниже 10%
  let tailBucket = BUCKETS - 1;
  while (tailBucket > peakBucket && envNorm[tailBucket] < 0.1) tailBucket--;
  const releaseMs = durationMs - Math.round(((tailBucket + 1) / BUCKETS) * durationMs);

  // Полезная длительность (обрезаем тишину в конце) — для таймингов анимации
  const effectiveMs = Math.round(((tailBucket + 1) / BUCKETS) * durationMs);

  // Локальные пики огибающей — сколько "ударов" в звуке
  const hits = [];
  for (let b = 1; b < BUCKETS - 1; b++) {
    if (envNorm[b] > 0.28 && envNorm[b] >= envNorm[b - 1] && envNorm[b] > envNorm[b + 1]) {
      const t = Math.round((b / BUCKETS) * durationMs);
      if (!hits.length || t - hits[hits.length - 1].tMs > 45) {
        hits.push({ tMs: t, level: envNorm[b] });
      }
    }
  }

  // Спектральный центроид (яркость) по грубому DFT на нескольких окнах —
  // определяет "холодный/тёплый" характер => палитру анимации
  const brightness = estimateBrightness(mono, sr);

  // Классификация формы: perc (резкий удар), swell (нарастание), sustain, multi
  const shape = classify(envNorm, hits, peakBucket);

  return {
    file,
    sampleRate: sr,
    channels: meta.fmt.channels,
    bitsPerSample: meta.fmt.bitsPerSample,
    durationMs,
    effectiveMs,
    attackMs,
    releaseMs,
    peak: +peak.toFixed(4),
    peakDbfs: +(20 * Math.log10(Math.max(peak, 1e-9))).toFixed(2),
    hits,
    hitCount: hits.length,
    brightness,
    shape,
    envelope: envNorm,
  };
}

function estimateBrightness(mono, sr) {
  // грубая оценка: доля высокочастотной энергии через разностный сигнал
  let lowE = 0;
  let highE = 0;
  let prev = 0;
  let lp = 0;
  const a = 0.15; // однополюсный ФНЧ
  for (let i = 0; i < mono.length; i++) {
    const x = mono[i];
    lp = lp + a * (x - lp);
    const hp = x - lp;
    lowE += lp * lp;
    highE += hp * hp;
    prev = x;
  }
  const total = lowE + highE || 1e-9;
  return +(highE / total).toFixed(4);
}

function classify(env, hits, peakBucket) {
  const n = env.length;
  const early = peakBucket / n;
  if (hits.length >= 4) return 'multi';       // серия ударов -> каскад/стагger
  if (hits.length === 3) return 'triple';
  if (hits.length === 2) return 'double';
  if (early <= 0.12) return 'perc';           // мгновенная атака -> pop/impact
  if (early >= 0.45) return 'swell';          // нарастание -> rise/bloom
  return 'sustain';                            // плавный -> glow/breathe
}

const files = walk(ROOT);
const results = [];
const errors = [];
for (const f of files) {
  try {
    const r = analyze(f);
    r.file = relative(ROOT, f).replace(/\\/g, '/');
    results.push(r);
  } catch (e) {
    errors.push({ file: relative(ROOT, f), error: String(e.message) });
  }
}

results.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(OUT, JSON.stringify({ analyzedAt: 'static', count: results.length, errors, results }, null, 2));

console.log(`analyzed=${results.length} errors=${errors.length}`);
for (const r of results) {
  console.log(
    `${r.file.padEnd(46)} ${String(r.durationMs).padStart(5)}ms eff=${String(r.effectiveMs).padStart(5)} atk=${String(r.attackMs).padStart(4)} hits=${String(r.hitCount).padStart(2)} peak=${String(r.peakDbfs).padStart(7)}dB bright=${r.brightness.toFixed(2)} ${r.shape}`
  );
}
for (const e of errors) console.log('ERR', e.file, e.error);
