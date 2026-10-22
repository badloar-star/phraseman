/**
 * «Итог недели друга» (идея 6, docs/design/v2-app/friends-full.html #week) — своя неделя, посчитанная телефоном.
 *
 * зачем (закон владельца: «телефон решает и выдаёт сразу, сервер только хранит записи, чтобы друг их забрал»; координатор 22.10):
 * вместо ленты событий (прежняя стоила ~9 000 чтений в сутки) — одна запись friends_week_v1 в синхронизируемом прогрессе. Она едет
 * в users/{uid}.progress тем же патчем синхронизации, а friendsGetProfiles отдаёт её друзьям тем же чтением users/{uid}: 0 новых
 * чтений и 0 отдельных записей. В записи две недели — идущая (cur) и закрытая (prev): друг в понедельник видит прошлую неделю, даже
 * если я уже открыл приложение в новой. Здесь только чистая арифметика и разбор чужой записи — без хранилища и сети.
 */

export const FRIEND_WEEK_STORAGE_KEY = 'friends_week_v1';
/** Дружба младше — итога ещё нет (макет: «Первый итог — после 7 дней дружбы»). */
export const FRIEND_WEEK_MIN_FRIEND_DAYS = 7;

export type FriendWeekBestDay = Readonly<{
  /** 0 — понедельник … 6 — воскресенье. */
  dow: number;
  lessons: number;
}>;

export type FriendWeekSummary = Readonly<{
  /** Локальный понедельник недели, YYYY-MM-DD. */
  week: string;
  /** Серия дней на конец недели (для идущей — на момент последнего обновления). */
  streak: number;
  /** Занятий за неделю. */
  lessons: number;
  /** Дней с занятиями, 0…7. */
  days: number;
  /** Лучший этаж Пика за неделю; null — не поднимался. */
  floor: number | null;
  /** На сколько этажей выше прошлой недели («7 ↑2» макета); null — не выше или сравнить не с чем. */
  rise: number | null;
  /** День с наибольшим числом занятий; null — занятий не было. */
  best: FriendWeekBestDay | null;
}>;

export type FriendWeekRecord = Readonly<{
  v: 1;
  /** «Показывать друзьям мою неделю» выключено — сервер запись друзьям не отдаёт. */
  hidden: boolean;
  cur: FriendWeekSummary | null;
  prev: FriendWeekSummary | null;
}>;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const MAX_STREAK = 100_000;
const MAX_WEEK_LESSONS = 2_000;
const MAX_FLOOR = 999;

function dayKeyToUtcMs(dayKey: string): number | null {
  if (!DAY_KEY.test(dayKey)) return null;
  const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  const back = new Date(ms);
  // 2026-02-31 и подобное — не дата
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? ms : null;
}

function utcMsToDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** День ± n. Арифметика в полдень UTC не зависит от перевода часов. */
export function addWeekDays(dayKey: string, n: number): string {
  const ms = dayKeyToUtcMs(dayKey);
  return ms === null ? dayKey : utcMsToDayKey(ms + n * DAY_MS);
}

/** Понедельник недели, в которую входит день. */
export function weekStartOf(dayKey: string): string {
  const ms = dayKeyToUtcMs(dayKey);
  if (ms === null) return dayKey;
  const dow = (new Date(ms).getUTCDay() + 6) % 7;
  return utcMsToDayKey(ms - dow * DAY_MS);
}

export function weekDayKeys(week: string): readonly string[] {
  return Array.from({ length: 7 }, (_, i) => addWeekDays(week, i));
}

