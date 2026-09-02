// Трассировка установления MAX-звонка. Единый префикс [MAX-CONNECT].
//
// зачем: владелец 2026-09-02 — «не удалось установить связь» приходило БЕЗ
// единой строчки в логах. На 5200 строк цепочки звонка было ровно 3 лога, все
// под __DEV__ (то есть на боевой сборке невидимые), а загрузчик нативного
// стека (max_webrtc_module) имел два пустых catch {} и семь немых `return null`.
// Диагноз ставить было физически не из чего. Правило проекта: сперва логи,
// потом починка — этот модуль и есть «сперва логи».
//
// Пишем через DebugLogger.error: только он персистит в AsyncStorage и
// переживает перезапуск (info/warn живут лишь в dev-консоли). Severity
// 'warning' — чтобы шаги трассы не улетали в Firestore; в Firestore уходит
// только финальный вердикт отказа (critical), он же один на звонок.
//
// Ноль React/нативных импортов: модуль зовётся и из транспорта, и из UI.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const PREFIX = '[MAX-CONNECT]';

/**
 * `__DEV__` объявляет рантайм React Native, и вне него (jest без RN-preset,
 * любой чистый node-контекст) обращение к нему БРОСАЕТ ReferenceError.
 * Трассировка обязана быть безопаснее того, что она диагностирует: упасть на
 * собственном логе — худший исход из возможных.
 */
const IS_DEV: boolean = ((): boolean => {
  try {
    return typeof __DEV__ !== 'undefined' && __DEV__ === true;
  } catch {
    return false;
  }
})();

/** Значения приводим к короткой печатной форме: лог обязан показать САМО значение. */
function printable(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    const json = JSON.stringify(value);
    return typeof json === 'string' && json.length > 300 ? `${json.slice(0, 300)}…` : String(json);
  } catch (e) {
    return `<unserializable:${e instanceof Error ? e.message : String(e)}>`;
  }
}

function fields(data?: Record<string, unknown>): string {
  if (!data) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) parts.push(`${key}=${printable(value)}`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** Начало отсчёта звонка: длительности шагов считаем от него. */
let traceStartedAtMs = 0;
let traceCallId = '';

const TRACE_KEY = 'max_connect_trace_v1';
/** Больше одного звонка держать незачем, но хвост предыдущего помогает. */
const TRACE_MAX_LINES = 200;

let traceLines: string[] = [];
let flushQueue: Promise<void> = Promise.resolve();

export function maxConnectTraceBegin(callId: string, data?: Record<string, unknown>): void {
  traceStartedAtMs = Date.now();
  traceCallId = callId;
  // Отделяем звонки друг от друга: хвост прошлой попытки оставляем (он часто
  // объясняет, почему повторный дозвон тоже не прошёл), но помечаем границу.
  traceLines.push(`----- new call ${callId} -----`);
  maxConnectTrace('begin', data);
}

function elapsed(): number {
  return traceStartedAtMs > 0 ? Date.now() - traceStartedAtMs : -1;
}

/**
 * Кольцевой буфер шагов В ПАМЯТИ + отдельный ключ AsyncStorage.
 *
 * зачем: DebugLogger.error даже с severity 'warning' зовёт recordError в
 * Crashlytics и держит троттлинг по fingerprint. Сорок шагов трассы на каждый
 * звонок засорили бы Crashlytics и часть шагов всё равно была бы проглочена
 * троттлом — то есть трасса получилась бы дырявой ровно там, где нужна целой.
 * Поэтому шаги идут в свой буфер, а в общий журнал (и в Firestore) уходит
 * только финальный вердикт отказа — один на звонок.
 */
function persistTrace(): void {
  const snapshot = [...traceLines];
  flushQueue = flushQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(TRACE_KEY, JSON.stringify(snapshot)))
    .then(() => undefined)
    .catch((e) => {
      // ЗАПРЕТ немого catch: молчащий журнал хуже отсутствующего.
      if (IS_DEV) console.warn(`${PREFIX} persist failed`, e);
    });
}

/**
 * Шаг трассы. Пишется ВСЕГДА (dev и release), переживает перезапуск.
 * Каждое ветвление обязано печатать значение, которое его решило.
 */
export function maxConnectTrace(step: string, data?: Record<string, unknown>): void {
  const line = `${new Date().toISOString()} t+${elapsed()}ms call=${traceCallId || 'n/a'} ${step}${fields(data)}`;
  traceLines.push(line);
  if (traceLines.length > TRACE_MAX_LINES) {
    traceLines = traceLines.slice(-TRACE_MAX_LINES);
  }
  if (IS_DEV) console.log(`${PREFIX} ${step}${fields(data)}`);
  persistTrace();
}

/**
 * Финальный вердикт отказа: единственная critical-запись на звонок.
 * Вместе с ним в общий журнал уходит хвост трассы — иначе вердикт «связь не
 * установилась» снова остался бы без ответа на вопрос «а что было до этого».
 */
export function maxConnectTraceFail(reason: string, data?: Record<string, unknown>): void {
  const line = `${new Date().toISOString()} t+${elapsed()}ms call=${traceCallId || 'n/a'} FAIL:${reason}${fields(data)}`;
  traceLines.push(line);
  persistTrace();
  const tail = traceLines.slice(-25).join(' | ');
  DebugLogger.error(
    `${PREFIX} FAIL:${reason}`,
    new Error(`t+${elapsed()}ms call=${traceCallId || 'n/a'}${fields(data)} :: TRACE ${tail}`),
    'critical',
  );
}

/** Прочитать сохранённую трассу (экран диагностики / выгрузка владельцу). */
export async function readMaxConnectTrace(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch (e) {
    if (IS_DEV) console.warn(`${PREFIX} read failed`, e);
    return [];
  }
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
