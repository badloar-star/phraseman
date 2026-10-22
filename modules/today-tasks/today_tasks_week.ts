// ════════════════════════════════════════════════════════════════════════
// today_tasks_week.ts — итог дня «Сегодня» за последние дни для карточки «Неделя · N из 6 дней».
//
// зачем (владелец 22.10 выбрал вариант 2 scenes-compact.html: под «Заданиями дня» карточка «Неделя» с кольцами по дням; координатор:
// вариант А — «итог дня на телефоне, 7 последних дней в отдельном ключе, без сети»): хранилище заданий держит только сегодняшний день,
// поэтому при смене дня оно отдаёт сюда вчерашний набор (прогресс и цели трёх заданий — те же числа, что у колец), а карточка читает
// 6 дней до сегодняшнего. Только устройство: ключ на владельца (как today_tasks_v1), Firestore не читается и не пишется; дни до
// выпуска — пустые кольца (честно: факта нет). Смена аккаунта сбрасывает память. Журнал — [TODAY-WEEK].
// ════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../app/account_owner_change';
import type { TodayTasksDayState } from './today_tasks_core';
import { todayTaskViewCounter } from './today_tasks_view';

const LOG = '[TODAY-WEEK]';
export const TODAY_WEEK_KEY_PREFIX = 'today_tasks_week_v1:';
/** Сколько прошедших дней хранится (карточке нужно 6 до сегодняшнего; седьмой — запас на смену часового пояса). */
export const TODAY_WEEK_DAYS_KEPT = 7;
/** Сколько дней до сегодняшнего показывает карточка «Неделя». */
export const TODAY_WEEK_WINDOW = 6;

export type TodayWeekTriple = readonly [number, number, number];
export type TodayWeekDay = Readonly<{ dayKey: string; progress: TodayWeekTriple; targets: TodayWeekTriple }>;
/** Клетка карточки: день и его итог; null — факта нет (приложение в тот день не открывали или запись была до выпуска). */
export type TodayWeekCell = Readonly<{ dayKey: string; day: TodayWeekDay | null }>;

const memory = new Map<string, readonly TodayWeekDay[]>();
onAccountOwnerChanged('today_tasks_week', () => {
  memory.clear();
});

const errText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const keyOf = (ownerKey: string): string => `${TODAY_WEEK_KEY_PREFIX}${ownerKey}`;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function triple(values: readonly number[]): TodayWeekTriple {
  const at = (i: number): number => {
    const v = values[i];
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  };
  return [at(0), at(1), at(2)];
}

/** Итог дня из набора хранилища: прогресс и цели трёх заданий — как у колец (todayTaskViewCounter: видео — минуты из 10). */
export function todayWeekDayOf(state: TodayTasksDayState): TodayWeekDay | null {
  if (!DAY_KEY.test(state.dayKey) || state.tasks.length === 0) return null;
  const counters = state.tasks.slice(0, 3).map((task) => todayTaskViewCounter(task));
  const targets = triple(counters.map((c) => c.target));
  const progress = triple(counters.map((c, i) => Math.min(c.progress, targets[i] ?? 0)));
  return Object.freeze({ dayKey: state.dayKey, progress, targets });
}

/** Добавить или заменить день и оставить последние TODAY_WEEK_DAYS_KEPT по ключу дня. Чистая функция. */
export function mergeTodayWeek(days: readonly TodayWeekDay[], day: TodayWeekDay): readonly TodayWeekDay[] {
  const rest = days.filter((d) => d.dayKey !== day.dayKey);
  return Object.freeze([...rest, day].sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0)).slice(-TODAY_WEEK_DAYS_KEPT));
}

