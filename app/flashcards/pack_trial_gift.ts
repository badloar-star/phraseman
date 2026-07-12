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
import { flashcardsOfficialPacksAvailableForTarget } from '../flashcards_target_gate';
import { flashcardsPackTrialGiftKey, type RuntimeStudyTarget } from '../target_storage_keys';

export type PackTrialState = { packId: string; expiresAt: number };

const PACK_TRIAL_ONCE_KEY_PREFIX = 'flashcard_pack_trial_gift_once_';

export async function getPackGiftTrial(studyTarget?: RuntimeStudyTarget): Promise<PackTrialState | null> {
  const key = flashcardsPackTrialGiftKey(studyTarget);
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) {
    await AsyncStorage.removeItem(key).catch(() => {});
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as PackTrialState;
    if (!s?.packId || typeof s.expiresAt !== 'number') {
      await AsyncStorage.removeItem(key);
      return null;
    }
    if (Date.now() >= s.expiresAt) {
      await AsyncStorage.removeItem(key);
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

export async function setRandomPackGiftTrial48h(studyTarget?: RuntimeStudyTarget): Promise<PackTrialState | null> {
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) return null;
  const packs = (bundledManifest as { packs: { id: string }[] }).packs;
  const ids = packs.length > 0 ? packs.map(p => p.id) : ['official_peaky_blinders_en'];
  const packId = ids[Math.floor(Math.random() * ids.length)];
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
  const s: PackTrialState = { packId, expiresAt };
  await AsyncStorage.setItem(flashcardsPackTrialGiftKey(studyTarget), JSON.stringify(s));
  emitAppEvent('pack_trial_gift_set');
  return s;
}

function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function setPackGiftTrial48hOnce(studyTarget: RuntimeStudyTarget | undefined, idempotencyKey: string, expiresAtOverride?: number): Promise<PackTrialState | null> {
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) return null;
  const safeKey = idempotencyKey.replace(/[^\w.-]/g, '_').slice(0, 160);
  if (!safeKey) return setRandomPackGiftTrial48h(studyTarget);
  const markerKey = `${PACK_TRIAL_ONCE_KEY_PREFIX}${safeKey}`;
  if ((await AsyncStorage.getItem(markerKey).catch(() => null)) === '1') return getPackGiftTrial(studyTarget);
  const packs = (bundledManifest as { packs: { id: string }[] }).packs;
  const ids = packs.length > 0 ? packs.map(p => p.id) : ['official_peaky_blinders_en'];
  const packId = ids[hash32(safeKey) % ids.length] ?? ids[0];
  const expiresAt = Math.max(0, Math.floor(Number(expiresAtOverride) || 0)) || Date.now() + 48 * 60 * 60 * 1000;
  if (Date.now() >= expiresAt) {
    await AsyncStorage.setItem(markerKey, '1');
    return null;
  }
  const s: PackTrialState = { packId, expiresAt };
  await AsyncStorage.multiSet([
    [flashcardsPackTrialGiftKey(studyTarget), JSON.stringify(s)],
    [markerKey, '1'],
  ]);
  emitAppEvent('pack_trial_gift_set');
  return s;
}

/**
 * Чи активний зараз ваучер. Швидкий чек без читання packId / повного об\'єкта.
 */
export async function hasActivePackGiftVoucher(studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  const tr = await getPackGiftTrial(studyTarget);
  return tr != null;
}

/**
 * Знищити ваучер (одноразовий — «згоряє» одразу після redemption).
 * Викликається з redeemPackGiftVoucher() у cardPackShardPurchase.ts.
 */
export async function consumePackGiftTrial(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.removeItem(flashcardsPackTrialGiftKey(studyTarget));
  emitAppEvent('pack_trial_gift_consumed');
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
