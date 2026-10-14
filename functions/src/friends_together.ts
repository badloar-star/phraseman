/**
 * «Вместе» — сервер (docs/plans/2026-08-16-friends-together-implementation.ru.md §3).
 *
 * Callable-обёртки вокруг чистых функций friends_together_core.ts:
 *  - friendsNudge — «Позвать» (пуш другу, дневные лимиты, тихие часы).
 *  - applyReferralPairBonus — хук из referral.ts: пара стартует с bonusDays=3.
 *
 * Награды за уровни дружбы (PM-170, D78) удалены целиком, а не оставлены заглушкой: остался только «Позвать».
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { ensureStableLinkForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';
import { sendExpoPush, type ExpoPushTransport } from './expo_push';
import {
  type FriendsTogetherConfig,
  FRIENDS_TOGETHER_DEFAULTS,
  friendsTogetherConfigFromNumbers,
  isQuietHours,
  nudgeLimitBlockReason,
} from './friends_together_core';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/* ------------------------------------ helpers -------------------------------- */

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanRequestId(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(raw)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }
  return raw;
}

function parseInt0(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function getField(data: FirebaseFirestore.DocumentData | undefined, key: string): unknown {
  const progress = getProgress(data);
  return data?.[key] ?? progress[key];
}

function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

function todayDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** Server-cached remote_config/app.numbers overlay — 60s TTL, same spirit as friendsGetProfiles. */
const CONFIG_CACHE_TTL_MS = 60_000;
let cachedConfig: { expiresAtMs: number; value: FriendsTogetherConfig } | null = null;

async function resolveConfig(db: admin.firestore.Firestore): Promise<FriendsTogetherConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAtMs > now) return cachedConfig.value;
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    const value = friendsTogetherConfigFromNumbers(data?.numbers);
    cachedConfig = { expiresAtMs: now + CONFIG_CACHE_TTL_MS, value };
    return value;
  } catch (e) {
    console.warn('friends_together: resolveConfig failed, using defaults', e);
    return { ...FRIENDS_TOGETHER_DEFAULTS };
  }
}

/* -------------------------------- friendsNudge ------------------------------- */

export const friendsNudge = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = cleanId(request.data?.stableId);
  const friendUid = cleanId(request.data?.friendUid);
  const requestId = cleanRequestId(request.data?.requestId);
  if (!stableUid || !friendUid || stableUid === friendUid) {
    throw new HttpsError('invalid-argument', 'valid_stable_and_friend_required');
  }
  if (!requestId) throw new HttpsError('invalid-argument', 'request_id_required');

  const db = admin.firestore();
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const linked = await ensureStableLinkForAuth(db, request.auth.uid, stableUid, signInProvider);
  if (linked.stableUid !== stableUid) throw new HttpsError('failed-precondition', 'stable_id_changed');

  const config = await resolveConfig(db);
  const now = Date.now();
  const dayKey = todayDayKey(now);
  const userRef = db.collection('users').doc(stableUid);
  const friendRef = db.collection('users').doc(friendUid);
  const senderNudgeRef = userRef.collection('friend_nudges').doc(dayKey);
  const receiverNudgeRef = friendRef.collection('friend_nudges').doc(dayKey);
  const receiptRef = userRef.collection('friends_together_nudge_receipts').doc(requestId);
  const notificationId = `friends_together_nudge_${stableUid}_${dayKey}`;

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, friendSnap, ownFriend, reciprocal, senderNudgeSnap, receiverNudgeSnap, receiptSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(friendRef),
      tx.get(userRef.collection('friends').doc(friendUid)),
      tx.get(friendRef.collection('friends').doc(stableUid)),
      tx.get(senderNudgeRef),
      tx.get(receiverNudgeRef),
      tx.get(receiptRef),
    ]);

    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      if (receipt.friendUid !== friendUid) throw new HttpsError('already-exists', 'request_id_reused');
      return receipt.response as Record<string, unknown>;
    }

    if (!userSnap.exists || !friendSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }
    if (!ownFriend.exists || !reciprocal.exists) {
      throw new HttpsError('failed-precondition', 'not_friends');
    }

    const friendPush = parseJsonObject(getField(friendSnap.data(), 'friends_push_v1'));
    if (friendPush.enabled === false) {
      throw new HttpsError('failed-precondition', 'disabled');
    }
    const tzRaw = friendPush.tz;
    const tzOffsetMinutes = typeof tzRaw === 'number' && Number.isFinite(tzRaw) ? tzRaw : null;
    if (isQuietHours(now, tzOffsetMinutes, config.nudgeQuietStartHour, config.nudgeQuietEndHour, config.nudgeDefaultTzOffsetMinutes)) {
      throw new HttpsError('failed-precondition', 'quiet_hours');
    }

    const senderData = senderNudgeSnap.data() ?? {};
    const receiverData = receiverNudgeSnap.data() ?? {};
    const sentMap = parseJsonObject(senderData.sent);
    const blockReason = nudgeLimitBlockReason({
      sentToThisFriendToday: Boolean(sentMap[friendUid]),
      senderSentCountToday: parseInt0(senderData.sentCount),
      receiverReceivedCountToday: parseInt0(receiverData.receivedCount),
      maxPerFriend: config.nudgeMaxPerFriendPerDay,
      maxSender: config.nudgeMaxSenderPerDay,
      maxReceiver: config.nudgeMaxReceiverPerDay,
    });
    if (blockReason) throw new HttpsError('resource-exhausted', blockReason);

    const senderName =
      String(request.data?.senderDisplayName ?? '').trim().slice(0, 80) ||
      String(getField(userSnap.data(), 'user_name') ?? '').trim().slice(0, 80) ||
      String(userSnap.data()?.displayName ?? '').trim().slice(0, 80) ||
      'Friend';

    tx.set(senderNudgeRef, {
      sent: { ...sentMap, [friendUid]: now },
      sentCount: parseInt0(senderData.sentCount) + 1,
      updatedAt: now,
    }, { merge: true });
    tx.set(receiverNudgeRef, {
      receivedCount: parseInt0(receiverData.receivedCount) + 1,
      updatedAt: now,
    }, { merge: true });

    tx.set(userNotificationRef(db, friendUid, notificationId), buildUserNotification({
      type: 'friend_nudge',
      fromUid: stableUid,
      fromName: senderName,
      // зачем (D188-следствие, 14.10): друзья учат разные языки — без названия языка (клиент 2.0 показывает свой перевод).
      text: 'Пять минут на практику?',
      nav: {
        kind: 'friend_event',
        actorStableUid: stableUid,
        eventId: notificationId,
        action: 'study_invite',
      },
    }, now));

    const response = { ok: true, requestId, sentAtMs: now };
    tx.set(receiptRef, { friendUid, response, createdAt: now });

    return {
      ...response,
      _friendPushToken: typeof friendSnap.data()?.expoPushToken === 'string' ? friendSnap.data()!.expoPushToken as string : '',
      _senderName: senderName,
    };
  });

  const pushToken = (result as { _friendPushToken?: string })._friendPushToken;
  const senderName = (result as { _senderName?: string })._senderName ?? 'Friend';
  if (pushToken) {
    void sendExpoPush(
      pushToken,
      `${senderName}: пять минут практики?`,
      'Одно маленькое занятие.',
      {
        type: 'friend_nudge',
        fromName: senderName,
        eventId: notificationId,
        actorStableUid: stableUid,
        nav: 'friends',
      },
    ).then(logFriendNudgePushOutcome).catch(logFriendNudgePushError);
  }

  return { ok: true, requestId: result.requestId, sentAtMs: result.sentAtMs };
});

