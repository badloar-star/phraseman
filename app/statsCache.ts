/**
 * statsCache — module-level pre-load cache for the Statistics screen.
 *
 * Call `preloadStats()` on the Home screen focus so that by the time the
 * user navigates to streak_stats.tsx the data is already ready.
 * streak_stats.tsx reads `getStatsCache()` to initialise useState values,
 * preventing any visible loading flash.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkStreakLossPending } from './hall_of_fame_utils';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { getMistakePracticeReadyCount } from './mistake_practice_insights';
import { isStreakFreezeActiveToday, streakFreezeDateKey } from './streak_freeze';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { buildStatsActivityRows, type StatsActivityDay, type StatsActivityTimeDay } from '../modules/stats_activity_rows';
import { onAccountOwnerChanged } from './account_owner_change';

type StatsCacheStudyTarget = ReturnType<typeof storageStudyTarget>;

const STATS_PRELOAD_CACHE_KEY = 'stats_preload_cache_v5';

export type StatsCachedDay = StatsActivityDay;

export type StatsCachedTimeDay = StatsActivityTimeDay;

export interface StatsPreloadData {
  days: StatsCachedDay[];
  allDays: StatsCachedDay[];
  allTimeDays: StatsCachedTimeDay[];
  totalStreak: number;
  bestStreak: number;
  activeDays: number;
  freezeActive: boolean;
  premiumFreezeUsed: boolean;
  hadPremiumEver: boolean;
  myName: string;
  streakAtRisk: boolean;
  /** Готовые слова и фразы новой системы ошибок. */
  mistakePracticeDue: number;
  /** Scope for mistakePracticeDue only; streak and daily stats stay shared. */
  studyTarget: StatsCacheStudyTarget;
  pendingGiftCount: number;
  /** true once a successful preload has completed */
  loaded: boolean;
  updatedAt: number;
}

const DEFAULT_CACHE: StatsPreloadData = {
  days: [],
  allDays: [],
  allTimeDays: [],
  totalStreak: 0,
  bestStreak: 0,
  activeDays: 0,
  freezeActive: false,
  premiumFreezeUsed: false,
  hadPremiumEver: false,
  myName: '',
  streakAtRisk: false,
  mistakePracticeDue: 0,
  studyTarget: 'en',
  pendingGiftCount: 0,
  loaded: false,
  updatedAt: 0,
};

let _cache: StatsPreloadData = { ...DEFAULT_CACHE };
let _preloadInFlight = false;
let _hydratePromise: Promise<void> | null = null;

function normalizeDayRow(row: any): StatsCachedDay | null {
  const date = String(row?.date ?? '').trim();
  if (!date) return null;
  return {
    date,
    dayNum: String(row?.dayNum ?? new Date(`${date}T12:00:00`).getDate()),
    active: !!row?.active,
    streak: Math.max(0, Math.floor(Number(row?.streak) || 0)),
  };
}

function normalizeTimeDayRow(row: any): StatsCachedTimeDay | null {
  const date = String(row?.date ?? '').trim();
  if (!date) return null;
  const ms = Math.max(0, Math.floor(Number(row?.ms) || 0));
  return {
    date,
    dayNum: String(row?.dayNum ?? new Date(`${date}T12:00:00`).getDate()),
    ms,
    active: !!row?.active,
  };
}

function normalizeStatsCache(value: Partial<StatsPreloadData> | null | undefined): StatsPreloadData {
  const days = Array.isArray(value?.days)
    ? value.days.map(normalizeDayRow).filter((row): row is StatsCachedDay => !!row)
    : [];
  const allDays = Array.isArray(value?.allDays)
    ? value.allDays.map(normalizeDayRow).filter((row): row is StatsCachedDay => !!row)
    : [];
  const allTimeDays = Array.isArray(value?.allTimeDays)
    ? value.allTimeDays.map(normalizeTimeDayRow).filter((row): row is StatsCachedTimeDay => !!row)
    : [];

  return {
    ...DEFAULT_CACHE,
    days,
    allDays,
    allTimeDays,
    totalStreak: Math.max(0, Math.floor(Number(value?.totalStreak) || 0)),
    bestStreak: Math.max(0, Math.floor(Number(value?.bestStreak) || 0)),
    activeDays: Math.max(0, Math.floor(Number(value?.activeDays) || 0)),
    freezeActive: value?.freezeActive === true,
    premiumFreezeUsed: value?.premiumFreezeUsed === true,
    hadPremiumEver: value?.hadPremiumEver === true,
    myName: String(value?.myName ?? ''),
    streakAtRisk: value?.streakAtRisk === true,
    mistakePracticeDue: Math.max(0, Math.floor(Number(value?.mistakePracticeDue) || 0)),
    studyTarget: storageStudyTarget(value?.studyTarget),
    pendingGiftCount: Math.max(0, Math.floor(Number(value?.pendingGiftCount) || 0)),
    loaded: value?.loaded === true,
    updatedAt: Math.max(0, Number(value?.updatedAt) || 0),
  };
}

