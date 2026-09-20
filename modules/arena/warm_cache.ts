import type { ArenaKeyValueStore } from './match_store';
import type { ArenaStudyTarget } from './target_registry';

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

export const ARENA_WARM_SCHEMA = 'arena-warm-list.v2' as const;
const ARENA_LEGACY_WARM_SCHEMA = 'arena-warm-list.v1' as const;
/** Дольше суток список не показывается: он перестаёт быть похожим на правду. */
export const ARENA_WARM_TTL_MS = 24 * 60 * 60 * 1_000;

export type ArenaWarmKey = 'history' | 'tops' | 'review' | 'store' | 'partner';

export type ArenaWarmEntry = Readonly<{
  schemaVersion: typeof ARENA_WARM_SCHEMA;
  studyTarget: ArenaStudyTarget;
  savedAtWallMs: number;
  value: unknown;
}>;

const memory = new Map<string, ArenaWarmEntry>();

function memoryKey(key: ArenaWarmKey, studyTarget: ArenaStudyTarget): string {
  return `${studyTarget}:${key}`;
}

function legacyWarmStorageKey(key: ArenaWarmKey): string {
  return `arena.warm.v1.${key}`;
}

export function arenaWarmStorageKey(key: ArenaWarmKey, studyTarget: ArenaStudyTarget): string {
  return `arena.warm.v2.${key}.${studyTarget}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function arenaWarmUsable(
  value: unknown,
  wallNowMs: number,
  expectedTarget?: ArenaStudyTarget,
): ArenaWarmEntry | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== ARENA_WARM_SCHEMA) return null;
  const studyTarget = value.studyTarget;
  if (studyTarget !== 'en' && studyTarget !== 'es' && studyTarget !== 'fr' && studyTarget !== 'de') return null;
  if (expectedTarget !== undefined && studyTarget !== expectedTarget) return null;
  const savedAtWallMs = Number(value.savedAtWallMs);
  if (!Number.isFinite(savedAtWallMs)) return null;
  // Снимок из будущего означает переведённые часы: доверять ему нельзя.
  if (savedAtWallMs > wallNowMs + 60_000) return null;
  if (wallNowMs - savedAtWallMs > ARENA_WARM_TTL_MS) return null;
  return { schemaVersion: ARENA_WARM_SCHEMA, studyTarget, savedAtWallMs: Math.trunc(savedAtWallMs), value: value.value };
}

/** Синхронно — им и рисуется первый кадр. */
export function arenaPeekWarm(key: ArenaWarmKey, studyTarget: ArenaStudyTarget, wallNowMs: number): unknown {
  const entry = memory.get(memoryKey(key, studyTarget));
  if (!entry) return undefined;
  return arenaWarmUsable(entry, wallNowMs, studyTarget)?.value;
}

export function arenaRememberWarm(input: Readonly<{
  key: ArenaWarmKey;
  studyTarget: ArenaStudyTarget;
  value: unknown;
  wallNowMs: number;
  store?: ArenaKeyValueStore;
}>): void {
  const entry: ArenaWarmEntry = {
    schemaVersion: ARENA_WARM_SCHEMA,
    studyTarget: input.studyTarget,
    savedAtWallMs: Math.trunc(input.wallNowMs),
    value: input.value,
  };
  memory.set(memoryKey(input.key, input.studyTarget), entry);
  if (input.store) {
    // Ошибка записи глотается: тёплый снимок — удобство, а не данные.
    void input.store.setItem(arenaWarmStorageKey(input.key, input.studyTarget), JSON.stringify(entry)).catch(() => {});
  }
}

export async function arenaLoadWarm(
  store: ArenaKeyValueStore,
  key: ArenaWarmKey,
  studyTarget: ArenaStudyTarget,
  wallNowMs: number,
): Promise<unknown> {
  const fromMemory = arenaPeekWarm(key, studyTarget, wallNowMs);
  if (fromMemory !== undefined) return fromMemory;
  let raw: string | null = null;
  try {
    raw = await store.getItem(arenaWarmStorageKey(key, studyTarget));
  } catch {
    return undefined;
  }
  if (!raw && studyTarget === 'en') {
    // Untagged v1 snapshots predate multilingual Arena. They are eligible for
    // exactly one explicit English migration and are never exposed elsewhere.
    try {
      const legacyRaw = await store.getItem(legacyWarmStorageKey(key));
      const legacy = legacyRaw ? JSON.parse(legacyRaw) as Record<string, unknown> : null;
      if (legacy?.schemaVersion === ARENA_LEGACY_WARM_SCHEMA) {
        const candidate = { ...legacy, schemaVersion: ARENA_WARM_SCHEMA, studyTarget: 'en' };
        const migrated = arenaWarmUsable(candidate, wallNowMs, 'en');
        if (migrated) {
          await store.setItem(arenaWarmStorageKey(key, 'en'), JSON.stringify(migrated));
          await store.removeItem(legacyWarmStorageKey(key));
          memory.set(memoryKey(key, 'en'), migrated);
          return migrated.value;
        }
      }
    } catch {
      return undefined;
    }
  }
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const usable = arenaWarmUsable(parsed, wallNowMs, studyTarget);
  if (!usable) return undefined;
  memory.set(memoryKey(key, studyTarget), usable);
  return usable.value;
}

/** Только для тестов: память общая на модуль. */
export function arenaResetWarm(): void {
  memory.clear();
}
