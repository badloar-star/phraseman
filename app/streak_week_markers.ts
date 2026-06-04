import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakWeekDayMarkerKind = 'freeze' | 'revive' | 'repair';

export const STREAK_WEEK_MARKERS_KEY = 'streak_week_day_markers_v1';

type StoredWeekMarkers = {
  weekKey: string;
  marks: Record<string, StreakWeekDayMarkerKind>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function streakWeekMarkerDateKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const time = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(time)) return streakWeekMarkerDateKey();
  return streakWeekMarkerDateKey(new Date(time + days * MS_PER_DAY));
}

export function streakWeekMarkerWeekKey(date: Date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
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
  const weekKey = streakWeekMarkerWeekKey(new Date(`${dateKey}T00:00:00.000Z`));
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
