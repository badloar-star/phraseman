// ════════════════════════════════════════════════════════════════════════════
// async_storage_null_bind_guard.ts — глобальная страховка от краша
//   "java.lang.IllegalArgumentException: the bind value at index N is null"
// Also guards multiGet/multiRemove because Android SQLite binds batch keys too.
//
// Native AsyncStorage (Android SQLite) биндит ключ И значение как строковый
// параметр и падает, если в пару multiSet/multiMerge просочился null/undefined.
// Здесь мы один раз оборачиваем multiSet/multiMerge на уровне модуля, чтобы:
//   1. (всегда) санитизировать пары — null/undefined значение → '' , битый
//      ключ → пара отбрасывается, и приложение НЕ падает на старте;
//   2. (в dev) залогировать ТОЧНЫЙ список ключей-нарушителей + JS-стек, чтобы
//      найти настоящий источник null в коде.
//
// Импортируется первым в index.js — до запуска expo-router и любых стартовых
// миграций, которые пишут в AsyncStorage.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import { DebugLogger } from './debug-logger';

type Pair = readonly [unknown, unknown];
type Key = unknown;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

/** Возвращает индексы/ключи пар, где ключ или значение не пригодны для SQLite-бинда. */
function findOffenders(pairs: ReadonlyArray<Pair>): Array<{ index: number; key: unknown; value: unknown }> {
  const offenders: Array<{ index: number; key: unknown; value: unknown }> = [];
  pairs.forEach((pair, index) => {
    const key = pair?.[0];
    const value = pair?.[1];
    const badKey = typeof key !== 'string' || key.length === 0;
    const badValue = value === null || value === undefined || typeof value !== 'string';
    if (badKey || badValue) offenders.push({ index, key, value });
  });
  return offenders;
}

function findBadKeys(keys: ReadonlyArray<Key>): Array<{ index: number; key: unknown }> {
  const offenders: Array<{ index: number; key: unknown }> = [];
  keys.forEach((key, index) => {
    if (typeof key !== 'string' || key.length === 0) offenders.push({ index, key });
  });
  return offenders;
}

/** Новый массив, где каждый ключ/значение гарантированно строки; битые ключи отброшены. */
function sanitize(pairs: ReadonlyArray<Pair>): [string, string][] {
  const safe: [string, string][] = [];
  for (const pair of pairs) {
    const key = pair?.[0];
    if (typeof key !== 'string' || key.length === 0) continue;
    const value = pair[1];
    safe.push([key, value === null || value === undefined ? '' : String(value)]);
  }
  return safe;
}

function sanitizeKeys(keys: ReadonlyArray<Key>): string[] {
  const safe: string[] = [];
  for (const key of keys) {
    if (typeof key === 'string' && key.length > 0) safe.push(key);
  }
  return safe;
}

let installed = false;

// зачем ([COLD-START-IO], store-release 03.10, callers=): getAllKeys шёл ~14 раз за холодный старт (денежные журналы рун и
// энергии). Долгоживущий кэш списка ключей ЗАПРЕЩЁН (ревью Ядра: ключи пишут десятки модулей, устаревший список = пропущенная
// операция = потеря или двойное начисление). Поэтому только single-flight: вызовы, пришедшие, пока нативный getAllKeys ещё
// летит, получают его результат; результат живёт до завершения вызова и дальше НЕ хранится — последовательный вызов всегда
// идёт в нативный слой. Любая запись (JS-API и нативные мутаторы), начавшаяся или закончившаяся с момента старта вызова,
// отцепляет его от новых подписчиков: присоединиться можно только к чтению, под которым записей не было.
let mutationEpoch = 0;
let mutationsInFlight = 0;
let keysInFlight: { epoch: number; promise: Promise<readonly string[]> } | null = null;

export function resetAsyncStorageKeyListSingleFlightForTests(): void {
  mutationEpoch = 0;
  mutationsInFlight = 0;
  keysInFlight = null;
}

