import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleIntroExpiringNotification,
  scheduleUpsellNotifications,
  cancelIntroExpiringNotification,
  cancelUpsellNotifications,
} from './notifications';
import type { Lang } from '../constants/i18n';
import { persistGiftAccessOnCloud, readGiftAccessFromCloud } from './gift_access_cloud';
import {
  INTRO_FULL_ACCESS_DURATION_MS,
  INTRO_FULL_ACCESS_ENDED_SEEN_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_STORAGE_KEYS,
  INTRO_FULL_ACCESS_WELCOME_SEEN_KEY,
} from './intro_full_access_keys';
import { isIntroFullAccessEnabled } from './remote_flags';

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
  // Kill-switch из «Пульта» блокирует только НОВУЮ выдачу. Уже выданный подарок
  // сначала ищем локально и в облаке, чтобы не отобрать остаток доступа после
  // переустановки. Новому юзеру при выключенном флаге стор не заполняем, поэтому
  // приветственный и финальный модалы не появятся.
  // Подарок выдаётся РОВНО ОДИН РАЗ за всю жизнь установки: если отметка о старте
  // уже есть (даже если 72ч давно истекли) — повторно не выдаём. Для проверки в
  // разработке отметку стирает кнопка «Онбординг — просмотреть повторно» в админке
  // (resetIntroFullAccessForAdmin), после чего подарок выдаётся как новому юзеру.
  const existingStart = parsePositiveMs(await AsyncStorage.getItem(INTRO_FULL_ACCESS_STARTED_AT_KEY));
  if (existingStart) return;

  // H4 cloud-guard: после переустановки AsyncStorage чист, но Firestore помнит
  // что подарок уже выдавался → НЕ выдаём повторно. Если cloud-grant ещё активен —
  // восстанавливаем endsAt в локальный стор, юзер докатает оставшиеся часы.
  // Best-effort: при оффлайне/ошибке падаем на обычный локальный путь (выдача).
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

  // The kill-switch blocks only a NEW grant. The one-time cloud guard above must still run so
  // an already granted gift survives reinstall / cleared AsyncStorage without being reissued.
  if (!isIntroFullAccessEnabled()) return;

  const endsAt = nowMs + INTRO_FULL_ACCESS_DURATION_MS;

  await AsyncStorage.multiSet([
    [INTRO_FULL_ACCESS_STARTED_AT_KEY, String(nowMs)],
    [INTRO_FULL_ACCESS_ENDS_AT_KEY, String(endsAt)],
    [INTRO_FULL_ACCESS_WELCOME_SEEN_KEY, 'false'],
    [INTRO_FULL_ACCESS_ENDED_SEEN_KEY, 'false'],
  ]);

  // Пишем в облако ПОСЛЕ AsyncStorage — UI не блокируем. Сервер увидит подарок и
  // ИИ-функции откроются. Если запись упадёт (offline) — попробуем при следующем
  // sync (TODO опционально: добавить в cloud_sync SYNC_KEYS, но достаточно одного push).
  void persistGiftAccessOnCloud('intro', nowMs, endsAt);

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
