import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { ensureStableLinkForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { getLevelFromXP } from './xp_levels';
import { appendExternalEconomyEvent } from './external_economy_events';
import {
  commitPreparedLevelSpinMinting,
  LEVEL_SPIN_PROTOCOL,
  prepareLevelSpinMinting,
} from './level_reward_spins';

const REGION = 'us-central1';

/**
 * Отправляет один Expo push. Best-effort: ошибки глотаем — получатель всё равно
 * увидит подарок при следующем открытии приложения (inbox friend_gifts_received + центр уведомлений).
 * Тот же транспорт, что в matchmaking.ts (exp.host/--/api/v2/push/send).
 */
export type FriendGiftPushTransport = 'sent' | 'failed' | 'timeout' | 'skipped';

export async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<FriendGiftPushTransport> {
  const to = String(token ?? '').trim();
  if (!to) return 'skipped';
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const request = fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ to, sound: 'default', title, body, data }]),
        signal: controller.signal,
      })
      .then(async (response) => {
        if (!response.ok) return 'failed' as const;
        const body = await response.json().catch(() => null) as { data?: Array<{ status?: string }> } | null;
        const tickets = Array.isArray(body?.data) ? body!.data! : [];
        return tickets.length > 0 && tickets.every((ticket) => ticket?.status === 'ok')
          ? 'sent' as const
          : 'failed' as const;
      })
      .catch(() => controller.signal.aborted ? 'timeout' as const : 'failed' as const);
    const deadline = new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => {
        controller.abort();
        resolve('timeout');
      }, 2_000);
    });
    return await Promise.race([request, deadline]);
  } catch {
    return controller.signal.aborted ? 'timeout' : 'failed';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAILY_GIFTS_TOTAL = 3;
const MAX_DAILY_GIFTS_PER_FRIEND = 1;
const FRIEND_QUEST_TARGET_XP = 3000;
const FRIEND_QUEST_REWARD_SHARDS = 10;
const FRIEND_QUEST_REWARD_XP = 1000;
const FRIEND_QUEST_DURATION_MS = DAY_MS;

type FriendGiftId = 'chain_shield_1' | 'xp_boost_2x_24h';

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

type FriendGiftTxResult = {
  ok: boolean;
  giftId: FriendGiftId;
  costShards: number;
  dailyRemaining: number;
  questStarted: boolean;
  questBlockedReason: 'active' | 'weekly' | null;
  quest: Record<string, unknown> | null;
  idempotencyKey?: string;
  idempotentReplay?: boolean;
  _recipientPushToken?: string;
  _recipientLang?: PushLang;
  _senderName?: string;
};

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

function cleanIdempotencyKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(raw)) {
    throw new HttpsError('invalid-argument', 'Invalid idempotency key');
  }
  return raw;
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

function replayFriendGiftResult(
  idempotencyData: FirebaseFirestore.DocumentData | undefined,
  idempotencyKey: string,
  friendStableId: string,
  gift: GiftCatalogItem,
): FriendGiftTxResult {
  if (String(idempotencyData?.friendStableId ?? '') !== friendStableId ||
      String(idempotencyData?.giftId ?? '') !== gift.id) {
    throw new HttpsError('already-exists', 'Idempotency key already used for another friend gift');
  }
  const response = parseJsonObject(idempotencyData?.response);
  if (response.ok !== true) {
    throw new HttpsError('aborted', 'Idempotency record is incomplete');
  }
  const questRaw = response.quest;
  const quest = questRaw && typeof questRaw === 'object' && !Array.isArray(questRaw)
    ? questRaw as Record<string, unknown>
    : null;
  const questBlockedReason = response.questBlockedReason === 'active' || response.questBlockedReason === 'weekly'
    ? response.questBlockedReason
    : null;
  return {
    ok: true,
    giftId: gift.id,
    costShards: parseProgressInt(response.costShards) || gift.costShards,
    dailyRemaining: parseProgressInt(response.dailyRemaining),
    questStarted: response.questStarted === true,
    questBlockedReason,
    quest,
    idempotencyKey,
    idempotentReplay: true,
  };
}

