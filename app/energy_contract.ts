/**
 * Numeric energy economy constants and activity prices.
 *
 * This module is intentionally pure. Runtime storage, entitlements and remote
 * rollout code may consume it, but no screen is allowed to define a second
 * price table.
 */

export const ENERGY_SCHEMA_VERSION = 2 as const;
export const ENERGY_BASE_CAPACITY = 100 as const;
export const PROFILE_CARD_ENERGY_PER_LEVEL = 10 as const;
export const PROFILE_CARD_ENERGY_MAX_LEVEL = 5 as const;
/**
 * зачем (владелец, 2026-09-14): «каждая новая лига даёт +10 к общему запасу
 * энергии». Считаем по ТЕКУЩЕЙ лиге (выбор владельца), а не по рекорду: ушёл
 * лигой ниже — прибавка уменьшается вместе с ней.
 *
 * Лиг двенадцать (CLUBS в league_engine: id 0 «Медная» … id 11 «Высшая»), но
 * прибавку даёт именно НОМЕР лиги, поэтому стартовая Медная остаётся на 100, а
 * максимум приходится на Высшую: 100 + 11 × 10 = 210.
 */
export const LEAGUE_ENERGY_PER_LEVEL = 10 as const;
export const LEAGUE_ENERGY_MAX_LEVEL = 11 as const;
export const ENERGY_PERMANENT_CAPACITY_LIMIT =
  ENERGY_BASE_CAPACITY
  + PROFILE_CARD_ENERGY_PER_LEVEL * PROFILE_CARD_ENERGY_MAX_LEVEL
  + LEAGUE_ENERGY_PER_LEVEL * LEAGUE_ENERGY_MAX_LEVEL;
export const ENERGY_BONUS_CAPACITY_LIMIT = 200 as const;
export const ENERGY_ACTIVE_CAPACITY_LIMIT = ENERGY_PERMANENT_CAPACITY_LIMIT + ENERGY_BONUS_CAPACITY_LIMIT;
export const ENERGY_PASSIVE_UNIT_MS = 6 * 60 * 1000;
export const ENERGY_VIDEO_UNIT_MS = 36 * 1000;
export const ENERGY_MICRO_UNITS_PER_UNIT = 1_000_000 as const;

/** Clamps any unknown tier input to [0, max]; anything non-numeric reads as 0. */
function normalizeTier(input: unknown, maxLevel: number): number {
  const raw = Number(input);
  return Number.isFinite(raw) ? Math.max(0, Math.min(maxLevel, Math.floor(raw))) : 0;
}

/**
 * Единственная формула постоянного потолка энергии: база плюс 10 за каждый
 * купленный ярус карточки профиля плюс 10 за каждую лигу выше стартовой.
 *
 * зачем оба слагаемых здесь: прибавки складываются (решение владельца
 * 2026-09-14), и второй таблицы потолков в проекте быть не должно — иначе
 * знаменатель энергии на Главной и в прогреве разойдутся.
 *
 * Неизвестная лига (снимок ещё не прогрет, игрок вышел из аккаунта) читается
 * как нулевая: лучше не показать прибавку, чем выдумать её.
 */
export function permanentEnergyCapacity(input: {
  profileCardLevel?: unknown;
  leagueId?: unknown;
  base?: number;
}): number {
  const baseInput = input.base ?? ENERGY_BASE_CAPACITY;
  const base = Number.isFinite(baseInput)
    ? Math.max(ENERGY_BASE_CAPACITY, Math.floor(baseInput))
    : ENERGY_BASE_CAPACITY;
  const cardBonus = normalizeTier(input.profileCardLevel, PROFILE_CARD_ENERGY_MAX_LEVEL)
    * PROFILE_CARD_ENERGY_PER_LEVEL;
  const leagueBonus = normalizeTier(input.leagueId, LEAGUE_ENERGY_MAX_LEVEL)
    * LEAGUE_ENERGY_PER_LEVEL;
  return Math.min(ENERGY_PERMANENT_CAPACITY_LIMIT, base + cardBonus + leagueBonus);
}

/**
 * Permanent base capacity: 100 plus 10 for every owned profile-card tier.
 *
 * Обёртка над permanentEnergyCapacity: сохраняет прежнюю сигнатуру для мест,
 * где лига не важна (тесты подарков энергии, серверные проекции).
 */
export function profileCardEnergyCapacity(levelInput: unknown, baseInput: number = ENERGY_BASE_CAPACITY): number {
  return permanentEnergyCapacity({ profileCardLevel: levelInput, base: baseInput });
}

export type EnergyRuntimeConfig = Readonly<{
  maxEnergy: number;
  recoveryIntervalMs: number;
}>;

export function resolveEnergyRuntimeConfig(
  numericEnergyV2Enabled: boolean,
  legacyMaxEnergy: number,
  legacyRecoveryIntervalMs: number,
): EnergyRuntimeConfig {
  return numericEnergyV2Enabled
    ? {
        maxEnergy: ENERGY_BASE_CAPACITY,
        recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS,
      }
    : {
        maxEnergy: legacyMaxEnergy,
        recoveryIntervalMs: legacyRecoveryIntervalMs,
      };
}

export type EnergyActivityKey =
  | 'flashcards'
  | 'lesson_words'
  | 'irregular_verbs'
  | 'preposition_drill'
  | 'mistake_practice'
  | 'classic_lesson'
  | 'learning_v2_session'
  | 'ai_dialog'
  | 'personal_plan_exercise'
  | 'diagnostic_test'
  | 'level_exam'
  | 'arena_match'
  | 'theory'
  | 'reading'
  | 'video'
  | 'max_call';

export type EnergyActivityCost = 0 | 10 | 20 | 25;

const ENERGY_ACTIVITY_PRICES: Readonly<Record<EnergyActivityKey, EnergyActivityCost>> = Object.freeze({
  flashcards: 10,
  lesson_words: 10,
  irregular_verbs: 10,
  preposition_drill: 10,
  mistake_practice: 10,
  classic_lesson: 20,
  learning_v2_session: 20,
  ai_dialog: 20,
  personal_plan_exercise: 20,
  diagnostic_test: 20,
  level_exam: 20,
  arena_match: 25,
  theory: 0,
  reading: 0,
  video: 0,
  max_call: 0,
});

export function activityEnergyCost(activity: EnergyActivityKey): EnergyActivityCost {
  return ENERGY_ACTIVITY_PRICES[activity];
}

/** Bridges durable legacy intent names to the one canonical price catalog. */
export function energyActivityForSessionKind(kindInput: string): EnergyActivityKey {
  const kind = String(kindInput ?? '').trim().toLowerCase();
  if (kind.includes('arena')) return 'arena_match';
  if (kind.startsWith('flashcards')) return 'flashcards';
  if (kind === 'lesson_words') return 'lesson_words';
  if (kind === 'irregular_verbs') return 'irregular_verbs';
  if (kind === 'preposition_drill') return 'preposition_drill';
  if (kind === 'mistake_practice') return 'mistake_practice';
  if (kind === 'learning_v2_session') return 'learning_v2_session';
  if (kind === 'ai_dialog') return 'ai_dialog';
  if (kind === 'personal_plan_exercise') return 'personal_plan_exercise';
  if (kind === 'diagnostic_test') return 'diagnostic_test';
  if (kind === 'exam' || kind.startsWith('level_exam')) return 'level_exam';
  if (kind === 'theory') return 'theory';
  if (kind === 'reading') return 'reading';
  if (kind === 'video') return 'video';
  if (kind === 'max_call' || kind.startsWith('max_voice')) return 'max_call';
  return 'classic_lesson';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
