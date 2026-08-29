import AsyncStorage from '@react-native-async-storage/async-storage';
import { GIFT_TTL_MS } from './gift_expiry';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';

export const FRIEND_GIFT_INVENTORY_KEY = 'friend_gift_inventory_v1';

export function friendGiftInventoryKey(token: AccountGenerationToken): string | null {
  const stableId = token.phase === 'active' ? String(token.stableId ?? '').trim() : '';
  return stableId ? `${FRIEND_GIFT_INVENTORY_KEY}::uid:${stableId}` : null;
}

const legacyFriendGiftInventoryKeys = async (stableId: string): Promise<string[]> => {
  const prefix = `${FRIEND_GIFT_INVENTORY_KEY}::generation:`;
  const suffix = `:uid:${stableId}`;
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  return keys.filter((key) => key.startsWith(prefix) && key.endsWith(suffix));
};

export type StoredFriendGiftInventoryItem = {
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
  savedAt: number;
};

const FRIEND_GIFT_INVENTORY_LIMIT = 40;

const parseStoredGifts = (raw: string | null): StoredFriendGiftInventoryItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredFriendGiftInventoryItem => (
      item &&
      typeof item.id === 'string' &&
      typeof item.giftId === 'string' &&
      typeof item.fromUid === 'string' &&
      typeof item.fromName === 'string' &&
      typeof item.ts === 'number'
    ));
  } catch {
    return [];
  }
};

/** Мс сгорания подарка друга: 72ч от authoritative server timestamp. */
export const friendGiftExpiresAtMs = (
  gift: Pick<StoredFriendGiftInventoryItem, 'ts' | 'savedAt'>,
): number => gift.ts + GIFT_TTL_MS;

export async function loadStoredFriendGiftInventory(
  nowMs: number = Date.now(),
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<StoredFriendGiftInventoryItem[]> {
  const storageKey = friendGiftInventoryKey(accountToken);
  if (!storageKey || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) return [];
  const stableId = String(accountToken.stableId ?? '').trim();
  const legacyKeys = await legacyFriendGiftInventoryKeys(stableId);
  if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return [];
  const rows = await AsyncStorage.multiGet([...legacyKeys, storageKey]);
  if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return [];
  const byId = new Map<string, StoredFriendGiftInventoryItem>();
  for (const [, raw] of rows) {
    for (const gift of parseStoredGifts(raw)) byId.set(gift.id, gift);
  }
  const stored = Array.from(byId.values())
    .sort((a, b) => (b.ts || b.savedAt) - (a.ts || a.savedAt))
    .slice(0, FRIEND_GIFT_INVENTORY_LIMIT);
  // зачем (2026-08-02, владелец): любой полученный подарок живёт 72 часа и
  // исчезает из раздела «Подарки»; сгоревшие вычищаем прямо при чтении.
  const alive = stored.filter((gift) => nowMs < friendGiftExpiresAtMs(gift));
  if (legacyKeys.length > 0 || alive.length !== stored.length) {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(alive));
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return [];
      if (legacyKeys.length > 0) await AsyncStorage.multiRemove(legacyKeys);
    } catch (e) {
      // Повторная чистка произойдёт при следующем чтении.
      DebugLogger.error('friend_gift_inventory:alive', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return alive;
}

export async function saveFriendGiftsToInventory(
  gifts: StoredFriendGiftInventoryItem[],
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  const clean = gifts.filter(gift => gift.id && gift.giftId);
  if (clean.length === 0) return;

  const storageKey = friendGiftInventoryKey(accountToken);
  if (!storageKey || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  const existing = await loadStoredFriendGiftInventory(Date.now(), accountToken);
  const byId = new Map<string, StoredFriendGiftInventoryItem>();
  for (const gift of [...existing, ...clean]) {
    byId.set(gift.id, gift);
  }
  const next = Array.from(byId.values())
    .sort((a, b) => (b.ts || b.savedAt) - (a.ts || a.savedAt))
    .slice(0, FRIEND_GIFT_INVENTORY_LIMIT);
  if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('friend_gift_identity_changed');
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
