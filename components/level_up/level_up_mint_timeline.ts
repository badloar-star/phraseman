// ─── Церемония повышения уровня «Монетный двор» · таймлайн ───────────────────
// зачем (владелец 2026-09-24, решение D49, PM-077): из трёх HTML-прототипов выбран
// вариант B «Монетный двор». Эталон — docs/design/level-up-animation/variant-b.html,
// его объект TIMELINE перенесён сюда 1:1 (миллисекунды, кривые, ключевые кадры).
// Модуль ЧИСТЫЙ: ни React, ни Reanimated — только числа. Функции помечены 'worklet',
// чтобы Reanimated вызывал их на UI-потоке раз в кадр, и их же гоняет jest.
//
// Правило для правок: меняешь тайминг здесь — поменяй и эталонный HTML (или наоборот),
// иначе владелец утверждал одно, а в приложении другое.

/** Кубическая кривая Безье как в CSS: cubic-bezier(x1, y1, x2, y2). */
export type Bezier = readonly [number, number, number, number];

export type MintSoundCue = 'drop' | 'riser' | 'flip' | 'mint' | 'shimmer';

type Step = Readonly<{ at: number; dur: number }>;
type EasedStep = Readonly<{ at: number; dur: number; ease: Bezier }>;

/** Полная версия. Все величины длины — в долях диаметра монеты (подстраиваются под экран). */
export const MINT_TIMELINE = {
  /** Длина мастер-часов: кнопка + хвост, после которого часы стоят. */
  total: 3500,
  /** 1. Экран уходит в темноту. */
  fade: { at: 0, dur: 320, ease: [0.4, 0, 0.2, 1] },
  /** 1б. Щель пресса разгорается и гаснет к концу подъёма. */
  slit: { at: 120, dur: 820, ease: [0.42, 0, 0.58, 1] },
  /**
   * 2. Монета выходит из щели: быстрый старт, мягкое торможение, перелёт на 80% и посадка.
   * Смещение центра монеты от линии пола (минус = выше), в диаметрах: 170/-194/-180 px при 220 px.
   */
  rise: {
    at: 260,
    dur: 620,
    from: 0.773,
    over: -0.882,
    to: -0.818,
    overAt: 0.8,
    easeUp: [0.15, 0.7, 0.2, 1],
    easeSettle: [0.4, 0, 0.6, 1],
  },
  /** 3. Короткий «вдох»: кивок на 4° и подъём на 3 px (в диаметрах). */
  breathe: { at: 880, dur: 220, ease: [0.45, 0, 0.55, 1], tiltDeg: 4, lift: -0.0136 },
  /** 4. Один тяжёлый оборот: медленно срывается, быстро проходит ребро, жёстко садится; наезд до 1.08. */
  flip: { at: 1080, dur: 700, ease: [0.75, 0, 0.18, 1], degrees: 180, zoom: 1.08 },
  /** 5. Чеканка: сжатие-раздутие монеты (ключевые кадры по eased-прогрессу). */
  land: { at: 1780, dur: 520, ease: [0.22, 1, 0.36, 1] },
  /** 5б. Тёплая вспышка. */
  flash: { at: 1780, dur: 560, ease: [0.4, 0, 0.2, 1] },
  /** 5в. Удар камеры, амплитуда в px (не в диаметрах: это «толчок экрана», а не сцены). */
  shake: { at: 1780, dur: 260, ease: [0.36, 0.07, 0.19, 0.97] },
  /** 5г. Ударная волна: кольцо 0.55 → 2.2. */
  ring: { at: 1780, dur: 700, ease: [0.16, 1, 0.3, 1] },
  /** 5д. Пятно тёплого света на полу. */
  pool: { at: 1780, dur: 600, ease: [0.22, 1, 0.36, 1] },
  /** 5е. Тёплый ореол за монетой. */
  halo: { at: 1780, dur: 900, ease: [0.22, 1, 0.36, 1] },
  /** 5ж. Искры металла: старт с разбросом до 60 мс, длительность 520–980 мс. */
  sparks: { at: 1780, jitter: 60, minDur: 520, maxDur: 980, count: 22, spread: 0.864, ease: [0.2, 0.8, 0.3, 1] },
  /** 6. Название нового уровня (масштаб 0.92 → 1). */
  title: { at: 2080, dur: 480, ease: [0.2, 1, 0.3, 1] },
  /** 6б. Строка «Уровень N». */
  sub: { at: 2200, dur: 420, ease: [0.23, 1, 0.32, 1] },
  /** 7. Кнопка «Продолжить»: с этого момента её можно нажать. */
  button: { at: 2780, dur: 400, ease: [0.23, 1, 0.32, 1] },
  /** 8. Парение после чеканки (бесконечное, отдельный гардированный таймер). */
  idle: { at: 2300, halfPeriod: 1700, amp: -0.018 },
  /** Во сколько раз ускоряется досмотр по тапу. */
  skipRate: 6,
  /** Метки для будущей озвучки (владелец добавит звуки сам). */
  cues: [
    { at: 0, cue: 'drop' },
    { at: 260, cue: 'riser' },
    { at: 1400, cue: 'flip' },
    { at: 1790, cue: 'mint' },
    { at: 2080, cue: 'shimmer' },
  ],
} as const;