function getTotalXp(data: FirebaseFirestore.DocumentData | undefined): number {
  return parseProgressInt(getExistingField(data, 'user_total_xp'));
}

function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string'
    ? data.canonicalStableId.trim()
    : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
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

  if (giftId === 'chain_shield_1') {
    const root = parseJsonObject(recipientData?.chain_shield);
    const progress = parseJsonObject(getProgress(recipientData).chain_shield);
    const daysLeft = Math.max(parseProgressInt(root.daysLeft), parseProgressInt(progress.daysLeft));
    const next = JSON.stringify({ daysLeft: daysLeft + 1, grantedAt: today });
    return {
      chain_shield: next,
      progress: { chain_shield: next },
      updatedAt: now,
    };
  }

  const root = parseJsonObject(recipientData?.gift_xp_multiplier);
  const progress = parseJsonObject(getProgress(recipientData).gift_xp_multiplier);
  const existingExpiresAt = Math.max(parseProgressInt(root.expiresAt), parseProgressInt(progress.expiresAt));
  const base = Math.max(now, existingExpiresAt);
  const next = JSON.stringify({ multiplier: 2, expiresAt: base + DAY_MS });
  return {
    gift_xp_multiplier: next,
    progress: { gift_xp_multiplier: next },
    updatedAt: now,
  };
}

export const friendConsumeChainShield = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Auth required');
  const requestedStableId = cleanId(request.data?.stableId);
  const occurrenceId = cleanIdempotencyKey(request.data?.occurrenceId);
  if (!requestedStableId || !occurrenceId) throw new HttpsError('invalid-argument', 'stableId and occurrenceId required');
  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linked = await ensureStableLinkForAuth(db, request.auth.uid, requestedStableId, signInProvider);
  if (linked.stableUid !== requestedStableId) throw new HttpsError('permission-denied', 'stable_id_mismatch');
  const userRef = db.collection('users').doc(requestedStableId);
  const receiptRef = userRef.collection('gift_perk_consumptions').doc(`chain_shield_${occurrenceId}`);
  return db.runTransaction(async (tx) => {
    const [snap, receiptSnap] = await Promise.all([tx.get(userRef), tx.get(receiptRef)]);
    if (!snap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (receiptSnap.exists) return receiptSnap.data()?.response ?? { ok: true, consumed: false, daysLeft: 0, chainShield: null };
    const data = snap.data() ?? {};
    const root = parseJsonObject(data.chain_shield);
    const progress = parseJsonObject(getProgress(data).chain_shield);
    const before = Math.max(parseProgressInt(root.daysLeft), parseProgressInt(progress.daysLeft));
    if (before <= 0) {
      const response = { ok: true, consumed: false, daysLeft: 0, chainShield: null };
      tx.set(receiptRef, { occurrenceId, createdAt: Date.now(), response });
      return response;
    }
    const daysLeft = before - 1;
    const canonical = JSON.stringify({ daysLeft, consumedAt: todayStrUtc() });
    tx.set(userRef, { chain_shield: canonical, progress: { chain_shield: canonical }, updatedAt: Date.now() }, { merge: true });
    const response = { ok: true, consumed: true, daysLeft, chainShield: canonical };
    tx.set(receiptRef, { occurrenceId, createdAt: Date.now(), response });
    return response;
  });
});

