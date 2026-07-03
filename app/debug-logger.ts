import AsyncStorage from '@react-native-async-storage/async-storage';
import { logAppError } from './app_health';
const isDevRuntime = typeof __DEV__ !== 'undefined' && !!__DEV__;

type DebugLogEntry = {
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
  const keys = await AsyncStorage.getAllKeys().catch(() => []);
  const legacyKeys = keys.filter((key) => key.startsWith(LEGACY_LOG_PREFIX));
  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys).catch(() => {});
  }
}

async function appendDebugLog(entry: DebugLogEntry): Promise<void> {
  const now = Date.now();
  const raw = await AsyncStorage.getItem(DEBUG_LOGS_KEY).catch(() => null);
  const logs = compactDebugLogs(parseDebugLogs(raw), now);
  const last = logs[logs.length - 1];
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
    last.count = (last.count ?? 1) + 1;
  } else {
    logs.push(entry);
  }
  await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(compactDebugLogs(logs, now))).catch(() => {});
  await cleanupLegacyDebugLogs(now);
}

function persistDebugLog(entry: DebugLogEntry): void {
  debugLogWriteQueue = debugLogWriteQueue
    .catch(() => undefined)
    .then(() => appendDebugLog(entry))
    .catch((err) => {
      if (isDevRuntime) console.error('Failed to log:', err);
    });
}

export const DebugLogger = {
  error: (context: string, error: unknown, severity: 'critical' | 'warning' = 'warning') => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const msg = `[${severity.toUpperCase()}] ${context}: ${errorMessage}`;
    if (isDevRuntime) console.error(msg);

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
    const raw = await AsyncStorage.getItem(DEBUG_LOGS_KEY).catch(() => null);
    const logs = parseDebugLogs(raw).filter((entry) => {
      const ts = Date.parse(entry.timestamp);
      return Number.isFinite(ts) && ts >= cutoffMs;
    }).slice(-MAX_DEBUG_LOGS);
    await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(logs)).catch(() => {});

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
