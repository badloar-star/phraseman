/**
 * "Тир бизнеса" — ОТДЕЛЬНАЯ, ВИДИМАЯ владельцу шкала развития приложения
 * в admin/v2/legacy.html. НЕ путать с internal AppTier (app_tier.ts) —
 * тот подстраивает пороги срабатывания департаментов Джарвиса незаметно
 * для владельца. Здесь наоборот: владелец должен явно видеть, на каком
 * этапе стартапа приложение находится и что осталось до следующего.
 *
 * зачем: владелец 2026-08-02 попросил бизнес-картину (активные, доход,
 * тотал регистраций) с терминологией стартапов (pre-seed/seed/early
 * growth/growth/scale-up/mature), но привязанную к РЕАЛЬНЫМ метрикам
 * проекта, а не абстрактным деньгам инвесторов. Порог каждого тира —
 * общее число зарегистрированных пользователей (users.count()) — самая
 * стабильная и дешёвая метрика, которая растёт монотонно (в отличие от
 * активных/дохода, которые могут просесть). Тир бизнеса не должен дёргаться
 * туда-обратно от одной плохой недели с возвратами.
 */

export type BusinessTier = 'pre_seed' | 'seed' | 'early_growth' | 'growth' | 'scale_up' | 'mature';

export const BUSINESS_TIER_ORDER: readonly BusinessTier[] = Object.freeze([
  'pre_seed', 'seed', 'early_growth', 'growth', 'scale_up', 'mature',
]);

export const BUSINESS_TIER_LABELS: Readonly<Record<BusinessTier, string>> = Object.freeze({
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  early_growth: 'Early Growth',
  growth: 'Growth',
  scale_up: 'Scale-up',
  mature: 'Mature',
});

/** Нижняя граница ТОТАЛА зарегистрированных пользователей для каждого тира. */
export const BUSINESS_TIER_THRESHOLDS: Readonly<Record<BusinessTier, number>> = Object.freeze({
  pre_seed: 0,
  seed: 500,
  early_growth: 2_000,
  growth: 10_000,
  scale_up: 50_000,
  mature: 200_000,
});

/**
 * Нижняя граница MRR (USD/мес) для каждого тира — consumer mobile app на
 * подписках RevenueCat, не enterprise-ARR. Регистрации без денег ничего
 * не говорят о жизнеспособности бизнеса.
 */
export const BUSINESS_TIER_MONEY_THRESHOLDS_USD: Readonly<Record<BusinessTier, number>> = Object.freeze({
  pre_seed: 0,
  seed: 100,
  early_growth: 1_000,
  growth: 5_000,
  scale_up: 25_000,
  mature: 100_000,
});

/** Нижняя граница АКТИВНЫХ (не всех зарегистрированных) пользователей. */
export const BUSINESS_TIER_ACTIVE_THRESHOLDS: Readonly<Record<BusinessTier, number>> = Object.freeze({
  pre_seed: 0,
  seed: 500,
  early_growth: 2_500,
  growth: 10_000,
  scale_up: 50_000,
  mature: 200_000,
});

function isSafeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function classifyBusinessTier(totalRegisteredUsers: number): BusinessTier {
  if (!isSafeCount(totalRegisteredUsers)) return 'pre_seed';
  let current: BusinessTier = 'pre_seed';
  for (const tier of BUSINESS_TIER_ORDER) {
    if (totalRegisteredUsers >= BUSINESS_TIER_THRESHOLDS[tier]) current = tier;
  }
  return current;
}

export interface BusinessTierProgress {
  readonly tier: BusinessTier;
  readonly nextTier: BusinessTier | null;
  /** 0..1, доля пройденного пути к следующему тиру. 1 у mature (предельный тир). */
  readonly progressToNext: number;
  readonly usersIntoTier: number;
  readonly usersToNextTier: number | null;
}

/**
 * Прогресс к следующему тиру — для полоски прогресса в UI. mature — предел
 * шкалы, прогресс всегда 1 и следующего тира нет.
 */
export function computeBusinessTierProgress(totalRegisteredUsers: number): BusinessTierProgress {
  const safeTotal = isSafeCount(totalRegisteredUsers) ? totalRegisteredUsers : 0;
  const tier = classifyBusinessTier(safeTotal);
  const tierIndex = BUSINESS_TIER_ORDER.indexOf(tier);
  const nextTier = tierIndex < BUSINESS_TIER_ORDER.length - 1 ? BUSINESS_TIER_ORDER[tierIndex + 1] : null;
  const tierFloor = BUSINESS_TIER_THRESHOLDS[tier];
  const usersIntoTier = Math.max(0, safeTotal - tierFloor);

  if (!nextTier) {
    return Object.freeze({ tier, nextTier: null, progressToNext: 1, usersIntoTier, usersToNextTier: null });
  }

  const nextFloor = BUSINESS_TIER_THRESHOLDS[nextTier];
  const span = nextFloor - tierFloor;
  const progressToNext = span > 0 ? Math.min(1, Math.max(0, usersIntoTier / span)) : 1;
  const usersToNextTier = Math.max(0, nextFloor - safeTotal);

  return Object.freeze({ tier, nextTier, progressToNext, usersIntoTier, usersToNextTier });
}

