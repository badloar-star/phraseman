/**
 * [MEM-TICK] — фоновый сэмплер памяти, таймеров и чтений Firestore (только разработческая сборка).
 *
 * зачем (координатор 11.10, «сперва факты»): за ~5 минут куча растёт 40 → 136 МБ и 1332 сборки мусора, а шаги старта
 * дают из них ~100. Значит, выделяет фоновая работа: таймеры, интервалы, анимации, опросы. Каждые 5 с первые 5 минут
 * одна строка: куча, сборки за интервал, текущий экран, активные интервалы (кто завёл), таймауты за интервал,
 * чтения Firestore за интервал (по коллекциям). В стор-сборке не включается вовсе.
 */
import { IS_STORE_RELEASE } from './config';
import { gcSnapshot } from './mem_probe';

const TICK_MS = 5_000;
const DURATION_MS = 5 * 60_000;

let currentRoute = 'unknown';
let armed = false;

const activeIntervals = new Map<unknown, string>();
let timeoutsCreated = 0;
let pendingTimeouts = 0;
const firestoreReads = new Map<string, number>();

/** Текущий экран для строки сэмплера (зовёт _layout при смене пути). */
export function setMemTickRoute(route: string): void {
  currentRoute = route;
}

function callerOf(stack: string | undefined): string {
  const frame = (stack ?? '').split('\n').slice(2, 4).map((line) => line.trim().replace(/^at /, '').replace(/ \(http[^)]*\)/, '')).join(' <- ');
  return frame.slice(0, 120) || 'unknown';
}

function patchTimers(): void {
  const g = globalThis as unknown as Record<string, (...args: unknown[]) => unknown>;
  const origSetInterval = g.setInterval;
  const origClearInterval = g.clearInterval;
  const origSetTimeout = g.setTimeout;
  const origClearTimeout = g.clearTimeout;
  g.setInterval = (...args: unknown[]) => {
    const id = origSetInterval(...args);
    activeIntervals.set(id, callerOf(new Error().stack));
    return id;
  };
  g.clearInterval = (id: unknown) => {
    activeIntervals.delete(id);
    return origClearInterval(id);
  };
  g.setTimeout = (callback: unknown, ...rest: unknown[]) => {
    timeoutsCreated += 1;
    pendingTimeouts += 1;
    const wrapped = typeof callback === 'function'
      ? (...cbArgs: unknown[]) => { pendingTimeouts = Math.max(0, pendingTimeouts - 1); return (callback as (...a: unknown[]) => unknown)(...cbArgs); }
      : callback;
    return origSetTimeout(wrapped, ...rest);
  };
  g.clearTimeout = (id: unknown) => {
    pendingTimeouts = Math.max(0, pendingTimeouts - 1);
    return origClearTimeout(id);
  };
}

function noteRead(path: unknown): void {
  const collection = String(path ?? '').split('/')[0] || 'unknown';
  firestoreReads.set(collection, (firestoreReads.get(collection) ?? 0) + 1); // guard-ok: Map в памяти процесса (счётчик), не Firestore
}

function patchFirestoreReads(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestore = (require('@react-native-firebase/firestore') as { default: () => { collection: (p: string) => { doc: (id: string) => object } } }).default;
    const db = firestore();
    const collectionRef = db.collection('__mem_tick_probe__');
    const docRef = collectionRef.doc('__probe__');
    const wrap = (proto: Record<string, unknown> | null, method: 'get' | 'onSnapshot', label: string) => {
      if (!proto || typeof proto[method] !== 'function') return;
      const original = proto[method] as (...a: unknown[]) => unknown;
      proto[method] = function wrapped(this: { path?: string }, ...args: unknown[]) {
        noteRead(`${this?.path ?? label}`);
        return original.apply(this, args);
      };
    };
    // Запрос и коллекция делят прототип get; документ — свой.
    let queryProto = Object.getPrototypeOf(collectionRef) as Record<string, unknown> | null;
    while (queryProto && !Object.prototype.hasOwnProperty.call(queryProto, 'get')) queryProto = Object.getPrototypeOf(queryProto);
    wrap(queryProto, 'get', 'query');
    wrap(queryProto, 'onSnapshot', 'query_listen');
    wrap(Object.getPrototypeOf(docRef) as Record<string, unknown>, 'get', 'doc');
    wrap(Object.getPrototypeOf(docRef) as Record<string, unknown>, 'onSnapshot', 'doc_listen');
  } catch (error) {
    console.warn('[MEM-TICK] счётчик чтений Firestore не подключён', error instanceof Error ? error.message : String(error));
  }
}

/** Включить сэмплер (один раз; только dev). Чем раньше — тем больше чтений старта попадёт в счёт. */
export function armMemTick(): void {
  if (armed) return;
  armed = true;
  if (IS_STORE_RELEASE || typeof __DEV__ === 'undefined' || !__DEV__) {
    console.log('[MEM-TICK] выключен: не разработческая сборка');
    return;
  }
  // В тестах подмена таймеров помешала бы поддельным таймерам тест-раннера — там сэмплер не нужен.
  if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) return;
  patchTimers();
  patchFirestoreReads();
  const startedAt = Date.now();
  let lastGc = gcSnapshot();
  let lastTimeouts = 0;
  const tick = () => {
    const stats = (globalThis as { HermesInternal?: { getInstrumentedStats?: () => Record<string, number> } }).HermesInternal?.getInstrumentedStats?.();
    const gcNow = gcSnapshot();
    const intervalsByCaller: Record<string, number> = {};
    for (const caller of activeIntervals.values()) intervalsByCaller[caller] = (intervalsByCaller[caller] ?? 0) + 1;
    const reads = Object.fromEntries(firestoreReads);
    firestoreReads.clear();
    console.log('[MEM-TICK]', JSON.stringify({
      tSec: Math.round((Date.now() - startedAt) / 1000),
      route: currentRoute,
      heapMb: stats ? Math.round((stats.js_heapSize / 1048576) * 10) / 10 : null,
      gc: lastGc && gcNow ? `${gcNow.gc - lastGc.gc}gc/${gcNow.gcMs - lastGc.gcMs}ms` : null,
      intervals: activeIntervals.size,
      intervalsByCaller,
      timeoutsCreated: timeoutsCreated - lastTimeouts,
      pendingTimeouts,
      firestoreReads: reads,
    }));
    lastGc = gcNow;
    lastTimeouts = timeoutsCreated;
    if (Date.now() - startedAt < DURATION_MS) setTimeout(tick, TICK_MS);
  };
  setTimeout(tick, TICK_MS);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
