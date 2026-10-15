/**
 * [FS-READS] — перепись чтений Firestore на холодном старте (координатор 15.10, правило Firebase-экономии). ТОЛЬКО __DEV__.
 *
 * зачем: понять, сколько документов читается от запуска до интерактивной Главной и в первые 60 с, кем и с какими повторами,
 * и какие onSnapshot-слушатели живут дольше нужного, — чтобы убрать или кэшировать лишнее без гадания.
 *
 * Подменяет get/onSnapshot у прототипов документа и запроса RNFB: так видны ВСЕ пути (модульные функции, старый стиль,
 * динамический import) без правки боевого кода. Считает только чтения с сервера (metadata.fromCache === false):
 * get — 1 на документ (пустой ответ = 1), слушатель — первый снимок = размер, дальше — число изменений.
 * В журнал идут шаблон пути (id → {id}) и имя вызывающей функции; ни содержимого документов, ни uid.
 */

type Proto = Record<string, unknown>;
type ReadKind = 'get' | 'listen_first' | 'listen_change';

export type FsReadEvent = Readonly<{ atMs: number; kind: ReadKind; path: string; caller: string; docs: number; fromCache: boolean }>;
type ListenerInfo = { id: number; path: string; caller: string; startedAtMs: number; snapshots: number; billedDocs: number; closedAtMs: number | null };

const LOG = '[FS-READS]';
const LINE_LOG_WINDOW_MS = 60_000;
const events: FsReadEvent[] = [];
const listeners = new Map<number, ListenerInfo>();
let nextListenerId = 1;
let bootMs = 0;
let installed = false;
let now: () => number = () => Date.now();
let log: (line: string) => void = (line) => console.log(line); // guard-ok: dev-трасса

/** users/AbC/notifications/x → users/{id}/notifications/{id}: шаблон коллекции без идентификаторов. */
export function fsPathTemplate(path: string): string {
  return String(path || '?').split('/').filter(Boolean).map((part, index) => (index % 2 === 1 ? '{id}' : part)).join('/') || '?';
}

const SKIP_LINE = /dev_firestore_read_counter|[\\/]node_modules[\\/]/;
const SKIP_NAME = /^(?:anonymous|tryCallOne|tryCallTwo|doResolve|__callFunction|asyncGeneratorStep|_asyncToGenerator|_next|_throw|step|fulfilled|rejected|wrapped|Promise.*|get|onSnapshot|getDoc|getDocs|onSnapshotModular)$/;

