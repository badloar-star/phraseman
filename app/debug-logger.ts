import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logAppError } from './app_health';
import { maskDiagnosticText, newTraceId, sanitizeDiagnosticContext } from './diagnostic_mask';
import { resolveAppBuildNumberV1 } from './app_build_number';
const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

export type DebugLogEntry = {
  timestamp: string;
  context: string;
  error: string;
  stack?: string;
  severity: 'critical' | 'warning';
  count?: number;
};

const LEGACY_LOG_PREFIX = 'debug_log_';
const DEBUG_LOGS_KEY = 'debug_logs_v1';
const MAX_DEBUG_LOGS = 160;
const DEBUG_LOG_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEBUG_LOG_DEDUPE_MS = 60_000;
const LEGACY_CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;

let debugLogWriteQueue: Promise<void> = Promise.resolve();
let lastLegacyCleanupAt = 0;

// зачем (PM-228): журнал не может логировать собственные сбои через себя (рекурсия), но и немой
// catch запрещён — причина уходит в консоль разработчика (в релизе console вырезан, нагрузки нет).
function warnLoggerIo(tag: string): (err: unknown) => void {
  return (err: unknown) => {
    if (isDevRuntime) console.warn(`[debug-logger] ${tag}:`, err instanceof Error ? err.message : String(err));
  };
}

function parseDebugLogs(raw: string | null): DebugLogEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DebugLogEntry => (
      entry != null
      && typeof entry === 'object'
      && typeof entry.timestamp === 'string'
      && typeof entry.context === 'string'
      && typeof entry.error === 'string'
      && (entry.severity === 'critical' || entry.severity === 'warning')
    ));
  } catch {
    return [];
  }
}

function compactDebugLogs(logs: DebugLogEntry[], now: number): DebugLogEntry[] {
  const cutoff = now - DEBUG_LOG_TTL_MS;
  return logs
    .filter((entry) => {
      const ts = Date.parse(entry.timestamp);
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .slice(-MAX_DEBUG_LOGS);
}

async function cleanupLegacyDebugLogs(now: number): Promise<void> {
  if (now - lastLegacyCleanupAt < LEGACY_CLEANUP_INTERVAL_MS) return;
  lastLegacyCleanupAt = now;
  const keys = await AsyncStorage.getAllKeys().catch((err: unknown) => { warnLoggerIo('legacy_keys_read_failed')(err); return [] as readonly string[]; });
  const legacyKeys = keys.filter((key) => key.startsWith(LEGACY_LOG_PREFIX));
  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys).catch(warnLoggerIo('legacy_keys_remove_failed'));
  }
}

/* ─── Журнал держим В ПАМЯТИ, на диск сбрасываем пачкой ───────────────────
 *
 * зачем (владелец 2026-09-22, «всё тормозит, удалить все логи, что копится»):
 * раньше КАЖДЫЙ из 867 вызовов DebugLogger.error делал полный цикл
 * чтение-разбор-сборка-запись: getItem всего журнала → JSON.parse до 160
 * записей со стеками → JSON.stringify → setItem. Это 2 перехода через мост в
 * SQLite и разбор килобайтов JSON НА ОДИН вызов, одинаково в деве и в релизе
 * (вырезание console сюда не достаёт — путь идёт мимо console). Один такой
 * вызов в цикле — и JS-поток стоит колом, отсюда «любая кнопка думает».
 *
 * Отсечка повторов при этом стояла ПОСЛЕ разбора, то есть дорогую работу не
 * экономила вовсе.
 *
 * Теперь: правда живёт в памяти, повтор гасится СРАЗУ (без диска), на диск
 * уходит одна отложенная запись пачкой. Стоимость вызова в горячем цикле —
 * сравнение строк вместо двух обращений к базе.
 */

/** Журнал в памяти процесса. Диск — только зеркало для переживания перезапуска. */
let memoryLogs: DebugLogEntry[] | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushScheduled = false;
/** Реже этого на диск не пишем: всплеск ошибок даёт ОДНУ запись, а не сотню. */
const DEBUG_LOG_FLUSH_DELAY_MS = 5_000;
/** Буфер записей до первой подгрузки журнала с диска (тот же лимит и дедуп). */
let pendingBeforeLoad: DebugLogEntry[] = [];
let loadScheduled = false;

/** Подтягивает журнал с диска один раз за запуск. Дальше память авторитетна. */
async function ensureMemoryLogs(): Promise<DebugLogEntry[]> {
  if (memoryLogs) return memoryLogs;
  const raw = await AsyncStorage.getItem(DEBUG_LOGS_KEY).catch((err: unknown) => { warnLoggerIo('journal_read_failed')(err); return null; });
  memoryLogs = compactDebugLogs(parseDebugLogs(raw), Date.now());
  return memoryLogs;
}

