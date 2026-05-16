import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAILY_GIFTS_TOTAL = 3;
const MAX_DAILY_GIFTS_PER_FRIEND = 1;

type FriendGiftId = 'arena_extra_5' | 'chain_shield_1' | 'xp_boost_2x_24h';

type GiftCatalogItem = {
  id: FriendGiftId;
  costShards: number;
  label: string;
  labelRu: string;
};

const GIFT_CATALOG: Record<FriendGiftId, GiftCatalogItem> = {
  arena_extra_5: {
    id: 'arena_extra_5',
    costShards: 5,
    label: '+5 rating games today',
    labelRu: '+5 рейтинг-игр',
  },
  chain_shield_1: {
    id: 'chain_shield_1',
    costShards: 8,
    label: '1 day streak shield',
    labelRu: 'Щит цепочки',
  },
  xp_boost_2x_24h: {
    id: 'xp_boost_2x_24h',
    costShards: 30,
    label: 'x2 XP for 24h',
    labelRu: 'x2 XP на 24 часа',
  },
};

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanDisplayName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function todayStrUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseShards(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function getExistingField(data: FirebaseFirestore.DocumentData | undefined, key: string): unknown {
  const progress = getProgress(data);
  return data?.[key] ?? progress[key];
}

function buildRecipientGiftPatch(
  giftId: FriendGiftId,
  recipientData: FirebaseFirestore.DocumentData | undefined,
): Record<string, unknown> {
  const now = Date.now();
  const today = todayStrUtc();

  if (giftId === 'arena_extra_5') {
    const cur = parseJsonObject(getExistingField(recipientData, 'arena_daily_gift_bonus_v1'));
    const sameDay = cur.date === today;
    const extra = sameDay && typeof cur.extra === 'number' && Number.isFinite(cur.extra)
      ? Math.max(0, Math.floor(cur.extra))
      : 0;
    const next = JSON.stringify({ date: today, extra: extra + 5 });
    return {
      arena_extra_plays_today: { date: today, n: extra + 5 },
      progress: { arena_daily_gift_bonus_v1: next },
      updatedAt: now,
    };
  }

  if (giftId === 'chain_shield_1') {
    const cur = parseJsonObject(getExistingField(recipientData, 'chain_shield'));
    const daysLeft = typeof cur.daysLeft === 'number' && Number.isFinite(cur.daysLeft)
      ? Math.max(0, Math.floor(cur.daysLeft))
      : 0;
    const next = JSON.stringify({ daysLeft: daysLeft + 1, grantedAt: today });
    return {
      chain_shield: next,
      progress: { chain_shield: next },
      updatedAt: now,
    };
  }

  const cur = parseJsonObject(getExistingField(recipientData, 'gift_xp_multiplier'));
  const existingExpiresAt = typeof cur.expiresAt === 'number' && Number.isFinite(cur.expiresAt)
    ? cur.expiresAt
    : 0;
  const base = Math.max(now, existingExpiresAt);
  const next = JSON.stringify({ multiplier: 2, expiresAt: base + DAY_MS });
  return {
    gift_xp_multiplier: next,
    progress: { gift_xp_multiplier: next },
    updatedAt: now,
  };
}

export const friendSendGift = onCall({ region: REGION, enforceAppCheck: false }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const senderStableId = cleanId(request.data?.senderStableId);
  const friendStableId = cleanId(request.data?.friendStableId);
  const giftId = cleanId(request.data?.giftId) as FriendGiftId;
  const gift = GIFT_CATALOG[giftId];

  if (!senderStableId || !friendStableId || senderStableId === friendStableId) {
    throw new HttpsError('invalid-argument', 'Valid sender and friend ids required');
  }
  if (!gift) {
    throw new HttpsError('invalid-argument', 'Unsupported gift id');
  }

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const recipientRef = db.collection('users').doc(friendStableId);
  const senderFriendRef = senderRef.collection('friends').doc(friendStableId);
  const recipientFriendRef = recipientRef.collection('friends').doc(senderStableId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const today = todayStrUtc();
  const dailyLimitRef = senderRef.collection('friend_gift_daily_limits').doc(today);

  return db.runTransaction(async (tx) => {
    const [senderSnap, recipientSnap, senderFriendSnap, recipientFriendSnap, dailyLimitSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(recipientRef),
      tx.get(senderFriendRef),
      tx.get(recipientFriendRef),
      tx.get(dailyLimitRef),
    ]);

    if (!senderSnap.exists || !recipientSnap.exists) {
      throw new HttpsError('not-found', 'User not found');
    }
    if (!senderFriendSnap.exists || !recipientFriendSnap.exists) {
      throw new HttpsError('failed-precondition', 'Users are not friends');
    }

    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid && linkedAuthUid !== request.auth!.uid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }

    const senderBalanceBefore = parseShards(senderData.shards);
    if (senderBalanceBefore < gift.costShards) {
      throw new HttpsError('failed-precondition', 'Not enough shards');
    }
    const senderBalanceAfter = senderBalanceBefore - gift.costShards;
    const dailyData = dailyLimitSnap.exists ? dailyLimitSnap.data() ?? {} : {};
    const totalSentToday = parseShards(dailyData.totalSent);
    const recipientsToday = parseJsonObject(dailyData.recipients);
    const sentToFriendToday = parseShards(recipientsToday[friendStableId]);
    if (totalSentToday >= MAX_DAILY_GIFTS_TOTAL) {
      throw new HttpsError('resource-exhausted', 'Daily gift limit reached');
    }
    if (sentToFriendToday >= MAX_DAILY_GIFTS_PER_FRIEND) {
      throw new HttpsError('resource-exhausted', 'Daily friend gift limit reached');
    }

    const senderProgress = getProgress(senderData);
    const senderName =
      cleanDisplayName(request.data?.senderDisplayName) ||
      cleanDisplayName(senderData.displayName) ||
      cleanDisplayName(senderProgress.user_name) ||
      'Friend';

    tx.set(senderRef, {
      shards: senderBalanceAfter,
      shards_updated_at_ms: now,
      shards_updated_op: 'spend',
      shards_updated_reason: `friend_gift:${gift.id}`,
      updatedAt: now,
    }, { merge: true });

    tx.set(recipientRef, buildRecipientGiftPatch(gift.id, recipientSnap.data()), { merge: true });

    tx.set(senderRef.collection('shard_log').doc(), {
      ts: nowIso,
      type: 'spend',
      amount: gift.costShards,
      reason: 'friend_gift',
      giftId: gift.id,
      targetUid: friendStableId,
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
    });

    tx.set(recipientRef.collection('shard_rewards').doc(), {
      ts: nowIso,
      reason: 'friend_gift',
      amount: 0,
      rewardType: gift.id,
      label: `${gift.label} from ${senderName}`,
      giftLabel: gift.labelRu,
      fromUid: senderStableId,
      fromName: senderName,
      seen: false,
    });

    const sentGiftRef = senderRef.collection('friend_gifts_sent').doc();
    const receivedGiftRef = recipientRef.collection('friend_gifts_received').doc(sentGiftRef.id);

    tx.set(sentGiftRef, {
      ts: nowIso,
      giftId: gift.id,
      costShards: gift.costShards,
      toUid: friendStableId,
      toName: cleanDisplayName(recipientSnap.data()?.displayName) || '',
    });

    tx.set(receivedGiftRef, {
      ts: nowIso,
      giftId: gift.id,
      costShards: gift.costShards,
      fromUid: senderStableId,
      fromName: senderName,
      seen: false,
    });

    tx.set(senderRef.collection('my_events').doc(`friend_gift_sent_${sentGiftRef.id}`), {
      type: 'friend_gift_sent',
      uid: senderStableId,
      ts: now,
      payload: {
        giftId: gift.id,
        giftLabel: gift.labelRu,
        costShards: gift.costShards,
        targetUid: friendStableId,
      },
    });

    tx.set(recipientRef.collection('my_events').doc(`friend_gift_received_${sentGiftRef.id}`), {
      type: 'friend_gift_received',
      uid: friendStableId,
      ts: now,
      payload: {
        giftId: gift.id,
        giftLabel: gift.labelRu,
        costShards: gift.costShards,
        fromUid: senderStableId,
        fromName: senderName,
      },
    });

    tx.set(dailyLimitRef, {
      date: today,
      totalSent: totalSentToday + 1,
      recipients: {
        [friendStableId]: sentToFriendToday + 1,
      },
      updatedAt: now,
    }, { merge: true });

    tx.set(senderRef.collection('friend_gift_history').doc(sentGiftRef.id), {
      direction: 'sent',
      ts: nowIso,
      giftId: gift.id,
      giftLabel: gift.labelRu,
      costShards: gift.costShards,
      peerUid: friendStableId,
    });

    tx.set(recipientRef.collection('friend_gift_history').doc(sentGiftRef.id), {
      direction: 'received',
      ts: nowIso,
      giftId: gift.id,
      giftLabel: gift.labelRu,
      costShards: gift.costShards,
      peerUid: senderStableId,
      peerName: senderName,
      seen: false,
    });

    return {
      ok: true,
      giftId: gift.id,
      costShards: gift.costShards,
      senderBalanceAfter,
      dailyRemaining: Math.max(0, MAX_DAILY_GIFTS_TOTAL - totalSentToday - 1),
    };
  });
});