// зачем (§122, read-through снапшот): подписчики видят КАЖДУЮ запись через AsyncStorage (старт и финиш, с ключами), чтобы
// память снапшота не могла пережить запись мимо него. keys === 'all' — очистка всего хранилища.
export type StorageMutationEvent = Readonly<{ phase: 'start' | 'end'; keys: readonly string[] | 'all' }>;
const mutationListeners = new Set<(event: StorageMutationEvent) => void>();

export function subscribeStorageMutations(listener: (event: StorageMutationEvent) => void): () => void {
  mutationListeners.add(listener);
  return () => { mutationListeners.delete(listener); };
}

function emitMutation(event: StorageMutationEvent): void {
  for (const listener of mutationListeners) {
    try {
      listener(event);
    } catch (error) {
      console.warn('[SNAPSHOT-RT] подписчик записи упал', error instanceof Error ? error.message : String(error));
    }
  }
}

function mutationKeys(name: string, args: unknown[]): readonly string[] | 'all' {
  const first = args[0];
  if (name === 'clear') return 'all';
  if (name === 'setItem' || name === 'removeItem' || name === 'mergeItem') {
    return typeof first === 'string' ? [first] : [];
  }
  if (!Array.isArray(first)) return [];
  if (name === 'multiRemove') return first.filter((key): key is string => typeof key === 'string');
  return first
    .map((pair) => (Array.isArray(pair) ? pair[0] : undefined))
    .filter((key): key is string => typeof key === 'string');
}

function noteMutationStart(keys: readonly string[] | 'all'): void {
  mutationEpoch += 1;
  mutationsInFlight += 1;
  keysInFlight = null;
  emitMutation({ phase: 'start', keys });
}

function noteMutationEnd(keys: readonly string[] | 'all'): void {
  mutationEpoch += 1;
  mutationsInFlight = Math.max(0, mutationsInFlight - 1);
  keysInFlight = null;
  emitMutation({ phase: 'end', keys });
}

/** Оборачивает мутатор: эпоха меняется на старте и на финише (успех или ошибка), кэш ключей сбрасывается. */
function trackMutation<A extends unknown[]>(name: string, original: (...args: A) => unknown): (this: unknown, ...args: A) => unknown {
  return function tracked(this: unknown, ...args: A): unknown {
    const keys = mutationKeys(name, args);
    noteMutationStart(keys);
    let result: unknown;
    try {
      result = original.apply(this, args);
    } catch (error) {
      noteMutationEnd(keys);
      throw error;
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then(
        (value) => { noteMutationEnd(keys); return value; },
        (error: unknown) => { noteMutationEnd(keys); throw error; },
      );
    }
    noteMutationEnd(keys);
    return result;
  };
}

