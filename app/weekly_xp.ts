import AsyncStorage from '@react-native-async-storage/async-storage';

export const WEEKLY_XP_KEY = 'weekly_xp';
export const WEEKLY_XP_PERIOD_START_KEY = 'weekly_xp_period_start';

/**
 * Returns ISO date (YYYY-MM-DD) of the most recent Monday at 00:00 UTC.
 * Aligned with resetWeeklyXpCron (Monday 00:00 UTC) so client-side period_start
 * matches the server-side reset boundary exactly.
 *
 * Pure function — no side effects, no AsyncStorage. Trivially testable.
 */
export function getCurrentWeekStartIso(now: Date = new Date()): string {
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = (utcDay + 6) % 7; // Mon→0, Tue→1, ..., Sun→6
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  ));
  const yyyy = monday.getUTCFullYear();
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Increment weekly XP counter in AsyncStorage. Mirrors XP-01 contract:
 * called from xp_manager.registerXP() right after user_total_xp is written.
 *
 * - delta <= 0 is a no-op (XP-01: only positive gains accumulate weekly).
 * - If stored period_start differs from current week, the counter resets
 *   (defensive: Cloud Function reset is the primary mechanism, but client-side
 *   self-heal protects offline-then-online scenarios where the cron ran while
 *   the device was offline and local cache is stale).
 * - Cloud sync via SYNC_KEYS picks up these keys → users/{uid}.progress.weekly_xp.
 */
export async function addWeeklyXp(delta: number): Promise<void> {
  if (!delta || delta <= 0) return;
  const currentPeriod = getCurrentWeekStartIso();
  const [storedXpRaw, storedPeriodRaw] = await Promise.all([
    AsyncStorage.getItem(WEEKLY_XP_KEY),
    AsyncStorage.getItem(WEEKLY_XP_PERIOD_START_KEY),
  ]);
  const storedPeriod = storedPeriodRaw ?? '';
  const storedXp = parseInt(storedXpRaw ?? '0', 10) || 0;
  const newXp = (storedPeriod === currentPeriod) ? storedXp + delta : delta;
  await AsyncStorage.multiSet([
    [WEEKLY_XP_KEY, String(newXp)],
    [WEEKLY_XP_PERIOD_START_KEY, currentPeriod],
  ]);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