/** Короткая версия для «Уменьшения движения»: затемнение → смена монеты кроссфейдом → название. */
export const MINT_TIMELINE_REDUCED = {
  total: 1900,
  fade: { at: 0, dur: 300, ease: [0.4, 0, 0.2, 1] },
  cross: { at: 400, dur: 500, ease: [0.42, 0, 0.58, 1] },
  title: { at: 950, dur: 350, ease: [0.23, 1, 0.32, 1] },
  sub: { at: 1050, dur: 350, ease: [0.23, 1, 0.32, 1] },
  button: { at: 1450, dur: 300, ease: [0.23, 1, 0.32, 1] },
  cues: [
    { at: 0, cue: 'drop' },
    { at: 650, cue: 'mint' },
    { at: 950, cue: 'shimmer' },
  ],
} as const;

export function mintTotalMs(reduced: boolean): number {
  'worklet';
  return reduced ? MINT_TIMELINE_REDUCED.total : MINT_TIMELINE.total;
}

export function mintButtonAtMs(reduced: boolean): number {
  'worklet';
  return reduced ? MINT_TIMELINE_REDUCED.button.at : MINT_TIMELINE.button.at;
}

/** Сколько миллисекунд займёт досмотр от момента t при тапе. */
export function mintSkipDurationMs(t: number, reduced: boolean): number {
  'worklet';
  const left = Math.max(0, mintTotalMs(reduced) - t);
  return left / MINT_TIMELINE.skipRate;
}

export function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * CSS cubic-bezier: по x (время) найти параметр s и вернуть y (прогресс).
 * Ньютон + бисекция как запасной путь — тот же приём, что у браузеров.
 */
