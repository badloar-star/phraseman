import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDayKey } from './local_date';

export type StreakWeekDayMarkerKind = 'freeze' | 'revive' | 'repair';

export const STREAK_WEEK_MARKERS_KEY = 'streak_week_day_markers_v1';

type StoredWeekMarkers = {
  weekKey: string;
  marks: Record<string, StreakWeekDayMarkerKind>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ключ дня, соответствующий UTC-midnight конкретного Date. Используется ТОЛЬКО
 * для round-trip арифметики уже существующих ключей (addDaysToDateKey и
 * recordStreakWeekMarker разбирают ключ через `${dateKey}T00:00:00.000Z`, затем
 * снова сворачивают в ключ этой функцией) — это чистая арифметика ключей, не
 * связанная с локальным/UTC "сегодня" пользователя.
 */
function dateKeyFromUtcMidnight(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Ключ "сегодня" БЕЗ явного Date — здесь важна локальная дата устройства (см.
 * app/local_date.ts), иначе вечером в UTC+N или утром в UTC-N маркер недели
 * ляжет не в тот день/неделю.
 */
export function streakWeekMarkerDateKey(date?: Date): string {
  return date ? dateKeyFromUtcMidnight(date) : getLocalDayKey();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const time = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(time)) return streakWeekMarkerDateKey();
  return dateKeyFromUtcMidnight(new Date(time + days * MS_PER_DAY));
}

function weekKeyFromDayKey(dayKey: string): string {
  const ms = Date.parse(`${dayKey}T00:00:00.000Z`);
  const utc = new Date(Number.isFinite(ms) ? ms : Date.now());
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Неделя для УЖЕ ИЗВЕСТНОГО ключа дня (используется при записи маркера для
 * конкретной прошедшей даты — recordStreakWeekMarker).
 */
export function streakWeekMarkerWeekKeyForDayKey(dayKey: string): string {
  return weekKeyFromDayKey(dayKey);
}

/**
 * Неделя "сейчас" — если Date не передан, использует ЛОКАЛЬНЫЙ день устройства
 * (см. app/local_date.ts). Если Date передан явно (тесты, симуляция конкретного
 * момента) — интерпретируется как ЛОКАЛЬНЫЙ календарный день этого момента,
 * т.к. это реальный wall-clock момент "сейчас", а не ключ из хранилища.
 */
export function streakWeekMarkerWeekKey(date?: Date): string {
  const dayKey = date ? getLocalDayKey(date) : getLocalDayKey();
  return weekKeyFromDayKey(dayKey);
}

export function weekIndexFromDateKey(dateKey: string): number | null {
  const time = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(time)) return null;
  return (new Date(time).getUTCDay() + 6) % 7;
}

function normalizeStoredMarkers(raw: string | null, weekKey: string): StoredWeekMarkers {
  if (!raw) return { weekKey, marks: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredWeekMarkers>;
    if (!parsed || parsed.weekKey !== weekKey || !parsed.marks || typeof parsed.marks !== 'object') {
      return { weekKey, marks: {} };
    }
    return { weekKey, marks: parsed.marks };
  } catch {
    return { weekKey, marks: {} };
  }
}

export async function recordStreakWeekMarker(
  dateKey: string,
  kind: StreakWeekDayMarkerKind,
): Promise<void> {
  const weekKey = streakWeekMarkerWeekKeyForDayKey(dateKey);
  const stored = normalizeStoredMarkers(await AsyncStorage.getItem(STREAK_WEEK_MARKERS_KEY), weekKey);
  stored.marks[dateKey] = kind;
  await AsyncStorage.setItem(STREAK_WEEK_MARKERS_KEY, JSON.stringify(stored));
}

export async function recordMissedStreakWeekMarkersEndingYesterday(
  kind: StreakWeekDayMarkerKind,
  missedDays: number = 1,
  todayKey: string = streakWeekMarkerDateKey(),
): Promise<void> {
  const count = Math.max(1, Math.floor(Number(missedDays) || 1));
  for (let offset = count; offset >= 1; offset -= 1) {
    await recordStreakWeekMarker(addDaysToDateKey(todayKey, -offset), kind);
  }
}

export async function readCurrentStreakWeekMarkers(
  date: Date = new Date(),
): Promise<Array<StreakWeekDayMarkerKind | null>> {
  const weekKey = streakWeekMarkerWeekKey(date);
  const stored = normalizeStoredMarkers(await AsyncStorage.getItem(STREAK_WEEK_MARKERS_KEY), weekKey);
  const result: Array<StreakWeekDayMarkerKind | null> = new Array(7).fill(null);
  Object.entries(stored.marks).forEach(([dateKey, kind]) => {
    const idx = weekIndexFromDateKey(dateKey);
    if (idx !== null) result[idx] = kind;
  });
  return result;
}

export default function __StreakWeekMarkersRouteShim() {
  return null;
}
