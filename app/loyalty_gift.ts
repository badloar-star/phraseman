import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleIntroExpiringNotification,
  scheduleUpsellNotifications,
} from './notifications';
import type { Lang } from '../constants/i18n';
import { persistGiftAccessOnCloud, readGiftAccessFromCloud } from './gift_access_cloud';

// Подарок лояльности: 72 часа полного доступа СУЩЕСТВУЮЩИМ (не новым) free-пользователям
// в честь крупного обновления. Механика — копия intro_full_access, но в собственных
// AsyncStorage-ключах, чтобы:
//   1) не пересекаться с подарком новичка (intro_full_access_*),
//   2) выдаваться строго один раз на пользователя (LOYALTY_GIFT_CLAIMED_KEY),
//   3) откатываться начисто простым multiRemove, не трогая real-premium/VIP.
// Доступ остаётся ПРОИЗВОДНЫМ (проверяется в premium_guard/PremiumContext через
// isLoyaltyGiftActive), поэтому удаление ключей мгновенно убирает доступ.
export const LOYALTY_GIFT_DURATION_MS = 72 * 60 * 60 * 1000;

export const LOYALTY_GIFT_STARTED_AT_KEY = 'loyalty_gift_started_at_v1';
export const LOYALTY_GIFT_ENDS_AT_KEY = 'loyalty_gift_ends_at_v1';
export const LOYALTY_GIFT_WELCOME_SEEN_KEY = 'loyalty_gift_welcome_seen_v1';
export const LOYALTY_GIFT_ENDED_SEEN_KEY = 'loyalty_gift_ended_seen_v1';
// Одноразовость: ставится при первом старте и НЕ удаляется откатом подарка —
// гарантирует, что повторно подарок не выдаётся даже после истечения/отката.
export const LOYALTY_GIFT_CLAIMED_KEY = 'loyalty_gift_claimed_v1';
// Метка «модал предложения показан» — чтобы показать предложение получить подарок ровно один раз.
export const LOYALTY_GIFT_OFFER_SEEN_KEY = 'loyalty_gift_offer_seen_v1';

export const LOYALTY_GIFT_STORAGE_KEYS = [
  LOYALTY_GIFT_STARTED_AT_KEY,
  LOYALTY_GIFT_ENDS_AT_KEY,
  LOYALTY_GIFT_WELCOME_SEEN_KEY,
  LOYALTY_GIFT_ENDED_SEEN_KEY,
] as const;

// Полный набор ключей для админ-сброса (включая одноразовость и метку предложения).
export const LOYALTY_GIFT_ALL_KEYS = [
  ...LOYALTY_GIFT_STORAGE_KEYS,
  LOYALTY_GIFT_CLAIMED_KEY,
  LOYALTY_GIFT_OFFER_SEEN_KEY,
] as const;

export type LoyaltyGiftState = {
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

/**
 * Был ли подарок лояльности уже выдан этому пользователю (хоть раз).
 * Используется как защита от повторной выдачи — не сбрасывается откатом подарка.
 */
export async function isLoyaltyGiftClaimed(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOYALTY_GIFT_CLAIMED_KEY)) === 'true';
}

/**
 * Был ли уже показан модал-предложение «получить 3 дня». Показываем ровно один раз.
 */
export async function isLoyaltyGiftOfferSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOYALTY_GIFT_OFFER_SEEN_KEY)) === 'true';
}

export async function markLoyaltyGiftOfferSeen(): Promise<void> {
  await AsyncStorage.setItem(LOYALTY_GIFT_OFFER_SEEN_KEY, 'true');
}

/**
 * Запускает 72-часовой подарок лояльности.
 * Идемпотентно (повторный вызов не перезапускает) и одноразово (если claimed — выходим).
 * Гейт «не для платных/VIP» делается ВЫШЕ по стеку (в месте вызова), как и у intro.
 */
