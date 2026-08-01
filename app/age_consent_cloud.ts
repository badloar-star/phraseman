/** Durable, privacy-minimized delivery for age and analytics consent metadata. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getAnalyticsConsentState, setAnalyticsConsent, type AnalyticsConsentState } from './analytics_consent';
import { getInstalledAppVersion } from './app_version';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  ensureAnonUser,
  ensureStableAuthLink,
  getCurrentUid,
  waitForAnonAuth,
} from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  getAgeBracketSnapshot,
  restoreAgeBracket,
  type AgeBracket,
} from './age_gate';
import { getStableId } from './stable_id';

const FUNCTIONS_REGION = 'us-central1';
const PENDING_CONSENT_KEY = 'age_consent_cloud_pending_v1';
const INTENT_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const MAX_COHORT_TEXT = 64;

export const LEGAL_ACCEPTED_STORAGE_KEY = 'onboarding_terms_privacy_accepted_v1';

type ConsentPlatform = 'ios' | 'android' | 'web';

export type AgeConsentCloudSnapshot = {
  schemaVersion: 1;
  intentId: string;
  ageBracket: AgeBracket;
  analyticsConsent: AnalyticsConsentState;
  legalAccepted: boolean;
  appVersion: string;
  build: string;
  platform: ConsentPlatform;
};

type CapturedConsentSnapshot = Omit<AgeConsentCloudSnapshot, 'schemaVersion' | 'intentId'>;

type DeliveryStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type DeliveryDependencies = {
  storage: DeliveryStorage;
  createIntentId(): string;
  captureSnapshot(): Promise<CapturedConsentSnapshot>;
  prepareDelivery(): Promise<boolean>;
  send(snapshot: AgeConsentCloudSnapshot): Promise<{ ok: boolean; duplicate?: boolean }>;
};

type ReadinessDependencies = {
  ensureAuthenticated(): Promise<unknown>;
  waitForCurrentAuth(): Promise<boolean>;
  hasCurrentAuth(): boolean;
  initAppCheck(): Promise<boolean>;
  ensureStableLink(): Promise<boolean>;
};

function isCohortText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_COHORT_TEXT;
}

function parsePendingSnapshot(raw: string | null): AgeConsentCloudSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const allowed = new Set([
      'schemaVersion',
      'intentId',
      'ageBracket',
      'analyticsConsent',
      'legalAccepted',
      'appVersion',
      'build',
      'platform',
    ]);
    if (Object.keys(value).some((key) => !allowed.has(key))) return null;
    if (value.schemaVersion !== 1) return null;
    if (typeof value.intentId !== 'string' || !INTENT_ID_RE.test(value.intentId)) return null;
    if (value.ageBracket !== 'adult' && value.ageBracket !== 'unknown') return null;
    if (
      value.analyticsConsent !== 'granted'
      && value.analyticsConsent !== 'denied'
      && value.analyticsConsent !== 'unset'
    ) return null;
    if (typeof value.legalAccepted !== 'boolean') return null;
    if (!isCohortText(value.appVersion) || !isCohortText(value.build)) return null;
    if (value.platform !== 'ios' && value.platform !== 'android' && value.platform !== 'web') return null;
    return value as AgeConsentCloudSnapshot;
  } catch {
    return null;
  }
}

export function createAgeConsentDeliveryReadiness(
  dependencies: ReadinessDependencies,
): () => Promise<boolean> {
  return async () => {
    try {
      await dependencies.ensureAuthenticated();
      if ((await dependencies.waitForCurrentAuth()) !== true) return false;
      if (!dependencies.hasCurrentAuth()) return false;
      if ((await dependencies.initAppCheck()) !== true) return false;
      if ((await dependencies.ensureStableLink()) !== true) return false;
      return dependencies.hasCurrentAuth();
    } catch {
      return false;
    }
  };
}

export function createAgeConsentCloudDelivery(dependencies: DeliveryDependencies) {
  async function deliver(snapshot: AgeConsentCloudSnapshot): Promise<boolean> {
    try {
      if ((await dependencies.prepareDelivery()) !== true) return false;
      const response = await dependencies.send(snapshot);
      if (response?.ok !== true) return false;

      const current = parsePendingSnapshot(
        await dependencies.storage.getItem(PENDING_CONSENT_KEY).catch(() => null),
      );
      if (current?.intentId === snapshot.intentId) {
        await dependencies.storage.setItem(PENDING_CONSENT_KEY, '');
      }
      return true;
    } catch {
      return false;
    }
  }

  return {
    recordCurrentConsent: async (): Promise<boolean> => {
      try {
        const intentId = dependencies.createIntentId().trim();
        if (!INTENT_ID_RE.test(intentId)) return false;
        const snapshot = parsePendingSnapshot(JSON.stringify({
          schemaVersion: 1,
          intentId,
          ...(await dependencies.captureSnapshot()),
        }));
        if (!snapshot) return false;
        await dependencies.storage.setItem(PENDING_CONSENT_KEY, JSON.stringify(snapshot));
        return deliver(snapshot);
      } catch {
        return false;
      }
    },
    resumePending: async (): Promise<boolean> => {
      const snapshot = parsePendingSnapshot(
        await dependencies.storage.getItem(PENDING_CONSENT_KEY).catch(() => null),
      );
      if (!snapshot) return false;
      return deliver(snapshot);
    },
  };
}

function currentPlatform(): ConsentPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

function boundedCohortText(value: unknown): string {
  const normalized = String(value ?? '').trim();
  return (normalized || 'unknown').slice(0, MAX_COHORT_TEXT);
}

function currentBuild(): string {
  const configured = Platform.OS === 'ios'
    ? (Constants.expoConfig?.ios as { buildNumber?: string } | undefined)?.buildNumber
    : (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode;
  return boundedCohortText(Constants.nativeBuildVersion ?? configured);
}

let callable: ((snapshot: AgeConsentCloudSnapshot) => Promise<{ data: { ok: boolean; duplicate?: boolean } }>) | null = null;

async function sendToServer(snapshot: AgeConsentCloudSnapshot): Promise<{ ok: boolean; duplicate?: boolean }> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !getCurrentUid()) return { ok: false };
  if (!callable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    callable = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'recordAgeConsentSnapshot',
    ) as typeof callable;
  }
  return (await callable!(snapshot)).data;
}

const prepareDefaultDelivery = createAgeConsentDeliveryReadiness({
  ensureAuthenticated: () => ensureAnonUser(),
  waitForCurrentAuth: () => waitForAnonAuth(),
  hasCurrentAuth: () => Boolean(getCurrentUid()),
  initAppCheck: () => initFirebaseAppCheckIfAvailable(),
  ensureStableLink: () => ensureStableAuthLink(),
});

const defaultDelivery = createAgeConsentCloudDelivery({
  storage: AsyncStorage,
  createIntentId: () => Crypto.randomUUID(),
  captureSnapshot: async () => ({
    ageBracket: getAgeBracketSnapshot(),
    analyticsConsent: getAnalyticsConsentState(),
    legalAccepted: (await AsyncStorage.getItem(LEGAL_ACCEPTED_STORAGE_KEY).catch(() => null)) === '1',
    appVersion: boundedCohortText(getInstalledAppVersion(Constants)),
    build: currentBuild(),
    platform: currentPlatform(),
  }),
  prepareDelivery: async () => (
    !IS_EXPO_GO && CLOUD_SYNC_ENABLED && prepareDefaultDelivery()
  ),
  send: sendToServer,
});

export async function recordConsentToCloud(): Promise<void> {
  await defaultDelivery.recordCurrentConsent();
}

export function resumePendingAgeConsent(): Promise<boolean> {
  return defaultDelivery.resumePending();
}

function getFirestore(): any | null {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

/** Restore existing consent metadata without inventing deprecated birth-year data. */
export async function restoreConsentStateFromCloud(): Promise<boolean> {
  const db = getFirestore();
  if (!db) return false;
  try {
    const stableId = await getStableId();
    if (!stableId) return false;
    await ensureStableAuthLink().catch(() => false);

    const snap = await db.collection('user_consents').doc(stableId).get();
    const data = (snap?.data?.() ?? null) as Record<string, unknown> | null;
    if (!data) return false;

    let restored = false;
    const bracket = data.ageBracket as AgeBracket | undefined;
    if (bracket === 'adult') {
      await restoreAgeBracket('adult');
      restored = true;
    }

    const analytics = data.analyticsConsent;
    if (analytics === 'granted' || analytics === 'denied') {
      await setAnalyticsConsent(analytics);
      restored = true;
    }

    if (data.legalAccepted === true) {
      await AsyncStorage.setItem(LEGAL_ACCEPTED_STORAGE_KEY, '1').catch(() => {});
      restored = true;
    }
    return restored;
  } catch {
    return false;
  }
}
