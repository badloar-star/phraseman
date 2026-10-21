/**
 * «Серия вдвоём» — огонь пары (идея 1, решение владельца 21.10; макет docs/design/v2-app/friends-full.html#streak).
 *
 * зачем: огонь пары растёт, если сегодня занимались оба; пропустил один — пламя тускнеет до полуночи, и в строке друга
 * появляется «Позвать»; один пропущенный день — серия с нуля. Считаем ЧИСТО на телефоне из active_days_v1 обоих:
 * свои — из AsyncStorage, друга — из friendsGetProfiles (уже загружается, кэш 30 мин). Ни чтений, ни записей Firestore.
 *
 * Формат дней — together_days.ts ({ anchor, bits }, окно 120 дней).
 */
import { addLocalDays } from '../local_date';
import { MAX_WINDOW_DAYS, decodeActiveDays, type ActiveDays } from './together_days';

/** Состояние огня пары на сегодня. */
export type PairFlameState =
  /** Оба занимались сегодня — огонь горит, в строке шеврон. */
  | 'both_today'
  /** Я сегодня занимался, друг ещё нет — огонь ждёт до полуночи, в строке «Позвать». */
  | 'friend_pending'
  /** Друг уже занимался, я ещё нет — огонь ждёт, в строке «Ждёт тебя». */
  | 'me_pending'
  /** Серия жива со вчера, сегодня ещё никто — огонь ждёт, в строке «Позвать». */
  | 'none_today'
  /** Серия от двух дней оборвалась недавно — серый 0, «Серия прервалась». */
  | 'broken'
  /** Серии вдвоём нет — обычная подпись строки. */
  | 'none';

export type PairWeekDay = Readonly<{
  dayKey: string;
  mine: boolean;
  friend: boolean;
  today: boolean;
  future: boolean;
}>;

export type PairStreakView = Readonly<{
  state: PairFlameState;
  /** Текущая серия: подряд дни, когда занимались оба, по сегодня (если оба сегодня) или по вчера. */
  streak: number;
  /** Лучшая серия пары в окне 120 дней. */
  best: number;
  /** Длина оборвавшейся серии для «прервалась» (0, если обрыва нет). */
  lostStreak: number;
  /** Неделя пары с понедельника: занимались оба / один / никто, сегодня, будущее. */
  week: readonly PairWeekDay[];
}>;

/** С какой длины оборвавшаяся серия заслуживает строки «Серия прервалась» (один общий день — ещё не серия). */
export const PAIR_BROKEN_MIN_STREAK = 2;
/** Сколько дней после обрыва строка «Серия прервалась» остаётся видна, дальше — обычная подпись. */
export const PAIR_BROKEN_VISIBLE_DAYS = 7;
/** Вехи серии вдвоём — как у личной серии (7 · 30 · 100). */
export const PAIR_STREAK_MILESTONES: readonly number[] = [7, 30, 100];

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** День недели ключа 'YYYY-MM-DD': 0 — понедельник … 6 — воскресенье. */
function weekdayMondayFirst(dayKey: string): number {
  const ms = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return 0;
  return (new Date(ms).getUTCDay() + 6) % 7;
}

/** Длина подряд идущих общих дней назад от start (включительно). */
function runBackFrom(start: string, both: (dayKey: string) => boolean): number {
  let count = 0;
  let day = start;
  while (count < MAX_WINDOW_DAYS && both(day)) {
    count += 1;
    day = addLocalDays(day, -1);
  }
  return count;
}

/** Лучшая серия: самая длинная цепочка подряд общих дней в окне. */
function bestRun(common: readonly string[]): number {
  if (common.length === 0) return 0;
  const sorted = [...common].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = addLocalDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Огонь пары на сегодня. todayKey — локальный день телефона (getLocalDayKey), его же пишет active_days_v1.
 * Нет данных у одного из двоих — состояние 'none' без огня (ничего не выдумываем).
 */
export function computePairStreak(
  mine: ActiveDays | null | undefined,
  friend: ActiveDays | null | undefined,
  todayKey: string,
): PairStreakView {
  const empty: PairStreakView = { state: 'none', streak: 0, best: 0, lostStreak: 0, week: buildWeek(new Set(), new Set(), todayKey) };
  if (!DAY_KEY_RE.test(todayKey)) return empty;
  const a = decodeActiveDays(mine);
  const b = decodeActiveDays(friend);
  if (a.size === 0 || b.size === 0) return { ...empty, week: buildWeek(a, b, todayKey) };

  const both = (dayKey: string) => a.has(dayKey) && b.has(dayKey);
  const common = [...a].filter((dayKey) => b.has(dayKey));
  const best = bestRun(common);
  const week = buildWeek(a, b, todayKey);
  const yesterday = addLocalDays(todayKey, -1);

  if (both(todayKey)) {
    return { state: 'both_today', streak: runBackFrom(todayKey, both), best, lostStreak: 0, week };
  }
  const alive = runBackFrom(yesterday, both);
  if (alive > 0) {
    const state: PairFlameState = a.has(todayKey) ? 'friend_pending' : b.has(todayKey) ? 'me_pending' : 'none_today';
    return { state, streak: alive, best, lostStreak: 0, week };
  }
  // Обрыв: последняя общая цепочка закончилась позавчера или раньше, но не дальше PAIR_BROKEN_VISIBLE_DAYS.
  for (let back = 2; back <= PAIR_BROKEN_VISIBLE_DAYS + 1; back += 1) {
    const dayKey = addLocalDays(todayKey, -back);
    if (both(dayKey)) {
      const lost = runBackFrom(dayKey, both);
      if (lost >= PAIR_BROKEN_MIN_STREAK) return { state: 'broken', streak: 0, best, lostStreak: lost, week };
      break;
    }
  }
  return { state: 'none', streak: 0, best, lostStreak: 0, week };
}

function buildWeek(a: ReadonlySet<string>, b: ReadonlySet<string>, todayKey: string): readonly PairWeekDay[] {
  if (!DAY_KEY_RE.test(todayKey)) return [];
  const monday = addLocalDays(todayKey, -weekdayMondayFirst(todayKey));
  const out: PairWeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayKey = addLocalDays(monday, i);
    out.push({ dayKey, mine: a.has(dayKey), friend: b.has(dayKey), today: dayKey === todayKey, future: dayKey > todayKey });
  }
  return out;
}

/**
 * Веха, которую пара только что взяла: серия была меньше вехи, стала не меньше. Только при 'both_today' —
 * веху празднуем в момент, когда огонь зажёгся у обоих. null — вехи нет.
 */
export function pairStreakMilestoneReached(previousStreak: number, view: PairStreakView): number | null {
  if (view.state !== 'both_today') return null;
  const prev = Number.isFinite(previousStreak) ? Math.max(0, Math.floor(previousStreak)) : 0; // guard-ok: нормализация входа, не баланс
  for (const milestone of PAIR_STREAK_MILESTONES) {
    if (prev < milestone && view.streak >= milestone) return milestone;
  }
  return null;
}

/** Цвет огня по вехам — те же стадии, что у личной серии: до 7 обычный, от 30 голубой, от 100 белый. */
export type PairFlameStage = 'base' | 'blue' | 'white';
export function pairFlameStage(streak: number): PairFlameStage {
  if (streak >= 100) return 'white';
  if (streak >= 30) return 'blue';
  return 'base';
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном */
export default function __RouteShim() { return null; }