function int(value: unknown, max: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

export type FriendWeekInput = Readonly<{
  week: string;
  /** Занятий по дням (ключ — день YYYY-MM-DD). */
  lessonsByDay: Readonly<Record<string, number>>;
  /** Дни с любой активностью (active_days_v1). */
  activeDays: ReadonlySet<string>;
  streak: number;
  floor: number | null;
  /** Этаж прошлой недели — для подъёма; null — неизвестен. */
  floorBefore?: number | null;
}>;

export function summarizeFriendWeek(input: FriendWeekInput): FriendWeekSummary {
  let lessons = 0;
  let days = 0;
  let best: FriendWeekBestDay | null = null;
  const dayKeys = weekDayKeys(input.week);
  for (let dow = 0; dow < dayKeys.length; dow += 1) {
    const day = dayKeys[dow]!;
    const n = int(input.lessonsByDay[day], MAX_WEEK_LESSONS);
    lessons += n;
    if (n > 0 || input.activeDays.has(day)) days += 1;
    // при равенстве — более поздний день: «лучший день» ближе к итогу недели
    if (n > 0 && (best === null || n >= best.lessons)) best = { dow, lessons: n };
  }
  const floor = input.floor === null ? null : int(input.floor, MAX_FLOOR) || null;
  const before = input.floorBefore ?? null;
  const rise = floor !== null && before !== null && floor > before ? floor - before : null;
  return { week: input.week, streak: int(input.streak, MAX_STREAK), lessons: Math.min(lessons, MAX_WEEK_LESSONS), days, floor, rise, best };
}

/** Серия на конец дня `endDay` по дням активности: подряд идущие активные дни назад от него (окно active_days — 120 дней). */
export function streakEndingAt(activeDays: ReadonlySet<string>, endDay: string, maxDays = 120): number {
  let n = 0;
  let day = endDay;
  while (n < maxDays && activeDays.has(day)) {
    n += 1;
    day = addWeekDays(day, -1);
  }
  return n;
}

function mergeClosedWeek(calc: FriendWeekSummary, old: FriendWeekSummary | null): FriendWeekSummary {
  if (!old) return calc;
  // дневные счётчики могли обрезаться или прийти с другого устройства позже — берём большее, ничего не теряем
  const best = !calc.best ? old.best : !old.best || calc.best.lessons >= old.best.lessons ? calc.best : old.best;
  return {
    week: calc.week,
    streak: old.streak,
    lessons: Math.max(calc.lessons, old.lessons),
    days: Math.max(calc.days, old.days),
    floor: old.floor ?? calc.floor,
    // подъём закрытой недели посчитан, пока она шла (тогда была известна неделя перед ней)
    rise: old.rise,
    best,
  };
}

export type MyFriendWeekInput = Readonly<{
  todayKey: string;
  stored: FriendWeekRecord | null;
  lessonsByDay: Readonly<Record<string, number>>;
  activeDays: ReadonlySet<string>;
  streakNow: number;
  /** Лучший этаж Пика идущей недели; null — не поднимался или данных нет. */
  floorThisWeek: number | null;
}>;

/**
 * Новая своя запись. Идущая неделя считается заново; закрытая — тоже из тех же дневных данных (занятия в воскресенье после
 * последнего обновления не теряются), а серия и этаж закрытой недели — из прежней записи, если она была.
 */
export function nextMyFriendWeekRecord(input: MyFriendWeekInput): FriendWeekRecord {
  const thisWeek = weekStartOf(input.todayKey);
  const lastWeek = addWeekDays(thisWeek, -7);
  const old = input.stored;
  const oldThis = old?.cur?.week === thisWeek ? old.cur : null;
  const oldLast = old?.cur?.week === lastWeek ? old.cur : old?.prev?.week === lastWeek ? old.prev : null;
  const floorNow = input.floorThisWeek ?? null;
  const floor = floorNow === null ? oldThis?.floor ?? null : Math.max(floorNow, oldThis?.floor ?? 0);
  const cur = summarizeFriendWeek({
    week: thisWeek,
    lessonsByDay: input.lessonsByDay,
    activeDays: input.activeDays,
    streak: input.streakNow,
    floor,
    floorBefore: oldLast?.floor ?? null,
  });
  const lastCalc = summarizeFriendWeek({
    week: lastWeek,
    lessonsByDay: input.lessonsByDay,
    activeDays: input.activeDays,
    streak: streakEndingAt(input.activeDays, addWeekDays(lastWeek, 6)),
    floor: null,
  });
  const hadLastWeek = lastCalc.days > 0 || lastCalc.lessons > 0 || oldLast !== null;
  return { v: 1, hidden: old?.hidden === true, cur, prev: hadLastWeek ? mergeClosedWeek(lastCalc, oldLast) : null };
}

/** Закрытая неделя, которую видит смотрящий сейчас: его прошлая неделя. Скрытая запись или другая неделя — null. */
export function friendWeekToShow(record: FriendWeekRecord | null, viewerTodayKey: string): FriendWeekSummary | null {
  if (!record || record.hidden) return null;
  const lastWeek = addWeekDays(weekStartOf(viewerTodayKey), -7);
  if (record.prev?.week === lastWeek) return record.prev;
  // друг ещё не открывал приложение в новой неделе — его «идущая» и есть прошлая
  if (record.cur?.week === lastWeek) return record.cur;
  return null;
}

function parseSummary(raw: unknown): FriendWeekSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.week !== 'string' || dayKeyToUtcMs(r.week) === null || weekStartOf(r.week) !== r.week) return null;
  const bestRaw = r.best && typeof r.best === 'object' && !Array.isArray(r.best) ? (r.best as Record<string, unknown>) : null;
  const dow = Math.floor(Number(bestRaw?.dow));
  const bestLessons = int(bestRaw?.lessons, MAX_WEEK_LESSONS);
  const floor = r.floor === null || r.floor === undefined ? null : int(r.floor, MAX_FLOOR) || null;
  return {
    week: r.week,
    streak: int(r.streak, MAX_STREAK),
    lessons: int(r.lessons, MAX_WEEK_LESSONS),
    days: Math.min(int(r.days, 7), 7),
    floor,
    rise: floor === null ? null : int(r.rise, MAX_FLOOR) || null,
    best: bestRaw && Number.isFinite(dow) && dow >= 0 && dow <= 6 && bestLessons > 0 ? { dow, lessons: bestLessons } : null,
  };
}

/** Разбор записи (своей из хранилища или чужой из профиля друга): строгий — данные друга недоверенные. */
export function parseFriendWeekRecord(raw: unknown): FriendWeekRecord | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (r.v !== 1) return null;
  const cur = parseSummary(r.cur);
  const prev = parseSummary(r.prev);
  if (!cur && !prev && r.hidden !== true) return null;
  return { v: 1, hidden: r.hidden === true, cur, prev };
}

/** Постоянный порядок ключей — одинаковая строка для одинаковой записи (сравнение без лишних записей в хранилище). */
export function serializeFriendWeekRecord(record: FriendWeekRecord): string {
  const s = (w: FriendWeekSummary | null) => (w
    ? { week: w.week, streak: w.streak, lessons: w.lessons, days: w.days, floor: w.floor, rise: w.rise, best: w.best ? { dow: w.best.dow, lessons: w.best.lessons } : null }
    : null);
  return JSON.stringify({ v: 1, hidden: record.hidden, cur: s(record.cur), prev: s(record.prev) });
}

/** ISO-неделя (UTC) — тот же ключ, что у недели Пика (spire_week_v1, functions/src/friends_profiles.ts currentWeekKey). */
export function isoWeekKeyUtc(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
