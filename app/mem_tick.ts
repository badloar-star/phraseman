/**
 * [MEM-TICK] — фоновый сэмплер памяти, таймеров и чтений Firestore (только разработческая сборка).
 *
 * зачем (координатор 11.10, «сперва факты»): за ~5 минут куча растёт 40 → 136 МБ и 1332 сборки мусора, а шаги старта
 * дают из них ~100. Значит, выделяет фоновая работа: таймеры, интервалы, анимации, опросы. Каждые 5 с одна строка: куча,
 * сборки за интервал, текущий экран, активные интервалы (кто завёл), таймауты за интервал, чтения Firestore за интервал.
 * В стор-сборке не включается вовсе.
 *
 * зачем (координатор 12.10, «Настройки»): по журналам 11–12.10 открытые «Настройки» давали скачки кучи с чтениями
 * users/query и 29–52 таймерами каждые 30–60 с — и это 💸 (лишние чтения у каждого, кто сидит в Настройках). Чтобы
 * чинить по фактам, строка дополнена: firestoreReadsByCaller («коллекция|метод|вызывающий» → сеть / кэш / в полёте /
 * ошибка / подписка) и timeoutsByCaller (топ создателей таймаутов). Окно в 5 минут перезапускается при смене экрана —
 * открыл «Настройки» и получил 5 минут строк именно по ним.
 */
import { IS_STORE_RELEASE } from './config';
import { gcSnapshot } from './mem_probe';

const TICK_MS = 5_000;
const WINDOW_MS = 5 * 60_000;
const TOP_CALLERS = 5;

let currentRoute = 'unknown';
let armed = false;
let active = false;
let windowEndsAt = 0;
let loopRunning = false;

const activeIntervals = new Map<unknown, string>();
let timeoutsCreated = 0;
let pendingTimeouts = 0;
const firestoreReads = new Map<string, number>();
const timeoutsByCaller = new Map<string, number>();

export type ReadStat = { network: number; cache: number; pending: number; error: number; listen: number };
const readsByCaller = new Map<string, ReadStat>();

/** Текущий экран для строки сэмплера (зовёт _layout при смене пути). Смена экрана продлевает окно на 5 минут. */
export function setMemTickRoute(route: string): void {
  const changed = route !== currentRoute;
  currentRoute = route;
  if (changed && active) {
    windowEndsAt = Date.now() + WINDOW_MS;
    ensureLoop();
  }
}

/** Вызывающий по стеку: два кадра над обёрткой, без адресов бандла. Чистая функция. */
export function callerOf(stack: string | undefined, skip = 2): string {
  const frame = (stack ?? '').split('\n').slice(skip, skip + 2).map((line) => line.trim().replace(/^at /, '').replace(/ \(http[^)]*\)/, '')).join(' <- ');
  return frame.slice(0, 120) || 'unknown';
}

/** Топ-N записей счётчика по убыванию. Чистая функция. */
export function topCallers(counts: ReadonlyMap<string, number>, n = TOP_CALLERS): Record<string, number> {
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n));
}

/** Свёртка чтений по вызывающему для строки журнала: только ненулевые поля. Чистая функция. */
export function summarizeReads(stats: ReadonlyMap<string, ReadStat>): Record<string, Partial<ReadStat>> {
  const out: Record<string, Partial<ReadStat>> = {};
  for (const [key, stat] of stats) {
    const compact: Partial<ReadStat> = {};
    for (const field of ['network', 'cache', 'pending', 'error', 'listen'] as const) {
      if (stat[field] > 0) compact[field] = stat[field];
    }
    if (Object.keys(compact).length > 0) out[key] = compact;
  }
  return out;
}

