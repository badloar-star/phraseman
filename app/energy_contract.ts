/**
 * Numeric energy economy constants and activity prices.
 *
 * This module is intentionally pure. Runtime storage, entitlements and remote
 * rollout code may consume it, but no screen is allowed to define a second
 * price table.
 */

export const ENERGY_SCHEMA_VERSION = 2 as const;
/**
 * Замок владельца 28.10: «Энергия: 5, −1 за начавшееся учебное занятие, +1 за
 * 30 минут, Plus не расходует». Запас энергии
 * ровно 5 у всех. Бонусов cap/rate от оформления или видео нет. Потолок — одно
 * число, без формул и удалённой настройки.
 */
export const ENERGY_BASE_CAPACITY = 5 as const;
/**
 * Максимальный ярус карточки профиля. Остался здесь только как граница яруса
 * (его читает profile_card_system) — к запасу энергии ярус больше НИЧЕГО не
 * добавляет (замок владельца 28.10).
 */
export const PROFILE_CARD_MAX_LEVEL = 5 as const;
/** Постоянный потолок = базовый запас: прибавок сверху больше нет (замок владельца 28.10). */
// зачем (владелец 04.11, «энергия от Пика»; замок 28.10 «ровно 5» ОТМЕНЁН): жёсткий предел хранения = база 5 + максимум бонуса Пика 11.
// Рабочий потолок игрока — permanentEnergyCapacity({ spireBonus }) = 5 + его бонус; этот предел лишь страхует проверки сохранённого состояния.
export const SPIRE_ENERGY_BONUS_CAP = 11 as const;
export const ENERGY_PERMANENT_CAPACITY_LIMIT: number = ENERGY_BASE_CAPACITY + SPIRE_ENERGY_BONUS_CAP;
/** Retired energy gifts/boosters cannot add capacity or refill units. */
export const ENERGY_BONUS_CAPACITY_LIMIT = 0 as const;
export const ENERGY_ACTIVE_CAPACITY_LIMIT = ENERGY_PERMANENT_CAPACITY_LIMIT;
/**
 * +1 энергия за каждые 30 минут; от нуля до полного запаса 5 — 150 минут.
 *
 * Замок владельца 28.10 заменяет прежние интервалы. Пересчёт ленивый: по
 * времени последнего сохранения (energy_state_v2.settleEnergyState), без
 * таймеров и серверного крона на каждого пользователя.
 */
export const ENERGY_PASSIVE_UNIT_MS = 30 * 60 * 1000;
export const ENERGY_VIDEO_UNIT_MS = 36 * 1000;
export const ENERGY_MICRO_UNITS_PER_UNIT = 1_000_000 as const;

/**
 * Единственная формула постоянного потолка энергии — теперь просто 5.
 *
 * зачем сигнатура сохранена (PM-081): её зовут EnergyContext, energy_system,
 * прогрев первого кадра и подарочные модули. Входы (ярус карточки и база
 * из удалённого конфига) намеренно ИГНОРИРУЮТСЯ: потолок не меняется,
 * ни пульт не меняют потолок. Держим одну точку правды, чтобы знаменатель на
 * Главной и в прогреве не разошёлся.
 */
export function permanentEnergyCapacity(input: {
  base?: number;
  /** Бонус Пика (лиги, набранные после выхода правила), 0..11; Plus ∞ обрабатывается отдельно (isUnlimited). */
  spireBonus?: number;
} = {}): number {
  const raw = Number(input.spireBonus);
  const bonus = Number.isFinite(raw) ? Math.max(0, Math.min(SPIRE_ENERGY_BONUS_CAP, Math.trunc(raw))) : 0;
  return ENERGY_BASE_CAPACITY + bonus;
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
  _numericEnergyV2Enabled: boolean,
  _legacyMaxEnergy: number,
  _legacyRecoveryIntervalMs: number,
): EnergyRuntimeConfig {
  // PM-015 / D66: старые удалённые флаги не управляют учебной энергией.
  return {
    maxEnergy: ENERGY_BASE_CAPACITY,
    recoveryIntervalMs: ENERGY_PASSIVE_UNIT_MS,
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
  | 'diagnostic_test'
  | 'level_exam'
  | 'arena_match'
  // зачем (PM-274, TOWER T3): ступень Шпиля — своё занятие в общем каталоге
  // цен 2.0, а не молчаливый откат в 'classic_lesson' по умолчанию.
  | 'spire_step'
  | 'theory'
  | 'reading'
  | 'video';

/**
 * Цена ОДНОГО начавшегося учебного занятия — любого режима.
 *
 * зачем (PM-082, BIBLE «−1 за начавшееся учебное занятие»; владелец: «все
 * будет одна единица»): прежняя лестница 10/20/25 по видам активности
 * отменена. Урок, карточки, диалог, экзамен, диагностика — ровно 1.
 */
export const ENERGY_SESSION_COST = 1 as const;

/**
 * D159 (владелец 04.10): повторный вход в тот же раздел того же урока (урок / «Словарь» / «Глаголы») в течение
 * этого окна после выхода — бесплатно: это продолжение, а не новое занятие. Единственное место значения.
 */
export const ENERGY_FREE_REENTRY_WINDOW_MS = 10 * 60 * 1000;

export type EnergyActivityCost = 0 | typeof ENERGY_SESSION_COST;

/**
 * 0 — не учебное занятие (теория, чтение, просмотр видео): такие экраны
 * энергию не тратят (PM-082-A2).
 */
const ENERGY_ACTIVITY_PRICES: Readonly<Record<EnergyActivityKey, EnergyActivityCost>> = Object.freeze({
  flashcards: ENERGY_SESSION_COST,
  lesson_words: ENERGY_SESSION_COST,
  irregular_verbs: ENERGY_SESSION_COST,
  preposition_drill: ENERGY_SESSION_COST,
  mistake_practice: ENERGY_SESSION_COST,
  classic_lesson: ENERGY_SESSION_COST,
  learning_v2_session: ENERGY_SESSION_COST,
  ai_dialog: ENERGY_SESSION_COST,
  diagnostic_test: ENERGY_SESSION_COST,
  level_exam: ENERGY_SESSION_COST,
  arena_match: ENERGY_SESSION_COST,
  spire_step: ENERGY_SESSION_COST,
  theory: 0,
  reading: 0,
  video: 0,
});

export function activityEnergyCost(activity: EnergyActivityKey): EnergyActivityCost {
  return ENERGY_ACTIVITY_PRICES[activity];
}

/** A classic lesson starts only when its first exercise can actually be used. */
export function canChargeClassicLessonEntry(state: Readonly<{
  energyReady: boolean;
  lessonHydrated: boolean;
  introGateReady: boolean;
  introVisible: boolean;
  hasPlayableRows: boolean;
  remoteSourceReady: boolean;
}>): boolean {
  return state.energyReady
    && state.lessonHydrated
    && state.introGateReady
    && !state.introVisible
    && state.hasPlayableRows
    && state.remoteSourceReady;
}

/** Training charges only after a playable queue and the live energy balance are ready. */
export function canChargePreparedTrainingEntry(state: Readonly<{
  energyReady: boolean;
  hasPlayableItems: boolean;
}>): boolean {
  return state.energyReady && state.hasPlayableItems;
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
  if (kind === 'diagnostic_test') return 'diagnostic_test';
  if (kind === 'exam' || kind.startsWith('level_exam')) return 'level_exam';
  if (kind === 'theory') return 'theory';
  if (kind === 'reading') return 'reading';
  if (kind === 'video') return 'video';
  if (kind === 'spire_step') return 'spire_step';
  return 'classic_lesson';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
