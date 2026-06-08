import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleIntroExpiringNotification,
  scheduleUpsellNotifications,
  cancelIntroExpiringNotification,
  cancelUpsellNotifications,
} from './notifications';
import type { Lang } from '../constants/i18n';

export const INTRO_FULL_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;

export const INTRO_FULL_ACCESS_STARTED_AT_KEY = 'intro_full_access_started_at_v1';
export const INTRO_FULL_ACCESS_ENDS_AT_KEY = 'intro_full_access_ends_at_v1';
export const INTRO_FULL_ACCESS_WELCOME_SEEN_KEY = 'intro_full_access_welcome_seen_v1';
export const INTRO_FULL_ACCESS_ENDED_SEEN_KEY = 'intro_full_access_ended_seen_v1';

export const INTRO_FULL_ACCESS_STORAGE_KEYS = [
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  INTRO_FULL_ACCESS_WELCOME_SEEN_KEY,
  INTRO_FULL_ACCESS_ENDED_SEEN_KEY,
] as const;

export type IntroFullAccessState = {
  active: boolean;
  startedAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  expiredUnseen: boolean;
  welcomeUnseen: boolean;
};

function parsePositiveMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function startIntroFullAccessAfterOnboarding(
  nowMs: number = Date.now(),
  lang: Lang = 'ru',
): Promise<void> {
  const existingStart = parsePositiveMs(await AsyncStorage.getItem(INTRO_FULL_ACCESS_STARTED_AT_KEY));
  if (existingStart) return;

  const endsAt = nowMs + INTRO_FULL_ACCESS_DURATION_MS;

  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(nowMs)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(endsAt)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'false'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);

  scheduleIntroExpiringNotification(endsAt, lang).catch(() => {});
  scheduleUpsellNotifications(endsAt, lang).catch(() => {});

  // Воронка: старт 72-часового полного доступа — ключевой шаг между онбордингом и пейволом.
  void import('./analytics').then(({ trackEvent }) => trackEvent('intro_full_access_started', {})).catch(() => {});
}

export async function getIntroFullAccessState(nowMs: number = Date.now()): Promise<IntroFullAccessState> {
  const pairs = await AsyncStorage.multiGet([...INTRO_FULL_ACCESS_STORAGE_KEYS]);
  const get = (key: string) => pairs.find(([k]) => k === key)?.[1] ?? null;
  const startedAt = parsePositiveMs(get(INTRO_FULL_ACCESS_STARTED_AT_KEY));
  const endsAt = parsePositiveMs(get(INTRO_FULL_ACCESS_ENDS_AT_KEY));
  const welcomeSeen = get(INTRO_FULL_ACCESS_WELCOME_SEEN_KEY) === 'true';
  const endedSeen = get(INTRO_FULL_ACCESS_ENDED_SEEN_KEY) === 'true';

  if (!startedAt || !endsAt) {
    return {
      active: false,
      startedAt: null,
      endsAt: null,
      remainingMs: 0,
      expiredUnseen: false,
      welcomeUnseen: false,
    };
  }

  const remainingMs = Math.max(0, endsAt - nowMs);
  const active = remainingMs > 0;
  return {
    active,
    startedAt,
    endsAt,
    remainingMs,
    expiredUnseen: !active && !endedSeen,
    welcomeUnseen: active && !welcomeSeen,
  };
}

export async function isIntroFullAccessActive(nowMs: number = Date.now()): Promise<boolean> {
  return (await getIntroFullAccessState(nowMs)).active;
}

export async function shouldShowIntroFullAccessWelcome(nowMs: number = Date.now()): Promise<boolean> {
  return (await getIntroFullAccessState(nowMs)).welcomeUnseen;
}

export async function markIntroFullAccessWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'true');
}

export async function markIntroFullAccessEndedSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'true');
}

export async function activateIntroFullAccessForAdmin(nowMs: number = Date.now()): Promise<void> {
  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(nowMs)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(nowMs + INTRO_FULL_ACCESS_DURATION_MS)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'false'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);
}

export async function expireIntroFullAccessForAdmin(nowMs: number = Date.now()): Promise<void> {
  const startedAt = nowMs - INTRO_FULL_ACCESS_DURATION_MS - 1000;
  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(startedAt)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(nowMs - 1000)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'true'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);
}

export async function resetIntroFullAccessForAdmin(): Promise<void> {
  await AsyncStorage.multiRemove([...INTRO_FULL_ACCESS_STORAGE_KEYS]);
}
