import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';

/**
 * Отправляет один Expo push. Best-effort: ошибки глотаем — получатель всё равно
 * увидит подарок при следующем открытии приложения (через my_events / badge).
 * Тот же транспорт, что в matchmaking.ts (exp.host/--/api/v2/push/send).
 */
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  const to = String(token ?? '').trim();
  if (!to) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ to, sound: 'default', title, body, data }]),
    });
  } catch {
    // non-critical
  }
}
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAILY_GIFTS_TOTAL = 3;
const MAX_DAILY_GIFTS_PER_FRIEND = 1;
const FRIEND_QUEST_TARGET_XP = 3000;
const FRIEND_QUEST_REWARD_SHARDS = 10;
const FRIEND_QUEST_REWARD_XP = 1000;
const FRIEND_QUEST_DURATION_MS = DAY_MS;

type FriendGiftId = 'arena_extra_5' | 'chain_shield_1' | 'xp_boost_2x_24h';

type GiftCatalogItem = {
  id: FriendGiftId;
  costShards: number;
  label: string;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
};

const GIFT_CATALOG: Record<FriendGiftId, GiftCatalogItem> = {
  arena_extra_5: {
    id: 'arena_extra_5',
    costShards: 5,
    label: '+5 rating games today',
    labelRu: '+5 рейтинг-игр',
    labelUk: '+5 рейтинг-ігор',
    labelEs: '+5 partidas Arena',
    labelPtBr: '+5 partidas ranqueadas',
    labelVi: '+5 trận xếp hạng',
    labelId: '+5 game peringkat',
    labelTr: '+5 sıralama oyunu',
    labelPl: '+5 gier rankingowych',
  },
  chain_shield_1: {
    id: 'chain_shield_1',
    costShards: 8,
    label: '1 day streak shield',
    labelRu: 'Щит цепочки',
    labelUk: 'Щит ланцюжка',
    labelEs: 'Escudo de racha',
    labelPtBr: 'Escudo de sequência',
    labelVi: 'Khiên chuỗi ngày',
    labelId: 'Perisai rentetan',
    labelTr: 'Seri kalkanı',
    labelPl: 'Tarcza serii',
  },
  xp_boost_2x_24h: {
    id: 'xp_boost_2x_24h',
    costShards: 30,
    label: 'x2 XP for 24h',
    labelRu: 'x2 XP на 24 часа',
    labelUk: 'x2 XP на 24 години',
    labelEs: 'x2 XP por 24 h',
    labelPtBr: 'x2 XP por 24 h',
    labelVi: 'x2 XP trong 24 giờ',
    labelId: 'x2 XP selama 24 jam',
    labelTr: '24 saat x2 XP',
    labelPl: 'x2 XP na 24 godz.',
  },
};

type PushLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

/** Язык получателя из users/{uid}: cloud_sync зеркалит AsyncStorage 'app_lang'/'lang' в progress. */
function normalizePushLang(value: unknown): PushLang {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw.startsWith('uk')) return 'uk';
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('pt')) return 'pt-BR';
  if (raw.startsWith('vi')) return 'vi';
  if (raw === 'id' || raw.startsWith('id-')) return 'id';
  if (raw.startsWith('tr')) return 'tr';
  if (raw.startsWith('pl')) return 'pl';
  return 'ru';
}

function giftLabelForPushLang(gift: GiftCatalogItem, lang: PushLang): string {
  switch (lang) {
    case 'uk': return gift.labelUk;
    case 'es': return gift.labelEs;
    case 'pt-BR': return gift.labelPtBr;
    case 'vi': return gift.labelVi;
    case 'id': return gift.labelId;
    case 'tr': return gift.labelTr;
    case 'pl': return gift.labelPl;
    default: return gift.labelRu;
  }
}

const GIFT_PUSH_TITLE: Record<PushLang, string> = {
  ru: '🎁 Подарок от друга!',
  uk: '🎁 Подарунок від друга!',
  es: '🎁 ¡Regalo de un amigo!',
  'pt-BR': '🎁 Presente de um amigo!',
  vi: '🎁 Quà từ bạn bè!',
  id: '🎁 Hadiah dari teman!',
  tr: '🎁 Arkadaşından hediye!',
  pl: '🎁 Prezent od znajomego!',
};

