// ════════════════════════════════════════════════════════════════════════════
// storage_snapshot.ts — read-through снапшот AsyncStorage (§122, PM-220, холодный старт)
//
// зачем: на холодном старте одни и те же ключи (premium_*, intro_full_access_*, coin_rank_v1, streak_count, user_frame,
// stable_auth_link_cache_v1) читаются 5–16 раз РАЗНЫМИ потребителями, последовательно, и каждое чтение — ход через мост в SQLite
// (замер 04.10: calls ≈545 при цели < 450). Здесь ключ читается из хранилища ОДИН раз, дальше отвечает память.
//
// Почему это не «долгоживущий кэш списка ключей» (его Ядро запретило для денежных журналов):
//  1. Снапшот подписан на КАЖДУЮ запись через AsyncStorage (subscribeStorageMutations из охраны null-bind) — запись в ключ
//     мимо снапшота всё равно выбрасывает его из памяти (на старте и на финише записи): устаревшее значение запись не переживёт.
//  2. Пока по ключу идёт запись, в память ничего не кладётся; чтение идёт в хранилище либо отдаёт ожидаемое значение
//     собственной записи снапшота.
//  3. Денежные журналы (energy ledger, level_spin_star, журнал рун, клиентские шарды) в снапшот НЕ кладутся никогда —
//     SNAPSHOT_DENY_PATTERNS: такое чтение/запись сразу идёт в хранилище.
//  4. Ключ, зависящий от аккаунта, содержит id владельца → смена аккаунта даёт другой ключ; clear() сбрасывает всё.
// Логи: [SNAPSHOT-RT] — miss/hydrate/bypass/каждый catch, итог hit/miss раз за окно (console.warn: в release log/info вырезаны).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMutationTrackingActive, subscribeStorageMutations, type StorageMutationEvent } from './storage_mutation_bus';

/** Ключи, которые НИКОГДА не живут в памяти снапшота (деньги: руны, монеты, энергия, шарды операций). */
export const SNAPSHOT_DENY_PATTERNS: readonly RegExp[] = Object.freeze([
  /^level_spin_star_/,
  /^practice_rune_journal_v1:/,
  /^paid_level_spin/i,
  /^energy_/,
  /^client_shard_operation/,
  /operation_ledger/i,
]);

const MISS_LOG_LIMIT = 40;
const SUMMARY_AFTER_MS = 20_000;

type Entry = { value: string | null };

const entries = new Map<string, Entry>();
const pendingWrites = new Map<string, { count: number; value: string | null }>();
const writesInFlight = new Map<string, number>();
const keyEpoch = new Map<string, number>();
const readsInFlight = new Map<string, { epoch: number; promise: Promise<string | null> }>();
let globalEpoch = 0;
let globalWritesInFlight = 0;
let subscribed = false;
let summaryTimer: ReturnType<typeof setTimeout> | null = null;
const stats = { hits: 0, misses: 0, hydrated: 0, bypass: 0, writes: 0, errors: 0 };
const denyLogged = new Set<string>();

export function isSnapshotDeniedKey(key: string): boolean {
  return SNAPSHOT_DENY_PATTERNS.some((pattern) => pattern.test(key));
}

function epochOf(key: string): number {
  return (keyEpoch.get(key) ?? 0) + globalEpoch;
}

function warn(message: string, detail?: unknown): void {
  console.warn(`[SNAPSHOT-RT] ${message}`, detail === undefined ? '' : detail);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function onMutation(event: StorageMutationEvent): void {
  if (event.keys === 'all') {
    entries.clear();
    readsInFlight.clear();
    globalEpoch += 1;
    globalWritesInFlight = Math.max(0, globalWritesInFlight + (event.phase === 'start' ? 1 : -1));
    return;
  }
  for (const key of event.keys) {
    entries.delete(key);
    readsInFlight.delete(key);
    keyEpoch.set(key, (keyEpoch.get(key) ?? 0) + 1);
    const next = (writesInFlight.get(key) ?? 0) + (event.phase === 'start' ? 1 : -1);
    if (next > 0) writesInFlight.set(key, next);
    else writesInFlight.delete(key);
  }
}

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  subscribeStorageMutations(onMutation);
  summaryTimer = setTimeout(() => {
    summaryTimer = null;
    warn(`summary windowMs=${SUMMARY_AFTER_MS} ${JSON.stringify(stats)} cached=${entries.size}`);
  }, SUMMARY_AFTER_MS);
  (summaryTimer as { unref?: () => void }).unref?.();
}

