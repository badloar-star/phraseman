import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { recordError } from './firebase';
import { submitClientReport } from './client_reports';
import { DebugLogger } from './debug-logger';
import { resolveAppBuildNumberV1 } from './app_build_number';

export type AppHealthSeverity = 'info' | 'warning' | 'critical';

export interface AppHealthMeta {
  feature?: string;
  screen?: string;
  severity?: AppHealthSeverity;
  sampleRate?: number;
  writeToFirestore?: boolean;
  tags?: Record<string, string | number | boolean | null | undefined>;
}

const THROTTLE_PREFIX = 'app_health_last_';
const DEFAULT_THROTTLE_MS = 30 * 60 * 1000;
const MAX_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 4000;
const THROTTLE_CACHE_LIMIT = 128;
const THROTTLE_STORAGE_LIMIT = 192;
const THROTTLE_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const THROTTLE_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const healthThrottleCache = new Map<string, number>();

// зачем: PM-227 — немой catch запрещён (CLAUDE.md «Сперва логи»). Здесь нельзя звать
// DebugLogger: он сам вызывает logAppError, и отказ транспорта ушёл бы в рекурсию.
// Поэтому только console.warn с единым префиксом [APP-HEALTH] — без текста ошибки
// пользователя, только шаг и сообщение исключения.
function warnHealthIo(step: string, error: unknown): void {
  console.warn('[APP-HEALTH]', step, error instanceof Error ? error.message : String(error));
}
let lastThrottlePruneAt = 0;
let throttlePruneInFlight = false;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack,
    };
  }
  return {
    name: 'NonError',
    message: String(error),
    stack: undefined,
  };
}

function shortHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function cleanTags(tags: AppHealthMeta['tags']) {
  if (!tags) return {};
  const out: Record<string, string | number | boolean | null> = {};
  Object.entries(tags).slice(0, 20).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === 'string') out[key] = value.slice(0, 180);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
    else out[key] = String(value).slice(0, 180);
  });
  return out;
}

function rememberThrottle(key: string, lastAt: number) {
  healthThrottleCache.set(key, lastAt);
  if (healthThrottleCache.size <= THROTTLE_CACHE_LIMIT) return;
  const oldest = healthThrottleCache.keys().next().value;
  if (oldest) healthThrottleCache.delete(oldest);
}

async function pruneStoredThrottleKeys(now: number): Promise<void> {
  if (throttlePruneInFlight || now - lastThrottlePruneAt < THROTTLE_PRUNE_INTERVAL_MS) return;
  throttlePruneInFlight = true;
  lastThrottlePruneAt = now;
  try {
    const keys = await AsyncStorage.getAllKeys().catch((e) => { warnHealthIo('throttle_prune_keys_failed', e); return [] as readonly string[]; });
    const throttleKeys = keys.filter((key) => key.startsWith(THROTTLE_PREFIX));
    if (throttleKeys.length === 0) return;

    const rows = await AsyncStorage.multiGet(throttleKeys).catch((e) => { warnHealthIo('throttle_prune_read_failed', e); return [] as readonly (readonly [string, string | null])[]; });
    const keep: Array<{ key: string; at: number }> = [];
    const remove: string[] = [];
    for (const [key, value] of rows) {
      const at = parseInt(value || '0', 10) || 0;
      if (!at || now - at > THROTTLE_STORAGE_TTL_MS) {
        remove.push(key);
      } else {
        keep.push({ key, at });
      }
    }

    keep.sort((a, b) => b.at - a.at);
    if (keep.length > THROTTLE_STORAGE_LIMIT) {
      remove.push(...keep.slice(THROTTLE_STORAGE_LIMIT).map((entry) => entry.key));
    }

    if (remove.length > 0) {
      await AsyncStorage.multiRemove(remove).catch((e) => warnHealthIo('throttle_prune_remove_failed', e));
      remove.forEach((key) => healthThrottleCache.delete(key));
    }
  } finally {
    throttlePruneInFlight = false;
  }
}

