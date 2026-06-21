// Weekly Boons — движок: единственный источник истины «какой бонус активен сегодня».
//
// Чистые функции (без побочных эффектов) → переиспользуются и в UI, и в местах
// применения эффекта, и легко тестируются. День РОТАЦИИ считается по UTC (синхронно
// со сбросом daily-tasks/арены/стрика). Эффекты по времени суток (early-bird,
// energy-window) проверяют локальный час отдельно — это не задача резолвера.

import { getTodayKey } from '../daily_tasks';
import { getWeeklyBoonsConfigRaw } from '../remote_flags';
import { parseWeeklyBoonsConfig } from './boon_config';
import {
  ALL_BOON_MODIFIER_IDS,
  type BoonId,
  type BoonModifierId,
  type BoonScheduleSlot,
  type TodaysBoons,
  type WeeklyBoonsConfig,
} from './boon_types';

/** Включён ли бонус глобально (отсутствие ключа в enabled = включён). */
function isBoonEnabled(cfg: WeeklyBoonsConfig, id: BoonId): boolean {
  return cfg.enabled[id] !== false;
}

/** Включён ли модификатор (отсутствие ключа = включён). */
function isModifierEnabled(cfg: WeeklyBoonsConfig, id: BoonModifierId): boolean {
  return cfg.modifiersEnabled[id] !== false;
}

/**
 * UTC-день недели (0=вс..6=сб), синхронный с getTodayKey (UTC ISO-дата).
 * Берём именно из today-key, а не из new Date().getUTCDay() напрямую, чтобы день
 * ротации точно совпадал с днём сброса прочих систем.
 */
export function utcWeekdayFromTodayKey(todayKey: string = getTodayKey()): number {
  // todayKey = "YYYY-MM-DD". Полдень UTC выбран намеренно: исключает любые
  // краевые сдвиги дня при парсинге и совпадает с UTC-датой today-key.
  const d = new Date(`${todayKey}T12:00:00Z`);
  const wd = d.getUTCDay();
  return Number.isFinite(wd) ? wd : new Date().getUTCDay();
}

/**
 * Номер недели по UTC от эпохи. Привязан к понедельнику (как недельный XP-сброс).
 * Используется как индекс для чередующихся слотов расписания.
 */
export function utcWeekNumberFromTodayKey(todayKey: string = getTodayKey()): number {
  const d = new Date(`${todayKey}T12:00:00Z`);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return 0;
  // 1970-01-01 — четверг. Сдвигаем на 4 дня, чтобы границы недель легли на понедельник.
  const days = Math.floor(ms / 86_400_000);
  return Math.floor((days + 4) / 7);
}

/**
 * Выбирает primary-бонус из слота расписания. Для чередующегося слота (массив)
 * берёт элемент по индексу weekNumber % length, пропуская выключенные. Если все
 * элементы выключены — вернёт null.
 */
function resolvePrimaryFromSlot(
  cfg: WeeklyBoonsConfig,
  slot: BoonScheduleSlot,
  weekNumber: number,
): BoonId | null {
  if (typeof slot === 'string') {
    return isBoonEnabled(cfg, slot) ? slot : null;
  }
  if (slot.length === 0) return null;
  // Стартовый индекс по номеру недели, дальше — по кругу, пока не найдём включённый.
  const start = ((weekNumber % slot.length) + slot.length) % slot.length;
  for (let i = 0; i < slot.length; i++) {
    const candidate = slot[(start + i) % slot.length];
    if (isBoonEnabled(cfg, candidate)) return candidate;
  }
  return null;
}

/**
 * Главный резолвер: какой primary-бонус и какие always-on модификаторы активны
 * сегодня. Чистая функция; принимает явный конфиг и today-key для тестируемости.
 */
export function resolveTodaysBoons(
  cfg: WeeklyBoonsConfig,
  todayKey: string = getTodayKey(),
): TodaysBoons {
  const utcWeekday = utcWeekdayFromTodayKey(todayKey);
  const weekNumber = utcWeekNumberFromTodayKey(todayKey);

  const slot = cfg.schedule[utcWeekday];
  const primary = slot != null ? resolvePrimaryFromSlot(cfg, slot, weekNumber) : null;

  const modifiers = ALL_BOON_MODIFIER_IDS.filter((m) => isModifierEnabled(cfg, m));

  return { primary, modifiers, utcWeekday, weekNumber };
}

// Мемоизация по (raw-config, todayKey): getTodaysBoons зовётся в hot-path (xp_manager
// на каждое начисление XP, EnergyContext), а parseWeeklyBoonsConfig делает JSON.parse.
// Кэш инвалидируется сам, когда меняется сырой конфиг (админка) или день (todayKey).
let _cachedRaw: string | null = null;
let _cachedKey: string | null = null;
let _cachedBoons: TodaysBoons | null = null;

/**
 * Удобная обёртка: читает «живой» конфиг из Remote Config и резолвит сегодняшние
 * бонусы. Мемоизировано по (сырой конфиг + день) — дёшево даже в hot-path (XP, энергия).
 */
export function getTodaysBoons(todayKey: string = getTodayKey()): TodaysBoons {
  const raw = getWeeklyBoonsConfigRaw();
  if (_cachedBoons && _cachedRaw === raw && _cachedKey === todayKey) {
    return _cachedBoons;
  }
  const cfg = parseWeeklyBoonsConfig(raw);
  const resolved = resolveTodaysBoons(cfg, todayKey);
  _cachedRaw = raw;
  _cachedKey = todayKey;
  _cachedBoons = resolved;
  return resolved;
}

/** Активен ли сейчас конкретный primary-бонус (синхронно, по живому конфигу). */
export function isPrimaryBoonActive(id: BoonId, todayKey: string = getTodayKey()): boolean {
  return getTodaysBoons(todayKey).primary === id;
}

/** Активен ли сейчас always-on модификатор. */
export function isBoonModifierActive(id: BoonModifierId, todayKey: string = getTodayKey()): boolean {
  return getTodaysBoons(todayKey).modifiers.includes(id);
}
