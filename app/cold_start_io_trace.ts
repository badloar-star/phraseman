/**
 * [COLD-START-IO] — счётчик обращений к AsyncStorage и SecureStore в первые 15 с холодного старта.
 *
 * зачем (координатор §89, Q119а, 02.10): на слабом профиле три независимых чтения phone-state
 * (lineage, ключ, флаг) ждали одновременно по 3,5–5 с, а повторное чтение — 34 мс. Значит,
 * очередь нативных модулей сразу после кадра Главной забита чужой стартовой работой. Чтобы снять
 * с этого окна самое тяжёлое по ФАКТАМ, считаем: кто (метод + шаблон ключа), сколько раз,
 * сколько суммарно и максимум ждал, сколько запросов висело одновременно.
 *
 * Работает и в release (решение принимается по release-сборке слабого профиля — dev раздувает
 * JS-лаг): итог печатается одной строкой console.warn — babel вырезает только log/info/debug.
 * Окно 15 с, затем оригинальные методы возвращаются — в остальное время накладных расходов нет.
 * Ключи печатаются только шаблоном (uid/хэши/числа → *), значения не читаются вовсе.
 * Временное: убрать после выноса тяжёлого с окна старта.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WINDOW_MS = 15_000;
const TOP = 10;

type Group = { count: number; totalMs: number; maxMs: number; failed: number };

let installed = false;

export function coldStartIoKeyPattern(key: unknown): string {
  // Куски между разделителями: длинный hex или смесь букв и цифр от 20 символов (uid, хэш) → *,
  // остальные числа → #. Имена ключей (слова через _) остаются читаемыми.
  return String(key ?? '')
    .split(/([^A-Za-z0-9]+)/)
    .map((token) => {
      if (/^[0-9a-f]{16,}$/i.test(token)) return '*';
      if (token.length >= 20 && /\d/.test(token) && /[A-Za-z]/.test(token)) return '*';
      return token.replace(/\d+/g, '#');
    })
    .join('')
    .slice(0, 60);
}

type AnyFn = (...args: unknown[]) => unknown;

export function installColdStartIoTrace(
  targets: Readonly<{ asyncStorage?: Record<string, unknown>; secureStore?: Record<string, unknown> }> = {},
  windowMs: number = WINDOW_MS,
): void {
  if (installed) return;
  installed = true;
  const startedAt = Date.now();
  const groups = new Map<string, Group>();
  const restores: Array<() => void> = [];
  const patched: Record<string, boolean> = {};
  let inflight = 0;
  let maxInflight = 0;
  let calls = 0;

  const wrap = (owner: Record<string, unknown> | undefined, method: string, api: string,
    keyOf: (args: unknown[]) => string): boolean => {
    if (!owner) return false;
    const original = owner[method];
    if (typeof original !== 'function') return false;
    const wrapped = function wrappedIo(this: unknown, ...args: unknown[]): unknown {
      if (Date.now() - startedAt > windowMs) return (original as AnyFn).apply(this, args);
      const name = `${api}:${keyOf(args)}`;
      const callStartedAt = Date.now();
      calls += 1;
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      const settle = (ok: boolean): void => {
        inflight -= 1;
        const ms = Date.now() - callStartedAt;
        const group = groups.get(name) ?? { count: 0, totalMs: 0, maxMs: 0, failed: 0 };
        group.count += 1;
        group.totalMs += ms;
        group.maxMs = Math.max(group.maxMs, ms);
        if (!ok) group.failed += 1;
        groups.set(name, group);
      };
      return Promise.resolve((original as AnyFn).apply(this, args)).then(
        (value) => { settle(true); return value; },
        (error: unknown) => { settle(false); throw error; },
      );
    };
    try {
      owner[method] = wrapped;
      if (owner[method] !== wrapped) return false;
      restores.push(() => { owner[method] = original; });
      return true;
    } catch (error) {
      console.warn(`[COLD-START-IO] patch_failed ${api}.${method}`, error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const asyncStorage = (targets.asyncStorage ?? (AsyncStorage as unknown as Record<string, unknown>));
  const firstKey = (args: unknown[]) => coldStartIoKeyPattern(args[0]);
  const multiKey = (args: unknown[]) => {
    const list = Array.isArray(args[0]) ? args[0] as unknown[] : [];
    const head = Array.isArray(list[0]) ? (list[0] as unknown[])[0] : list[0];
    return `[${list.length}]${coldStartIoKeyPattern(head)}`;
  };
  patched.asyncGetItem = wrap(asyncStorage, 'getItem', 'AS.get', firstKey);
  patched.asyncSetItem = wrap(asyncStorage, 'setItem', 'AS.set', firstKey);
  patched.asyncRemoveItem = wrap(asyncStorage, 'removeItem', 'AS.remove', firstKey);
  patched.asyncMergeItem = wrap(asyncStorage, 'mergeItem', 'AS.merge', firstKey);
  patched.asyncMultiGet = wrap(asyncStorage, 'multiGet', 'AS.multiGet', multiKey);
  patched.asyncMultiSet = wrap(asyncStorage, 'multiSet', 'AS.multiSet', multiKey);
  patched.asyncMultiRemove = wrap(asyncStorage, 'multiRemove', 'AS.multiRemove', multiKey);
  patched.asyncGetAllKeys = wrap(asyncStorage, 'getAllKeys', 'AS.getAllKeys', () => '*');

  let secureStore = targets.secureStore;
  if (!secureStore) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      secureStore = require('expo-secure-store') as Record<string, unknown>;
    } catch (error) {
      console.warn('[COLD-START-IO] secure_store_require_failed', error instanceof Error ? error.message : String(error));
    }
  }
  patched.secureGet = wrap(secureStore, 'getItemAsync', 'SS.get', firstKey);
  patched.secureSet = wrap(secureStore, 'setItemAsync', 'SS.set', firstKey);
  patched.secureDelete = wrap(secureStore, 'deleteItemAsync', 'SS.delete', firstKey);

  setTimeout(() => {
    for (const restore of restores) restore();
    const top = [...groups.entries()]
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .slice(0, TOP)
      .map(([name, g]) => `${name} n=${g.count} total=${g.totalMs}ms max=${g.maxMs}ms${g.failed ? ` failed=${g.failed}` : ''}`);
    console.warn(`[COLD-START-IO] summary windowMs=${windowMs} startedEpochMs=${startedAt} calls=${calls} groups=${groups.size} maxInflight=${maxInflight} patched=${JSON.stringify(patched)} top=${JSON.stringify(top)}`);
  }, windowMs);
}

/** Только для тестов. */
export function resetColdStartIoTraceForTests(): void {
  installed = false;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ColdStartIoTraceRouteShim() {
  return null;
}
