import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_REFERRAL_ACTIVITY_KEYS = [
  'user_total_xp',
  'weekly_xp',
  'streak_count',
  'lesson1_pass_count',
  'lesson1_best_score',
  'lesson1_progress',
  'lesson_progress_v2::fr::lesson1_pass_count',
  'lesson_progress_v2::fr::lesson1_best_score',
  'lesson_progress_v2::fr::1',
  'daily_stats',
  'stats_daily_breakdown_v1',
  'stats_daily_breakdown',
] as const;

function positiveNumber(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function progressHasAnsweredCell(raw: unknown): boolean {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed)
      && parsed.some((cell) => cell === 'correct' || cell === 'replay_correct' || cell === 'wrong');
  } catch {
    return false;
  }
}

function jsonObjectHasPositiveNumber(raw: unknown): boolean {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    return Object.values(parsed as Record<string, unknown>).some((value) => {
      if (positiveNumber(value)) return true;
      if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(positiveNumber);
      }
      return false;
    });
  } catch {
    return false;
  }
}

export function referralLocalActivityFromMap(data: Record<string, string | null | undefined>): boolean {
  if (positiveNumber(data.user_total_xp)) return true;
  if (positiveNumber(data.weekly_xp)) return true;
  if (positiveNumber(data.streak_count)) return true;
  if (positiveNumber(data.lesson1_pass_count)) return true;
  if (positiveNumber(data.lesson1_best_score)) return true;
  if (positiveNumber(data['lesson_progress_v2::fr::lesson1_pass_count'])) return true;
  if (positiveNumber(data['lesson_progress_v2::fr::lesson1_best_score'])) return true;
  if (progressHasAnsweredCell(data.lesson1_progress)) return true;
  if (progressHasAnsweredCell(data['lesson_progress_v2::fr::1'])) return true;
  if (jsonObjectHasPositiveNumber(data.daily_stats)) return true;
  if (jsonObjectHasPositiveNumber(data.stats_daily_breakdown_v1)) return true;
  if (jsonObjectHasPositiveNumber(data.stats_daily_breakdown)) return true;
  return false;
}

export async function hasLocalReferralExistingAccountActivity(): Promise<boolean> {
  const pairs = await AsyncStorage
    .multiGet([...LOCAL_REFERRAL_ACTIVITY_KEYS])
    .catch(() => [] as [string, string | null][]);
  return referralLocalActivityFromMap(Object.fromEntries(pairs) as Record<string, string | null>);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