export async function startLoyaltyGift(
  nowMs: number = Date.now(),
  lang: Lang = 'ru',
): Promise<boolean> {
  const alreadyClaimed = await isLoyaltyGiftClaimed();
  if (alreadyClaimed) return false;

  const existingStart = parsePositiveMs(await AsyncStorage.getItem(LOYALTY_GIFT_STARTED_AT_KEY));
  if (existingStart) return false;

  // H4 cloud-guard: после переустановки AsyncStorage чист, но Firestore помнит факт
  // выдачи → НЕ выдаём повторно. Если cloud-grant активен — восстанавливаем endsAt;
  // если просрочен — пишем только claimed-флаг чтобы блокировать новую выдачу.
  const cloudState = await readGiftAccessFromCloud('loyalty');
  if (cloudState?.grantedAtMs) {
    const remainingEndsAt = cloudState.endsAtMs && cloudState.endsAtMs > nowMs ? cloudState.endsAtMs : null;
    if (remainingEndsAt) {
      await AsyncStorage.multiSet([
        [LOYALTY_GIFT_STARTED_AT_KEY, String(cloudState.grantedAtMs)],
        [LOYALTY_GIFT_ENDS_AT_KEY, String(remainingEndsAt)],
        [LOYALTY_GIFT_WELCOME_SEEN_KEY, 'true'],
        [LOYALTY_GIFT_ENDED_SEEN_KEY, 'false'],
        [LOYALTY_GIFT_CLAIMED_KEY, 'true'],
      ]);
      scheduleIntroExpiringNotification(remainingEndsAt, lang).catch(() => {});
      scheduleUpsellNotifications(remainingEndsAt, lang).catch(() => {});
      return true;
    }
    await AsyncStorage.multiSet([
      [LOYALTY_GIFT_STARTED_AT_KEY, String(cloudState.grantedAtMs)],
      [LOYALTY_GIFT_CLAIMED_KEY, 'true'],
    ]);
    return false; // подарок уже истёк — повторно не выдаём
  }

  const endsAt = nowMs + LOYALTY_GIFT_DURATION_MS;

  await AsyncStorage.multiSet([
    [LOYALTY_GIFT_STARTED_AT_KEY, String(nowMs)],
    [LOYALTY_GIFT_ENDS_AT_KEY, String(endsAt)],
    [LOYALTY_GIFT_WELCOME_SEEN_KEY, 'false'],
    [LOYALTY_GIFT_ENDED_SEEN_KEY, 'false'],
    [LOYALTY_GIFT_CLAIMED_KEY, 'true'],
  ]);

  // Пишем в облако — сервер увидит подарок и ИИ-функции откроются. Best-effort.
  void persistGiftAccessOnCloud('loyalty', nowMs, endsAt);

  // Те же напоминания об истечении, что и у intro (переиспользуем расписание пушей).
  scheduleIntroExpiringNotification(endsAt, lang).catch(() => {});
  scheduleUpsellNotifications(endsAt, lang).catch(() => {});

  // Воронка: старт подарка лояльности — отдельное событие, чтобы не смешивать с intro новичков.
  void import('./analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_started', {})).catch(() => {});
  return true;
}

export async function getLoyaltyGiftState(nowMs: number = Date.now()): Promise<LoyaltyGiftState> {
  const pairs = await AsyncStorage.multiGet([...LOYALTY_GIFT_STORAGE_KEYS]);
  const get = (key: string) => pairs.find(([k]) => k === key)?.[1] ?? null;
  const startedAt = parsePositiveMs(get(LOYALTY_GIFT_STARTED_AT_KEY));
  const endsAt = parsePositiveMs(get(LOYALTY_GIFT_ENDS_AT_KEY));
  const welcomeSeen = get(LOYALTY_GIFT_WELCOME_SEEN_KEY) === 'true';
  const endedSeen = get(LOYALTY_GIFT_ENDED_SEEN_KEY) === 'true';

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

export async function isLoyaltyGiftActive(nowMs: number = Date.now()): Promise<boolean> {
  return (await getLoyaltyGiftState(nowMs)).active;
}

export async function markLoyaltyGiftWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(LOYALTY_GIFT_WELCOME_SEEN_KEY, 'true');
}

export async function markLoyaltyGiftEndedSeen(): Promise<void> {
  await AsyncStorage.setItem(LOYALTY_GIFT_ENDED_SEEN_KEY, 'true');
}

// --- Админ / QA ---

export async function activateLoyaltyGiftForAdmin(nowMs: number = Date.now()): Promise<void> {
  await AsyncStorage.multiSet([
    [LOYALTY_GIFT_STARTED_AT_KEY, String(nowMs)],
    [LOYALTY_GIFT_ENDS_AT_KEY, String(nowMs + LOYALTY_GIFT_DURATION_MS)],
    [LOYALTY_GIFT_WELCOME_SEEN_KEY, 'false'],
    [LOYALTY_GIFT_ENDED_SEEN_KEY, 'false'],
    [LOYALTY_GIFT_CLAIMED_KEY, 'true'],
  ]);
}

export async function expireLoyaltyGiftForAdmin(nowMs: number = Date.now()): Promise<void> {
  const startedAt = nowMs - LOYALTY_GIFT_DURATION_MS - 1000;
  await AsyncStorage.multiSet([
    [LOYALTY_GIFT_STARTED_AT_KEY, String(startedAt)],
    [LOYALTY_GIFT_ENDS_AT_KEY, String(nowMs - 1000)],
    [LOYALTY_GIFT_WELCOME_SEEN_KEY, 'true'],
    [LOYALTY_GIFT_ENDED_SEEN_KEY, 'false'],
  ]);
}

/**
 * Полный откат подарка лояльности (и его одноразовости, и метки предложения) —
 * для QA. Доступ исчезает мгновенно, real-premium/VIP не затрагиваются.
 */
export async function resetLoyaltyGiftForAdmin(): Promise<void> {
  await AsyncStorage.multiRemove([...LOYALTY_GIFT_ALL_KEYS]);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
