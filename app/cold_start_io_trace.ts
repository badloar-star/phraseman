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
import { getStorageLockMetrics } from './storage_mutex';

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

/**
 * зачем (PM-215, замер «Дизайна» 03.10: AS.getAllKeys n=15 и пустые multiGet n=10 за один старт):
 * шаблон ключа у этих вызовов ничего не говорит («*», «[0]»), а мест в коде два десятка. Для них
 * пишем ИСТОЧНИК — первые кадры стека вне этого файла (dev — имена функций, release — адреса,
 * которые сопоставляются по source map той же сборки). Только в окне старта и только для них.
 */
const SLOW_CALL_MS = 1_500;

export function coldStartIoCallerTag(stack: string | undefined): string {
  const frames = String(stack ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at ') && !/cold_start_io_trace|wrappedIo|Promise|tryCallOne|tryCallTwo|doResolve/.test(line));
  return frames.slice(0, 2)
    .map((frame) => frame.replace(/^at\s+/, '').replace(/\s*\(.*?([^/\\()\s]+:\d+:\d+)\)$/, ' @$1').slice(0, 70))
    .join(' < ') || 'unknown';
}

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
  const callers = new Map<string, number>();

  const wrap = (owner: Record<string, unknown> | undefined, method: string, api: string,
    keyOf: (args: unknown[]) => string): boolean => {
    if (!owner) return false;
    const original = owner[method];
    if (typeof original !== 'function') return false;
    const wrapped = function wrappedIo(this: unknown, ...args: unknown[]): unknown {
      if (Date.now() - startedAt > windowMs) return (original as AnyFn).apply(this, args);
      const name = `${api}:${keyOf(args)}`;
      // зачем (03.10): пустой multiGet короткозамкнут в async_storage_null_bind_guard и до нативного модуля не доходит — это не
      // обращение к хранилищу, в «calls» ему не место (иначе ворота PM-220 считали бы то, чего уже нет).
      if (name.startsWith('AS.multiGet:[0]')) return (original as AnyFn).apply(this, args);
      // зачем (§122): чтения журнала ошибок (mistake_practice) тоже помечаем вызывающим — источники ≈15 повторов были неизвестны
      if (name === 'AS.getAllKeys:*' || name.includes('mistake_practice')) {
        const tag = `${api}<${coldStartIoCallerTag(new Error().stack)}`;
        callers.set(tag, (callers.get(tag) ?? 0) + 1);
      }
      const callStartedAt = Date.now();
      const inflightAtStart = inflight;
      // зачем (замер weak-профиля 04.10: десяток разных ключей разом простаивал по 3,5 с — впереди в очереди стоит ОДНА долгая операция).
      // Каждая операция дольше 1,5 с пишет отдельную строку: что, когда началась (от старта окна), сколько ждали в очереди, размер значения.
      const argBytes = typeof args[1] === 'string' ? (args[1] as string).length : -1;
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
        if (ms >= SLOW_CALL_MS) {
          console.warn(`[COLD-START-IO] slow name=${name} ms=${ms} startedAtMs=${callStartedAt - startedAt} inflightAtStart=${inflightAtStart} valueBytes=${argBytes} ok=${String(ok)}`);
        }
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
    // зачем (PM-215 шаг 0, §115): рядом с обращениями к хранилищу — метрики глобального замка
    // (глубина очереди, ожидание, удержание). Поле в конце строки: разбор ворот PM-220 не меняется.
    const lock = getStorageLockMetrics();
    const callerTop = [...callers.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)
      .map(([tag, n]) => `${tag} n=${n}`);
    console.warn(`[COLD-START-IO] summary windowMs=${windowMs} startedEpochMs=${startedAt} calls=${calls} groups=${groups.size} maxInflight=${maxInflight} patched=${JSON.stringify(patched)} top=${JSON.stringify(top)} lock=${JSON.stringify(lock)} callers=${JSON.stringify(callerTop)}`);
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
