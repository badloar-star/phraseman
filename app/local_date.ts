// Единый источник истины для "локального дня устройства" в контексте стрика.
//
// Контекст: getTodayKey/todayKey по всей кодовой базе исторически считали день
// через toISOString().slice(0,10) — то есть UTC-день. Пользователь, который
// занимается вечером в UTC+N или утром в UTC-N, может физически заниматься
// каждый календарный день у себя дома, но их локальные дни мапятся на разные
// (или совпадающие) UTC-дни неверно — стрик рвётся или задваивается несправедливо.
//
// Здесь — локальный день по часам устройства (getFullYear/getMonth/getDate,
// НЕ getUTC*). Это то, что физически видит пользователь на экране телефона.

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Локальный календарный день устройства в формате YYYY-MM-DD. */
export function getLocalDayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** UTC-календарный день — тот ключ, который использовался ДО миграции на локальную дату. */
export function getUtcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseDayKeyAsUtcMs(dayKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : null;
}

/** Сдвигает YYYY-MM-DD ключ (любого происхождения — локальный или UTC) на N календарных дней. */
export function addLocalDays(dayKey: string, days: number): string {
  const ms = parseDayKeyAsUtcMs(dayKey);
  if (ms == null) return dayKey;
  const shifted = new Date(ms + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Локальный день "вчера" относительно now. */
export function getLocalYesterdayKey(date: Date = new Date()): string {
  return addLocalDays(getLocalDayKey(date), -1);
}

/**
 * ПЕРЕХОДНАЯ логика: во время миграции с UTC-ключа на локальный ключ, ранее
 * сохранённый last_active_date мог быть записан ПО СТАРОЙ (UTC) схеме. Чтобы ни
 * один стрик не сгорел в момент апдейта, "вчера" считается валидным, если оно
 * совпадает с локальным ИЛИ с UTC "вчера" (и то же самое для "сегодня").
 *
 * Как только last_active_date переписывается (после первого начисления после
 * апдейта), он уже в новом (локальном) формате — так что расширенное сравнение
 * нужно только на один переходный день на пользователя.
 */
export type DayKeyRelation = 'today' | 'yesterday' | 'day_before_yesterday' | 'other';

/**
 * Где ключ дня относительно reference: сегодня / вчера / позавчера / другое.
 *
 * зачем (Сверка 05.10, [STREAK] «today=2026-10-05 lastActive=2026-10-04 sameDay=true → same_day keep=8»): раньше
 * «тот же день» принимал ЛОКАЛЬНЫЙ ИЛИ UTC-день без приоритета. В UTC+N сразу после местной полуночи вчерашний
 * локальный ключ (10-04) равен UTC-сегодня (10-04) — серия не росла (8 вместо 9). Теперь локальная классификация
 * ПЕРВИЧНА; UTC-ключ — только запасной путь для старых записей, когда ключ не совпал ни с одним локальным днём.
 */
export function makeDayKeyComparators(localDayKey: (date?: Date) => string = getLocalDayKey) {
  const relation = (dayKey: string | null | undefined, reference: Date = new Date()): DayKeyRelation => {
    if (!dayKey) return 'other';
    const local = localDayKey(reference);
    if (dayKey === local) return 'today';
    if (dayKey === addLocalDays(local, -1)) return 'yesterday';
    if (dayKey === addLocalDays(local, -2)) return 'day_before_yesterday';
    // Переходный запасной путь: last_active_date, записанный старой UTC-схемой.
    const utc = getUtcDayKey(reference);
    if (dayKey === utc) return 'today';
    if (dayKey === addLocalDays(utc, -1)) return 'yesterday';
    if (dayKey === addLocalDays(utc, -2)) return 'day_before_yesterday';
    return 'other';
  };
  return {
    relation,
    isSameLocalOrUtcDay: (dayKey: string | null | undefined, reference: Date = new Date()) =>
      relation(dayKey, reference) === 'today',
    isYesterdayFlexible: (dayKey: string | null | undefined, reference: Date = new Date()) =>
      relation(dayKey, reference) === 'yesterday',
    /**
     * "Пропущен РОВНО 1 день" — dayKey совпадает с позавчера (локально; UTC — запасной путь).
     * freeze/repair/chain_shield прощают только один пропущенный день, не больше.
     */
    isDayBeforeYesterdayFlexible: (dayKey: string | null | undefined, reference: Date = new Date()) =>
      relation(dayKey, reference) === 'day_before_yesterday',
  };
}

const deviceDayKeyComparators = makeDayKeyComparators();

export const dayKeyRelation = deviceDayKeyComparators.relation;
export const isSameLocalOrUtcDay = deviceDayKeyComparators.isSameLocalOrUtcDay;
export const isYesterdayFlexible = deviceDayKeyComparators.isYesterdayFlexible;
export const isDayBeforeYesterdayFlexible = deviceDayKeyComparators.isDayBeforeYesterdayFlexible;

/**
 * Тестовый хелпер: локальный день для ПРОИЗВОЛЬНОГО IANA-пояса (а не пояса машины,
 * на которой выполняется код). Используется только в тестах — на устройстве
 * пользователя реальный локальный пояс уже отражён в date.getFullYear()/getMonth()/getDate().
 */
export function localDayKeyForTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

/* expo-router: не показываем как маршрут при авто-обнаружении файлов в app/ */
export default function __LocalDateRouteShim() {
  return null;
}
