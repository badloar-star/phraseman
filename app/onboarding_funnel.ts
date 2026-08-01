import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, getCurrentUid, waitForAnonAuth } from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';
const ATTEMPT_KEY = 'onboarding_funnel_attempt_v1';
const START_ACK_KEY = 'onboarding_funnel_started_ack_v1';
const COMPLETE_ACK_KEY = 'onboarding_funnel_completed_ack_v1';
const START_PENDING_KEY = 'onboarding_funnel_started_pending_v1';
const COMPLETE_PENDING_KEY = 'onboarding_funnel_completed_pending_v1';
/** Решение о согласии переживает перезапуск: resumePending() шлёт событие уже без памяти. */
const CONSENT_PENDING_KEY = 'onboarding_funnel_consent_pending_v1';
const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;

type FunnelEvent = 'started' | 'completed';
type FunnelPlatform = 'ios' | 'android' | 'web';
/**
 * зачем: доля согласий на аналитику — единственный способ узнать, какая часть
 * аудитории вообще доходит до A/B-теста пейвола. Продуктовая аналитика гейтится
 * согласием и отказавшихся не видит, поэтому решение едет здесь — в счётчике без
 * PII на легитимном интересе (сервер хранит только +1, само значение не пишется).
 */
type FunnelConsentDecision = 'granted' | 'denied';
type FunnelPayload = {
  event: FunnelEvent;
  platform: FunnelPlatform;
  attemptId: string;
  analyticsConsent?: FunnelConsentDecision;
};
type FunnelResponse = { ok: boolean; duplicate: boolean };

type RecorderStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type RecorderDependencies = {
  storage: RecorderStorage;
  createAttemptId(): string;
  platform: FunnelPlatform;
  prepareDelivery(): Promise<boolean>;
  send(payload: FunnelPayload): Promise<FunnelResponse>;
};

type DeliveryReadinessDependencies = {
  ensureAuthenticated(): Promise<unknown>;
  waitForCurrentAuth(): Promise<boolean>;
  hasCurrentAuth(): boolean;
  initAppCheck(): Promise<boolean>;
};

export function createOnboardingFunnelDeliveryReadiness(
  dependencies: DeliveryReadinessDependencies,
): () => Promise<boolean> {
  return async () => {
    try {
      await dependencies.ensureAuthenticated();
      if ((await dependencies.waitForCurrentAuth()) !== true) return false;
      if (!dependencies.hasCurrentAuth()) return false;
      if ((await dependencies.initAppCheck()) !== true) return false;
      return dependencies.hasCurrentAuth();
    } catch {
      return false;
    }
  };
}

function ackKey(event: FunnelEvent): string {
  return event === 'started' ? START_ACK_KEY : COMPLETE_ACK_KEY;
}

function pendingKey(event: FunnelEvent): string {
  return event === 'started' ? START_PENDING_KEY : COMPLETE_PENDING_KEY;
}

