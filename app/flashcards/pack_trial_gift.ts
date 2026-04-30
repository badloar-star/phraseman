/**
 * Подарунок-ваучер на безкоштовний набір карток (48 год).
 *
 * Семантика: одноразовий «купон» на будь-який ОФІЦІЙНИЙ паркарток, який юзер
 * сам обирає й активує в магазині протягом 48 год. Поле packId зберігається
 * лише історично (раніше там був рандомний preview-пак). На access logic
 * більше не впливає — paywall флоу читає сам факт існування активного
 * ваучера через `getPackGiftTrial()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledManifest from './bundles/bundled_marketplace_manifest.json';
import { emitAppEvent } from '../events';

const KEY = 'flashcard_pack_trial_gift_v1';

export type PackTrialState = { packId: string; expiresAt: number };

export async function getPackGiftTrial(): Promise<PackTrialState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PackTrialState;
    if (!s?.packId || typeof s.expiresAt !== 'number') {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    if (Date.now() >= s.expiresAt) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** Скільки повних годин залишилось (тільки години, як у ТЗ) */
export function getPackTrialHoursLeft(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600000));
}

export async function setRandomPackGiftTrial48h(): Promise<PackTrialState> {
  const packs = (bundledManifest as { packs: { id: string }[] }).packs;
  const ids = packs.length > 0 ? packs.map(p => p.id) : ['official_peaky_blinders_en'];
  const packId = ids[Math.floor(Math.random() * ids.length)];
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
  const s: PackTrialState = { packId, expiresAt };
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  emitAppEvent('pack_trial_gift_set');
  return s;
}

/**
 * Чи активний зараз ваучер. Швидкий чек без читання packId / повного об'єкта.
 */
export async function hasActivePackGiftVoucher(): Promise<boolean> {
  const tr = await getPackGiftTrial();
  return tr != null;
}

/**
 * Знищити ваучер (одноразовий — «згоряє» одразу після redemption).
 * Викликається з redeemPackGiftVoucher() у cardPackShardPurchase.ts.
 */
export async function consumePackGiftTrial(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  emitAppEvent('pack_trial_gift_consumed');
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