/** Разбор записи с диска; всё непохожее на день отбрасывается (битая запись — пустая неделя, а не падение). */
export function parseTodayWeek(raw: string | null): readonly TodayWeekDay[] {
  if (!raw) return Object.freeze([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(LOG, 'parse:broken_json', JSON.stringify({ error: errText(error), length: raw.length })); // guard-ok: причина, неделя пустая
    return Object.freeze([]);
  }
  const list = parsed && typeof parsed === 'object' && Array.isArray((parsed as { days?: unknown }).days) ? (parsed as { days: unknown[] }).days : [];
  const days: TodayWeekDay[] = [];
  for (const item of list) {
    const d = item as Partial<{ dayKey: unknown; progress: unknown; targets: unknown }>;
    if (typeof d.dayKey !== 'string' || !DAY_KEY.test(d.dayKey) || !Array.isArray(d.progress) || !Array.isArray(d.targets)) continue;
    days.push(Object.freeze({ dayKey: d.dayKey, progress: triple(d.progress as number[]), targets: triple(d.targets as number[]) }));
  }
  return days.reduce<readonly TodayWeekDay[]>((acc, day) => mergeTodayWeek(acc, day), Object.freeze([]));
}

/** Записать итог дня владельца (вызывает хранилище заданий при смене дня). Ошибка записи не ломает новый день — только журнал. */
export async function recordTodayWeekDay(ownerKey: string, state: TodayTasksDayState): Promise<void> {
  const day = todayWeekDayOf(state);
  if (!day) {
    console.log(LOG, 'record:skip', JSON.stringify({ reason: 'no_day', dayKey: state.dayKey, tasks: state.tasks.length })); // guard-ok: ранний выход
    return;
  }
  try {
    const before = memory.get(ownerKey) ?? parseTodayWeek(await AsyncStorage.getItem(keyOf(ownerKey)));
    const next = mergeTodayWeek(before, day);
    await AsyncStorage.setItem(keyOf(ownerKey), JSON.stringify({ schemaVersion: 1, days: next }));
    memory.set(ownerKey, next);
    console.log(LOG, 'record', JSON.stringify({ dayKey: day.dayKey, progress: day.progress, targets: day.targets, kept: next.length })); // guard-ok: одна строка на смену дня
  } catch (error) {
    console.warn(LOG, 'record:failed', JSON.stringify({ dayKey: day.dayKey, error: errText(error) })); // guard-ok: причина; день просто не попадёт в неделю
  }
}

/** Синхронно из памяти процесса — карточка стоит уже в первом кадре при повторном открытии. null — памяти нет. */
export function peekTodayWeek(ownerKey: string): readonly TodayWeekDay[] | null {
  return memory.get(ownerKey) ?? null;
}

/** Неделя владельца: память → диск. Сбой чтения — пустая неделя с причиной в журнале. */
export async function readTodayWeek(ownerKey: string): Promise<readonly TodayWeekDay[]> {
  const cached = memory.get(ownerKey);
  if (cached) return cached;
  try {
    const days = parseTodayWeek(await AsyncStorage.getItem(keyOf(ownerKey)));
    memory.set(ownerKey, days);
    console.log(LOG, 'read', JSON.stringify({ source: 'disk', days: days.length })); // guard-ok: одна строка на первое чтение
    return days;
  } catch (error) {
    console.warn(LOG, 'read:failed', JSON.stringify({ error: errText(error) })); // guard-ok: причина, неделя пустая
    return Object.freeze([]);
  }
}

/** Ключ дня на `back` дней раньше (локальный календарь, как todayLocalDayKey). */
export function todayWeekShiftDayKey(dayKey: string, back: number): string {
  const m = DAY_KEY.exec(dayKey) ? dayKey.split('-').map(Number) : null;
  if (!m) return dayKey;
  const d = new Date(m[0], m[1] - 1, m[2] - back, 12, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Шесть дней до сегодняшнего по порядку (самый ранний первым) и их итоги. */
export function todayWeekWindow(days: readonly TodayWeekDay[], todayKey: string): readonly TodayWeekCell[] {
  const byKey = new Map(days.map((d) => [d.dayKey, d] as const));
  return Object.freeze(Array.from({ length: TODAY_WEEK_WINDOW }, (_, i) => {
    const dayKey = todayWeekShiftDayKey(todayKey, TODAY_WEEK_WINDOW - i);
    return Object.freeze({ dayKey, day: byKey.get(dayKey) ?? null });
  }));
}

/** Сколько дней окна с занятием (хоть одно задание сдвинулось) — «5 из 6 дней» эталона. */
export function todayWeekActiveDays(cells: readonly TodayWeekCell[]): number {
  return cells.filter((c) => c.day !== null && c.day.progress.some((v) => v > 0)).length;
}

/** Только для тестов: сбросить память. */
export function __resetTodayWeekMemory(): void {
  memory.clear();
}
