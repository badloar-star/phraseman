import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistLegacyPersonalProgressScalar } from '../modules/phone-state/legacy_mirror';

type ProgressMap = Record<string, string | null | undefined>;

const DEV_SEED_STREAK_FLOOR = 500;

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseIntSafe = (value: unknown): number => {
  const n = parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

export type StreakRestoreState = {
  streak: unknown;
  lastActive?: unknown;
  streakLast?: unknown;
};

const dateKeyOrNull = (value: unknown): string | null =>
  isDateKey(value) ? value : null;

/**
 * Мерж между устройствами (в т.ч. в РАЗНЫХ часовых поясах). last_active_date
 * теперь пишется по локальной дате устройства (см. app/local_date.ts), а не UTC.
 * Сравнение здесь — чисто лексическое сравнение YYYY-MM-DD строк, оно корректно
 * отражает порядок календарных дат независимо от того, в каком поясе устройство
 * сформировало ключ: "2026-07-05" > "2026-07-04" всегда, невзирая на TZ.
 * Если два устройства в разных поясах активны каждое в СВОЙ локальный "сегодня",
 * но их календарные даты отличаются на день (например Токио уже 5-е число,
 * а LA ещё 4-е) — побеждает более поздняя дата. Это осознанный трейд-офф:
 * реальный стрик синхронизируется по «более продвинутому» устройству, а не
 * теряется — обратное (брать более раннюю дату) чаще давало бы устаревший стрик.
 */
/** Разница в календарных днях между двумя ключами YYYY-MM-DD (>= 0). */
function daysBetweenDateKeys(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00.000Z`);
  const b = Date.parse(`${later}T00:00:00.000Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86400000);
}

export function mergeStreakByActivityDate(
  local: StreakRestoreState,
  incoming: StreakRestoreState,
): { streak: number; lastActive: string | null } {
  const localStreak = Math.max(0, parseIntSafe(local.streak));
  const incomingStreak = Math.max(0, parseIntSafe(incoming.streak));
  const localDate = dateKeyOrNull(local.lastActive) ?? dateKeyOrNull(local.streakLast);
  const incomingDate = dateKeyOrNull(incoming.lastActive) ?? dateKeyOrNull(incoming.streakLast);

  if (localDate && incomingDate) {
    if (incomingDate === localDate) {
      return { streak: Math.max(localStreak, incomingStreak), lastActive: localDate };
    }
    const incomingIsFresher = incomingDate > localDate;
    const fresherDate = incomingIsFresher ? incomingDate : localDate;
    const stalerDate = incomingIsFresher ? localDate : incomingDate;
    const fresherStreak = incomingIsFresher ? incomingStreak : localStreak;
    const stalerStreak = incomingIsFresher ? localStreak : incomingStreak;

    // зачем (аудит 2026-08-24): дату задаёт свежая сторона — так было и раньше.
    // Но её СЧЁТЧИК брался вслепую, и цепочка на 50 дней обесценивалась до 1,
    // когда второе устройство (переустановка, новый телефон, откатившийся кэш)
    // отмечалось сегодня со стриком 1. Контракт владельца — «поздний синк не
    // откатывает значения» (tests/owner_direction_runtime_contract.test.ts),
    // XP и week_points уже сливаются максимумом.
    //
    // Максимум применим ТОЛЬКО когда даты соседние (разрыв в один день): тогда
    // свежая сторона — продолжение той же цепочки, и её меньшее значение
    // означает потерю данных, а не сгорание. При разрыве в два дня и больше
    // цепочка обязана быть сгоревшей — там побеждает счётчик свежей стороны,
    // иначе честно сгоревший стрик воскресал бы из устаревшего снимка облака.
    const gapDays = daysBetweenDateKeys(stalerDate, fresherDate);
    const streak = gapDays <= 1 ? Math.max(fresherStreak, stalerStreak) : fresherStreak;
    return { streak, lastActive: fresherDate };
  }

  // Одна сторона без даты: её счётчик не теряем — судить о сгорании нечем,
  // а дату задаёт та сторона, у которой она есть.
  if (incomingDate) return { streak: Math.max(localStreak, incomingStreak), lastActive: incomingDate };
  if (localDate) return { streak: Math.max(localStreak, incomingStreak), lastActive: localDate };
  return { streak: Math.max(localStreak, incomingStreak), lastActive: null };
}

function hasDevSeedFingerprint(data: ProgressMap): boolean {
  let score = 0;
  if (parseIntSafe(data.user_total_xp) === 100000) score += 1;
  if (parseIntSafe(data.shards_balance) === 100) score += 1;
  try {
    const login = JSON.parse(String(data.login_bonus_v1 ?? '{}'));
    if (parseIntSafe(login?.consecutiveDays) === 365) score += 1;
  } catch {}
  return score >= 2;
}

function activeDatesFromStats(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed)
      .filter(([date, value]) => {
        if (!isDateKey(date)) return false;
        if (typeof value === 'number') return value > 0;
        if (value && typeof value === 'object') {
          const points = parseIntSafe((value as Record<string, unknown>).points);
          return points > 0;
        }
        return false;
      })
      .map(([date]) => date)
      .sort();
  } catch {
    return [];
  }
}

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split('T')[0]!;
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function currentActivityRunFromStats(data: ProgressMap, today: string = todayKey()): number {
  const active = new Set([
    ...activeDatesFromStats(data.daily_stats),
    ...activeDatesFromStats(data.stats_daily_breakdown_v1),
  ]);
  if (active.size === 0) return 0;

  let cursor = active.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (active.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function normalizeDevSeededStreakValue(streak: number, data: ProgressMap, today: string = todayKey()): number {
  if (!Number.isFinite(streak) || streak < 0) return 0;
  if (streak < DEV_SEED_STREAK_FLOOR || !hasDevSeedFingerprint(data)) return streak;

  const evidencedRun = currentActivityRunFromStats(data, today);
  if (evidencedRun > 0) return evidencedRun;

  const lastActive = data.last_active_date ?? data.streak_last_date;
  if (lastActive === today || lastActive === addDays(today, -1)) return 1;
  return 0;
}

export async function repairDevSeededStreakInStorage(): Promise<number | null> {
  const keys = [
    'streak_count',
    'user_total_xp',
    'login_bonus_v1',
    'shards_balance',
    'daily_stats',
    'stats_daily_breakdown_v1',
    'last_active_date',
    'streak_last_date',
  ];
  const pairs = await AsyncStorage.multiGet(keys);
  const data: ProgressMap = {};
  for (const [key, value] of pairs) data[key] = value;

  const current = parseIntSafe(data.streak_count);
  const normalized = normalizeDevSeededStreakValue(current, data);
  if (normalized !== current) {
    await persistLegacyPersonalProgressScalar(AsyncStorage, 'streak_count', normalized);
    return normalized;
  }
  return null;
}