export function cubicBezier(curve: Bezier, x: number): number {
  'worklet';
  const [x1, y1, x2, y2] = curve;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  let s = x;
  for (let i = 0; i < 8; i++) {
    const err = sampleX(s) - x;
    if (Math.abs(err) < 1e-5) return ((ay * s + by) * s + cy) * s;
    const d = slopeX(s);
    if (Math.abs(d) < 1e-6) break;
    s -= err / d;
  }
  let lo = 0;
  let hi = 1;
  s = x;
  for (let i = 0; i < 24; i++) {
    const v = sampleX(s);
    if (Math.abs(v - x) < 1e-5) break;
    if (v < x) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return ((ay * s + by) * s + cy) * s;
}

/** Линейный прогресс шага в момент t (0 до старта, 1 после конца). */
export function stepProgress(step: Step, t: number): number {
  'worklet';
  return clamp01((t - step.at) / step.dur);
}

/** Прогресс шага после его кривой. */
export function easedProgress(step: EasedStep, t: number): number {
  'worklet';
  return cubicBezier(step.ease, stepProgress(step, t));
}

/** Кусочно-линейная интерполяция по ключевым кадрам (offset, value) — как keyframes в WAAPI. */
export function keyframes(p: number, frames: readonly (readonly [number, number])[]): number {
  'worklet';
  if (p <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [o1, v1] = frames[i];
    const [o0, v0] = frames[i - 1];
    if (p <= o1) return v0 + (v1 - v0) * ((p - o0) / (o1 - o0));
  }
  return frames[frames.length - 1][1];
}

/** Все числа сцены в момент t. Длины — в диаметрах монеты, кроме shake (px). */
export type MintFrame = {
  /** Непрозрачность затемнённой сцены (0 → 1). */
  scene: number;
  slitGlow: number;
  /** Смещение центра монеты от линии пола, диаметры (минус = выше пола). */
  coinY: number;
  tiltDeg: number;
  /** Угол флипа 0…180. До 90 видна текущая монета, после — новая. */
  flipDeg: number;
  /** Общий масштаб монеты (наезд при флипе × сжатие при чеканке). */
  coinScale: number;
  /** Для reduce-версии: непрозрачность новой грани при кроссфейде (иначе по углу). */
  newFaceOpacity: number;
  flash: number;
  shakeX: number;
  shakeY: number;
  ringOpacity: number;
  ringScale: number;
  pool: number;
  haloOpacity: number;
  haloScale: number;
  title: number;
  sub: number;
  button: number;
};

function sampleReduced(t: number): MintFrame {
  'worklet';
  const R = MINT_TIMELINE_REDUCED;
  const cross = easedProgress(R.cross, t);
  return {
    scene: easedProgress(R.fade, t),
    slitGlow: 0,
    coinY: MINT_TIMELINE.rise.to,
    tiltDeg: 0,
    flipDeg: 0,
    coinScale: 1,
    newFaceOpacity: cross,
    flash: 0,
    shakeX: 0,
    shakeY: 0,
    ringOpacity: 0,
    ringScale: 1,
    pool: cross,
    haloOpacity: cross,
    haloScale: 1,
    title: easedProgress(R.title, t),
    sub: easedProgress(R.sub, t),
    button: easedProgress(R.button, t),
  };
}

function sampleCoinY(t: number): number {
  'worklet';
  const r = MINT_TIMELINE.rise;
  const p = stepProgress(r, t);
  if (p <= 0) return r.from;
  if (p < r.overAt) {
    return r.from + (r.over - r.from) * cubicBezier(r.easeUp, p / r.overAt);
  }
  return r.over + (r.to - r.over) * cubicBezier(r.easeSettle, (p - r.overAt) / (1 - r.overAt));
}

/**
 * Кадр сцены в момент t (мс от старта). Вызывается раз в кадр на UI-потоке.
 * reduced=true — короткая версия без движения монеты.
 */
export function sampleMintFrame(t: number, reduced: boolean): MintFrame {
  'worklet';
  if (reduced) return sampleReduced(t);
  const T = MINT_TIMELINE;

  const slitP = stepProgress(T.slit, t);
  const slitGlow = slitP <= 0 ? 0 : keyframes(cubicBezier(T.slit.ease, slitP), [[0, 0], [0.35, 1], [0.7, 0.9], [1, 0]]);

  const breatheP = easedProgress(T.breathe, t);
  const breatheK = keyframes(breatheP, [[0, 0], [0.45, 1], [1, 0]]);

  const flipP = easedProgress(T.flip, t);
  const zoom = keyframes(flipP, [[0, 1], [0.5, T.flip.zoom], [1, 1]]);

  const landP = easedProgress(T.land, t);
  const squash = keyframes(landP, [[0, 1], [0.22, 1.07], [0.6, 0.985], [1, 1]]);
  const landDrop = keyframes(landP, [[0, 0], [0.22, 0.0364], [0.6, -0.0091], [1, 0]]);

  const shakeP = easedProgress(T.shake, t);
  const ringP = easedProgress(T.ring, t);
  const haloP = easedProgress(T.halo, t);

  return {
    scene: easedProgress(T.fade, t),
    slitGlow,
    coinY: sampleCoinY(t) + breatheK * T.breathe.lift + landDrop,
    tiltDeg: breatheK * T.breathe.tiltDeg,
    flipDeg: flipP * T.flip.degrees,
    coinScale: zoom * squash,
    newFaceOpacity: flipP >= 0.5 ? 1 : 0,
    flash: stepProgress(T.flash, t) <= 0 ? 0 : keyframes(easedProgress(T.flash, t), [[0, 0], [0.1, 1], [1, 0]]),
    shakeX: keyframes(shakeP, [[0, 0], [0.2, 0], [0.45, -2], [0.7, 1], [1, 0]]),
    shakeY: keyframes(shakeP, [[0, 0], [0.2, 3], [0.45, -2], [0.7, 1], [1, 0]]),
    ringOpacity: stepProgress(T.ring, t) <= 0 ? 0 : keyframes(ringP, [[0, 0], [0.08, 0.8], [1, 0]]),
    ringScale: 0.55 + (2.2 - 0.55) * ringP,
    pool: easedProgress(T.pool, t),
    haloOpacity: haloP,
    haloScale: 0.8 + 0.2 * haloP,
    title: easedProgress(T.title, t),
    sub: easedProgress(T.sub, t),
    button: easedProgress(T.button, t),
  };
}

/** Параметры одной искры — считаются один раз на показ, дальше только время. */
export type MintSpark = Readonly<{
  delay: number;
  dur: number;
  /** Угол вылета, радианы (вверх ± 135°). */
  angle: number;
  /** Дальность, диаметры. */
  dist: number;
  /** Длина и толщина штриха, px. */
  len: number;
  thick: number;
}>;

/**
 * Детерминированный набор искр (mulberry32) — одинаковый в тестах и на устройстве,
 * а seed меняется от показа к показу, чтобы искры не выглядели заученными.
 */
export function buildMintSparks(seed: number): MintSpark[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const S = MINT_TIMELINE.sparks;
  return Array.from({ length: S.count }, () => ({
    delay: S.at + rand() * S.jitter,
    dur: S.minDur + rand() * (S.maxDur - S.minDur),
    angle: -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.5,
    dist: S.spread * (0.3 + rand() * 0.7),
    len: 4 + rand() * 9,
    thick: 1.2 + rand() * 1.2,
  }));
}

/** Кадр искры: смещение (диаметры), непрозрачность и растяжение штриха. */
export function sampleSpark(spark: MintSpark, t: number): { x: number; y: number; opacity: number; stretch: number } {
  'worklet';
  const p = clamp01((t - spark.delay) / spark.dur);
  if (p <= 0) return { x: 0, y: 0, opacity: 0, stretch: 0.4 };
  const e = cubicBezier(MINT_TIMELINE.sparks.ease, p);
  const along = keyframes(e, [[0, 0.03], [0.18, 0.35], [0.55, 0.8], [1, 1]]) * spark.dist;
  // Под конец искра оседает вниз «под тяжестью» — как в эталоне (+30..70 px при 220 px).
  const fall = keyframes(e, [[0, 0], [0.55, 0], [1, 1]]) * (Math.abs(Math.cos(spark.angle)) * 0.18 + 0.136);
  return {
    x: Math.cos(spark.angle) * along,
    y: Math.sin(spark.angle) * along + fall,
    opacity: keyframes(e, [[0, 0], [0.18, 1], [0.55, 0.9], [1, 0]]),
    stretch: keyframes(e, [[0, 0.4], [0.18, 1.6], [0.55, 1], [1, 0.5]]),
  };
}

/** Какие метки звука пересекла стрелка часов между prev и t (включая t, исключая prev). */
export function crossedCues(prev: number, t: number, reduced: boolean): MintSoundCue[] {
  'worklet';
  const cues = reduced ? MINT_TIMELINE_REDUCED.cues : MINT_TIMELINE.cues;
  const out: MintSoundCue[] = [];
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    // Старт часов задаётся prev = -1, поэтому метка на нуле тоже срабатывает ровно один раз.
    if (c.at > prev && c.at <= t) out.push(c.cue);
  }
  return out;
}