function readStat(key: string): ReadStat {
  let stat = readsByCaller.get(key);
  if (!stat) {
    stat = { network: 0, cache: 0, pending: 0, error: 0, listen: 0 };
    readsByCaller.set(key, stat); // guard-ok: Map в памяти процесса (счётчик), не Firestore
  }
  return stat;
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
    // Стек — только пока окно открыто: вне окна сэмплер не должен утяжелять каждый таймер dev-сборки.
    if (Date.now() < windowEndsAt) {
      const caller = callerOf(new Error().stack);
      timeoutsByCaller.set(caller, (timeoutsByCaller.get(caller) ?? 0) + 1);
    }
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

function noteRead(path: unknown): string {
  const collection = String(path ?? '').split('/')[0] || 'unknown';
  firestoreReads.set(collection, (firestoreReads.get(collection) ?? 0) + 1); // guard-ok: Map в памяти процесса (счётчик), не Firestore
  return collection;
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
        const collection = noteRead(`${this?.path ?? label}`);
        const inWindow = Date.now() < windowEndsAt;
        const stat = inWindow ? readStat(`${collection}|${label}|${callerOf(new Error().stack)}`) : null;
        const result = original.apply(this, args);
        if (!stat) return result;
        if (method === 'onSnapshot') {
          stat.listen += 1;
          return result;
        }
        stat.pending += 1;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          // Отдельная ветка наблюдения: исходный промис возвращается вызывающему без изменений.
          (result as Promise<{ metadata?: { fromCache?: boolean } }>).then(
            (snapshot) => {
              stat.pending = Math.max(0, stat.pending - 1);
              if (snapshot?.metadata?.fromCache === true) stat.cache += 1;
              else stat.network += 1;
            },
            (error: unknown) => {
              stat.pending = Math.max(0, stat.pending - 1);
              stat.error += 1;
              console.warn('[MEM-TICK] чтение Firestore упало (учтено как error)', label, error instanceof Error ? error.message : String(error));
            },
          );
        }
        return result;
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

let startedAt = 0;
let lastGc: ReturnType<typeof gcSnapshot> = null;
let lastTimeouts = 0;

function tick(): void {
  const stats = (globalThis as { HermesInternal?: { getInstrumentedStats?: () => Record<string, number> } }).HermesInternal?.getInstrumentedStats?.();
  const gcNow = gcSnapshot();
  const intervalsByCaller: Record<string, number> = {};
  for (const caller of activeIntervals.values()) intervalsByCaller[caller] = (intervalsByCaller[caller] ?? 0) + 1;
  const reads = Object.fromEntries(firestoreReads);
  firestoreReads.clear();
  const byCaller = summarizeReads(readsByCaller);
  // Завершённые чтения сбрасываем, «в полёте» переносим в следующий тик.
  for (const [key, stat] of readsByCaller) {
    if (stat.pending > 0) readsByCaller.set(key, { network: 0, cache: 0, pending: stat.pending, error: 0, listen: 0 }); // guard-ok: Map в памяти процесса, не Firestore
    else readsByCaller.delete(key); // guard-ok: Map в памяти процесса, не Firestore
  }
  const topTimeouts = topCallers(timeoutsByCaller);
  timeoutsByCaller.clear();
  console.log('[MEM-TICK]', JSON.stringify({
    tSec: Math.round((Date.now() - startedAt) / 1000),
    route: currentRoute,
    heapMb: stats ? Math.round((stats.js_heapSize / 1048576) * 10) / 10 : null,
    gc: lastGc && gcNow ? `${gcNow.gc - lastGc.gc}gc/${gcNow.gcMs - lastGc.gcMs}ms` : null,
    intervals: activeIntervals.size,
    intervalsByCaller,
    timeoutsCreated: timeoutsCreated - lastTimeouts,
    timeoutsByCaller: topTimeouts,
    pendingTimeouts,
    firestoreReads: reads,
    firestoreReadsByCaller: byCaller,
  }));
  lastGc = gcNow;
  lastTimeouts = timeoutsCreated;
  if (Date.now() < windowEndsAt) setTimeout(tick, TICK_MS);
  else {
    loopRunning = false;
    console.log('[MEM-TICK] окно закрыто — следующая смена экрана откроет новое на 5 минут');
  }
}

function ensureLoop(): void {
  if (loopRunning) return;
  loopRunning = true;
  lastTimeouts = timeoutsCreated;
  lastGc = gcSnapshot();
  setTimeout(tick, TICK_MS);
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
  active = true;
  startedAt = Date.now();
  windowEndsAt = startedAt + WINDOW_MS;
  patchTimers();
  patchFirestoreReads();
  ensureLoop();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
