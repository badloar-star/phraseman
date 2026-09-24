// Weekly Boons — движок: единственный источник истины «какой бонус активен сегодня».
//
// Чистые функции (без побочных эффектов) → переиспользуются и в UI, и в местах
// применения эффекта, и легко тестируются. День РОТАЦИИ считается по UTC (синхронно
// со сбросом арены/стрика). Эффекты по времени суток (early-bird,
// energy-window) проверяют локальный час отдельно — это не задача резолвера.

import { getUtcDayKey } from '../local_date';
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
export function utcWeekdayFromTodayKey(todayKey: string = getUtcDayKey()): number {
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
export function utcWeekNumberFromTodayKey(todayKey: string = getUtcDayKey()): number {
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
  todayKey: string = getUtcDayKey(),
): TodaysBoons {
  const utcWeekday = utcWeekdayFromTodayKey(todayKey);
  const weekNumber = utcWeekNumberFromTodayKey(todayKey);

  const slot = cfg.schedule[utcWeekday];
  const primary = slot != null ? resolvePrimaryFromSlot(cfg, slot, weekNumber) : null;

  const modifiers = ALL_BOON_MODIFIER_IDS.filter((m) => isModifierEnabled(cfg, m));

  return { primary, modifiers, utcWeekday, weekNumber };
}

/**
 * Удобная обёртка: раньше читала «живой» конфиг из Remote Config и резолвила
 * сегодняшние бонусы (кэш убран вместе с этой логикой — см. зачем внутри).
 */
export function getTodaysBoons(todayKey: string = getUtcDayKey()): TodaysBoons {
  // зачем (PM-050/051/052, D09/S51 владельца, 2026-09-24): «бонусы дня/недели,
  // бонус возвращения, "новый день"» удалены — ничто декоративное не
  // преграждает вход. Это ЕДИНСТВЕННЫЙ источник истины: одним условием гаснут
  // разом все read/write-эффекты (boon_bootstrap, xp_manager, energy_system,
  // feature_gates), плашка TodaysBoonStrip (у неё уже есть `if (!primary)
  // return null`) и хосты сундуков/модалок (сняты с монтирования в
  // app/_layout.tsx отдельным PM-049 коммитом; сами файлы host-компонентов и
  // их тесты ждут отдельной сессии — построчная чистка 10+ интеграций
  // (xp_manager/energy_system/feature_gates) не влезает в бюджет этой сессии,
  // единая точка правды безопаснее частичного вычищения). Деньги, уже
  // выданные ДО этой правки (спины/осколки в кошельке), не отнимаются —
  // гасится только НОВОЕ начисление. Прежняя логика (remote-config резолвер,
  // first-day-silence, кэш) оставлена НИЖЕ недостижимой намеренно не была —
  // удалена целиком вместе с этим комментарием, откат — через git revert.
  return {
    primary: null,
    modifiers: [],
    utcWeekday: utcWeekdayFromTodayKey(todayKey),
    weekNumber: utcWeekNumberFromTodayKey(todayKey),
  };
}

/** Активен ли сейчас конкретный primary-бонус (синхронно, по живому конфигу). */
export function isPrimaryBoonActive(id: BoonId, todayKey: string = getUtcDayKey()): boolean {
  return getTodaysBoons(todayKey).primary === id;
}

/** Активен ли сейчас always-on модификатор. */
export function isBoonModifierActive(id: BoonModifierId, todayKey: string = getUtcDayKey()): boolean {
  return getTodaysBoons(todayKey).modifiers.includes(id);
}
