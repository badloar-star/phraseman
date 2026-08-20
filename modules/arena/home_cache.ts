import type { ArenaKeyValueStore } from './match_store';

/**
 * Тёплый снимок главного экрана Арены.
 *
 * Владелец (2026-08-13, дословно): «не должно быть видимой никогда нигде
 * загрузки, всё сразу загружено должно быть».
 *
 * Экран Арены открывался пустым и рисовал «Загрузка…», пока сервер отвечал.
 * Данные при этом почти не меняются между заходами: ранг, звёзды, доступность
 * режимов. Значит правильный ответ — показать ПРОШЛЫЙ снимок мгновенно и
 * молча обновить его, когда придёт свежий. Ни одного лишнего запроса это не
 * добавляет: обновление и так делалось при каждом открытии.
 *
 * Два уровня. Память переживает переходы между экранами внутри сессии и
 * читается СИНХРОННО — то есть первый кадр уже с данными. Диск переживает
 * перезапуск приложения и читается асинхронно, но всё равно быстрее сети.
 *
 * Снимок — это ПОКАЗАННОЕ ПРОШЛОЕ, а не правда. Всё, что нельзя показывать
 * устаревшим (идёт ли матч прямо сейчас), из него вычищается: место в очереди
 * и активный матч живут секундами, и старое значение здесь хуже пустого.
 */

export const ARENA_HOME_CACHE_KEY = 'arena.home.warm.v1';
export const ARENA_HOME_CACHE_SCHEMA = 'arena-home-warm.v1' as const;
/** Дольше суток снимок не показывается: сезон и ранг за это время меняются. */
export const ARENA_HOME_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

export type ArenaHomeWarm = Readonly<{
  schemaVersion: typeof ARENA_HOME_CACHE_SCHEMA;
  savedAtWallMs: number;
  /** Сутки UTC, в которые снят снимок: по ним отсекаются дневные счётчики. */
  savedDayKey: string;
  home: Readonly<Record<string, unknown>> | null;
  expansion: Readonly<Record<string, unknown>> | null;
}>;

/** Ключ суток UTC. Тот же вид, что и на сервере: `YYYY-MM-DD`. */
export function arenaWarmDayKey(wallMs: number): string {
  return new Date(Math.max(0, Math.trunc(wallMs))).toISOString().slice(0, 10);
}

/**
 * Счётчики, которые верны только внутри своих суток. Показать вчерашние как
 * сегодняшние — значит соврать игроку, что он уже сыграл три матча и закрыл
 * половину дневных целей.
 */
const DAILY_PROFILE_FIELDS = ['dailyMatches', 'dailyWins', 'dailyFirstAnswers', 'dailyDayKey', 'todayKey'] as const;

function stripDailyCounters(home: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!home) return null;
  const profile = home.profile;
  if (!isRecord(profile)) return home;
  const nextProfile: Record<string, unknown> = { ...profile };
  for (const field of DAILY_PROFILE_FIELDS) delete nextProfile[field];
  return { ...home, profile: nextProfile };
}

/** Today and an unfinished run are only meaningful for the exact snapshot day. */
export function stripExpansionDaily(expansion: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!expansion) return null;
  const next = { ...expansion };
  delete next.today;
  delete next.activeRun;
  return next;
}

let warm: ArenaHomeWarm | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Вычищает всё, что нельзя показывать вчерашним. Активный матч и место в
 * очереди живут секундами: показать их из снимка значит предложить игроку
 * вернуться в матч, которого давно нет.
 */
export function arenaHomeWarmSanitize(home: unknown): Record<string, unknown> | null {
  if (!isRecord(home)) return null;
  const copy: Record<string, unknown> = { ...home };
  delete copy.activeMatch;
  delete copy.activeQueue;
  return copy;
}

export function arenaHomeWarmUsable(value: unknown, wallNowMs: number): ArenaHomeWarm | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== ARENA_HOME_CACHE_SCHEMA) return null;
  const savedAtWallMs = Number(value.savedAtWallMs);
  if (!Number.isFinite(savedAtWallMs)) return null;
  // Снимок из будущего означает переведённые часы: доверять ему нельзя.
  if (savedAtWallMs > wallNowMs + 60_000) return null;
  if (wallNowMs - savedAtWallMs > ARENA_HOME_CACHE_TTL_MS) return null;
  const savedDayKey = typeof value.savedDayKey === 'string' ? value.savedDayKey : '';
  const sameDay = savedDayKey === arenaWarmDayKey(wallNowMs);
  const home = isRecord(value.home) ? value.home : null;
  return {
    schemaVersion: ARENA_HOME_CACHE_SCHEMA,
    savedAtWallMs: Math.trunc(savedAtWallMs),
    savedDayKey,
    // Сутки сменились — дневные счётчики выбрасываются, остальное остаётся:
    // ранг и звёзды за ночь не портятся, а «сыграно сегодня» портится.
    home: sameDay ? home : stripDailyCounters(home),
    expansion: sameDay ? (isRecord(value.expansion) ? value.expansion : null) : stripExpansionDaily(isRecord(value.expansion) ? value.expansion : null),
  };
}

/** Синхронное чтение из памяти — им и рисуется первый кадр. */
export function arenaPeekHomeWarm(wallNowMs: number): ArenaHomeWarm | null {
  return warm ? arenaHomeWarmUsable(warm, wallNowMs) : null;
}

export function arenaRememberHomeWarm(input: Readonly<{
  home?: unknown;
  expansion?: unknown;
  wallNowMs: number;
  store?: ArenaKeyValueStore;
}>): ArenaHomeWarm {
  const next: ArenaHomeWarm = {
    schemaVersion: ARENA_HOME_CACHE_SCHEMA,
    savedAtWallMs: Math.trunc(input.wallNowMs),
    savedDayKey: arenaWarmDayKey(input.wallNowMs),
    home: input.home === undefined ? stripDailyCounters(warm?.home ?? null) : arenaHomeWarmSanitize(input.home),
    expansion: input.expansion === undefined
      ? stripExpansionDaily(warm?.expansion ?? null)
      : (isRecord(input.expansion) ? input.expansion : null),
  };
  warm = next;
  if (input.store) {
    // Ошибка записи глотается: тёплый снимок — удобство, а не данные.
    void input.store.setItem(ARENA_HOME_CACHE_KEY, JSON.stringify(next)).catch(() => {});
  }
  return next;
}

export async function arenaLoadHomeWarm(
  store: ArenaKeyValueStore,
  wallNowMs: number,
): Promise<ArenaHomeWarm | null> {
  if (warm) return arenaPeekHomeWarm(wallNowMs);
  let raw: string | null = null;
  try {
    raw = await store.getItem(ARENA_HOME_CACHE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const usable = arenaHomeWarmUsable(parsed, wallNowMs);
  if (usable) warm = usable;
  return usable;
}

/** Только для тестов: память процесса общая на весь модуль. */
export function arenaResetHomeWarm(): void {
  warm = null;
}
