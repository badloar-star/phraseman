// Weekly Boons — типы данных «бонусов дня недели» для бесплатных пользователей.
//
// Идея: каждый день недели несёт особый бонус (повышающий retention), бонусы могут
// ЧЕРЕДОВАТЬСЯ по неделям (одна суббота — Арена, следующая — Speaking). Расписание
// и включённость каждого бонуса задаются из «Пульта» (Remote Config), движок —
// единственный источник истины «какой бонус активен сегодня».
//
// День недели для РОТАЦИИ считается по UTC (синхронно со сбросом daily-tasks/арены/
// стрика — см. getTodayKey в daily_tasks.ts). Эффекты по ВРЕМЕНИ СУТОК (early-bird,
// energy-window) считают локальный час — это правильно для пользователя.

/** Основные бонусы дня (ровно один primary на день; могут чередоваться по неделям). */
export type BoonId =
  | 'streak_saver' // вс: бесплатная заморозка серии
  | 'energy_free_window' // окно «энергия не тратится» (вечер буднего дня)
  | 'arena_saturday' // сб: +попытки арены
  | 'mystery_monday' // пн: сундук с переменной наградой (модал)
  | 'double_xp' // чт: ×2 XP
  | 'flashcard_friday' // пт: 48ч триал случайного пака карточек
  | 'speaking_saturday' // сб: открыт speaking-гейт на день
  | 'turbo_regen'; // 2× восстановление энергии за день

/** Полный список всех известных бонусов (для валидации/админки/итераций). */
export const ALL_BOON_IDS: readonly BoonId[] = [
  'streak_saver',
  'energy_free_window',
  'arena_saturday',
  'mystery_monday',
  'double_xp',
  'flashcard_friday',
  'speaking_saturday',
  'turbo_regen',
] as const;

/** Always-on модификаторы — работают КАЖДЫЙ день, не входят в дневную ротацию. */
export type BoonModifierId =
  | 'early_bird' // вход до 10:00 (локально) → небольшой бонус
  | 'perfect_week'; // мета-трекер: вся неделя пройдена → крупный приз

export const ALL_BOON_MODIFIER_IDS: readonly BoonModifierId[] = ['early_bird', 'perfect_week'] as const;

/**
 * Один слот расписания на день недели. Может быть:
 *  - один BoonId (бонус прибит к этому дню навсегда), либо
 *  - массив BoonId (чередование по неделям: индекс = weekNumber % rotation.length).
 * Пустой/отсутствует = в этот день нет primary-бонуса.
 */
export type BoonScheduleSlot = BoonId | readonly BoonId[];

/**
 * Конфиг недельных бонусов (приходит из Remote Config как JSON-строка).
 * weekday: 0=вс .. 6=сб (UTC, как Date.getUTCDay()).
 */
export interface WeeklyBoonsConfig {
  /** Расписание: день недели → бонус или ротация бонусов по неделям. */
  schedule: Partial<Record<number, BoonScheduleSlot>>;
  /** Глобальный on/off каждого бонуса. Отсутствие ключа = включён. */
  enabled: Partial<Record<BoonId, boolean>>;
  /** On/off always-on модификаторов. Отсутствие ключа = включён. */
  modifiersEnabled: Partial<Record<BoonModifierId, boolean>>;
}

/** Результат резолва «что активно сегодня». */
export interface TodaysBoons {
  /** Основной бонус дня (с учётом enabled и недельной ротации) или null. */
  primary: BoonId | null;
  /** Активные always-on модификаторы. */
  modifiers: BoonModifierId[];
  /** День недели по UTC (0=вс..6=сб), по которому решался primary. */
  utcWeekday: number;
  /** Номер недели (для отладки/ротации). */
  weekNumber: number;
}