export const friendSendGift = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const senderStableId = cleanId(request.data?.senderStableId);
  const friendStableId = cleanId(request.data?.friendStableId);
  const giftId = cleanId(request.data?.giftId) as FriendGiftId;
  const gift = GIFT_CATALOG[giftId];
  const idempotencyKey = cleanIdempotencyKey(request.data?.idempotencyKey);

  if (!idempotencyKey) {
    throw new HttpsError('invalid-argument', 'idempotencyKey required');
  }

  if (!senderStableId || !friendStableId || senderStableId === friendStableId) {
    throw new HttpsError('invalid-argument', 'Valid sender and friend ids required');
  }
  if (!gift) {
    throw new HttpsError('invalid-argument', 'Unsupported gift id');
  }

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linkedSender = await ensureStableLinkForAuth(db, request.auth.uid, senderStableId, signInProvider);
  if (linkedSender.stableUid !== senderStableId) {
    throw new HttpsError('failed-precondition', 'sender_stable_id_changed');
  }
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
  const idempotencyRef = idempotencyKey
    ? senderRef.collection('friend_gift_idempotency').doc(idempotencyKey)
    : null;
  const questId = questIdFor(senderStableId, friendStableId, weekKey);
  const questRef = db.collection('friend_quests').doc(questId);

  const result = await db.runTransaction(async (tx): Promise<FriendGiftTxResult> => {
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
      idempotencySnap,
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
      idempotencyRef ? tx.get(idempotencyRef) : Promise.resolve(null),
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
    if (idempotencySnap?.exists) {
      return replayFriendGiftResult(idempotencySnap.data(), idempotencyKey, friendStableId, gift);
    }

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

    appendExternalEconomyEvent(tx, senderRef, {
      source: 'friend_gift',
      eventId: idempotencyKey,
      ownerStableId: senderStableId,
      delta: -gift.costShards,
      reason: 'friend_gift',
      kind: 'person_to_person_gift',
      subjectId: gift.id,
      payload: { giftId: gift.id, targetUid: friendStableId },
      createdAtMs: now,
    });

    tx.set(recipientRef, buildRecipientGiftPatch(gift.id, recipientSnap.data()), { merge: true });

    tx.set(senderRef.collection('shard_log').doc(), {
      ts: nowIso,
      type: 'spend',
      amount: gift.costShards,
      reason: 'friend_gift',
      giftId: gift.id,
      targetUid: friendStableId,
      authority: 'external_event',
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

    const sentGiftRef = idempotencyKey
      ? senderRef.collection('friend_gifts_sent').doc(`idem_${idempotencyKey}`)
      : senderRef.collection('friend_gifts_sent').doc();
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

    // Центр событий: «X отправил вам подарок».
    tx.set(userNotificationRef(db, friendStableId, `gift_${sentGiftRef.id}`), buildUserNotification({
      type: 'friend_gift_received',
      fromUid: senderStableId,
      fromName: senderName,
      text: gift.labelRu,
      nav: { kind: 'friends' },
    }, now));

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

    const publicResult: FriendGiftTxResult = {
      ok: true,
      giftId: gift.id,
      costShards: gift.costShards,
      dailyRemaining: Math.max(0, MAX_DAILY_GIFTS_TOTAL - totalSentToday - 1),
      questStarted,
      questBlockedReason,
      quest: questPayload,
    };
    if (idempotencyKey) {
      publicResult.idempotencyKey = idempotencyKey;
      tx.set(idempotencyRef!, {
        createdAt: now,
        senderStableId,
        friendStableId,
        giftId: gift.id,
        response: publicResult,
      });
    }

    return {
      ...publicResult,
      // Для push после commit (не возвращаем клиенту-отправителю).
      _recipientPushToken: recipientPushToken,
      _recipientLang: recipientLang,
      _senderName: senderName,
    };
  });

  // Push получателю — только после успешного commit транзакции, на языке получателя.
  if (!result.idempotentReplay && result._recipientPushToken) {
    const pushLang = result._recipientLang ?? 'ru';
    const senderName = result._senderName ?? 'Friend';
    void sendExpoPush(
      result._recipientPushToken,
      GIFT_PUSH_TITLE[pushLang],
      giftPushBody(pushLang, senderName, giftLabelForPushLang(gift, pushLang)),
      { type: 'friend_gift_received', fromName: senderName, giftId: result.giftId },
    ).then((transport) => {
      if (transport !== 'sent' && transport !== 'skipped') {
        console.warn('friend_gift_push_failed', { transport, giftId: result.giftId });
      }
    }).catch(() => {});
  }

  const response: Record<string, unknown> = {
    ok: result.ok,
    giftId: result.giftId,
    costShards: result.costShards,
    dailyRemaining: result.dailyRemaining,
    questStarted: result.questStarted,
    questBlockedReason: result.questBlockedReason,
    quest: result.quest,
  };
  if (result.idempotencyKey) response.idempotencyKey = result.idempotencyKey;
  if (result.idempotentReplay) response.idempotentReplay = true;
  return response;
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

type FriendGetActiveQuestResponse = {
  ok: true;
  quest: Record<string, unknown> | null;
};

const FRIEND_GET_ACTIVE_QUEST_SERVER_CACHE_TTL_MS = 30_000;
const friendGetActiveQuestServerCache = new Map<string, { expiresAtMs: number; data: FriendGetActiveQuestResponse }>();

function cacheFriendGetActiveQuest(stableId: string, data: FriendGetActiveQuestResponse): void {
  const now = Date.now();
  friendGetActiveQuestServerCache.set(stableId, {
    expiresAtMs: now + FRIEND_GET_ACTIVE_QUEST_SERVER_CACHE_TTL_MS,
    data,
  });
  if (friendGetActiveQuestServerCache.size > 1000) {
    for (const [key, entry] of friendGetActiveQuestServerCache) {
      if (entry.expiresAtMs <= now || friendGetActiveQuestServerCache.size > 900) {
        friendGetActiveQuestServerCache.delete(key);
      }
    }
  }
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
  const force = request.data?.force === true;

  return db.runTransaction(async (tx) => {
    const [userSnap, currentSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(currentRef),
    ]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found');
    if (!userMatchesAuth(stableId, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'User does not match auth');
    }
    if (!currentSnap.exists) {
      const data: FriendGetActiveQuestResponse = { ok: true, quest: null };
      cacheFriendGetActiveQuest(stableId, data);
      return data;
    }

    const current = currentSnap.data() ?? {};
    const questId = cleanId(current.questId);
    const expiresAtMs = parseProgressInt(current.expiresAtMs);
    if (!questId || current.status !== 'active') {
      const data: FriendGetActiveQuestResponse = { ok: true, quest: null };
      cacheFriendGetActiveQuest(stableId, data);
      return data;
    }
    const cached = force ? undefined : friendGetActiveQuestServerCache.get(stableId);
    if (cached && cached.expiresAtMs > now) return cached.data;
    const questRef = db.collection('friend_quests').doc(questId);
    const questSnap = await tx.get(questRef);
    if (!questSnap.exists) {
      const data: FriendGetActiveQuestResponse = { ok: true, quest: null };
      cacheFriendGetActiveQuest(stableId, data);
      return data;
    }
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
      const data: FriendGetActiveQuestResponse = { ok: true, quest: { ...buildQuestStatus({ ...quest, status: 'expired' }, { [stableId]: userSnap.data(), [otherUid]: otherSnap?.data() }), status: 'expired' } };
      cacheFriendGetActiveQuest(stableId, data);
      if (otherUid) cacheFriendGetActiveQuest(otherUid, data);
      return data;
    }
    const data: FriendGetActiveQuestResponse = {
      ok: true,
      quest: buildQuestStatus(quest, { [stableId]: userSnap.data(), [otherUid]: otherSnap?.data() }),
    };
    cacheFriendGetActiveQuest(stableId, data);
    if (otherUid) cacheFriendGetActiveQuest(otherUid, data);
    return data;
  });
});