function giftPushBody(lang: PushLang, senderName: string, giftLabel: string): string {
  switch (lang) {
    case 'uk': return `${senderName} надіслав тобі подарунок: ${giftLabel}`;
    case 'es': return `${senderName} te envió un regalo: ${giftLabel}`;
    case 'pt-BR': return `${senderName} te enviou um presente: ${giftLabel}`;
    case 'vi': return `${senderName} đã gửi cho bạn một món quà: ${giftLabel}`;
    case 'id': return `${senderName} mengirimimu hadiah: ${giftLabel}`;
    case 'tr': return `${senderName} sana bir hediye gönderdi: ${giftLabel}`;
    case 'pl': return `${senderName} wysłał ci prezent: ${giftLabel}`;
    default: return `${senderName} прислал тебе подарок: ${giftLabel}`;
  }
}

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

function parseProgressInt(value: unknown): number {
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

function getTotalXp(data: FirebaseFirestore.DocumentData | undefined): number {
  return parseProgressInt(getExistingField(data, 'user_total_xp'));
}

function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function questIdFor(senderStableId: string, friendStableId: string, weekKey: string): string {
  const pair = [senderStableId, friendStableId]
    .sort()
    .map((id) => id.replace(/[^A-Za-z0-9_-]/g, '_'))
    .join('_');
  return `quest_${weekKey}_${pair}`;
}

function isActiveQuestMeta(data: FirebaseFirestore.DocumentData | undefined, now: number): boolean {
  if (!data || data.status !== 'active') return false;
  const expiresAtMs = parseProgressInt(data.expiresAtMs);
  return expiresAtMs > now;
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

export const friendSendGift = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
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
  const weekKey = isoWeekKey(now);
  const dailyLimitRef = senderRef.collection('friend_gift_daily_limits').doc(today);
  const senderCurrentQuestRef = senderRef.collection('friend_quest_meta').doc('current');
  const recipientCurrentQuestRef = recipientRef.collection('friend_quest_meta').doc('current');
  const senderWeekQuestRef = senderRef.collection('friend_quest_weekly').doc(weekKey);
  const recipientWeekQuestRef = recipientRef.collection('friend_quest_weekly').doc(weekKey);
  const questId = questIdFor(senderStableId, friendStableId, weekKey);
  const questRef = db.collection('friend_quests').doc(questId);

  const result = await db.runTransaction(async (tx) => {
    const [
      senderSnap,
      recipientSnap,
      senderFriendSnap,
      recipientFriendSnap,
      dailyLimitSnap,
      senderCurrentQuestSnap,
      recipientCurrentQuestSnap,
      senderWeekQuestSnap,
      recipientWeekQuestSnap,
    ] = await Promise.all([
      tx.get(senderRef),
      tx.get(recipientRef),
      tx.get(senderFriendRef),
      tx.get(recipientFriendRef),
      tx.get(dailyLimitRef),
      tx.get(senderCurrentQuestRef),
      tx.get(recipientCurrentQuestRef),
      tx.get(senderWeekQuestRef),
      tx.get(recipientWeekQuestRef),
    ]);

    if (!senderSnap.exists || !recipientSnap.exists) {
      throw new HttpsError('not-found', 'User not found');
    }
    if (!senderFriendSnap.exists || !recipientFriendSnap.exists) {
      throw new HttpsError('failed-precondition', 'Users are not friends');
    }

    const senderData = senderSnap.data() ?? {};
    // Sender must be the authenticated caller. Previously this only checked when
    // linkedAuthUid was non-empty — so an UNLINKED sender doc let any authed
    // user spend that account's shards by passing its senderStableId (IDOR).
    // Now require the link to exist AND match the caller (admin SDK callers are
    // not used here). Allow the legacy path where senderStableId == auth.uid
    // directly (doc keyed by the Firebase uid itself).
    if (!userMatchesAuth(senderStableId, senderData, request.auth!.uid)) {
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
      giftLabelRu: gift.labelRu,
      giftLabelUk: gift.labelUk,
      giftLabelEs: gift.labelEs,
      giftLabelPtBr: gift.labelPtBr,
      giftLabelVi: gift.labelVi,
      giftLabelId: gift.labelId,
      giftLabelTr: gift.labelTr,
      giftLabelPl: gift.labelPl,
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
        giftLabelRu: gift.labelRu,
        giftLabelUk: gift.labelUk,
        giftLabelEs: gift.labelEs,
        giftLabelPtBr: gift.labelPtBr,
        giftLabelVi: gift.labelVi,
        giftLabelId: gift.labelId,
        giftLabelTr: gift.labelTr,
        giftLabelPl: gift.labelPl,
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
        giftLabelRu: gift.labelRu,
        giftLabelUk: gift.labelUk,
        giftLabelEs: gift.labelEs,
        giftLabelPtBr: gift.labelPtBr,
        giftLabelVi: gift.labelVi,
        giftLabelId: gift.labelId,
        giftLabelTr: gift.labelTr,
        giftLabelPl: gift.labelPl,
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
      giftLabelRu: gift.labelRu,
      giftLabelUk: gift.labelUk,
      giftLabelEs: gift.labelEs,
      giftLabelPtBr: gift.labelPtBr,
      giftLabelVi: gift.labelVi,
      giftLabelId: gift.labelId,
      giftLabelTr: gift.labelTr,
      giftLabelPl: gift.labelPl,
      costShards: gift.costShards,
      peerUid: friendStableId,
    });

    tx.set(recipientRef.collection('friend_gift_history').doc(sentGiftRef.id), {
      direction: 'received',
      ts: nowIso,
      giftId: gift.id,
      giftLabel: gift.labelRu,
      giftLabelRu: gift.labelRu,
      giftLabelUk: gift.labelUk,
      giftLabelEs: gift.labelEs,
      giftLabelPtBr: gift.labelPtBr,
      giftLabelVi: gift.labelVi,
      giftLabelId: gift.labelId,
      giftLabelTr: gift.labelTr,
      giftLabelPl: gift.labelPl,
      costShards: gift.costShards,
      peerUid: senderStableId,
      peerName: senderName,
      seen: false,
    });

    const senderHasActiveQuest = isActiveQuestMeta(senderCurrentQuestSnap.data(), now);
    const recipientHasActiveQuest = isActiveQuestMeta(recipientCurrentQuestSnap.data(), now);
    const hasWeeklyQuest = senderWeekQuestSnap.exists || recipientWeekQuestSnap.exists;
    let questStarted = false;
    let questBlockedReason: 'active' | 'weekly' | null = null;
    let questPayload: Record<string, unknown> | null = null;

    if (senderHasActiveQuest || recipientHasActiveQuest) {
      questBlockedReason = 'active';
    } else if (hasWeeklyQuest) {
      questBlockedReason = 'weekly';
    } else {
      const expiresAtMs = now + FRIEND_QUEST_DURATION_MS;
      const participantUids = [senderStableId, friendStableId];
      const startXpByUid = {
        [senderStableId]: getTotalXp(senderSnap.data()),
        [friendStableId]: getTotalXp(recipientSnap.data()),
      };
      const progressByUid = {
        [senderStableId]: 0,
        [friendStableId]: 0,
      };
      const remainingXpByUid = {
        [senderStableId]: FRIEND_QUEST_TARGET_XP,
        [friendStableId]: FRIEND_QUEST_TARGET_XP,
      };
      questPayload = {
        questId,
        participantUids,
        status: 'active',
        startedAtMs: now,
        expiresAtMs,
        weekKey,
        targetXp: FRIEND_QUEST_TARGET_XP,
        rewardShards: FRIEND_QUEST_REWARD_SHARDS,
        rewardXp: FRIEND_QUEST_REWARD_XP,
        startXpByUid,
        progressByUid,
        remainingXpByUid,
        rewardClaimedByUid: {},
        triggerGiftId: gift.id,
        createdByUid: senderStableId,
      };
      tx.set(questRef, questPayload);
      tx.set(senderCurrentQuestRef, { questId, status: 'active', peerUid: friendStableId, expiresAtMs, weekKey });
      tx.set(recipientCurrentQuestRef, { questId, status: 'active', peerUid: senderStableId, expiresAtMs, weekKey });
      tx.set(senderWeekQuestRef, { questId, peerUid: friendStableId, startedAtMs: now });
      tx.set(recipientWeekQuestRef, { questId, peerUid: senderStableId, startedAtMs: now });
      questStarted = true;
    }

    const recipientPushToken = typeof recipientSnap.data()?.expoPushToken === 'string'
      ? (recipientSnap.data()?.expoPushToken as string)
      : '';
    const recipientLang = normalizePushLang(
      getExistingField(recipientSnap.data(), 'app_lang') ?? getExistingField(recipientSnap.data(), 'lang'),
    );

    return {
      ok: true,
      giftId: gift.id,
      costShards: gift.costShards,
      senderBalanceAfter,
      dailyRemaining: Math.max(0, MAX_DAILY_GIFTS_TOTAL - totalSentToday - 1),
      questStarted,
      questBlockedReason,
      quest: questPayload,
      // Для push после commit (не возвращаем клиенту-отправителю).
      _recipientPushToken: recipientPushToken,
      _recipientLang: recipientLang,
      _senderName: senderName,
    };
  });

  // Push получателю — только после успешного commit транзакции, на языке получателя.
  if (result._recipientPushToken) {
    const pushLang = result._recipientLang;
    await sendExpoPush(
      result._recipientPushToken,
      GIFT_PUSH_TITLE[pushLang],
      giftPushBody(pushLang, result._senderName, giftLabelForPushLang(gift, pushLang)),
      { type: 'friend_gift_received', fromName: result._senderName, giftId: result.giftId },
    );
  }

  return {
    ok: result.ok,
    giftId: result.giftId,
    costShards: result.costShards,
    senderBalanceAfter: result.senderBalanceAfter,
    dailyRemaining: result.dailyRemaining,
    questStarted: result.questStarted,
    questBlockedReason: result.questBlockedReason,
    quest: result.quest,
  };
});

