import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';

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
let lastEventKey = '';
let lastEventAt = 0;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

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

async function queueLocal(record: Record<string, unknown>) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY).catch(() => null);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push(record);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => {});
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

    await queueLocal(record);
    if (meta.writeToFirestore === false) return;

    const db = getFirestore();
    if (!db) return;
    await db.collection('app_activity').add(record).catch(() => {});
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
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
