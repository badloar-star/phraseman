/**
 * cards-2.1 (§7.1 SPEC_2_1): ЧИСТАЯ модель эквалайзера плеера «Слушание».
 * Без RN/Reanimated-импортов — юнит-тестируется в node
 * (tests/fc_listening_equalizer.test.ts), рендер живёт в ListeningEqualizer.tsx.
 *
 * Зачем отдельный модуль: параметры полос (амплитуда/период/фаза) должны быть
 * ДЕТЕРМИНИРОВАННЫМИ — Math.random() в рендере дал бы новую анимацию на каждый
 * ре-рендер и невоспроизводимые тесты. Здесь — псевдошум от индекса полосы:
 * одна и та же полоса всегда «дышит» одинаково, но соседние расходятся по
 * периоду и фазе (иначе получается «шагающий строй», §8 — премиальный вид).
 *
 * Анимируется ТОЛЬКО transform: scaleY (не height — это layout-проход на
 * каждый кадр), поэтому все значения здесь — множители масштаба в (0..1].
 */

/** Границы количества полос (UI не должен уехать в 1 или в 40). */
export const EQ_MIN_BARS = 3;
export const EQ_MAX_BARS = 12;
export const EQ_DEFAULT_BARS = 5;

/** Полупериод «дыхания» полосы, мс — диапазон разброса. */
export const EQ_MIN_DURATION_MS = 340;
export const EQ_MAX_DURATION_MS = 720;

/** Низкое статичное положение полос на паузе / после завершения. */
export const EQ_REST_SCALE_MIN = 0.14;
export const EQ_REST_SCALE_MAX = 0.24;

/** Длительность цикла общего драйвера в упрощённом режиме (lowPower), мс. */
export const EQ_SIMPLE_CYCLE_MS = 1500;

/** Плавный переход в статичное положение (пауза / завершено), мс. */
export const EQ_SETTLE_MS = 260;

export type EqBarParams = {
  /** Нижняя точка «дыхания» (scaleY). */
  minScale: number;
  /** Верхняя точка «дыхания» (scaleY). */
  maxScale: number;
  /** Полупериод вверх, мс (вниз — чуть длиннее, см. `downDurationMs`). */
  durationMs: number;
  /** Полупериод вниз, мс — асимметрия делает движение живым, а не «маятником». */
  downDurationMs: number;
  /** Задержка старта, мс — фазовый сдвиг полосы. */
  delayMs: number;
  /** Фаза 0..1 для общего драйвера упрощённого режима (без своих таймингов). */
  phase01: number;
  /** Статичная высота на паузе / при «уменьшить движение» + пауза. */
  restScale: number;
  /** Статичная высота при «уменьшить движение» + идёт озвучка (видно, что звук есть). */
  activeStaticScale: number;
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Целочисленный вход из пропса: мусор → дефолт, выход за границы → зажим. */
export function resolveBarCount(raw: number | null | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return EQ_DEFAULT_BARS;
  return clamp(Math.round(raw), EQ_MIN_BARS, EQ_MAX_BARS);
}

/**
 * Детерминированный псевдошум 0..1 от целого seed (классический sin-hash).
 * Нужен именно детерминизм: одинаковая картинка между ре-рендерами и тестами.
 */
export function eqNoise(seed: number, salt = 0): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7 + 74.7) * 43758.5453;
  const f = x - Math.floor(x);
  // -0 и краевые float-артефакты приводим в [0,1)
  return f < 0 ? f + 1 : f >= 1 ? 0.999999 : f;
}

/**
 * «Арка»: полосы в центре выше краёв (0..1, центр = 1) — форма, а не случайный
 * частокол. Для count<=1 всегда 1.
 */
export function eqArch(index: number, count: number): number {
  if (count <= 1) return 1;
  const center = (count - 1) / 2;
  return 1 - Math.abs(index - center) / center;
}

/**
 * Параметры одной полосы. Индекс за границами зажимается — компонент никогда
 * не получит NaN-тайминг, даже если barCount поменялся на лету.
 */