async function flushDebugLogs(): Promise<void> {
  flushScheduled = false;
  const logs = memoryLogs;
  if (!logs) return;
  const now = Date.now();
  const compacted = compactDebugLogs(logs, now);
  memoryLogs = compacted;
  await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(compacted)).catch((err: unknown) => {
    // зачем: немой catch запрещён — молчащий журнал маскирует свою же поломку.
    if (isDevRuntime) console.warn('[debug-logger] сброс на диск не удался:', err);
  });
  await cleanupLegacyDebugLogs(now).catch((err: unknown) => {
    if (isDevRuntime) console.warn('[debug-logger] чистка старых ключей не удалась:', err);
  });
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    debugLogWriteQueue = debugLogWriteQueue
      // зачем (PM-229): разрыв цепочки намеренный — отказ ПРЕДЫДУЩЕЙ записи не должен ронять следующую; причину пишем (только dev: сам логгер, без рекурсии).
      .catch((err) => { if (isDevRuntime) console.warn('[debug-logger] предыдущая запись очереди отказала, цепочка продолжается:', err); })
      .then(() => flushDebugLogs())
      .catch((err) => {
        if (isDevRuntime) console.error('Failed to log:', err);
      });
  }, DEBUG_LOG_FLUSH_DELAY_MS);
}

/**
 * Кладёт запись в журнал. Диска НЕ касается — только память плюс отложенный
 * сброс. Повтор той же ошибки в пределах окна лишь увеличивает счётчик.
 */
// зачем (PM-228, «логи bounded»): число записей уже ограничено (160) и TTL 7 дней, но одна запись
// могла нести стек на десятки КБ — 160 таких раздували ключ AsyncStorage до мегабайт и каждый
// сброс сериализовал их целиком. Режем каждое поле до фиксированного размера ДО дедупа,
// чтобы сравнение повторов шло по тем же строкам, что лягут на диск.
export const DEBUG_LOG_FIELD_LIMITS = { context: 200, error: 1_000, stack: 2_000 } as const;