export function rememberStatsCache(next: Partial<StatsPreloadData>): StatsPreloadData {
  const normalized = normalizeStatsCache({
    ..._cache,
    ...next,
    loaded: true,
    updatedAt: Date.now(),
  });
  _cache = normalized;
  AsyncStorage.setItem(STATS_PRELOAD_CACHE_KEY, JSON.stringify(normalized)).catch((error: unknown) => {
    console.warn('[STATS-CACHE] persist failed', String((error as Error)?.message ?? error).slice(0, 160));
  });
  return normalized;
}

export async function hydrateStatsCacheFromStorage(): Promise<void> {
  if (_cache.loaded) return;
  if (_hydratePromise) return _hydratePromise;
  _hydratePromise = AsyncStorage.getItem(STATS_PRELOAD_CACHE_KEY)
    .then((raw) => {
      if (!raw || _cache.loaded) return;
      const parsed = normalizeStatsCache(JSON.parse(raw));
      if (parsed.loaded) _cache = parsed;
    })
    .catch((error: unknown) => {
      console.warn('[STATS-CACHE] hydrate failed', String((error as Error)?.message ?? error).slice(0, 160));
    })
    .finally(() => {
      _hydratePromise = null;
    });
  return _hydratePromise;
}

export function getStatsCache(studyTarget?: RuntimeStudyTarget): StatsPreloadData {
  const target = storageStudyTarget(studyTarget);
  if (_cache.studyTarget === target) return _cache;
  return {
    ..._cache,
    mistakePracticeDue: 0,
    studyTarget: target,
  };
}

/**
 * Kept for older call sites. Do not reset to defaults: the statistics screen
 * must keep showing the last good snapshot while fresh data loads invisibly.
 */
export function invalidateStatsCache(): void {
  _preloadInFlight = false;
}

async function buildFreshStatsSnapshot(studyTarget?: RuntimeStudyTarget): Promise<StatsPreloadData> {
  const todayStr = streakFreezeDateKey();

  const [
    streakVal,
    statsRaw,
    freezeRaw,
    freeUsedRaw,
    hadPrem,
    name,
    fgDaily,
    lastActiveRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('streak_count'),
    AsyncStorage.getItem('daily_stats'),
    AsyncStorage.getItem('streak_freeze'),
    AsyncStorage.getItem('premium_free_freeze_used'),
    AsyncStorage.getItem('had_premium_ever'),
    AsyncStorage.getItem('user_name'),
    getForegroundDailyMsMap(),
    AsyncStorage.getItem('last_active_date'),
  ]);

  const statsMap: Record<string, unknown> = statsRaw ? JSON.parse(statsRaw) : {};
  const currentStreak = Math.max(0, parseInt(streakVal || '0', 10) || 0);
  const activityRows = buildStatsActivityRows(statsMap, fgDaily, currentStreak, new Date(), lastActiveRaw);
  // зачем (жалоба «серия висит», 04.10; СПЕРВА ЛОГИ): откуда берутся отметки недели — счётчик, последний засчитанный день, локальный и UTC-день,
  // смещение пояса, время в приложении и итоговая отметка по каждому из последних 7 дней. Оставить: строка одна на пересчёт статистики.
  {
    const nowForLog = new Date();
    const last7 = (activityRows as { days: Array<{ date: string; active: boolean }> }).days.slice(-7)
      .map((d) => `${d.date}:${d.active ? 1 : 0}:${Math.round((fgDaily[d.date] ?? 0) / 1000)}s`).join(' ');
    console.log(`[STREAK-WEEK] stats:marks streak=${currentStreak} lastActive=${String(lastActiveRaw)} localDay=${streakFreezeDateKey()} utcDay=${nowForLog.toISOString().slice(0, 10)} tzOffsetMin=${nowForLog.getTimezoneOffset()} last7=${last7}`);
  }
  // зачем (баг 01.10): временная трассировка — что показывает «Твои результаты» и откуда (AsyncStorage streak_count vs дни активности).
  console.log(`[STREAK] stats:read streak_count=${String(streakVal)} -> ${currentStreak} best=${String((activityRows as { bestStreak?: number }).bestStreak)} activeDays=${Object.keys(statsMap).length}`);

  const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
  const freezeIsActive = isStreakFreezeActiveToday(freeze, todayStr);

  const target = storageStudyTarget(studyTarget);
  // зачем (PM-289, D70): баланс жемчуга статистике больше не нужен — валюта удалена.
  const [{ willLose }, mistakePracticeDue] = await Promise.all([
    checkStreakLossPending(),
    // зачем (PM-229): отказ чтения счётчика «Мои ошибки» не должен молча превращаться в 0 — пишем причину, значение по умолчанию прежнее.
    getMistakePracticeReadyCount(target).catch((error: unknown) => {
      console.warn('[STATS-CACHE] mistakes ready count read failed — 0', error instanceof Error ? error.message : String(error));
      return 0;
    }),
  ]);

  return normalizeStatsCache({
    ...activityRows,
    totalStreak: currentStreak,
    freezeActive: freezeIsActive,
    premiumFreezeUsed: freeUsedRaw === 'true',
    hadPremiumEver: hadPrem === '1',
    myName: name || '',
    streakAtRisk: willLose && !freezeIsActive,
    mistakePracticeDue,
    studyTarget: target,
    pendingGiftCount: 0,
    loaded: true,
    updatedAt: Date.now(),
  });
}