export function equalizerBarParams(index: number, count: number): EqBarParams {
  const total = resolveBarCount(count);
  const i = clamp(Math.round(index), 0, total - 1);

  const arch = eqArch(i, total);
  const n1 = eqNoise(i, 1);
  const n2 = eqNoise(i, 2);
  const n3 = eqNoise(i, 3);

  // Верх: центр громче краёв + индивидуальный разброс. Потолок 1 = высота слота.
  const maxScale = clamp(0.58 + 0.3 * arch + 0.14 * n1, 0.5, 1);
  // Низ: доля от верха — полоса не схлопывается в точку и не «висит» высоко.
  const minScale = clamp(maxScale * (0.26 + 0.16 * n2), 0.12, 0.55);

  // Периоды: у каждой полосы свой, и вниз дольше, чем вверх (атака/затухание).
  const durationMs = Math.round(EQ_MIN_DURATION_MS + (EQ_MAX_DURATION_MS - EQ_MIN_DURATION_MS) * n2);
  const downDurationMs = Math.round(durationMs * (1.1 + 0.25 * n3));

  // Фаза: детерминированный сдвиг, НЕ кратный шагу индекса (иначе «волна строем»).
  const phase01 = (i * 0.6180339887 + n3 * 0.37) % 1;
  const delayMs = Math.round(phase01 * durationMs);

  const restScale = clamp(EQ_REST_SCALE_MIN + (EQ_REST_SCALE_MAX - EQ_REST_SCALE_MIN) * n1, EQ_REST_SCALE_MIN, EQ_REST_SCALE_MAX);
  // Статичный «играет» — между низом и верхом: форма арки читается, движения нет.
  const activeStaticScale = clamp(minScale + (maxScale - minScale) * 0.72, 0.2, 1);

  return { minScale, maxScale, durationMs, downDurationMs, delayMs, phase01, restScale, activeStaticScale };
}

/** Все полосы разом (мемоизируется в компоненте по barCount). */
export function equalizerBars(count: number): EqBarParams[] {
  const total = resolveBarCount(count);
  const out: EqBarParams[] = [];
  for (let i = 0; i < total; i++) out.push(equalizerBarParams(i, total));
  return out;
}

/**
 * Режим отрисовки:
 *  - 'full'   — у каждой полосы свой период и фаза (по умолчанию);
 *  - 'simple' — слабое устройство: ОДИН общий драйвер на все полосы (фаза из
 *               phase01), движение упрощено, но озвучка всё ещё «видна»;
 *  - 'static' — пауза/финал или «уменьшить движение»: анимации нет вообще.
 */
export type EqMotionMode = 'full' | 'simple' | 'static';

export function equalizerMotionMode(opts: {
  playing: boolean;
  reduceMotion?: boolean;
  lowPower?: boolean;
}): EqMotionMode {
  if (!opts.playing) return 'static';
  if (opts.reduceMotion) return 'static';
  if (opts.lowPower) return 'simple';
  return 'full';
}

/**
 * Упрощённый режим: масштаб полосы по фазе ОДНОГО общего драйвера t∈[0,1)
 * (пила). Треугольная волна + личный сдвиг `phase01` — полосы всё ещё не идут
 * строем, но анимация в приложении ровно одна.
 * ВНИМАНИЕ: та же формула продублирована инлайн внутри useAnimatedStyle
 * (ListeningEqualizer.tsx) — worklet не может звать не-workletized функцию.
 */
export function equalizerSimpleScale(params: EqBarParams, t: number): number {
  const safeT = Number.isFinite(t) ? t : 0;
  const ph = ((safeT + params.phase01) % 1 + 1) % 1;
  const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
  return params.minScale + (params.maxScale - params.minScale) * tri;
}

/** Статичный масштаб полосы: играет (reduce motion) — арка, стоит — низкое положение. */
export function equalizerStaticScale(params: EqBarParams, playing: boolean): number {
  return playing ? params.activeStaticScale : params.restScale;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