function buildQuestStatus(
  quest: FirebaseFirestore.DocumentData,
  userDataByUid: Record<string, FirebaseFirestore.DocumentData | undefined>,
): Record<string, unknown> {
  const participantUids = Array.isArray(quest.participantUids)
    ? quest.participantUids.map((uid: unknown) => String(uid)).filter(Boolean)
    : [];
  const startXpByUid = parseJsonObject(quest.startXpByUid);
  const progressByUid: Record<string, number> = {};
  const remainingXpByUid: Record<string, number> = {};
  const targetXp = parseProgressInt(quest.targetXp) || FRIEND_QUEST_TARGET_XP;
  for (const uid of participantUids) {
    const start = parseProgressInt(startXpByUid[uid]);
    const current = getTotalXp(userDataByUid[uid]);
    const progress = Math.max(0, current - start);
    progressByUid[uid] = Math.min(targetXp, progress);
    remainingXpByUid[uid] = Math.max(0, targetXp - progress);
  }
  const completed = participantUids.length === 2 && participantUids.every((uid) => remainingXpByUid[uid] === 0);
  return {
    questId: String(quest.questId ?? ''),
    participantUids,
    status: completed && quest.status === 'active' ? 'ready' : String(quest.status ?? 'active'),
    startedAtMs: parseProgressInt(quest.startedAtMs),
    expiresAtMs: parseProgressInt(quest.expiresAtMs),
    weekKey: String(quest.weekKey ?? ''),
    targetXp,
    rewardShards: parseProgressInt(quest.rewardShards) || FRIEND_QUEST_REWARD_SHARDS,
    rewardXp: parseProgressInt(quest.rewardXp) || FRIEND_QUEST_REWARD_XP,
    progressByUid,
    remainingXpByUid,
    rewardClaimedByUid: parseJsonObject(quest.rewardClaimedByUid),
  };
}

