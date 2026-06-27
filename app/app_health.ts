import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { recordError } from './firebase';
import { submitClientReport } from './client_reports';

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
const healthThrottleCache = new Map<string, number>();

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

async function shouldSend(fingerprint: string, severity: AppHealthSeverity, sampleRate?: number) {
  if (severity === 'info') return false;
  if (sampleRate != null && sampleRate < 1 && Math.random() > sampleRate) return false;

  const key = `${THROTTLE_PREFIX}${fingerprint}`;
  const now = Date.now();
  const throttleMs = severity === 'critical' ? 10 * 60 * 1000 : DEFAULT_THROTTLE_MS;
  const cachedLast = healthThrottleCache.get(key) ?? 0;
  if (now - cachedLast < throttleMs) return false;

  const lastRaw = await AsyncStorage.getItem(key).catch(() => null);
  const last = parseInt(lastRaw || '0', 10) || 0;
  rememberThrottle(key, last);
  if (now - last < throttleMs) return false;

  rememberThrottle(key, now);
  await AsyncStorage.setItem(key, String(now)).catch(() => {});
  return true;
}

export async function logAppError(context: string, error: unknown, meta: AppHealthMeta = {}) {
  const severity: AppHealthSeverity = meta.severity ?? 'warning';
  const normalized = normalizeError(error);
  const feature = meta.feature ?? context.split(':')[0] ?? 'app';
  const fingerprint = shortHash(`${context}|${normalized.name}|${normalized.message.slice(0, 160)}`);

  if (!(await shouldSend(fingerprint, severity, meta.sampleRate))) return;

  const errForCrashlytics = error instanceof Error ? error : new Error(normalized.message);
  if (severity === 'critical' || severity === 'warning') {
    try {
      recordError(errForCrashlytics, context);
    } catch {
      // Diagnostics must never make the original failure path worse.
    }
  }

  const shouldWrite = meta.writeToFirestore ?? severity === 'critical';
  if (!shouldWrite) return;

  const userName = await AsyncStorage.getItem('user_name').catch(() => null);
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const buildNumber = Constants.nativeBuildVersion ?? 'unknown';

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
    userName: userName ?? null,
    appVersion,
    buildNumber,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceName: Constants.deviceName ?? null,
  }).catch(() => {});
}

export function logAppWarning(context: string, error: unknown, meta: Omit<AppHealthMeta, 'severity'> = {}) {
  return logAppError(context, error, { ...meta, severity: 'warning' });
}

export function logAppCritical(context: string, error: unknown, meta: Omit<AppHealthMeta, 'severity'> = {}) {
  return logAppError(context, error, { ...meta, severity: 'critical', writeToFirestore: true });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
