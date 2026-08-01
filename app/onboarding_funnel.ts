import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';
const ATTEMPT_KEY = 'onboarding_funnel_attempt_v1';
const START_ACK_KEY = 'onboarding_funnel_started_ack_v1';
const COMPLETE_ACK_KEY = 'onboarding_funnel_completed_ack_v1';
const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;

type FunnelEvent = 'started' | 'completed';
type FunnelPlatform = 'ios' | 'android' | 'web';
type FunnelPayload = { event: FunnelEvent; platform: FunnelPlatform; attemptId: string };
type FunnelResponse = { ok: boolean; duplicate: boolean };

type RecorderStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type RecorderDependencies = {
  storage: RecorderStorage;
  createAttemptId(): string;
  platform: FunnelPlatform;
  send(payload: FunnelPayload): Promise<FunnelResponse>;
};

function ackKey(event: FunnelEvent): string {
  return event === 'started' ? START_ACK_KEY : COMPLETE_ACK_KEY;
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

  async function sendEvent(event: FunnelEvent): Promise<boolean> {
    const existing = eventInFlight.get(event);
    if (existing) return existing;

    const pending = (async () => {
      try {
        const attemptId = await getAttemptId();
        const key = ackKey(event);
        const acknowledgedAttempt = await dependencies.storage.getItem(key).catch(() => null);
        if (acknowledgedAttempt === attemptId) return true;
        const response = await dependencies.send({ event, platform: dependencies.platform, attemptId });
        if (response?.ok !== true) return false;
        await dependencies.storage.setItem(key, attemptId);
        return true;
      } catch {
        return false;
      }
    })().finally(() => { eventInFlight.delete(event); });

    eventInFlight.set(event, pending);
    return pending;
  }

  return {
    recordStart: () => sendEvent('started'),
    recordCompletion: async () => {
      if (!(await sendEvent('started'))) return false;
      return sendEvent('completed');
    },
  };
}

function currentPlatform(): FunnelPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

let callable: ((payload: FunnelPayload) => Promise<{ data: FunnelResponse }>) | null = null;

async function sendToServer(payload: FunnelPayload): Promise<FunnelResponse> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, duplicate: false };
  await initFirebaseAppCheckIfAvailable();
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

const defaultRecorder = createOnboardingFunnelRecorder({
  storage: AsyncStorage,
  createAttemptId: () => Crypto.randomUUID(),
  platform: currentPlatform(),
  send: sendToServer,
});

export function recordOnboardingFunnelStart(): Promise<boolean> {
  return defaultRecorder.recordStart();
}

export function recordOnboardingFunnelCompletion(): Promise<boolean> {
  return defaultRecorder.recordCompletion();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
