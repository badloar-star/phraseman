import AsyncStorage from '@react-native-async-storage/async-storage';

const LEVEL_GIFT_EFFECT_RECEIPTS_KEY = 'level_gift_effect_receipts_v1';

const safeOwnerPart = (ownerStableId: string): string =>
  ownerStableId.trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80);

function parseReceiptMap(raw: string | null): Record<string, unknown> {
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('level_gift_effect_receipts_corrupt');
  }
}

function ownerReceiptPrefix(ownerStableId: string): string {
  const owner = safeOwnerPart(ownerStableId);
  if (!owner) throw new Error('account_wipe_identity_unavailable');
  return `${owner}:`;
}

export async function removeOwnerLevelGiftEffectReceipts(ownerStableId: string): Promise<void> {
  const prefix = ownerReceiptPrefix(ownerStableId);
  const current = parseReceiptMap(await AsyncStorage.getItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY));
  const retained = Object.fromEntries(
    Object.entries(current).filter(([key]) => !key.startsWith(prefix)),
  );
  if (Object.keys(retained).length === Object.keys(current).length) return;
  if (Object.keys(retained).length === 0) {
    await AsyncStorage.removeItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY);
  } else {
    await AsyncStorage.setItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY, JSON.stringify(retained));
  }
  await assertNoOwnerLevelGiftEffectReceipts(ownerStableId);
}

export async function assertNoOwnerLevelGiftEffectReceipts(ownerStableId: string): Promise<void> {
  const prefix = ownerReceiptPrefix(ownerStableId);
  const durable = parseReceiptMap(await AsyncStorage.getItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY));
  if (Object.keys(durable).some((key) => key.startsWith(prefix))) {
    throw new Error('account_wipe_incomplete');
  }
}