export const friendGetActiveQuest = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableId = cleanId(request.data?.stableId);
  if (!stableId) {
    throw new HttpsError('invalid-argument', 'stableId required');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableId);
  const currentRef = userRef.collection('friend_quest_meta').doc('current');
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, currentSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(currentRef),
    ]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found');
    if (!userMatchesAuth(stableId, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'User does not match auth');
    }
    if (!currentSnap.exists) return { ok: true, quest: null };

    const current = currentSnap.data() ?? {};
    const questId = cleanId(current.questId);
    const expiresAtMs = parseProgressInt(current.expiresAtMs);
    if (!questId || current.status !== 'active') return { ok: true, quest: null };
    const questRef = db.collection('friend_quests').doc(questId);
    const questSnap = await tx.get(questRef);
    if (!questSnap.exists) return { ok: true, quest: null };
    const quest = questSnap.data() ?? {};
    const participantUids = Array.isArray(quest.participantUids)
      ? quest.participantUids.map((uid: unknown) => String(uid)).filter(Boolean)
      : [];
    if (!participantUids.includes(stableId)) {
      throw new HttpsError('permission-denied', 'Not a quest participant');
    }
    const otherUid = participantUids.find((uid) => uid !== stableId) || '';
    const otherRef = db.collection('users').doc(otherUid);
    const otherSnap = otherUid ? await tx.get(otherRef) : null;
    if (expiresAtMs > 0 && expiresAtMs <= now && quest.status === 'active') {
      tx.set(questRef, { status: 'expired', expiredAtMs: now }, { merge: true });
      tx.set(currentRef, { status: 'expired', expiredAtMs: now }, { merge: true });
      if (otherUid) {
        tx.set(otherRef.collection('friend_quest_meta').doc('current'), { status: 'expired', expiredAtMs: now }, { merge: true });
      }
      return { ok: true, quest: { ...buildQuestStatus({ ...quest, status: 'expired' }, { [stableId]: userSnap.data(), [otherUid]: otherSnap?.data() }), status: 'expired' } };
    }
    return {
      ok: true,
      quest: buildQuestStatus(quest, { [stableId]: userSnap.data(), [otherUid]: otherSnap?.data() }),
    };
  });
});