// зачем (аудит Optimistic UI, 04.10): общий промис не различал studyTarget — вызов для цели B получал результат, собранный для цели A.
// Дедупликация теперь по цели; одновременные вызовы ОДНОЙ цели по-прежнему делят один рефреш.
const _refreshPromises = new Map<string, Promise<StatsPreloadData | null>>();
// зачем (координатор 15.10, LOGOUT_WIPE_AUDIT 🔴): кэш в памяти принадлежит владельцу — при смене аккаунта без перезапуска JS B видел данные A.
onAccountOwnerChanged('stats_preload', () => {
  _cache = { ...DEFAULT_CACHE };
  _hydratePromise = null;
  _refreshPromises.clear();
});

export async function refreshStatsCache(studyTarget?: RuntimeStudyTarget): Promise<StatsPreloadData | null> {
  await hydrateStatsCacheFromStorage();
  // Конкурентные вызовы ждут текущий рефреш вместо возврата устаревшего кэша.
  const refreshKey = studyTarget ?? '';
  const inFlight = _refreshPromises.get(refreshKey);
  if (inFlight) return inFlight;
  _preloadInFlight = true;
  const refresh = buildFreshStatsSnapshot(studyTarget)
    .then((fresh) => rememberStatsCache(fresh))
    .catch((error: unknown) => {
      // зачем (PM-214 preflight, D158): немой catch прятал отказ сборки статистики — экран ждал
      // statsReady без единой строки в журнале. Поведение прежнее: старый кэш или null.
      console.warn('[STATS-CACHE] refresh failed', JSON.stringify({ hadCache: _cache.loaded, error: String((error as Error)?.message ?? error).slice(0, 160) }));
      return _cache.loaded ? _cache : null;
    })
    .finally(() => {
      _refreshPromises.delete(refreshKey);
      _preloadInFlight = _refreshPromises.size > 0;
    }) as Promise<StatsPreloadData | null>;
  _refreshPromises.set(refreshKey, refresh);
  return refresh;
}

/**
 * Pre-fetches all data needed by streak_stats.tsx.
 * Safe to call multiple times — concurrent calls are de-duplicated.
 * Does NOT throw; errors are swallowed so callers can fire-and-forget.
 */
export async function preloadStats(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await refreshStatsCache(studyTarget);
}

// зачем: PM-212 — чтение AsyncStorage при ИМПОРТЕ убрано: гидрацию осознанно
// запускает стартовый загрузчик в app/_layout.tsx (Promise.all прогрева), а
// streak_stats.tsx зовёт её перед чтением. Функция идемпотентна (_hydratePromise).

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