export function installAsyncStorageNullBindGuard(): void {
  if (installed) return;
  installed = true;

  const store = AsyncStorage as unknown as {
    multiGet?: (keys: ReadonlyArray<Key>, cb?: unknown) => Promise<unknown>;
    multiSet?: (pairs: ReadonlyArray<Pair>, cb?: unknown) => Promise<unknown>;
    multiRemove?: (keys: ReadonlyArray<Key>, cb?: unknown) => Promise<unknown>;
    multiMerge?: (pairs: ReadonlyArray<Pair>, cb?: unknown) => Promise<unknown>;
  };

  const wrap = (name: 'multiSet' | 'multiMerge') => {
    const original = store[name];
    if (typeof original !== 'function') return;
    store[name] = function patched(this: unknown, pairs: ReadonlyArray<Pair>, cb?: unknown) {
      const list = Array.isArray(pairs) ? pairs : [];
      if (isDev) {
        const offenders = findOffenders(list);
        if (offenders.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[asyncstorage-null-bind] ${name}: ${offenders.length} bad pair(s) intercepted (sanitized). Offenders:`,
            offenders.map((o) => ({ index: o.index, key: o.key, valueType: typeof o.value, value: o.value })),
          );
          // eslint-disable-next-line no-console
          console.warn('[asyncstorage-null-bind] call stack:', new Error('multiSet null-bind source').stack);
        }
      }
      return (original as (p: ReadonlyArray<Pair>, c?: unknown) => Promise<unknown>).call(this, sanitize(list), cb);
    } as typeof original;
  };

  wrap('multiSet');
  wrap('multiMerge');

  // getAllKeys: single-flight, см. комментарий выше. Мутаторы оборачиваются ПОСЛЕ санитайзеров, чтобы эпоха считалась на внешнем слое.
  const keyStore = AsyncStorage as unknown as Record<string, unknown>;
  const originalGetAllKeys = keyStore.getAllKeys;
  if (typeof originalGetAllKeys === 'function') {
    keyStore.getAllKeys = function cachedGetAllKeys(this: unknown, cb?: unknown) {
      if (typeof cb === 'function') return (originalGetAllKeys as (c?: unknown) => unknown).call(this, cb);
      if (keysInFlight && keysInFlight.epoch === mutationEpoch && mutationsInFlight === 0) {
        return keysInFlight.promise.then((keys) => keys.slice());
      }
      const epoch = mutationEpoch;
      const promise = (originalGetAllKeys as () => Promise<readonly string[]>).call(this).then((keys) => {
        const stable: readonly string[] = Array.isArray(keys) ? keys.slice() : keys;
        if (keysInFlight && keysInFlight.promise === promise) keysInFlight = null;
        return stable;
      }, (error: unknown) => {
        if (keysInFlight && keysInFlight.promise === promise) keysInFlight = null;
        console.warn('[COLD-START-IO] getAllKeys single-flight: нативный вызов упал', error instanceof Error ? error.message : String(error));
        throw error;
      });
      if (mutationsInFlight === 0) keysInFlight = { epoch, promise };
      return promise.then((keys) => (Array.isArray(keys) ? keys.slice() : keys));
    };
  }
  for (const name of ['setItem', 'removeItem', 'mergeItem', 'clear', 'multiSet', 'multiRemove', 'multiMerge']) {
    const fn = keyStore[name];
    if (typeof fn === 'function') keyStore[name] = trackMutation(name, fn as (...a: unknown[]) => unknown);
  }

  const wrapKeys = (name: 'multiGet' | 'multiRemove') => {
    const original = store[name];
    if (typeof original !== 'function') return;
    store[name] = function patched(this: unknown, keys: ReadonlyArray<Key>, cb?: unknown) {
      const list = Array.isArray(keys) ? keys : [];
      if (isDev) {
        const offenders = findBadKeys(list);
        if (offenders.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[asyncstorage-null-bind] ${name}: ${offenders.length} bad key(s) intercepted (sanitized). Offenders:`,
            offenders,
          );
          // eslint-disable-next-line no-console
          console.warn('[asyncstorage-null-bind] call stack:', new Error(`${name} null-bind source`).stack);
        }
      }
      const safeKeys = sanitizeKeys(list);
      // зачем ([COLD-START-IO], store-release, слабый профиль, 03.10): на холодном старте приходило ~10 пустых multiGet — каждый
      // шёл через мост в SQLite ради ответа «ничего». Пустой список ключей → результат заранее известен: [] (как у самого
      // AsyncStorage: колбэк, если есть, получает (null, [])). Обращения к нативу нет, поведение для вызывающих то же.
      if (safeKeys.length === 0) {
        // multiGet отвечает [] (колбэк — (null, [])); multiRemove — undefined (колбэк — (null)), как настоящий AsyncStorage
        const empty = name === 'multiGet' ? [] : undefined;
        if (typeof cb === 'function') (cb as (error: unknown, result?: unknown) => void)(null, empty);
        return Promise.resolve(empty);
      }
      return (original as (k: ReadonlyArray<Key>, c?: unknown) => Promise<unknown>).call(this, safeKeys, cb);
    } as typeof original;
  };

  wrapKeys('multiGet');
  wrapKeys('multiRemove');

  // КЛЮЧЕВОЕ: патчим САМ нативный модуль (RNCAsyncStorage) на границе моста.
  // Нативный multiSet принимает [key, value] и биндит в SQLite; если значение
  // null — падает "bind value at index N is null". JS-обёртка выше ловит только
  // вызовы через AsyncStorage.multiSet(...), а прямые вызовы RCTAsyncStorage.multiSet
  // (из библиотек/нативного слоя через bridge) её обходят. Здесь — последний рубеж.
  try {
    const native: any =
      (TurboModuleRegistry &&
        (TurboModuleRegistry.get('PlatformLocalStorage') ||
          TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage') ||
          TurboModuleRegistry.get('RNCAsyncStorage'))) ||
      (NativeModules as any)['PlatformLocalStorage'] ||
      (NativeModules as any)['RNC_AsyncSQLiteDBStorage'] ||
      (NativeModules as any)['RNCAsyncStorage'];
    for (const nativeName of ['setItem', 'removeItem', 'mergeItem', 'clear']) {
      if (native && typeof native[nativeName] === 'function') native[nativeName] = trackMutation(nativeName, native[nativeName].bind(native));
    }
    if (native && typeof native.multiSet === 'function') {
      const originalNative = native.multiSet.bind(native);
      native.multiSet = function patchedNativeMultiSet(pairs: ReadonlyArray<Pair>, cb?: unknown) {
        const list = Array.isArray(pairs) ? pairs : [];
        if (isDev) {
          const offenders = findOffenders(list);
          if (offenders.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
              `[asyncstorage-null-bind] NATIVE multiSet: ${offenders.length} bad pair(s) intercepted (sanitized). Offenders:`,
              offenders.map((o) => ({ index: o.index, key: o.key, valueType: typeof o.value, value: o.value })),
            );
            // eslint-disable-next-line no-console
            console.warn('[asyncstorage-null-bind] NATIVE call stack:', new Error('native multiSet null-bind source').stack);
          }
        }
        return originalNative(sanitize(list), cb);
      };
    }
    if (native && typeof native.multiMerge === 'function') {
      const originalMerge = native.multiMerge.bind(native);
      native.multiMerge = function patchedNativeMultiMerge(pairs: ReadonlyArray<Pair>, cb?: unknown) {
        const list = Array.isArray(pairs) ? pairs : [];
        return originalMerge(sanitize(list), cb);
      };
    }
    if (native && typeof native.multiGet === 'function') {
      const originalGet = native.multiGet.bind(native);
      native.multiGet = function patchedNativeMultiGet(keys: ReadonlyArray<Key>, cb?: unknown) {
        const list = Array.isArray(keys) ? keys : [];
        if (isDev) {
          const offenders = findBadKeys(list);
          if (offenders.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
              `[asyncstorage-null-bind] NATIVE multiGet: ${offenders.length} bad key(s) intercepted (sanitized). Offenders:`,
              offenders,
            );
            // eslint-disable-next-line no-console
            console.warn('[asyncstorage-null-bind] NATIVE call stack:', new Error('native multiGet null-bind source').stack);
          }
        }
        return originalGet(sanitizeKeys(list), cb);
      };
    }
    if (native && typeof native.multiRemove === 'function') {
      const originalRemove = native.multiRemove.bind(native);
      native.multiRemove = function patchedNativeMultiRemove(keys: ReadonlyArray<Key>, cb?: unknown) {
        const list = Array.isArray(keys) ? keys : [];
        return originalRemove(sanitizeKeys(list), cb);
      };
    }
  } catch (e) {
      // нативный модуль недоступен (например, web) — JS-обёртки выше достаточно
      DebugLogger.error('async_storage_null_bind_guard:list', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// Самоустановка при импорте: гарантирует, что обёртка стоит ДО любых сайд-эффектов
// модулей, импортируемых после этого (например, expo-router/entry в index.js).
installAsyncStorageNullBindGuard();