export const friendClaimQuestReward = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableId = cleanId(request.data?.stableId);
  const questId = cleanId(request.data?.questId);
  if (!stableId || !questId) {
    throw new HttpsError('invalid-argument', 'stableId and questId required');
  }

  const db = admin.firestore();
  const questRef = db.collection('friend_quests').doc(questId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  return db.runTransaction(async (tx) => {
    const questSnap = await tx.get(questRef);
    if (!questSnap.exists) throw new HttpsError('not-found', 'Quest not found');
    const quest = questSnap.data() ?? {};
    const participantUids = Array.isArray(quest.participantUids)
      ? quest.participantUids.map((uid: unknown) => String(uid)).filter(Boolean)
      : [];
    if (!participantUids.includes(stableId) || participantUids.length !== 2) {
      throw new HttpsError('permission-denied', 'Not a quest participant');
    }

    const userRefs = Object.fromEntries(participantUids.map((uid) => [uid, db.collection('users').doc(uid)]));
    const userSnaps = await Promise.all(participantUids.map((uid) => tx.get(userRefs[uid])));
    const userDataByUid: Record<string, FirebaseFirestore.DocumentData | undefined> = {};
    participantUids.forEach((uid, index) => {
      userDataByUid[uid] = userSnaps[index].data();
    });
    if (!userMatchesAuth(stableId, userDataByUid[stableId], request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'User does not match auth');
    }

    const targetXp = parseProgressInt(quest.targetXp) || FRIEND_QUEST_TARGET_XP;
    const rewardShards = parseProgressInt(quest.rewardShards) || FRIEND_QUEST_REWARD_SHARDS;
    const rewardXp = parseProgressInt(quest.rewardXp) || FRIEND_QUEST_REWARD_XP;
    const startXpByUid = parseJsonObject(quest.startXpByUid);
    const progressByUid: Record<string, number> = {};
    for (const uid of participantUids) {
      progressByUid[uid] = Math.max(0, getTotalXp(userDataByUid[uid]) - parseProgressInt(startXpByUid[uid]));
    }
    const reached = participantUids.every((uid) => progressByUid[uid] >= targetXp);
    const expiresAtMs = parseProgressInt(quest.expiresAtMs);
    if (!reached) {
      if (expiresAtMs > 0 && expiresAtMs <= now && quest.status === 'active') {
        tx.set(questRef, { status: 'expired', expiredAtMs: now, progressByUid }, { merge: true });
        for (const uid of participantUids) {
          tx.set(userRefs[uid].collection('friend_quest_meta').doc('current'), { status: 'expired', expiredAtMs: now }, { merge: true });
        }
      }
      return { ok: true, questId, rewardApplied: false, reached: false, progressByUid };
    }

    const rewardClaimedByUid = parseJsonObject(quest.rewardClaimedByUid);
    const callerAlreadyClaimed = rewardClaimedByUid[stableId] === true;
    if (participantUids.every((uid) => rewardClaimedByUid[uid] === true)) {
      const callerData = userDataByUid[stableId] ?? {};
      return {
        ok: true,
        questId,
        rewardApplied: false,
        reached: true,
        callerShards: parseShards(callerData.shards),
        callerXp: getTotalXp(callerData),
      };
    }

    const nextClaimed = { ...rewardClaimedByUid };
    for (const uid of participantUids) {
      if (nextClaimed[uid] === true) continue;
      const data = userDataByUid[uid] ?? {};
      const beforeShards = parseShards(data.shards);
      const beforeXp = getTotalXp(data);
      const afterShards = beforeShards + rewardShards;
      const afterXp = beforeXp + rewardXp;
      tx.set(userRefs[uid], {
        shards: afterShards,
        shards_updated_at_ms: now,
        shards_updated_op: 'earn',
        shards_updated_reason: 'friend_quest_reward',
        progress: { user_total_xp: String(afterXp) },
        updatedAt: now,
      }, { merge: true });
      tx.set(userRefs[uid].collection('shard_log').doc(), {
        ts: nowIso,
        type: 'earn',
        amount: rewardShards,
        reason: 'friend_quest_reward',
        questId,
        balanceBefore: beforeShards,
        balanceAfter: afterShards,
      });
      tx.set(userRefs[uid].collection('my_events').doc(`friend_quest_completed_${questId}`), {
        type: 'friend_quest_completed',
        uid,
        ts: now,
        payload: { questId, rewardShards, rewardXp },
      });
      tx.set(userRefs[uid].collection('friend_quest_meta').doc('current'), {
        questId,
        status: 'completed',
        completedAtMs: now,
      }, { merge: true });
      nextClaimed[uid] = true;
      userDataByUid[uid] = {
        ...data,
        shards: afterShards,
        progress: { ...getProgress(data), user_total_xp: String(afterXp) },
      };
    }

    tx.set(questRef, {
      status: 'completed',
      completedAtMs: now,
      progressByUid,
      rewardClaimedByUid: nextClaimed,
    }, { merge: true });

    const callerData = userDataByUid[stableId] ?? {};
    return {
      ok: true,
      questId,
      rewardApplied: !callerAlreadyClaimed,
      reached: true,
      callerShards: parseShards(callerData.shards),
      callerXp: getTotalXp(callerData),
    };
  });
});