/** Две ближайшие боевые функции из стека (Hermes dev: «at имя (url:строка:кол)»). */
export function fsCallerFromStack(stack: string | undefined): string {
  const names: string[] = [];
  for (const line of String(stack ?? '').split('\n')) {
    const match = /at\s+([A-Za-z0-9_$.<>]+)\s*\(/.exec(line);
    if (!match || SKIP_LINE.test(line) || SKIP_NAME.test(match[1])) continue;
    names.push(match[1]);
    if (names.length === 2) break;
  }
  return names.length ? names.join('<') : 'unknown';
}

function record(kind: ReadKind, path: string, caller: string, docs: number, fromCache: boolean): void {
  const event: FsReadEvent = { atMs: now() - bootMs, kind, path, caller, docs, fromCache };
  events.push(event);
  // зачем: построчно — только окно переписи (60 с), дальше лишь копим для сводок; журнал разработки общий для всех сессий.
  if (!fromCache && event.atMs <= LINE_LOG_WINDOW_MS) log(`${LOG} +${docs} ${kind} ${path} by=${caller} t=${event.atMs}ms`);
}

function queryPath(query: Proto): string {
  const cp = query._collectionPath as { relativeName?: string } | undefined;
  return fsPathTemplate(cp?.relativeName ?? '?');
}

function docPath(ref: Proto): string {
  const dp = ref._documentPath as { relativeName?: string } | undefined;
  return fsPathTemplate(dp?.relativeName ?? String((ref as { path?: string }).path ?? '?'));
}

type Snap = { metadata?: { fromCache?: boolean }; size?: number; exists?: boolean | (() => boolean); docChanges?: () => unknown[] };

function snapDocs(snap: Snap, isQuery: boolean): number {
  if (isQuery) return Math.max(1, Number(snap.size ?? 0));
  return 1;
}

function wrapGet(proto: Proto, isQuery: boolean): void {
  const original = proto.get as (this: Proto, ...args: unknown[]) => Promise<Snap>;
  if (typeof original !== 'function' || (original as { __fsReads?: boolean }).__fsReads) return;
  const wrapped = function (this: Proto, ...args: unknown[]): Promise<Snap> {
    const path = isQuery ? queryPath(this) : docPath(this);
    const caller = fsCallerFromStack(new Error().stack);
    return original.apply(this, args).then((snap) => {
      try {
        record('get', path, caller, snapDocs(snap, isQuery), snap?.metadata?.fromCache === true);
      } catch (error) {
        log(`${LOG} учёт get не удался path=${path} (${String(error)})`);
      }
      return snap;
    });
  };
  (wrapped as { __fsReads?: boolean }).__fsReads = true;
  proto.get = wrapped;
}

function wrapOnSnapshot(proto: Proto, isQuery: boolean): void {
  const original = proto.onSnapshot as (this: Proto, ...args: unknown[]) => () => void;
  if (typeof original !== 'function' || (original as { __fsReads?: boolean }).__fsReads) return;
  const wrapped = function (this: Proto, ...args: unknown[]): () => void {
    const path = isQuery ? queryPath(this) : docPath(this);
    const caller = fsCallerFromStack(new Error().stack);
    const info: ListenerInfo = { id: nextListenerId++, path, caller, startedAtMs: now() - bootMs, snapshots: 0, billedDocs: 0, closedAtMs: null };
    listeners.set(info.id, info);
    log(`${LOG} listen:open #${info.id} ${path} by=${caller} t=${info.startedAtMs}ms`);
    const onSnap = (snap: Snap): void => {
      try {
        const fromCache = snap?.metadata?.fromCache === true;
        const first = info.snapshots === 0;
        info.snapshots += 1;
        const docs = first ? snapDocs(snap, isQuery) : (isQuery ? (snap.docChanges?.().length ?? 0) : 1);
        if (!fromCache) info.billedDocs += docs;
        if (docs > 0) record(first ? 'listen_first' : 'listen_change', path, caller, docs, fromCache);
      } catch (error) {
        log(`${LOG} учёт снимка не удался #${info.id} (${String(error)})`);
      }
    };
    let wrappedOne = false;
    const nextArgs = args.map((arg) => {
      if (wrappedOne) return arg;
      if (typeof arg === 'function') {
        wrappedOne = true;
        return (snap: Snap) => { onSnap(snap); return (arg as (s: Snap) => unknown)(snap); };
      }
      if (arg && typeof arg === 'object' && typeof (arg as { next?: unknown }).next === 'function') {
        wrappedOne = true;
        const observer = arg as { next: (s: Snap) => unknown };
        return { ...observer, next: (snap: Snap) => { onSnap(snap); return observer.next(snap); } };
      }
      return arg;
    });
    const unsubscribe = original.apply(this, nextArgs);
    return () => {
      if (info.closedAtMs === null) {
        info.closedAtMs = now() - bootMs;
        log(`${LOG} listen:close #${info.id} ${path} жил=${info.closedAtMs - info.startedAtMs}ms снимков=${info.snapshots} оплачено=${info.billedDocs}`);
      }
      return unsubscribe();
    };
  };
  (wrapped as { __fsReads?: boolean }).__fsReads = true;
  proto.onSnapshot = wrapped;
}

export function installFirestoreReadCounter(input: Readonly<{
  queryProto: Proto; docProto: Proto; nowFn?: () => number; logFn?: (line: string) => void;
}>): boolean {
  if (installed) return false;
  installed = true;
  if (input.nowFn) now = input.nowFn;
  if (input.logFn) log = input.logFn;
  bootMs = now();
  wrapGet(input.queryProto, true);
  wrapGet(input.docProto, false);
  wrapOnSnapshot(input.queryProto, true);
  wrapOnSnapshot(input.docProto, false);
  log(`${LOG} счётчик включён (только dev): get/onSnapshot документа и запроса`);
  return true;
}

export type FsReadsReport = Readonly<{
  untilMs: number;
  billedDocs: number;
  calls: number;
  cacheHits: number;
  byPath: readonly Readonly<{ path: string; docs: number; calls: number; callers: string }>[];
  openListeners: readonly Readonly<{ id: number; path: string; caller: string; aliveMs: number; billedDocs: number }>[];
}>;

/** Сводка за первые untilMs от запуска: оплачиваемые документы по коллекциям, повторы, живые слушатели. */
export function fsReadsReport(untilMs: number): FsReadsReport {
  const inWindow = events.filter((event) => event.atMs <= untilMs);
  const billed = inWindow.filter((event) => !event.fromCache);
  const grouped = new Map<string, { docs: number; calls: number; callers: Set<string> }>();
  for (const event of billed) {
    const row = grouped.get(event.path) ?? { docs: 0, calls: 0, callers: new Set<string>() };
    row.docs += event.docs;
    row.calls += 1;
    row.callers.add(event.caller);
    grouped.set(event.path, row);
  }
  const nowMs = now() - bootMs;
  return {
    untilMs,
    billedDocs: billed.reduce((sum, event) => sum + event.docs, 0),
    calls: billed.length,
    cacheHits: inWindow.length - billed.length,
    byPath: [...grouped.entries()]
      .map(([path, row]) => ({ path, docs: row.docs, calls: row.calls, callers: [...row.callers].join(', ') }))
      .sort((a, b) => b.docs - a.docs),
    openListeners: [...listeners.values()].filter((l) => l.closedAtMs === null && l.startedAtMs <= untilMs)
      .map((l) => ({ id: l.id, path: l.path, caller: l.caller, aliveMs: nowMs - l.startedAtMs, billedDocs: l.billedDocs })),
  };
}

export function logFsReadsReport(untilMs: number, label: string): void {
  const report = fsReadsReport(untilMs);
  log(`${LOG} === ${label}: до ${untilMs} мс — оплачено документов ${report.billedDocs}, вызовов ${report.calls}, из кэша ${report.cacheHits}, слушателей открыто ${report.openListeners.length}`);
  for (const row of report.byPath) log(`${LOG}   ${row.docs} док / ${row.calls} выз  ${row.path}  ← ${row.callers}`);
  for (const l of report.openListeners) log(`${LOG}   слушатель #${l.id} ${l.path} живёт ${l.aliveMs} мс, оплачено ${l.billedDocs}  ← ${l.caller}`);
}

/** Только для тестов. */
export function __resetFsReadsForTests(): void {
  events.length = 0;
  listeners.clear();
  nextListenerId = 1;
  installed = false;
  now = () => Date.now();
  log = (line) => console.log(line); // guard-ok: dev-трасса
}

/* expo-router route shim */
export default function __FsReadsRouteShim() { return null; }