// ── Двухфакторная (честная) шкала: деньги И активные ────────────────────────
// зачем (владелец 2026-08-02): шкала по одним регистрациям монотонна и
// удобна, но льстит — мёртвая база с одним платящим китом выглядела бы как
// рост. Реальная стадия бизнеса определяется УЗКИМ МЕСТОМ: минимумом из
// того, куда указывают деньги и активная аудитория по отдельности.

export interface BusinessHealthMetrics {
  readonly mrrUsd: number;
  readonly activeUsers: number;
}

function tierByThreshold(value: number, thresholds: Readonly<Record<BusinessTier, number>>): BusinessTier {
  if (!isSafeCount(value)) return 'pre_seed';
  let current: BusinessTier = 'pre_seed';
  for (const tier of BUSINESS_TIER_ORDER) {
    if (value >= thresholds[tier]) current = tier;
  }
  return current;
}

/** Тир = минимум из «куда тянут деньги» и «куда тянет активная база». */
export function classifyBusinessTierByHealth(metrics: BusinessHealthMetrics): BusinessTier {
  const moneyIndex = BUSINESS_TIER_ORDER.indexOf(tierByThreshold(metrics.mrrUsd, BUSINESS_TIER_MONEY_THRESHOLDS_USD));
  const activeIndex = BUSINESS_TIER_ORDER.indexOf(tierByThreshold(metrics.activeUsers, BUSINESS_TIER_ACTIVE_THRESHOLDS));
  return BUSINESS_TIER_ORDER[Math.min(moneyIndex, activeIndex)];
}

export interface BusinessHealth {
  /** Что показывать крупно — достигнутый максимум (храповик, экран не прыгает назад). */
  readonly tier: BusinessTier;
  /** Где метрики находятся ПРЯМО СЕЙЧАС — может быть ниже tier. */
  readonly currentTier: BusinessTier;
  /** Максимум за всю историю (входной peak, поднятый текущим значением). */
  readonly peakTier: BusinessTier;
  /** true, если сейчас просели ниже достигнутого пика — UI обязан это показать. */
  readonly belowPeak: boolean;
  /** Какая из двух метрик держит текущий тир — узкое место для полоски прогресса. */
  readonly bindingMetric: 'mrrUsd' | 'activeUsers';
}

function isKnownTier(value: unknown): value is BusinessTier {
  return typeof value === 'string' && (BUSINESS_TIER_ORDER as readonly string[]).includes(value);
}

/**
 * Храповик: тир не понижается (владелец 2026-08-02 — экран не должен
 * дёргаться от одной плохой недели), но просадка не замалчивается —
 * belowPeak + currentTier говорят правду о сегодняшнем дне.
 */
export function computeBusinessHealth(
  metrics: BusinessHealthMetrics,
  storedPeakTier: BusinessTier | null,
): BusinessHealth {
  const currentTier = classifyBusinessTierByHealth(metrics);
  const currentIndex = BUSINESS_TIER_ORDER.indexOf(currentTier);
  // Неизвестное значение из базы не принимаем на веру — иначе битая запись
  // могла бы навсегда завысить показанный тир.
  const priorIndex = isKnownTier(storedPeakTier) ? BUSINESS_TIER_ORDER.indexOf(storedPeakTier) : -1;
  const peakIndex = Math.max(currentIndex, priorIndex);
  const peakTier = BUSINESS_TIER_ORDER[peakIndex];

  const moneyIndex = BUSINESS_TIER_ORDER.indexOf(tierByThreshold(metrics.mrrUsd, BUSINESS_TIER_MONEY_THRESHOLDS_USD));
  const activeIndex = BUSINESS_TIER_ORDER.indexOf(tierByThreshold(metrics.activeUsers, BUSINESS_TIER_ACTIVE_THRESHOLDS));

  return Object.freeze({
    tier: peakTier,
    currentTier,
    peakTier,
    belowPeak: currentIndex < peakIndex,
    bindingMetric: moneyIndex <= activeIndex ? 'mrrUsd' : 'activeUsers',
  });
}
