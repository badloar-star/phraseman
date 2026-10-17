// ═══════════════════════════════════════════════════════════════════════════
// step_budget_scale.ts — шкала времени ступени Пика: база «комфортно» × множитель лиги × поправка этажа.
//
// зачем (владелец 17.10: «для Пика определено время точно?»; аудит docs/work/tasks/spire-timing-audit-2026-10-17.md, вариант (б);
// решение координатора 17.10): прежняя шкала давала 9 с на задание уже на этаже 1 — «пары» и длинный «выбор» шли в минус, с этажа 10
// не хватало даже на чтение. Правило владельца: жёстко (мало времени) — только наверху и в 12-й лиге, ниже — щедро.
// Сильный C2 на 12-й лиге и 15-м этаже — впритык; B1 внизу — с запасом. Чистые функции без зависимостей: та же копия у сервера
// (functions/src/spire_config_contract.ts, выкладка 18.10), сторож сверяет числа. Запись в прод config/spire_v1 этим не делается.
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireTaskTimerKind } from './config_contract';

/**
 * Секунды «комфортно» на задание при типичных длинных вариантах (аудит, раздел 5).
 * timeattack — список по одному слову (поле пар только у match); voice в аудите не замерен — 18 с между «на слух» и «переводом» (допущение, поправимо одним числом).
 */
export const SPIRE_COMFORT_BASE_MS: Readonly<Record<SpireTaskTimerKind, number>> = Object.freeze({
  choice: 11_000,
  translate: 20_000,
  match: 20_000,
  timeattack: 14_000, // зачем (Сайт 17.10): timeattack остаётся списком по одному слову (6 быстрых выборов ×~2,3 с), не полем пар
  listen: 14_000,
  dictate: 20_000,
  voice: 18_000,
});

/** Множитель лиги M по индексу лиги 0…11 (лига 1 → 12): щедро внизу, 1,00 — 12-я лига. */
export const SPIRE_LEAGUE_TIME_MULTIPLIER: readonly number[] = Object.freeze([1.8, 1.77, 1.74, 1.71, 1.68, 1.64, 1.6, 1.55, 1.48, 1.4, 1.3, 1.0]);

export const SPIRE_TIME_FLOOR_TOP = 15;
const FLOOR_FACTOR_AT_14 = 0.9;
const FLOOR_FACTOR_AT_TOP = 0.85;

/** Множитель лиги; вне диапазона — ближайший край (битый tier не даёт «бесконечного» времени). */
export function spireLeagueTimeMultiplier(tier: number): number {
  const i = Number.isFinite(tier) ? Math.max(0, Math.min(SPIRE_LEAGUE_TIME_MULTIPLIER.length - 1, Math.trunc(tier))) : 0;
  return SPIRE_LEAGUE_TIME_MULTIPLIER[i] ?? 1;
}

/** Поправка этажа F: линейно 1,00 (эт. 1) → 0,90 (эт. 14); этаж 15 — 0,85. */
export function spireFloorTimeFactor(floor: number): number {
  const f = Number.isFinite(floor) ? Math.trunc(floor) : 1;
  if (f >= SPIRE_TIME_FLOOR_TOP) return FLOOR_FACTOR_AT_TOP;
  if (f <= 1) return 1;
  return 1 - ((1 - FLOOR_FACTOR_AT_14) * (f - 1)) / (SPIRE_TIME_FLOOR_TOP - 2);
}

/** Бюджет одного задания, мс: база × M × F. */
export function spireTaskBudgetMs(kind: SpireTaskTimerKind, tier: number, floor: number): number {
  return Math.round((SPIRE_COMFORT_BASE_MS[kind] ?? SPIRE_COMFORT_BASE_MS.choice) * spireLeagueTimeMultiplier(tier) * spireFloorTimeFactor(floor));
}

/** Бюджет ступени, мс: сумма бюджетов заданий набора. */
export function spireScaledStepBudgetMs(tier: number, floor: number, kinds: readonly SpireTaskTimerKind[]): number {
  return kinds.reduce((sum, kind) => sum + spireTaskBudgetMs(kind, tier, floor), 0);
}
