import { readStoredItems } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
type IntroNotificationModule = Pick<
  typeof import('./notifications'),
  'scheduleIntroExpiringNotification' | 'scheduleUpsellNotifications'
>;
let introNotificationModulePromise: Promise<IntroNotificationModule> | null = null;

function loadIntroNotificationModule(): Promise<IntroNotificationModule> {
  introNotificationModulePromise ??= import('./notifications');
  return introNotificationModulePromise;
}
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
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
      bumpIntroReadGeneration();
      void loadIntroNotificationModule().then((notifications) => {
        notifications.scheduleIntroExpiringNotification(remainingEndsAt, lang).catch(noteSwallowedHandler('intro_full_access:promise_2'));
        notifications.scheduleUpsellNotifications(remainingEndsAt, lang).catch(noteSwallowedHandler('intro_full_access:promise_3'));
      }).catch(noteSwallowedHandler('intro_full_access:promise_1'));
    } else {
      // Подарок выдан и истёк — пишем только started_at чтобы запомнить факт выдачи.
      await AsyncStorage.setItem(INTRO_FULL_ACCESS_STARTED_AT_KEY, String(cloudState.grantedAtMs));
      bumpIntroReadGeneration();
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
    bumpIntroReadGeneration();
    return;
  }

  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(grant.grantedAtMs)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(grant.endsAtMs)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, grant.alreadyGranted ? 'true' : 'false'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);
  bumpIntroReadGeneration();

  // Сервер уже атомарно выдал или replay-нул grant; локально сохраняются только
  // точные серверные timestamps, затем восстанавливаются прежние уведомления.
  void loadIntroNotificationModule().then((notifications) => {
    notifications.scheduleIntroExpiringNotification(grant.endsAtMs, lang).catch(noteSwallowedHandler('intro_full_access:promise_5'));
    notifications.scheduleUpsellNotifications(grant.endsAtMs, lang).catch(noteSwallowedHandler('intro_full_access:promise_6'));
  }).catch(noteSwallowedHandler('intro_full_access:promise_4'));

  // Воронка: старт 72-часового полного доступа — ключевой шаг между онбордингом и пейволом.
  if (!grant.alreadyGranted) {
    void import('./analytics').then(({ trackEvent }) => trackEvent('intro_full_access_started', {})).catch(noteSwallowedHandler('intro_full_access:promise_7'));
  }
}

/**
 * зачем ([COLD-START-IO], release, слабый профиль, 02.10): состояние intro читали 11 раз за 15 с старта
 * (PremiumContext, Главная, гейты) — каждое multiGet ждало очередь до 3,2 с. Одновременные чтения
 * склеиваются в одно; сырые пары общие, а «сейчас» считает каждый вызов сам. Любая запись в этом
 * модуле повышает поколение — следующие чтения идут заново, старый ответ не переиспользуется.
 * Кэша дольше одного запроса нет.
 */
let introReadGeneration = 0;
let inFlightIntroRead: Readonly<{ generation: number; promise: Promise<readonly (readonly [string, string | null])[]> }> | null = null;

function bumpIntroReadGeneration(): void {
  introReadGeneration += 1;
  inFlightIntroRead = null;
}

function readIntroPairs(): Promise<readonly (readonly [string, string | null])[]> {
  const current = inFlightIntroRead;
  if (current && current.generation === introReadGeneration) return current.promise;
  const generation = introReadGeneration;
  // зачем (§122, PM-220): сырые пары читаются через снапшот — хранилище трогаем один раз, дальше память; любая запись по этим
  // ключам (в том числе чужая, мимо модуля) выбрасывает их из снапшота. Склейка параллельных вызовов выше остаётся.
  const promise = readStoredItems(INTRO_FULL_ACCESS_STORAGE_KEYS);
  inFlightIntroRead = Object.freeze({ generation, promise });
  const release = (): void => {
    if (inFlightIntroRead?.promise === promise) inFlightIntroRead = null;
  };
  promise.then(release, (error: unknown) => {
    release();
    DebugLogger.error('intro_full_access:read_failed', error instanceof Error ? error : new Error(String(error)), 'warning');
  });
  return promise;
}

export async function getIntroFullAccessState(nowMs: number = Date.now()): Promise<IntroFullAccessState> {
  // зачем (settings-gap-005, координатор 13.10): dev-подмена «пробный доступ активен» — только память и только __DEV__
  // (ленивый require: в стор-сборке ветка мертва, модуль — заглушка). Окна приветствия/окончания не всплывают.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dev = (require('./dev_paywall_state') as typeof import('./dev_paywall_state')).getDevIntroFullAccess();
    if (dev) {
      console.log(`[DEV-STATE] intro: состояние из подмены endsAt=${new Date(dev.endsAt).toISOString()}`); // guard-ok: dev-ветка
      return { active: dev.endsAt > nowMs, startedAt: dev.startedAt, endsAt: dev.endsAt, remainingMs: Math.max(0, dev.endsAt - nowMs), expiredUnseen: false, welcomeUnseen: false };
    }
  }
  const pairs = await readIntroPairs();
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
  bumpIntroReadGeneration();
}

export async function markIntroFullAccessEndedSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'true');
  bumpIntroReadGeneration();
}
