import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleIntroExpiringNotification,
  scheduleUpsellNotifications,
  cancelIntroExpiringNotification,
  cancelUpsellNotifications,
} from './notifications';
import type { Lang } from '../constants/i18n';
import { claimIntroFullAccessOnCloud, readGiftAccessFromCloud } from './gift_access_cloud';
import { DebugLogger } from './debug-logger';
import {
  INTRO_FULL_ACCESS_DURATION_MS,
  INTRO_FULL_ACCESS_ENDED_SEEN_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_STORAGE_KEYS,
  INTRO_FULL_ACCESS_WELCOME_SEEN_KEY,
} from './intro_full_access_keys';

export {
  INTRO_FULL_ACCESS_DURATION_MS,
  INTRO_FULL_ACCESS_ENDED_SEEN_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_STORAGE_KEYS,
  INTRO_FULL_ACCESS_WELCOME_SEEN_KEY,
} from './intro_full_access_keys';

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
  // Локальная отметка позволяет быстро завершить повторный вызов. Источник истины
  // для новой выдачи и kill-switch — серверный introFullAccessClaim. Подарок выдаётся
  // ровно один раз на canonical account; локальный admin reset не продлевает его.
  const existingStart = parsePositiveMs(await AsyncStorage.getItem(INTRO_FULL_ACCESS_STARTED_AT_KEY));
  if (existingStart) return;

  // H4 cloud-guard: после переустановки AsyncStorage чист, но Firestore помнит
  // что подарок уже выдавался → НЕ выдаём повторно. Если cloud-grant ещё активен —
  // восстанавливаем endsAt в локальный стор, юзер докатает оставшиеся часы.
  // Direct read нужен для быстрого восстановления. При ошибке callable повторно
  // проверит тот же canonical account; без успешного ответа локальный доступ не создаётся.
  const cloudState = await readGiftAccessFromCloud('intro');
  if (cloudState?.grantedAtMs) {
    const remainingEndsAt = cloudState.endsAtMs && cloudState.endsAtMs > nowMs ? cloudState.endsAtMs : null;
    if (remainingEndsAt) {
      await AsyncStorage.multiSet([
        [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(cloudState.grantedAtMs)],
        [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(remainingEndsAt)],
        [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'true'], // уже видел приветствие в прошлой установке
        [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
      ]);
      scheduleIntroExpiringNotification(remainingEndsAt, lang).catch(() => {});
      scheduleUpsellNotifications(remainingEndsAt, lang).catch(() => {});
    } else {
      // Подарок выдан и истёк — пишем только started_at чтобы запомнить факт выдачи.
      await AsyncStorage.setItem(INTRO_FULL_ACCESS_STARTED_AT_KEY, String(cloudState.grantedAtMs));
    }
    return;
  }

  let grant;
  try {
    grant = await claimIntroFullAccessOnCloud();
  } catch (error) {
    DebugLogger.error('intro_full_access:claim', error, 'warning');
    return;
  }

  if (grant.endsAtMs <= nowMs) {
    await AsyncStorage.multiSet([
      [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(grant.grantedAtMs)],
      [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(grant.endsAtMs)],
      [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'true'],
      [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'true'],
    ]);
    return;
  }

  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(grant.grantedAtMs)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(grant.endsAtMs)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, grant.alreadyGranted ? 'true' : 'false'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);

  // Сервер уже атомарно выдал или replay-нул grant; локально сохраняются только
  // точные серверные timestamps, затем восстанавливаются прежние уведомления.
  scheduleIntroExpiringNotification(grant.endsAtMs, lang).catch(() => {});
  scheduleUpsellNotifications(grant.endsAtMs, lang).catch(() => {});

  // Воронка: старт 72-часового полного доступа — ключевой шаг между онбордингом и пейволом.
  if (!grant.alreadyGranted) {
    void import('./analytics').then(({ trackEvent }) => trackEvent('intro_full_access_started', {})).catch(() => {});
  }
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