function canCache(key: string): boolean {
  return globalWritesInFlight === 0 && !writesInFlight.has(key);
}

/** Синхронно: значение, если ключ уже в памяти (или ожидает запись); undefined — снапшот ничего не знает. */
export function peekStoredItem(key: string): string | null | undefined {
  if (isSnapshotDeniedKey(key)) return undefined;
  const pending = pendingWrites.get(key);
  if (pending) return pending.value;
  const entry = entries.get(key);
  return entry ? entry.value : undefined;
}

export function readStoredItem(key: string): Promise<string | null> {
  // слежение за записями не поставлено (тесты, ранний импорт) — снапшот прозрачен: память без подписки на записи была бы небезопасна
  if (!isMutationTrackingActive()) return AsyncStorage.getItem(key);
  ensureSubscribed();
  if (isSnapshotDeniedKey(key)) {
    stats.bypass += 1;
    if (!denyLogged.has(key)) {
      denyLogged.add(key);
      warn(`bypass key=${key} reason=money_journal_denied`);
    }
    return AsyncStorage.getItem(key);
  }
  const pending = pendingWrites.get(key);
  if (pending) {
    stats.hits += 1;
    return Promise.resolve(pending.value);
  }
  const entry = entries.get(key);
  if (entry) {
    stats.hits += 1;
    return Promise.resolve(entry.value);
  }
  const shared = readsInFlight.get(key);
  if (shared && shared.epoch === epochOf(key)) return shared.promise;
  stats.misses += 1;
  if (stats.misses <= MISS_LOG_LIMIT) warn(`miss key=${key} writesInFlight=${writesInFlight.get(key) ?? 0}`);
  const epoch = epochOf(key);
  const cacheable = canCache(key);
  const promise: Promise<string | null> = AsyncStorage.getItem(key).then((value) => {
    if (cacheable && epoch === epochOf(key) && canCache(key)) entries.set(key, { value });
    if (readsInFlight.get(key)?.promise === promise) readsInFlight.delete(key);
    return value;
  }, (error: unknown) => {
    stats.errors += 1;
    warn(`read:catch key=${key}`, errorText(error));
    if (readsInFlight.get(key)?.promise === promise) readsInFlight.delete(key);
    throw error;
  });
  if (cacheable) readsInFlight.set(key, { epoch, promise });
  return promise;
}

/**
 * multiGet с ответом из памяти; недостающие ключи читаются ОДНИМ multiGet, а параллельные вызовы с теми же ключами
 * присоединяются к уже летящему чтению (single-flight по ключу, как у readStoredItem). Порядок и форма — как у AsyncStorage.
 */
