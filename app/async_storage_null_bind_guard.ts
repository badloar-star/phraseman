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
      return (original as (k: ReadonlyArray<Key>, c?: unknown) => Promise<unknown>).call(this, sanitizeKeys(list), cb);
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