export function createOnboardingFunnelRecorder(dependencies: RecorderDependencies) {
  let attemptInFlight: Promise<string> | null = null;
  const eventInFlight = new Map<FunnelEvent, Promise<boolean>>();

  async function getAttemptId(): Promise<string> {
    if (attemptInFlight) return attemptInFlight;
    attemptInFlight = (async () => {
      const saved = (await dependencies.storage.getItem(ATTEMPT_KEY).catch(() => null))?.trim() ?? '';
      if (ATTEMPT_ID_RE.test(saved)) return saved;
      const created = dependencies.createAttemptId().trim();
      if (!ATTEMPT_ID_RE.test(created)) throw new Error('onboarding_funnel_attempt_unavailable');
      await dependencies.storage.setItem(ATTEMPT_KEY, created);
      return created;
    })().finally(() => { attemptInFlight = null; });
    return attemptInFlight;
  }

  async function readStoredConsent(): Promise<FunnelConsentDecision | undefined> {
    const raw = (await dependencies.storage.getItem(CONSENT_PENDING_KEY).catch(() => null))?.trim();
    return raw === 'granted' || raw === 'denied' ? raw : undefined;
  }

  async function sendEvent(event: FunnelEvent): Promise<boolean> {
    const existing = eventInFlight.get(event);
    if (existing) return existing;

    const pending = (async () => {
      try {
        const attemptId = await getAttemptId();
        const key = ackKey(event);
        const acknowledgedAttempt = await dependencies.storage.getItem(key).catch(() => null);
        if (acknowledgedAttempt === attemptId) {
          await dependencies.storage.setItem(pendingKey(event), '');
          return true;
        }
        await dependencies.storage.setItem(pendingKey(event), attemptId);
        if ((await dependencies.prepareDelivery()) !== true) return false;
        // Согласие относится только к 'completed' — момент, когда выбор сделан.
        // Читаем из хранилища, а не из памяти: после перезапуска resumePending()
        // досылает событие, и решение обязано пережить рестарт.
        const consent = event === 'completed' ? await readStoredConsent() : undefined;
        const response = await dependencies.send({
          event,
          platform: dependencies.platform,
          attemptId,
          ...(consent ? { analyticsConsent: consent } : {}),
        });
        if (response?.ok !== true) return false;
        await dependencies.storage.setItem(key, attemptId);
        await dependencies.storage.setItem(pendingKey(event), '');
        if (event === 'completed') await dependencies.storage.setItem(CONSENT_PENDING_KEY, '');
        return true;
      } catch {
        return false;
      }
    })().finally(() => { eventInFlight.delete(event); });

    eventInFlight.set(event, pending);
    return pending;
  }

  async function readPendingCount(): Promise<number> {
    const values = await Promise.all([
      dependencies.storage.getItem(START_PENDING_KEY).catch(() => null),
      dependencies.storage.getItem(COMPLETE_PENDING_KEY).catch(() => null),
    ]);
    return values.filter((value) => ATTEMPT_ID_RE.test(value?.trim() ?? '')).length;
  }

  async function resumePending(): Promise<{ attempted: number; pending: number }> {
    const [startPending, completionPending] = await Promise.all([
      dependencies.storage.getItem(START_PENDING_KEY).catch(() => null),
      dependencies.storage.getItem(COMPLETE_PENDING_KEY).catch(() => null),
    ]);
    const hasStart = ATTEMPT_ID_RE.test(startPending?.trim() ?? '');
    const hasCompletion = ATTEMPT_ID_RE.test(completionPending?.trim() ?? '');
    if (!hasStart && !hasCompletion) return { attempted: 0, pending: 0 };

    if (hasCompletion) await recordCompletion();
    else await sendEvent('started');
    return { attempted: 1, pending: await readPendingCount() };
  }

  async function recordCompletion(analyticsConsent?: FunnelConsentDecision): Promise<boolean> {
    try {
      const attemptId = await getAttemptId();
      await dependencies.storage.setItem(COMPLETE_PENDING_KEY, attemptId);
      // Пишем ДО отправки: если сеть отвалится, resumePending() досошлёт решение
      // после перезапуска и знаменатель доли согласий не потеряет отказы.
      if (analyticsConsent) await dependencies.storage.setItem(CONSENT_PENDING_KEY, analyticsConsent);
    } catch {
      return false;
    }
    if (!(await sendEvent('started'))) return false;
    return sendEvent('completed');
  }

  return {
    recordStart: () => sendEvent('started'),
    recordCompletion,
    resumePending,
  };
}

function currentPlatform(): FunnelPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

let callable: ((payload: FunnelPayload) => Promise<{ data: FunnelResponse }>) | null = null;

async function sendToServer(payload: FunnelPayload): Promise<FunnelResponse> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, duplicate: false };
  if (!getCurrentUid()) return { ok: false, duplicate: false };
  if (!callable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    callable = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'recordOnboardingFunnelEvent',
    ) as (value: FunnelPayload) => Promise<{ data: FunnelResponse }>;
  }
  return (await callable(payload)).data;
}

const prepareDefaultDelivery = createOnboardingFunnelDeliveryReadiness({
  ensureAuthenticated: () => ensureAnonUser(),
  waitForCurrentAuth: () => waitForAnonAuth(),
  hasCurrentAuth: () => Boolean(getCurrentUid()),
  initAppCheck: () => initFirebaseAppCheckIfAvailable(),
});

const defaultRecorder = createOnboardingFunnelRecorder({
  storage: AsyncStorage,
  createAttemptId: () => Crypto.randomUUID(),
  platform: currentPlatform(),
  prepareDelivery: async () => (
    !IS_EXPO_GO && CLOUD_SYNC_ENABLED && prepareDefaultDelivery()
  ),
  send: sendToServer,
});

export function recordOnboardingFunnelStart(): Promise<boolean> {
  return defaultRecorder.recordStart();
}

export function recordOnboardingFunnelCompletion(
  analyticsConsent?: FunnelConsentDecision,
): Promise<boolean> {
  return defaultRecorder.recordCompletion(analyticsConsent);
}

export function resumePendingOnboardingFunnel(): Promise<{ attempted: number; pending: number }> {
  return defaultRecorder.resumePending();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
