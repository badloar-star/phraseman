import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { saveFriendGiftsToInventory } from './friend_gift_inventory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

export type IncomingFriendGift = {
  id: string;
  giftId: string;
  giftLabel: string;
  giftLabelRu?: string;
  giftLabelUk?: string;
  giftLabelEs?: string;
  giftLabelPtBr?: string;
  giftLabelVi?: string;
  giftLabelId?: string;
  giftLabelTr?: string;
  giftLabelPl?: string;
  fromUid: string;
  fromName: string;
  ts: number;
};

const getDb = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

function parseTs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : Date.now();
  }
  return Date.now();
}

export async function claimUnseenFriendGifts(limit = 5): Promise<IncomingFriendGift[]> {
  const db = getDb();
  if (!db) return [];
  const uid = await ensureAnonUser();
  if (!uid) return [];
  /**
   * Сеть выполняется ДО захвата замка аккаунта.
   *
   * зачем (владелец 2026-09-20, тот же корень, что у Арены — лог
   * [ARENA-OUTBOX-GUARD] lock timeout waited=5012ms — another holder is stuck):
   * здесь под замком шли ТРИ сетевые операции: запрос подарков,
   * users.get() и batch.commit(). Очередь withAccountTransitionLock ждёт
   * предыдущего владельца БЕЗ таймаута, а зовётся это из глобального
   * GlobalFriendGiftHost — то есть НА КАЖДОМ ЭКРАНЕ. На моргнувшей сети
   * это вешало всех остальных владельцев замка — покупки, энергию, спины.
   *
   * Замок защищает смену ПОКОЛЕНИЯ аккаунта, а чтение из Firestore
   * поколение не меняет. Под замком остаются ТОЛЬКО локальные записи
   * и проверки владельца до/после — они мгновенные.
   *
   * Инвариант: под замком аккаунта не выполняется ни один сетевой вызов.
   */
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, uid)) return [];

  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('shard_rewards')
    .where('reason', '==', 'friend_gift')
    .where('seen', '==', false)
    .limit(limit)
    .get()
    .catch(() => null);

  if (!snap || snap.empty) return [];

  const gifts: IncomingFriendGift[] = [];
  for (const doc of snap.docs as Array<{ id: string; ref: unknown; data: () => Record<string, unknown> }>) {
    const d = doc.data();
    // Записи, созданные клиентом (QA-симуляция), по rules обязаны нести qa == true —
    // помечаем их в UI, чтобы поддельный «подарок от друга» нельзя было выдать за настоящий.
    const isQa = d.qa === true;
    const withQaMark = (label: string | undefined): string | undefined =>
      isQa && label ? `${label} (QA)` : label;
    gifts.push({
      id: doc.id,
      giftId: String(d.rewardType ?? d.giftId ?? ''),
      giftLabel: withQaMark(String(d.giftLabel ?? d.label ?? d.rewardType ?? '')) ?? '',
      giftLabelRu: withQaMark(typeof d.giftLabelRu === 'string' ? d.giftLabelRu : undefined),
      giftLabelUk: withQaMark(typeof d.giftLabelUk === 'string' ? d.giftLabelUk : undefined),
      giftLabelEs: withQaMark(typeof d.giftLabelEs === 'string' ? d.giftLabelEs : undefined),
      giftLabelPtBr: withQaMark(typeof d.giftLabelPtBr === 'string' ? d.giftLabelPtBr : undefined),
      giftLabelVi: withQaMark(typeof d.giftLabelVi === 'string' ? d.giftLabelVi : undefined),
      giftLabelId: withQaMark(typeof d.giftLabelId === 'string' ? d.giftLabelId : undefined),
      giftLabelTr: withQaMark(typeof d.giftLabelTr === 'string' ? d.giftLabelTr : undefined),
      giftLabelPl: withQaMark(typeof d.giftLabelPl === 'string' ? d.giftLabelPl : undefined),
      fromUid: String(d.fromUid ?? ''),
      fromName: String(d.fromName ?? ''),
      ts: parseTs(d.ts),
    });
  }

  const sorted = gifts.sort((a, b) => b.ts - a.ts);
  const userSnap = await db.collection('users').doc(uid).get();
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');
  const userData = userSnap?.data?.() ?? {};
  const progress = userData.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : {};
  const effectPairs: Array<[string, string]> = [];
  for (const key of ['chain_shield', 'gift_xp_multiplier'] as const) {
    const value = userData[key] ?? progress[key];
    if (typeof value === 'string' && value.trim()) effectPairs.push([key, value]);
    else if (value && typeof value === 'object') effectPairs.push([key, JSON.stringify(value)]);
  }
  const effectKeys = ['chain_shield', 'gift_xp_multiplier'];
  // С этого места идут ЛОКАЛЬНЫЕ записи — их и сериализует замок.
  const claimed = await withAccountTransitionLock(async () => {
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');
  const previousEffects = await AsyncStorage.multiGet(effectKeys);
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');
  if (effectPairs.length) await AsyncStorage.multiSet(effectPairs);
  const missingKeys = effectKeys.filter((key) => !effectPairs.some(([effectKey]) => effectKey === key));
  if (missingKeys.length) await AsyncStorage.multiRemove(missingKeys);
  if (!isCurrentAccountGeneration(accountToken, uid)) {
    const restorePairs = previousEffects.filter((entry): entry is [string, string] => entry[1] !== null);
    const removeKeys = previousEffects.filter((entry) => entry[1] === null).map(([key]) => key);
    if (restorePairs.length) await AsyncStorage.multiSet(restorePairs);
    if (removeKeys.length) await AsyncStorage.multiRemove(removeKeys);
    throw new Error('friend_gift_identity_changed');
  }
  await saveFriendGiftsToInventory(
    sorted.map(gift => ({ ...gift, savedAt: Date.now() })),
    accountToken,
  );
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');

  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');
  return sorted;
  });

  // Отметка «прочитано» — сеть, поэтому ПОСЛЕ замка. Подарки уже в
  // локальном инвентаре, поэтому сбой отметки не теряет награду — хуже только
  // то, что подарок придёт повторно; сохранение в инвентарь идемпотентно.
  try {
    const batch = db.batch();
    for (const doc of snap.docs as Array<{ ref: unknown }>) {
      batch.set(doc.ref, { seen: true, seenAt: Date.now() }, { merge: true });
    }
    await batch.commit();
  } catch (error: unknown) {
    // Немой catch запрещён: без лога повторный подарок выглядел бы
    // как двойное начисление, а не как непроставленная отметка.
    console.warn('[FRIEND-GIFT] seen_mark_failed', // guard-ok: проглоченная ошибка обязана писать причину
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  return claimed;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