/**
 * зачем: PM-200 — раньше отправка push «Позвать» глушилась немым `.catch(() => {})`:
 * если Expo падал, мы не знали ни о сбое, ни о причине. Логируем только код/транспорт —
 * без uid, имени и токена (PII в логи не уходит).
 */
export function logFriendNudgePushOutcome(transport: ExpoPushTransport): void {
  if (transport === 'sent') return;
  if (transport === 'skipped') {
    console.warn('[PUSH-PREFS] friend_nudge push skipped', { type: 'friend_nudge', code: 'no_token' });
    return;
  }
  console.warn('[PUSH-PREFS] friend_nudge push failed', { type: 'friend_nudge', code: transport });
}

export function logFriendNudgePushError(error: unknown): void {
  const code = error instanceof Error ? error.name : typeof error;
  console.warn('[PUSH-PREFS] friend_nudge push threw', { type: 'friend_nudge', code });
}

/* -------------------------------- referral hook ------------------------------- */

/**
 * Хук из referral.ts::markRefereeQualified (единая точка квалификации — обе точки входа,
 * apply-мгновенная и вебхук-триггер, сходятся туда). Пара стартует с bonusDays=3
 * «дней вместе». Идемпотентно: повторный вызов
 * для той же пары НЕ прибавляет бонус повторно — bonusDays только устанавливается, если
 * пары ещё не было (set с merge на новый док) или явно ещё не проставлен.
 *
 * Вызывающий (referral.ts) оборачивает это в try/catch — реферальная квалификация
 * НИКОГДА не должна падать из-за этой фичи (сформулировано в задании).
 */
export async function applyReferralPairBonusInTransaction(
  db: admin.firestore.Firestore,
  tx: admin.firestore.Transaction,
  inviterUid: string,
  inviteeUid: string,
  now: number,
): Promise<void> {
  const a = cleanId(inviterUid);
  const b = cleanId(inviteeUid);
  if (!a || !b || a === b) return;
  const ref = db.collection('friend_pairs').doc(pairId(a, b));
  const snap = await tx.get(ref);
  const data = snap.data() ?? {};
  // Идемпотентность: если bonusDays уже стоит (>=3), реферальный бонус этой паре уже выдан —
  // повторный вызов (retry вебхука, двойной триггер) ничего не делает.
  if (parseInt0(data.bonusDays) >= 3) return;
  tx.set(ref, {
    uids: [a, b],
    bonusDays: 3,
    updatedAt: now,
  }, { merge: true });
}

export async function applyReferralPairBonus(
  db: admin.firestore.Firestore,
  inviterUid: string,
  inviteeUid: string,
  now: number,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    await applyReferralPairBonusInTransaction(db, tx, inviterUid, inviteeUid, now);
  });
}
