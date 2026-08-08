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
  return withAccountTransitionLock(async () => {
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

  const batch = db.batch();
  for (const doc of snap.docs as Array<{ ref: unknown }>) {
    batch.set(doc.ref, { seen: true, seenAt: Date.now() }, { merge: true });
  }
  await batch.commit();
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('friend_gift_identity_changed');
  return sorted;
  });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
