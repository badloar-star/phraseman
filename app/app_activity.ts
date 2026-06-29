import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { getCanonicalUserId } from './user_id_policy';
import { submitClientReport } from './client_reports';
import { isAnalyticsConsentGranted } from './analytics_consent';

type ActivityValue = string | number | boolean | null | undefined;

export interface AppActivityMeta {
  feature?: string;
  screen?: string;
  result?: 'start' | 'success' | 'blocked' | 'error' | 'info';
  tags?: Record<string, ActivityValue>;
  writeToFirestore?: boolean;
}

const QUEUE_KEY = 'app_activity_queue_v1';
const MAX_QUEUE = 200;
const MAX_TAGS = 24;
const MAX_TEXT = 220;
const FIRESTORE_SAMPLE_RATE = 0.01;
const LOCAL_ACTIVITY_QUEUE_ENABLED = false;
let lastEventKey = '';
let lastEventAt = 0;
let activityQueueCache: Array<Record<string, unknown>> | null = null;

function cleanTags(tags: AppActivityMeta['tags']) {
  if (!tags) return {};
  const out: Record<string, string | number | boolean | null> = {};
  Object.entries(tags).slice(0, MAX_TAGS).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === 'string') out[key] = value.slice(0, MAX_TEXT);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
    else out[key] = String(value).slice(0, MAX_TEXT);
  });
  return out;
}

async function readActivityQueueFromStorage(): Promise<Array<Record<string, unknown>>> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY).catch(() => null);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
      : [];
  } catch {
    return [];
  }
}

async function queueLocal(record: Record<string, unknown>) {
  if (activityQueueCache === null) {
    activityQueueCache = await readActivityQueueFromStorage();
  }
  activityQueueCache.push(record);
  if (activityQueueCache.length > MAX_QUEUE) activityQueueCache.splice(0, activityQueueCache.length - MAX_QUEUE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(activityQueueCache)).catch(() => {});
}

export async function trackActivity(action: string, meta: AppActivityMeta = {}) {
  try {
    const now = Date.now();
    const key = `${action}|${meta.screen || ''}|${meta.result || ''}|${JSON.stringify(meta.tags || {})}`;
    if (key === lastEventKey && now - lastEventAt < 750) return;
    lastEventKey = key;
    lastEventAt = now;

    const uid = await getCanonicalUserId().catch(() => null);
    const userName = await AsyncStorage.getItem('user_name').catch(() => null);
    const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
    const buildNumber = Constants.nativeBuildVersion ?? 'unknown';
    const record = {
      action: action.slice(0, 120),
      feature: meta.feature ?? action.split(':')[0] ?? 'app',
      screen: meta.screen ?? null,
      result: meta.result ?? 'info',
      tags: cleanTags(meta.tags),
      uid: uid ?? 'unknown',
      userName: userName ?? null,
      appVersion,
      buildNumber,
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appState: AppState.currentState,
      createdAt: new Date(now).toISOString(),
    };

    if (LOCAL_ACTIVITY_QUEUE_ENABLED) {
      await queueLocal(record);
    }

    // Routine product analytics already goes to Firebase Analytics. Firestore is
    // reserved for explicit debug/critical traces, with light sampling for
    // high-volume diagnostic streams so growth does not turn every tap into a
    // billable document write.
    const isErrorTrace = meta.result === 'error';
    const shouldWrite =
      meta.writeToFirestore === true
      || (isErrorTrace && Math.random() < FIRESTORE_SAMPLE_RATE);
    if (!shouldWrite) return;

    // Гейт согласия (GDPR/ePrivacy): продуктовую телеметрию (uid+userName+действия)
    // НЕ пишем в облако без согласия на аналитику. Трейсы ОШИБОК (result:'error')
    // оставляем — это строго необходимая диагностика стабильности (как Crashlytics),
    // согласия не требует.
    if (!isErrorTrace && !isAnalyticsConsentGranted()) return;

    await submitClientReport('app_activity', record).catch(() => {});
  } catch {
    // Activity logging must never affect product behavior.
  }
}

export function trackFeatureStart(
  feature: string,
  action: string,
  tags: AppActivityMeta['tags'] = {},
  screen?: string,
) {
  return trackActivity(`${feature}:${action}_start`, { feature, screen: screen ?? feature, result: 'start', tags });
}

export function trackFeatureSuccess(
  feature: string,
  action: string,
  tags: AppActivityMeta['tags'] = {},
  screen?: string,
) {
  return trackActivity(`${feature}:${action}_success`, { feature, screen: screen ?? feature, result: 'success', tags });
}

export function trackFeatureBlocked(
  feature: string,
  action: string,
  reason: string,
  tags: AppActivityMeta['tags'] = {},
  screen?: string,
) {
  return trackActivity(`${feature}:${action}_blocked`, {
    feature,
    screen: screen ?? feature,
    result: 'blocked',
    tags: { reason, ...tags },
  });
}

export async function trackFeatureError(
  feature: string,
  action: string,
  error: unknown,
  tags: AppActivityMeta['tags'] = {},
  screen?: string,
) {
  const message = error instanceof Error ? error.message : String(error);
  await trackActivity(`${feature}:${action}_error`, {
    feature,
    screen: screen ?? feature,
    result: 'error',
    tags: { ...tags, error: message },
  });
  await import('./app_health')
    .then(({ logAppWarning }) =>
      logAppWarning(`${feature}:${action}_failed`, error, {
        feature,
        screen: screen ?? feature,
        writeToFirestore: true,
        tags,
      }),
    )
    .catch(() => {});
}

export async function getActivityQueue(): Promise<Array<Record<string, unknown>>> {
  try {
    if (activityQueueCache !== null) return activityQueueCache.slice();
    return readActivityQueueFromStorage();
  } catch {
    return [];
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
