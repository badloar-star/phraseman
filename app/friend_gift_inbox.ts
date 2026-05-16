import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';

export type IncomingFriendGift = {
  id: string;
  giftId: string;
  giftLabel: string;
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
      fromUid: String(d.fromUid ?? ''),
      fromName: String(d.fromName ?? ''),
      ts: parseTs(d.ts),
    });
    batch.set(doc.ref, { seen: true, seenAt: Date.now() }, { merge: true });
  }

  await batch.commit().catch(() => {});
  return gifts.sort((a, b) => b.ts - a.ts);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
