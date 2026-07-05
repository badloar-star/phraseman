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
export function isSameLocalOrUtcDay(dayKey: string | null | undefined, reference: Date = new Date()): boolean {
  if (!dayKey) return false;
  return dayKey === getLocalDayKey(reference) || dayKey === getUtcDayKey(reference);
}

export function isYesterdayFlexible(dayKey: string | null | undefined, reference: Date = new Date()): boolean {
  if (!dayKey) return false;
  const localYesterday = getLocalYesterdayKey(reference);
  const utcYesterday = addLocalDays(getUtcDayKey(reference), -1);
  return dayKey === localYesterday || dayKey === utcYesterday;
}

/**
 * "Пропущен РОВНО 1 день" — dayKey совпадает с позавчера (по local ИЛИ UTC схеме).
 * Используется там, где раньше было `lastActive >= dayBeforeStr` в связке с явным
 * исключением "сегодня"/"вчера" выше по коду: freeze/repair/chain_shield прощают
 * только один пропущенный день, не больше.
 */
export function isDayBeforeYesterdayFlexible(dayKey: string | null | undefined, reference: Date = new Date()): boolean {
  if (!dayKey) return false;
  const localDayBefore = addLocalDays(getLocalDayKey(reference), -2);
  const utcDayBefore = addLocalDays(getUtcDayKey(reference), -2);
  return dayKey === localDayBefore || dayKey === utcDayBefore;
}

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