async function shouldSend(fingerprint: string, severity: AppHealthSeverity, sampleRate?: number) {
  if (severity === 'info') return false;
  if (sampleRate != null && sampleRate < 1 && Math.random() > sampleRate) return false;

  const key = `${THROTTLE_PREFIX}${fingerprint}`;
  const now = Date.now();
  const throttleMs = severity === 'critical' ? 10 * 60 * 1000 : DEFAULT_THROTTLE_MS;
  const cachedLast = healthThrottleCache.get(key) ?? 0;
  if (now - cachedLast < throttleMs) return false;

  const lastRaw = await AsyncStorage.getItem(key).catch((e) => { warnHealthIo('throttle_read_failed', e); return null; });
  const last = parseInt(lastRaw || '0', 10) || 0;
  rememberThrottle(key, last);
  if (now - last < throttleMs) return false;

  rememberThrottle(key, now);
  await AsyncStorage.setItem(key, String(now)).catch((e) => warnHealthIo('throttle_write_failed', e));
  void pruneStoredThrottleKeys(now).catch((e) => warnHealthIo('throttle_prune_failed', e));
  return true;
}

export async function logAppError(context: string, error: unknown, meta: AppHealthMeta = {}) {
  const severity: AppHealthSeverity = meta.severity ?? 'warning';
  const normalized = normalizeError(error);
  const feature = meta.feature ?? context.split(':')[0] ?? 'app';
  const fingerprint = shortHash(`${context}|${normalized.name}|${normalized.message.slice(0, 160)}`);

  if (!(await shouldSend(fingerprint, severity, meta.sampleRate))) return;

  const errForCrashlytics = error instanceof Error ? error : new Error(normalized.message);
  // зачем (§126): в dev-клиенте (не в автотестах) ошибку в Crashlytics прод-проекта не отправляем — см. условие ниже для app_errors
  const isDevClient = typeof __DEV__ !== 'undefined' && __DEV__ && process.env.JEST_WORKER_ID === undefined;
  if (!isDevClient && (severity === 'critical' || severity === 'warning')) {
    try {
      recordError(errForCrashlytics, context);
    } catch (e) {
      // Diagnostics must never make the original failure path worse.
      DebugLogger.error('app_health:errForCrashlytics', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }

  const shouldWrite = meta.writeToFirestore ?? severity === 'critical';
  if (!shouldWrite) return;

  // зачем (§126, разбор обращений: ReferenceError «Property 'X' doesn't exist» по одному разу у каждого имени, 29.09–01.10 — это наши
  // dev-клиенты с Fast Refresh на полу-отредактированных файлах, а не пользователи): dev-сборка не пишет в прод-журнал app_errors,
  // иначе шум выглядит блокером релиза. Ошибка остаётся в консоли и в Crashlytics-пути выше; в тестах (там тоже __DEV__) запись не отключается.
  if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.JEST_WORKER_ID === undefined) {
    console.warn(`[APP-HEALTH] dev-сборка: запись в прод app_errors пропущена context=${context} severity=${severity} message=${normalized.message.slice(0, 120)}`);
    return;
  }

  // зачем (§AUTH-0230/§CORE-0158, приватность): имя в журнал сбоев не кладём — хватает uid из базы отчёта;
  // админка подставляет имя по uid сама (resolveUserNames), в Telegram и 90-дневный журнал оно не уходит.
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  // зачем (жалобы 9/13): родной номер пуст — берём из конфигурации сборки (app/app_build_number.ts)
  const buildNumber = resolveAppBuildNumberV1();

  await submitClientReport('app_error', {
    context,
    feature,
    screen: meta.screen ?? null,
    severity,
    fingerprint,
    errorName: normalized.name.slice(0, 120),
    message: normalized.message.slice(0, MAX_MESSAGE_LEN),
    stack: normalized.stack ? normalized.stack.slice(0, MAX_STACK_LEN) : null,
    tags: cleanTags(meta.tags),
    appVersion,
    buildNumber,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceName: Constants.deviceName ?? null,
  }).catch((e) => warnHealthIo(`transport_failed:${context}`, e));
}

export function logAppWarning(context: string, error: unknown, meta: Omit<AppHealthMeta, 'severity'> = {}) {
  return logAppError(context, error, { ...meta, severity: 'warning' });
}

export function logAppCritical(context: string, error: unknown, meta: Omit<AppHealthMeta, 'severity'> = {}) {
  return logAppError(context, error, { ...meta, severity: 'critical', writeToFirestore: true });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
