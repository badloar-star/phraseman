/**
 * Numeric energy economy constants and activity prices.
 *
 * This module is intentionally pure. Runtime storage, entitlements and remote
 * rollout code may consume it, but no screen is allowed to define a second
 * price table.
 */

export const ENERGY_SCHEMA_VERSION = 2 as const;
/**
 * зачем (PM-081, BIBLE «Энергия: 5, −1 за начавшееся учебное занятие, +1 за
 * 10 минут, Plus не расходует»; решения D06/D07 — OWNER_FINAL): запас энергии
 * ровно 5 у всех. Прежние 100 и прибавки к потолку от лиги (+10 за лигу) и от
 * карточки профиля (+10 за ярус) отменены — «никаких бонусов cap/rate от
 * визиток/лиги/видео». Потолок — одно число, без формул и удалённой настройки.
 */
export const ENERGY_BASE_CAPACITY = 5 as const;
/**
 * Максимальный ярус карточки профиля. Остался здесь только как граница яруса
 * (его читает profile_card_system) — к запасу энергии ярус больше НИЧЕГО не
 * добавляет (PM-081, D07).
 */
export const PROFILE_CARD_ENERGY_MAX_LEVEL = 5 as const;
/** Постоянный потолок = базовый запас: прибавок сверху больше нет (PM-081). */
export const ENERGY_PERMANENT_CAPACITY_LIMIT: number = ENERGY_BASE_CAPACITY;
export const ENERGY_BONUS_CAPACITY_LIMIT = 200 as const;
export const ENERGY_ACTIVE_CAPACITY_LIMIT = ENERGY_PERMANENT_CAPACITY_LIMIT + ENERGY_BONUS_CAPACITY_LIMIT;
export const ENERGY_PASSIVE_UNIT_MS = 6 * 60 * 1000;
export const ENERGY_VIDEO_UNIT_MS = 36 * 1000;
export const ENERGY_MICRO_UNITS_PER_UNIT = 1_000_000 as const;

/**
 * Единственная формула постоянного потолка энергии — теперь просто 5.
 *
 * зачем сигнатура сохранена (PM-081): её зовут EnergyContext, energy_system,
 * прогрев первого кадра и подарочные модули. Входы (ярус карточки, лига, база
 * из удалённого конфига) намеренно ИГНОРИРУЮТСЯ: по D07 ни лига, ни визитка,
 * ни пульт не меняют потолок. Держим одну точку правды, чтобы знаменатель на
 * Главной и в прогреве не разошёлся.
 */
export function permanentEnergyCapacity(_input: {
  profileCardLevel?: unknown;
  leagueId?: unknown;
  base?: number;
} = {}): number {
  return ENERGY_BASE_CAPACITY;
}

/** Обёртка прежней сигнатуры: ярус карточки больше не влияет на потолок (PM-081). */
export function profileCardEnergyCapacity(_levelInput?: unknown, _baseInput?: number): number {
  return ENERGY_BASE_CAPACITY;
}

export type EnergyRuntimeConfig = Readonly<{
  maxEnergy: number;
  recoveryIntervalMs: number;
}>;

export function resolveEnergyRuntimeConfig(
  numericEnergyV2Enabled: boolean,
  _legacyMaxEnergy: number,
  legacyRecoveryIntervalMs: number,
): EnergyRuntimeConfig {
  return numericEnergyV2Enabled
    ? {
        maxEnergy: ENERGY_BASE_CAPACITY,
        recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS,
      }
    : {
        // зачем (PM-081): аварийный выключатель numeric_energy_v2 не должен
        // возвращать старый потолок из удалённого конфига — запас всегда 5.
        maxEnergy: ENERGY_BASE_CAPACITY,
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
