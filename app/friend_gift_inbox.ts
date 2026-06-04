import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { saveFriendGiftsToInventory } from './friend_gift_inventory';

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
  const batch = db.batch();
  for (const doc of snap.docs as Array<{ id: string; ref: unknown; data: () => Record<string, unknown> }>) {
    const d = doc.data();
    gifts.push({
      id: doc.id,
      giftId: String(d.rewardType ?? d.giftId ?? ''),
      giftLabel: String(d.giftLabel ?? d.label ?? d.rewardType ?? ''),
      giftLabelRu: typeof d.giftLabelRu === 'string' ? d.giftLabelRu : undefined,
      giftLabelUk: typeof d.giftLabelUk === 'string' ? d.giftLabelUk : undefined,
      giftLabelEs: typeof d.giftLabelEs === 'string' ? d.giftLabelEs : undefined,
      giftLabelPtBr: typeof d.giftLabelPtBr === 'string' ? d.giftLabelPtBr : undefined,
      giftLabelVi: typeof d.giftLabelVi === 'string' ? d.giftLabelVi : undefined,
      giftLabelId: typeof d.giftLabelId === 'string' ? d.giftLabelId : undefined,
      giftLabelTr: typeof d.giftLabelTr === 'string' ? d.giftLabelTr : undefined,
      giftLabelPl: typeof d.giftLabelPl === 'string' ? d.giftLabelPl : undefined,
      fromUid: String(d.fromUid ?? ''),
      fromName: String(d.fromName ?? ''),
      ts: parseTs(d.ts),
    });
    batch.set(doc.ref, { seen: true, seenAt: Date.now() }, { merge: true });
  }

  await batch.commit().catch(() => {});
  const sorted = gifts.sort((a, b) => b.ts - a.ts);
  await saveFriendGiftsToInventory(sorted.map(gift => ({ ...gift, savedAt: Date.now() }))).catch(() => {});
  return sorted;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