export async function readStoredItems(keys: readonly string[]): Promise<ReadonlyArray<readonly [string, string | null]>> {
  if (!isMutationTrackingActive()) return AsyncStorage.multiGet([...keys]);
  ensureSubscribed();
  const result = new Map<string, string | null>();
  const joined: Array<Promise<void>> = [];
  const missing: string[] = [];
  for (const key of keys) {
    if (result.has(key) || missing.includes(key)) continue;
    const peeked = peekStoredItem(key);
    if (peeked !== undefined) {
      stats.hits += 1;
      result.set(key, peeked);
      continue;
    }
    const shared = isSnapshotDeniedKey(key) ? undefined : readsInFlight.get(key);
    if (shared && shared.epoch === epochOf(key)) {
      joined.push(shared.promise.then((value) => { result.set(key, value); }));
      continue;
    }
    missing.push(key);
  }
  if (missing.length > 0) {
    const epochs = new Map(missing.map((key) => [key, epochOf(key)] as const));
    const cacheable = new Map(missing.map((key) => [key, canCache(key)] as const));
    const batch = AsyncStorage.multiGet(missing);
    for (const key of missing) {
      if (isSnapshotDeniedKey(key) || !cacheable.get(key)) continue;
      const promise: Promise<string | null> = batch.then((rows) => {
        const row = rows.find(([rowKey]) => rowKey === key);
        return row ? row[1] : null;
      });
      readsInFlight.set(key, { epoch: epochs.get(key) ?? 0, promise });
      promise.then(() => {
        if (readsInFlight.get(key)?.promise === promise) readsInFlight.delete(key);
      }, () => {
        if (readsInFlight.get(key)?.promise === promise) readsInFlight.delete(key);
      });
    }
    let rows: ReadonlyArray<readonly [string, string | null]>;
    try {
      rows = await batch;
    } catch (error) {
      stats.errors += 1;
      warn(`readMany:catch keys=${missing.length}`, errorText(error));
      throw error;
    }
    stats.misses += missing.length;
    if (stats.misses <= MISS_LOG_LIMIT) warn(`miss many=${missing.length} first=${missing[0]}`);
    for (const [key, value] of rows) {
      result.set(key, value);
      if (!isSnapshotDeniedKey(key) && cacheable.get(key) && epochs.get(key) === epochOf(key) && canCache(key)) {
        entries.set(key, { value });
      }
    }
  }
  await Promise.all(joined);
  return keys.map((key) => [key, result.get(key) ?? null] as const);
}

/** Прогрев ключей одним multiGet (старт): последующие чтения — из памяти. */
export async function hydrateStoredKeys(keys: readonly string[]): Promise<void> {
  const started = Date.now();
  try {
    await readStoredItems(keys.filter((key) => !isSnapshotDeniedKey(key)));
    stats.hydrated += keys.length;
    warn(`hydrate keys=${keys.length} ms=${Date.now() - started}`);
  } catch (error) {
    warn('hydrate:catch', errorText(error));
  }
}

async function writeThrough(key: string, value: string | null): Promise<void> {
  if (!isMutationTrackingActive() || isSnapshotDeniedKey(key)) {
    stats.bypass += 1;
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
    return;
  }
  ensureSubscribed();
  stats.writes += 1;
  // сначала память (мгновенный отклик), потом хранилище; при ошибке — откат: ожидаемое значение снимается, чтение пойдёт в хранилище
  const previous = pendingWrites.get(key);
  pendingWrites.set(key, { count: (previous?.count ?? 0) + 1, value });
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch (error) {
    stats.errors += 1;
    warn(`write:catch key=${key}`, errorText(error));
    entries.delete(key);
    throw error;
  } finally {
    const current = pendingWrites.get(key);
    if (current && current.count > 1) pendingWrites.set(key, { count: current.count - 1, value: current.value });
    else pendingWrites.delete(key);
  }
  // запись подтверждена и других записей по ключу нет — значение можно держать в памяти
  if (!pendingWrites.has(key) && canCache(key)) entries.set(key, { value });
}

export function writeStoredItem(key: string, value: string): Promise<void> {
  return writeThrough(key, value);
}

export function removeStoredItem(key: string): Promise<void> {
  return writeThrough(key, null);
}

export function snapshotRtStats(): Readonly<typeof stats & { cached: number }> {
  return Object.freeze({ ...stats, cached: entries.size });
}

export function resetStorageSnapshotForTests(): void {
  entries.clear();
  pendingWrites.clear();
  writesInFlight.clear();
  keyEpoch.clear();
  readsInFlight.clear();
  denyLogged.clear();
  globalEpoch = 0;
  globalWritesInFlight = 0;
  subscribed = false;
  if (summaryTimer) clearTimeout(summaryTimer);
  summaryTimer = null;
  stats.hits = 0;
  stats.misses = 0;
  stats.hydrated = 0;
  stats.bypass = 0;
  stats.writes = 0;
  stats.errors = 0;
}
