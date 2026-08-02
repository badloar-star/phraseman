/**
 * Тир приложения по количеству активных пользователей.
 *
 * зачем: владелец 2026-08-02 — Джарвис обязан видеть не только проценты,
 * но и абсолютный масштаб. Просадка на 5% при 5 тыс. пользователей —
 * не трагедия; тот же процент при 50 тыс. — уже реальный сигнал. Тиры
 * масштабируют порог срабатывания департаментов, а не подменяют его.
 */

export type AppTier = 'seed' | 'growth' | 'scale' | 'mature';

/** Нижняя граница активных пользователей для каждого тира. */
export const APP_TIER_THRESHOLDS: Readonly<Record<AppTier, number>> = Object.freeze({
  seed: 0,
  growth: 1_000,
  scale: 5_000,
  mature: 20_000,
});

/**
 * Множитель порога для ОТНОСИТЕЛЬНЫХ сигналов (доля/процент — например
 * «Деньги»: доля возвратов от новых платящих). На маленькой базе шум
 * дороже — один случайный всплеск легко даёт большой процент, поэтому
 * порог поднимается (multiplier > 1). На зрелой базе процент уже сам
 * по себе статистически значим — порог остаётся как есть (multiplier = 1).
 */
const TIER_RELATIVE_THRESHOLD_MULTIPLIER: Readonly<Record<AppTier, number>> = Object.freeze({
  seed: 2,
  growth: 1.5,
  scale: 1.2,
  mature: 1,
});

/**
 * Множитель порога для АБСОЛЮТНЫХ сигналов (число событий — например
 * «Качество»: число репортов одной категории). Здесь логика обратная
 * относительному множителю: одно и то же абсолютное число репортов —
 * заметный сигнал на маленькой базе, но капля в море на зрелой, поэтому
 * порог растёт вместе с тиром (multiplier >= 1, растёт с масштабом).
 */
const TIER_ABSOLUTE_THRESHOLD_MULTIPLIER: Readonly<Record<AppTier, number>> = Object.freeze({
  seed: 1,
  growth: 2,
  scale: 4,
  mature: 8,
});

export function classifyAppTier(activeUserCount: number): AppTier {
  if (!Number.isFinite(activeUserCount) || activeUserCount < 0) return 'seed';
  if (activeUserCount >= APP_TIER_THRESHOLDS.mature) return 'mature';
  if (activeUserCount >= APP_TIER_THRESHOLDS.scale) return 'scale';
  if (activeUserCount >= APP_TIER_THRESHOLDS.growth) return 'growth';
  return 'seed';
}

export function tierThresholdMultiplier(tier: AppTier): number {
  return TIER_RELATIVE_THRESHOLD_MULTIPLIER[tier];
}

export function tierAbsoluteThresholdMultiplier(tier: AppTier): number {
  return TIER_ABSOLUTE_THRESHOLD_MULTIPLIER[tier];
}