function clampField(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…[+${value.length - max}]` : value;
}

export function boundDebugLogEntry(entry: DebugLogEntry): DebugLogEntry {
  return {
    ...entry,
    context: clampField(entry.context, DEBUG_LOG_FIELD_LIMITS.context),
    error: clampField(entry.error, DEBUG_LOG_FIELD_LIMITS.error),
    stack: entry.stack == null ? undefined : clampField(entry.stack, DEBUG_LOG_FIELD_LIMITS.stack),
  };
}

function persistDebugLog(rawEntry: DebugLogEntry): void {
  const entry = boundDebugLogEntry(rawEntry);
  const now = Date.now();

  // Быстрый путь: журнал уже в памяти — решаем без единого обращения к диску.
  if (memoryLogs) {
    memoryLogs = appendDeduped(memoryLogs, entry, now);
    scheduleFlush();
    return;
  }

  // зачем (PM-228, найдено замером): до первой подгрузки журнала с диска КАЖДЫЙ вызов вешал
  // свою задачу в очередь и клал запись без дедупа — шторм из 1000 одинаковых ошибок на старте
  // давал 160 копий вместо одной со счётчиком и 1000 замыканий в очереди. Теперь до подгрузки
  // записи копятся в ограниченном буфере с тем же дедупом, а подгрузка ставится ОДИН раз.
  pendingBeforeLoad = appendDeduped(pendingBeforeLoad, entry, now);
  if (loadScheduled) return;
  loadScheduled = true;
  debugLogWriteQueue = debugLogWriteQueue
    // зачем (PM-229): то же — намеренный разрыв цепочки, причина отказа предыдущей записи пишется (dev).
    .catch((err) => { if (isDevRuntime) console.warn('[debug-logger] предыдущая запись очереди отказала перед подгрузкой журнала:', err); })
    .then(async () => {
      let merged = await ensureMemoryLogs();
      for (const pending of pendingBeforeLoad) {
        merged = appendDeduped(merged, pending, Date.parse(pending.timestamp) || Date.now());
      }
      memoryLogs = merged;
      pendingBeforeLoad = [];
      scheduleFlush();
    })
    .catch((err) => {
      if (isDevRuntime) console.error('[debug-logger] подгрузка журнала не удалась:', err);
    })
    .finally(() => {
      loadScheduled = false;
    });
}

/**
 * Добавляет запись с дедупом последней. Мутирует массив намеренно: это горячий путь
 * (сотни вызовов в цикле), копия массива из 160 записей на каждый вызов дороже самой записи.
 */
function appendDeduped(list: DebugLogEntry[], entry: DebugLogEntry, now: number): DebugLogEntry[] {
  const last = list[list.length - 1];
  const lastAt = last ? Date.parse(last.timestamp) : 0;
  if (
    last
    && last.context === entry.context
    && last.error === entry.error
    && last.severity === entry.severity
    && Number.isFinite(lastAt)
    && now - lastAt < DEBUG_LOG_DEDUPE_MS
  ) {
    last.timestamp = entry.timestamp;
    last.stack = entry.stack ?? last.stack;
    last.count = (last.count ?? 1) + (entry.count ?? 1);
    return list;
  }
  list.push(entry);
  return list.length > MAX_DEBUG_LOGS ? list.slice(-MAX_DEBUG_LOGS) : list;
}

// зачем: PM-226 — единый контракт диагностической ошибки. Каждая запись несёт
// code, screen, operation, build, traceId и безопасный (замаскированный)
// контекст. Формат одной строки для поиска по логу: `[DIAG] code=… screen=… op=… build=… trace=… ctx={…} err=…`.
export type DiagnosticErrorInput = {
  code: string;
  screen: string;
  operation: string;
  error?: unknown;
  context?: Readonly<Record<string, unknown>>;
  traceId?: string;
  severity?: 'critical' | 'warning';
};

function resolveBuild(): string {
  try {
    const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
    const build = resolveAppBuildNumberV1();
    return `${version}+${build}`;
  } catch (buildError) {
    console.warn('[DIAG] build resolve failed', buildError instanceof Error ? buildError.message : 'unknown');
    return 'unknown';
  }
}

export function formatDiagnosticError(input: DiagnosticErrorInput, build: string = resolveBuild()): { line: string; traceId: string } {
  const traceId = input.traceId ?? newTraceId();
  const rawMessage = input.error instanceof Error ? input.error.message : input.error == null ? '' : String(input.error);
  const ctx = sanitizeDiagnosticContext(input.context);
  const line = `[DIAG] code=${input.code} screen=${input.screen} op=${input.operation} build=${build} trace=${traceId} ctx=${JSON.stringify(ctx)} err=${maskDiagnosticText(rawMessage)}`;
  return { line, traceId };
}

/** Единая точка записи диагностической ошибки. Никогда не бросает. */
export function reportDiagnosticError(input: DiagnosticErrorInput): string {
  try {
    const { line, traceId } = formatDiagnosticError(input);
    // console.warn идёт в бандлер и в metro-console.log даже в релизной отладке владельца;
    // сообщение уже замаскировано, сырой ошибки/стека наружу не выходит.
    console.warn(line);
    persistDebugLog({
      timestamp: new Date().toISOString(),
      context: `${input.screen}:${input.operation}`,
      error: line,
      severity: input.severity ?? 'warning',
    });
    return traceId;
  } catch (reportError) {
    console.warn('[DIAG] reportDiagnosticError failed', reportError instanceof Error ? reportError.message : 'unknown');
    return input.traceId ?? 'no-trace';
  }
}

/**
 * Для намеренно проглоченных ошибок: пишет причину и идёт дальше.
 * `tag` = `модуль:операция`. Поведение вызывающего не меняется.
 */
export function reportSwallowed(tag: string, error?: unknown): void {
  const sep = tag.indexOf(':');
  reportDiagnosticError({
    code: 'swallowed',
    screen: sep > 0 ? tag.slice(0, sep) : tag,
    operation: sep > 0 ? tag.slice(sep + 1) : 'unknown',
    error,
  });
}

/** Готовый обработчик для `.catch(swallowError('модуль:операция'))`. */
export function swallowError(tag: string): (error: unknown) => void {
  return (error: unknown) => reportSwallowed(tag, error);
}

export const DebugLogger = {
  error: (context: string, error: unknown, severity: 'critical' | 'warning' = 'warning') => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const msg = `[${severity.toUpperCase()}] ${context}: ${errorMessage}`;
    if (isDevRuntime) {
      if (severity === 'critical') console.error(msg);
      else console.warn(msg);
    }

    persistDebugLog({
      timestamp: new Date().toISOString(),
      context,
      error: errorMessage,
      stack: errorStack,
      severity,
    });

    void logAppError(context, error, {
      severity,
      feature: context.split(':')[0]?.replace(/\.(ts|tsx)$/i, '') || 'app',
      writeToFirestore: severity === 'critical',
    });
  },

  warn: (context: string, message: string) => {
    if (isDevRuntime) {
      console.warn(`[WARN] ${context}: ${message}`);
    }
  },

  info: (context: string, message: string) => {
    if (isDevRuntime) {
      console.log(`[INFO] ${context}: ${message}`);
    }
  },

  clearOldLogs: async (daysOld: number = 7) => {
    const cutoffMs = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const raw = await AsyncStorage.getItem(DEBUG_LOGS_KEY).catch((err: unknown) => { warnLoggerIo('clear_read_failed')(err); return null; });
    const logs = parseDebugLogs(raw).filter((entry) => {
      const ts = Date.parse(entry.timestamp);
      return Number.isFinite(ts) && ts >= cutoffMs;
    }).slice(-MAX_DEBUG_LOGS);
    await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(logs)).catch(warnLoggerIo('clear_write_failed'));

    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (key.startsWith(LEGACY_LOG_PREFIX)) {
        const timestamp = parseInt(key.replace(LEGACY_LOG_PREFIX, ''));
        if (!Number.isFinite(timestamp) || timestamp < cutoffMs) {
          await AsyncStorage.removeItem(key);
        }
      }
    }
  },
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
