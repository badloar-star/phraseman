import AsyncStorage from '@react-native-async-storage/async-storage';

export const FRIEND_GIFT_INVENTORY_KEY = 'friend_gift_inventory_v1';

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

export async function loadStoredFriendGiftInventory(): Promise<StoredFriendGiftInventoryItem[]> {
  return parseStoredGifts(await AsyncStorage.getItem(FRIEND_GIFT_INVENTORY_KEY));
}

export async function saveFriendGiftsToInventory(gifts: StoredFriendGiftInventoryItem[]): Promise<void> {
  const clean = gifts.filter(gift => gift.id && gift.giftId);
  if (clean.length === 0) return;

  const existing = await loadStoredFriendGiftInventory();
  const byId = new Map<string, StoredFriendGiftInventoryItem>();
  for (const gift of [...existing, ...clean]) {
    byId.set(gift.id, gift);
  }
  const next = Array.from(byId.values())
    .sort((a, b) => (b.ts || b.savedAt) - (a.ts || a.savedAt))
    .slice(0, FRIEND_GIFT_INVENTORY_LIMIT);
  await AsyncStorage.setItem(FRIEND_GIFT_INVENTORY_KEY, JSON.stringify(next));
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
