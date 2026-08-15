import type { ArenaKeyValueStore } from './match_store';

/**
 * Тёплые снимки для остальных экранов Арены.
 *
 * Владелец (2026-08-13): «не должно быть видимой никогда нигде загрузки».
 * Главный экран уже рисуется прошлым снимком (`home_cache.ts`); здесь то же
 * самое, но для списков — история, топы, разбор.
 *
 * Отличие от `home_cache.ts` одно: там снимок чистится от того, что живёт
 * секундами (активный матч, очередь), потому что показать это устаревшим —
 * значит соврать. Здесь такого нет: сыгранные матчи и места в таблице не
 * меняются задним числом, и вчерашний список — это просто вчерашний список.
 *
 * Память читается СИНХРОННО: первый кадр уже со строками, а не с пустотой.
 * Диск переживает перезапуск приложения.
 */

export const ARENA_WARM_SCHEMA = 'arena-warm-list.v1' as const;
/** Дольше суток список не показывается: он перестаёт быть похожим на правду. */
export const ARENA_WARM_TTL_MS = 24 * 60 * 60 * 1_000;

export type ArenaWarmKey = 'history' | 'tops' | 'review' | 'store' | 'partner';

export type ArenaWarmEntry = Readonly<{
  schemaVersion: typeof ARENA_WARM_SCHEMA;
  savedAtWallMs: number;
  value: unknown;
}>;

const memory = new Map<ArenaWarmKey, ArenaWarmEntry>();

export function arenaWarmStorageKey(key: ArenaWarmKey): string {
  return `arena.warm.v1.${key}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function arenaWarmUsable(value: unknown, wallNowMs: number): ArenaWarmEntry | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== ARENA_WARM_SCHEMA) return null;
  const savedAtWallMs = Number(value.savedAtWallMs);
  if (!Number.isFinite(savedAtWallMs)) return null;
  // Снимок из будущего означает переведённые часы: доверять ему нельзя.
  if (savedAtWallMs > wallNowMs + 60_000) return null;
  if (wallNowMs - savedAtWallMs > ARENA_WARM_TTL_MS) return null;
  return { schemaVersion: ARENA_WARM_SCHEMA, savedAtWallMs: Math.trunc(savedAtWallMs), value: value.value };
}

/** Синхронно — им и рисуется первый кадр. */
export function arenaPeekWarm(key: ArenaWarmKey, wallNowMs: number): unknown {
  const entry = memory.get(key);
  if (!entry) return undefined;
  return arenaWarmUsable(entry, wallNowMs)?.value;
}

export function arenaRememberWarm(input: Readonly<{
  key: ArenaWarmKey;
  value: unknown;
  wallNowMs: number;
  store?: ArenaKeyValueStore;
}>): void {
  const entry: ArenaWarmEntry = {
    schemaVersion: ARENA_WARM_SCHEMA,
    savedAtWallMs: Math.trunc(input.wallNowMs),
    value: input.value,
  };
  memory.set(input.key, entry);
  if (input.store) {
    // Ошибка записи глотается: тёплый снимок — удобство, а не данные.
    void input.store.setItem(arenaWarmStorageKey(input.key), JSON.stringify(entry)).catch(() => {});
  }
}

export async function arenaLoadWarm(
  store: ArenaKeyValueStore,
  key: ArenaWarmKey,
  wallNowMs: number,
): Promise<unknown> {
  const fromMemory = arenaPeekWarm(key, wallNowMs);
  if (fromMemory !== undefined) return fromMemory;
  let raw: string | null = null;
  try {
    raw = await store.getItem(arenaWarmStorageKey(key));
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const usable = arenaWarmUsable(parsed, wallNowMs);
  if (!usable) return undefined;
  memory.set(key, usable);
  return usable.value;
}

/** Только для тестов: память общая на модуль. */
export function arenaResetWarm(): void {
  memory.clear();
}