export const friendThankGift = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const senderStableId = cleanId(request.data?.senderStableId);
  const friendStableId = cleanId(request.data?.friendStableId);
  const giftId = cleanId(request.data?.giftId) as FriendGiftId;
  const gift = GIFT_CATALOG[giftId];
  if (!senderStableId || !friendStableId || senderStableId === friendStableId || !gift) {
    throw new HttpsError('invalid-argument', 'Valid sender, friend and gift required');
  }

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const friendRef = db.collection('users').doc(friendStableId);
  const now = Date.now();

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, friendSnap, senderFriendSnap, friendSenderSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(friendRef),
      tx.get(senderRef.collection('friends').doc(friendStableId)),
      tx.get(friendRef.collection('friends').doc(senderStableId)),
    ]);
    if (!senderSnap.exists || !friendSnap.exists) {
      throw new HttpsError('not-found', 'User not found');
    }
    if (!senderFriendSnap.exists || !friendSenderSnap.exists) {
      throw new HttpsError('failed-precondition', 'Users are not friends');
    }
    if (!userMatchesAuth(senderStableId, senderSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }

    const senderProgress = getProgress(senderSnap.data());
    const senderName =
      cleanDisplayName(request.data?.senderDisplayName) ||
      cleanDisplayName(senderSnap.data()?.displayName) ||
      cleanDisplayName(senderProgress.user_name) ||
      'Friend';

    tx.set(friendRef.collection('my_events').doc(`friend_gift_thanks_${senderStableId}_${now}`), {
      type: 'friend_gift_thanks',
      uid: friendStableId,
      ts: now,
      payload: {
        giftId: gift.id,
        giftLabel: gift.labelRu,
        fromUid: senderStableId,
        fromName: senderName,
      },
    });

    const friendPushToken = typeof friendSnap.data()?.expoPushToken === 'string'
      ? (friendSnap.data()?.expoPushToken as string)
      : '';
    const friendLang = normalizePushLang(
      getExistingField(friendSnap.data(), 'app_lang') ?? getExistingField(friendSnap.data(), 'lang'),
    );
    return { ok: true, _friendPushToken: friendPushToken, _friendLang: friendLang, _senderName: senderName };
  });

  if (result._friendPushToken) {
    const title = result._friendLang === 'ru' ? 'Спасибо за подарок!' : 'Thanks for the gift!';
    const body = result._friendLang === 'ru'
      ? `${result._senderName} поблагодарил тебя за подарок`
      : `${result._senderName} thanked you for the gift`;
    await sendExpoPush(result._friendPushToken, title, body, {
      type: 'friend_gift_thanks',
      fromName: result._senderName,
      giftId: gift.id,
    });
  }

  return { ok: true };
});