export const friendClaimQuestReward = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const stableId = cleanId(request.data?.stableId);
  const questId = cleanId(request.data?.questId);
  const levelSpinProtocol = request.data?.levelSpinProtocol === LEVEL_SPIN_PROTOCOL
    ? LEVEL_SPIN_PROTOCOL
    : undefined;
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
    if (participantUids.some((uid) => userDataByUid[uid]?.levelSpinMergePending === true)) {
      throw new HttpsError('failed-precondition', 'level_spin_identity_transition_pending');
    }
    if (!userMatchesAuth(stableId, userDataByUid[stableId], request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'User does not match auth');
    }
    participantUids.forEach((uid) => friendGetActiveQuestServerCache.delete(uid));

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
    const rewardOutcomeByUid = parseJsonObject(quest.rewardOutcomeByUid);
    if (callerAlreadyClaimed) {
      const callerData = userDataByUid[stableId] ?? {};
      const callerServerState = callerData.progressServerState && typeof callerData.progressServerState === 'object'
        ? callerData.progressServerState as Record<string, unknown>
        : {};
      const callerSpinState = callerData.levelSpinServerState && typeof callerData.levelSpinServerState === 'object'
        ? callerData.levelSpinServerState as Record<string, unknown>
        : {};
      const storedOutcome = parseJsonObject(rewardOutcomeByUid[stableId]);
      const callerXpBeforeReward = Math.max(
        getTotalXp(callerData),
        parseProgressInt(callerServerState.totalXp),
      );
      return {
        ok: true,
        questId,
        rewardApplied: false,
        reached: true,
        callerXpBeforeReward,
        rewardXpApplied: 0,
        callerXp: getTotalXp(callerData),
        levelSpinMintedCredits: Array.isArray(storedOutcome.levelSpinMintedCredits)
          ? storedOutcome.levelSpinMintedCredits
          : [],
        levelSpinBalance: parseProgressInt(storedOutcome.levelSpinBalance ?? callerSpinState.balance),
      };
    }

    const nextClaimed = { ...rewardClaimedByUid };
    const initialCallerData = userDataByUid[stableId] ?? {};
    const initialCallerServerState = initialCallerData.progressServerState
      && typeof initialCallerData.progressServerState === 'object'
      ? initialCallerData.progressServerState as Record<string, unknown>
      : {};
    let callerXpBeforeReward: number | undefined = callerAlreadyClaimed
      ? Math.max(getTotalXp(initialCallerData), parseProgressInt(initialCallerServerState.totalXp))
      : undefined;
    const participantsToReward = [stableId];
    const preparedSpinMints = await Promise.all(participantsToReward.map(async (uid) => {
      const data = userDataByUid[uid] ?? {};
      const progressBefore = getProgress(data);
      const existingServerState = data.progressServerState && typeof data.progressServerState === 'object'
        ? data.progressServerState as Record<string, unknown>
        : {};
      const beforeXp = Math.max(getTotalXp(data), parseProgressInt(existingServerState.totalXp));
      const afterXp = beforeXp + rewardXp;
      const storedSpinState = data.levelSpinServerState && typeof data.levelSpinServerState === 'object'
        ? data.levelSpinServerState as Record<string, unknown>
        : {};
      const participantProtocol = uid === stableId
        ? levelSpinProtocol
        : storedSpinState.protocol === LEVEL_SPIN_PROTOCOL ? LEVEL_SPIN_PROTOCOL : undefined;
      const participantAuthUid = uid === stableId
        ? request.auth!.uid
        : cleanId(data.firebaseAuthUid);
      const prepared = await prepareLevelSpinMinting({
        db,
        tx,
        stableUid: uid,
        authUid: participantAuthUid || undefined,
        userRef: userRefs[uid],
        userData: data as Record<string, unknown>,
        progressBefore,
        beforeLevel: getLevelFromXP(beforeXp),
        afterLevel: getLevelFromXP(afterXp),
        protocol: participantProtocol,
        earnedAtMs: now,
      });
      return { uid, prepared };
    }));
    const preparedSpinMintByUid = new Map(preparedSpinMints.map(({ uid, prepared }) => [uid, prepared]));
    for (const uid of participantsToReward) {
      const data = userDataByUid[uid] ?? {};
      const existingServerState = data.progressServerState && typeof data.progressServerState === 'object'
        ? data.progressServerState as Record<string, unknown>
        : {};
      const beforeXp = Math.max(getTotalXp(data), parseProgressInt(existingServerState.totalXp));
      if (uid === stableId) callerXpBeforeReward = beforeXp;
      const afterXp = beforeXp + rewardXp;
      const preparedSpinMint = preparedSpinMintByUid.get(uid);
      if (!preparedSpinMint) throw new HttpsError('internal', 'friend_quest_spin_mint_missing');
      commitPreparedLevelSpinMinting(tx, preparedSpinMint);
      appendExternalEconomyEvent(tx, userRefs[uid], {
        source: 'friend_quest',
        eventId: questId,
        ownerStableId: uid,
        delta: rewardShards,
        reason: 'friend_quest_reward',
        kind: 'social_quest_reward',
        subjectId: questId,
        payload: { questId },
        createdAtMs: now,
      });
      tx.set(userRefs[uid], {
        progress: {
          user_total_xp: String(afterXp),
          level_reward_spin_balance: String(preparedSpinMint.balance),
        },
        progressServerState: {
          ...existingServerState,
          totalXp: afterXp,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        progressServerAuthoritative: true,
        levelSpinServerState: preparedSpinMint.state,
        updatedAt: now,
      }, { merge: true });
      tx.set(userRefs[uid].collection('shard_log').doc(), {
        ts: nowIso,
        type: 'earn',
        amount: rewardShards,
        reason: 'friend_quest_reward',
        questId,
        authority: 'external_event',
      });
      tx.set(userRefs[uid].collection('friend_quest_meta').doc('current'), {
        questId,
        status: 'completed',
        completedAtMs: now,
      }, { merge: true });
      nextClaimed[uid] = true;
      rewardOutcomeByUid[uid] = {
        callerXpBeforeReward: beforeXp,
        rewardXpApplied: rewardXp,
        callerXp: afterXp,
        levelSpinMintedCredits: preparedSpinMint.mintedCredits,
        levelSpinBalance: preparedSpinMint.balance,
      };
      userDataByUid[uid] = {
        ...data,
        progress: { ...getProgress(data), user_total_xp: String(afterXp) },
      };
    }

    const allParticipantsClaimed = participantUids.every((uid) => nextClaimed[uid] === true);
    tx.set(questRef, {
      status: allParticipantsClaimed ? 'completed' : 'ready',
      ...(allParticipantsClaimed ? { completedAtMs: now } : {}),
      progressByUid,
      rewardClaimedByUid: nextClaimed,
      rewardOutcomeByUid,
    }, { merge: true });

    const callerData = userDataByUid[stableId] ?? {};
    return {
      ok: true,
      questId,
      rewardApplied: !callerAlreadyClaimed,
      reached: true,
      rewardShardsApplied: callerAlreadyClaimed ? 0 : rewardShards,
      callerXpBeforeReward,
      rewardXpApplied: callerAlreadyClaimed ? 0 : rewardXp,
      callerXp: getTotalXp(callerData),
      levelSpinMintedCredits: preparedSpinMintByUid.get(stableId)?.mintedCredits ?? [],
      levelSpinBalance: preparedSpinMintByUid.get(stableId)?.balance ?? 0,
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
  const idempotencyKey = cleanIdempotencyKey(request.data?.idempotencyKey);
  if (!idempotencyKey) {
    throw new HttpsError('invalid-argument', 'idempotencyKey required');
  }
  if (!senderStableId || !friendStableId || senderStableId === friendStableId || !gift) {
    throw new HttpsError('invalid-argument', 'Valid sender, friend and gift required');
  }

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linkedSender = await ensureStableLinkForAuth(db, request.auth.uid, senderStableId, signInProvider);
  if (linkedSender.stableUid !== senderStableId) {
    throw new HttpsError('failed-precondition', 'sender_stable_id_changed');
  }
  const senderRef = db.collection('users').doc(senderStableId);
  const friendRef = db.collection('users').doc(friendStableId);
  const now = Date.now();
  const idempotencyRef = idempotencyKey
    ? senderRef.collection('friend_gift_thanks_idempotency').doc(idempotencyKey)
    : null;

  const result: {
    ok: true;
    idempotencyKey?: string;
    idempotentReplay?: boolean;
    _friendPushToken?: string;
    _friendLang?: PushLang;
    _senderName?: string;
  } = await db.runTransaction(async (tx) => {
    const [senderSnap, friendSnap, senderFriendSnap, friendSenderSnap, idempotencySnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(friendRef),
      tx.get(senderRef.collection('friends').doc(friendStableId)),
      tx.get(friendRef.collection('friends').doc(senderStableId)),
      idempotencyRef ? tx.get(idempotencyRef) : Promise.resolve(null),
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
    if (idempotencySnap?.exists) {
      const data = idempotencySnap.data() ?? {};
      if (String(data.friendStableId ?? '') !== friendStableId || String(data.giftId ?? '') !== gift.id) {
        throw new HttpsError('already-exists', 'Idempotency key already used for another friend gift thanks');
      }
      return { ok: true, idempotencyKey, idempotentReplay: true };
    }

    const senderProgress = getProgress(senderSnap.data());
    const senderName =
      cleanDisplayName(request.data?.senderDisplayName) ||
      cleanDisplayName(senderSnap.data()?.displayName) ||
      cleanDisplayName(senderProgress.user_name) ||
      'Friend';

    // Центр событий: «X поблагодарил за подарок».
    tx.set(
      userNotificationRef(db, friendStableId, `gift_thanks_${senderStableId}_${idempotencyKey || now}`),
      buildUserNotification({
        type: 'friend_gift_thanks',
        fromUid: senderStableId,
        fromName: senderName,
        text: gift.labelRu,
        nav: { kind: 'friends' },
      }, now),
    );
    if (idempotencyRef) {
      tx.set(idempotencyRef, {
        createdAt: now,
        senderStableId,
        friendStableId,
        giftId: gift.id,
      });
    }

    const friendPushToken = typeof friendSnap.data()?.expoPushToken === 'string'
      ? (friendSnap.data()?.expoPushToken as string)
      : '';
    const friendLang = normalizePushLang(
      getExistingField(friendSnap.data(), 'app_lang') ?? getExistingField(friendSnap.data(), 'lang'),
    );
    return { ok: true, idempotencyKey, _friendPushToken: friendPushToken, _friendLang: friendLang, _senderName: senderName };
  });

  if (!result.idempotentReplay && result._friendPushToken) {
    const title = result._friendLang === 'ru' ? 'Спасибо за подарок!' : 'Thanks for the gift!';
    const body = result._friendLang === 'ru'
      ? `${result._senderName} поблагодарил тебя за подарок`
      : `${result._senderName} thanked you for the gift`;
    void sendExpoPush(result._friendPushToken, title, body, {
      type: 'friend_gift_thanks',
      fromName: result._senderName,
      giftId: gift.id,
    }).then((transport) => {
      if (transport !== 'sent' && transport !== 'skipped') {
        console.warn('friend_gift_thanks_push_failed', { transport, giftId: gift.id });
      }
    }).catch(() => {});
  }

  const response: { ok: true; idempotencyKey?: string; idempotentReplay?: boolean } = { ok: true };
  if (result.idempotencyKey) response.idempotencyKey = result.idempotencyKey;
  if (result.idempotentReplay) response.idempotentReplay = true;
  return response;
});
