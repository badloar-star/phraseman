/**
 * Чистая логика рулетки Plus — без Firebase, без IO. Импортируется:
 *  - functions/src/referral_spin.ts (продакшн callable);
 *  - functions/test/referral_spin_logic.test.ts (vitest);
 *  - админкой (копия spinLogic.ts) для dry-run симуляций.
 *
 * Всё детерминировано по переданному RNG — поэтому тесты и админская
 * симуляция воспроизводят поведение сервера 1-в-1.
 */

/** Призы рулетки в днях VIP. Индекс массива = prizeIndex на клиенте. */
export const REFERRAL_SPIN_PRIZE_DAYS: readonly number[] = [1, 7, 30, 90, 180, 365];
/** Дефолтные веса (%), если в «Пульте» мусор/отсутствует. Сумма = 100. */
export const REFERRAL_SPIN_DEFAULT_WEIGHTS: readonly number[] = [55, 30, 11.5, 2.9, 0.55, 0.05];

/** Индекс приза «365 дней» — джекпот, 1 раз на аккаунт. */
export const JACKPOT_INDEX = 5;
/** Индекс приза «180 дней» — 1 раз в 365 дней. */
export const BIG_PRIZE_INDEX = 4;
/** Pity: спины 1, 11, 21, … (spinsUsedTotal % 10 === 0) — минимум 7 дней. */
export const PITY_PERIOD = 10;
export const PITY_MIN_INDEX = 1;
/** Допуск суммы весов при строгой валидации (админка/«Пульт»). */
const WEIGHTS_SUM_EPS = 0.5;

// ── Валидация ─────────────────────────────────────────────────────────────────

export type WeightsValidation = { ok: true; weights: number[] } | { ok: false; error: string };

/**
 * Строгая валидация весов для ЗАПИСИ в конфиг (adminSetSpinWeights / «Пульт»):
 * ровно 6 конечных неотрицательных чисел, сумма = 100 ± 0.5.
 */
export function validateSpinWeights(raw: unknown): WeightsValidation {
  if (!Array.isArray(raw) || raw.length !== REFERRAL_SPIN_PRIZE_DAYS.length) {
    return { ok: false, error: `NEED_${REFERRAL_SPIN_PRIZE_DAYS.length}_WEIGHTS` };
  }
  const weights = raw.map((v) => Number(v));
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    return { ok: false, error: 'WEIGHTS_MUST_BE_NON_NEGATIVE_FINITE' };
  }
  const sum = weights.reduce((s, w) => s + w, 0);
  if (Math.abs(sum - 100) > WEIGHTS_SUM_EPS) {
    return { ok: false, error: `SUM_MUST_BE_100 (got ${sum})` };
  }
  return { ok: true, weights };
}

/**
 * Мягкий парсер весов для RUNTIME (никогда не бросает): мусор → дефолт.
 * Клиенты не должны страдать от битого конфига.
 */
export function referralSpinWeightsFromData(numbers: Record<string, unknown> | undefined): number[] {
  const v = validateSpinWeights(numbers?.referral_spin_weights);
  return v.ok ? v.weights : [...REFERRAL_SPIN_DEFAULT_WEIGHTS];
}

// ── RNG ───────────────────────────────────────────────────────────────────────

/** mulberry32 — детерминированный PRNG по числовому seed (для тестов и dry-run). */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Выбор приза ───────────────────────────────────────────────────────────────

/**
 * Weighted pick внутри пула по равномерному rand ∈ [0,1).
 * Бросает NO_POSITIVE_WEIGHTS, если у всех индексов пула нулевой вес.
 */
export function referralSpinPickIndex(pool: readonly number[], weights: readonly number[], rand: number): number {
  let total = 0;
  for (const i of pool) total += weights[i] ?? 0;
  if (total <= 0) {
    throw new Error('NO_POSITIVE_WEIGHTS: у всех призов пула нулевой вес');
  }
  let r = Math.min(Math.max(rand, 0), 0.999999999) * total;
  for (const i of pool) {
    r -= weights[i] ?? 0;
    if (r <= 0) return i;
  }
  return pool[pool.length - 1];
}

export interface SpinDrawInput {
  weights: readonly number[];
  /** Сколько спинов юзер уже сделал (0 = первый спин). */
  spinsUsedTotal: number;
  /** Запрещённые индексы призов (джекпот-капы: 5 — год уже был; 4 — 180д в окне 365д). */
  forbidden: ReadonlySet<number>;
  /** Источник случайности ∈ [0,1). */
  rng: () => number;
}

export interface SpinDrawResult {
  prizeIndex: number;
  prizeDays: number;
  /** Сработал pity (1-й и каждый 10-й спин — минимум 7 дней). */
  pity: boolean;
  /** Выпал запрещённый джекпот и был переброс в разрешённый пул. */
  reroll: boolean;
}

/**
 * Полный чистый розыгрыш: pity-фильтр пула → weighted pick → джекпот-капы с reroll.
 * Бросает EMPTY_ALLOWED_POOL, если все индексы пула запрещены капами
 * (конфигурационная ошибка — на сервере превращается в internal с понятным логом).
 */
export function spinDraw(input: SpinDrawInput): SpinDrawResult {
  const { weights, spinsUsedTotal, forbidden, rng } = input;
  const allIndices = REFERRAL_SPIN_PRIZE_DAYS.map((_, i) => i);
  const pity = spinsUsedTotal % PITY_PERIOD === 0;
  const pool = pity ? allIndices.filter((i) => i >= PITY_MIN_INDEX) : allIndices;

  let prizeIndex = referralSpinPickIndex(pool, weights, rng());
  let reroll = false;
  if (forbidden.has(prizeIndex)) {
    const allowed = pool.filter((i) => !forbidden.has(i));
    if (allowed.length === 0) {
      throw new Error('EMPTY_ALLOWED_POOL: все призы пула запрещены джекпот-капами');
    }
    prizeIndex = referralSpinPickIndex(allowed, weights, rng());
    reroll = true;
  }
  return { prizeIndex, prizeDays: REFERRAL_SPIN_PRIZE_DAYS[prizeIndex] ?? 1, pity, reroll };
}

/** Матожидание приза в днях (для админки: EV прокрута). */
export function spinExpectedDays(weights: readonly number[]): number {
  let ev = 0;
  for (let i = 0; i < REFERRAL_SPIN_PRIZE_DAYS.length; i += 1) {
    ev += ((weights[i] ?? 0) / 100) * (REFERRAL_SPIN_PRIZE_DAYS[i] ?? 0);
  }
  return ev;
}
