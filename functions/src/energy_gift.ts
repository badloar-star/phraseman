// Governance-ID: TG-77EE1592FAEB
/**
 * «Подарок энергии» — callable сервера (docs/work/tasks/energy-gift-design-2026-11-05.md §2).
 *  - energyGiftSend  — отправить +1 энергии другу: { toUid } → { ok, giftId, remainingToday }
 *  - energyGiftClaim — забрать подарок: { giftId } → { ok, bank, applied }
 *
 * зачем (владелец 05.11: «разрешить с лимитом»): сервер хранит подарок и считает лимиты по серверным суткам; энергия остаётся на
 * телефоне (копилка «Моментов»), поэтому сервер её НЕ начисляет, а лишь подтверждает факт и сообщает копилку-подсказку.
 * Работает только при remote_config.bools.energy_gift_enabled === true (ключа нет = выключено). Все ветки пишут [ENERGY-GIFT-SRV].
 * Firebase-экономия: send — 1 транзакция на 6 документов, claim — на 3; никаких where и плановых функций.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { currentPlusEndMs } from './plus_grant';
import {
  ENERGY_GIFT_AMOUNT,
  ENERGY_GIFT_CLAIM_PER_DAY,
  ENERGY_GIFT_SEND_PER_DAY,
  energyGiftClaimDecision,
  energyGiftDayKey,
  energyGiftId,
  energyGiftSendRefusal,
  normalizeEnergyGiftQuota,
} from './energy_gift_core';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const LOG = '[ENERGY-GIFT-SRV]';
const FLAG_CACHE_TTL_MS = 60_000;
const UID_RE = /^[A-Za-z0-9_-]{6,160}$/;
const GIFT_ID_RE = /^[A-Za-z0-9_-]{6,200}$/;

const uidTag = (uid: string): string => (uid ? uid.slice(0, 6) : '-');

function reject(code: ConstructorParameters<typeof HttpsError>[0], reason: string, ctx: Record<string, unknown> = {}): never {
  console.warn(`${LOG} reject reason=${reason} ${JSON.stringify(ctx)}`);
  throw new HttpsError(code, reason);
}

let cachedFlag: { expiresAtMs: number; enabled: boolean } | null = null;

async function giftEnabled(db: admin.firestore.Firestore): Promise<boolean> {
  const now = Date.now();
  if (cachedFlag && cachedFlag.expiresAtMs > now) return cachedFlag.enabled;
  try {
    const data = (await db.collection('remote_config').doc('app').get()).data() as { bools?: Record<string, unknown> } | undefined;
    const enabled = data?.bools?.energy_gift_enabled === true;
    cachedFlag = { expiresAtMs: now + FLAG_CACHE_TTL_MS, enabled };
    console.log(`${LOG} flag source=remote_config enabled=${enabled}`);
    return enabled;
  } catch (error) {
    console.warn(`${LOG} flag_read_failed ${String(error instanceof Error ? error.message : error).slice(0, 120)} -> disabled`);
    return false;
  }
}

export function __resetEnergyGiftFlagCacheForTests(): void {
  cachedFlag = null;
}

function hasPlus(userData: FirebaseFirestore.DocumentData | undefined, nowMs: number): boolean {
  const progress = userData?.progress && typeof userData.progress === 'object' && !Array.isArray(userData.progress)
    ? userData.progress as Record<string, unknown> : {};
  const end = currentPlusEndMs(progress, nowMs);
  return end === null || end > nowMs;
}

function edgeCreatedMs(snap: FirebaseFirestore.DocumentSnapshot): number | null {
  if (!snap.exists) return null;
  const ms = snap.createTime?.toMillis?.();
  return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
}

export async function handleEnergyGiftSend(request: CallableRequest): Promise<Record<string, unknown>> {
  if (!request.auth?.uid) reject('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const started = Date.now();
  const toUid = String(request.data?.toUid ?? '').trim();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.stableId ?? '').trim() || undefined);
  const ctx = { from: uidTag(stableUid), to: uidTag(toUid) };
  console.log(`${LOG} send:enter ${JSON.stringify(ctx)}`);
  if (!UID_RE.test(toUid)) reject('invalid-argument', 'invalid_to_uid', ctx);
  if (toUid === stableUid) reject('failed-precondition', 'self', ctx);
  if (!(await giftEnabled(db))) reject('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const dayKey = energyGiftDayKey(now);
  const giftId = energyGiftId(stableUid, toUid, dayKey);
  const fromQuotaRef = db.collection('energy_gift_quota').doc(stableUid);
  const toQuotaRef = db.collection('energy_gift_quota').doc(toUid);
  const giftRef = db.collection('users').doc(toUid).collection('energy_gifts').doc(giftId);
  const edgeA = db.collection('users').doc(stableUid).collection('friends').doc(toUid);
  const edgeB = db.collection('users').doc(toUid).collection('friends').doc(stableUid);
  const toUserRef = db.collection('users').doc(toUid);

  const response = await db.runTransaction(async (tx) => {
    const [giftSnap, fromQ, toQ, a, b, toUser] = await Promise.all([
      tx.get(giftRef), tx.get(fromQuotaRef), tx.get(toQuotaRef), tx.get(edgeA), tx.get(edgeB), tx.get(toUserRef),
    ]);
    const senderQuota = normalizeEnergyGiftQuota(fromQ.data(), dayKey);
    if (giftSnap.exists) {
      // зачем: повтор той же отправки в тот же день — тот же ответ, лимиты не списываются второй раз
      console.log(`${LOG} send:replay ${JSON.stringify({ ...ctx, giftId: giftId.slice(0, 12) })}`);
      return { ok: true, giftId, remainingToday: Math.max(0, ENERGY_GIFT_SEND_PER_DAY - senderQuota.sent), replayed: true };
    }
    const createdA = edgeCreatedMs(a);
    const createdB = edgeCreatedMs(b);
    const since = createdA === null || createdB === null ? null : Math.max(createdA, createdB);
    const receiverQuota = normalizeEnergyGiftQuota(toQ.data(), dayKey);
    const refusal = energyGiftSendRefusal({
      fromUid: stableUid, toUid, friendshipSinceMs: since, nowMs: now, senderQuota, receiverQuota,
      receiverHasPlus: toUser.exists ? hasPlus(toUser.data(), now) : false,
    });
    if (!toUser.exists && !refusal) reject('failed-precondition', 'not_friends_24h', { ...ctx, why: 'receiver_missing' });
    if (refusal) {
      const code = refusal === 'quota_sender' || refusal === 'quota_receiver' ? 'resource-exhausted' : 'failed-precondition';
      reject(code, refusal, { ...ctx, edgeA: a.exists, edgeB: b.exists, sinceMs: since, sent: senderQuota.sent, received: receiverQuota.received });
    }
    tx.create(giftRef, {
      schemaVersion: 1, fromUid: stableUid, toUid, status: 'pending', dayKey, amount: ENERGY_GIFT_AMOUNT,
      createdAtMs: now, expireAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    });
    tx.set(fromQuotaRef, { dayKey, sent: senderQuota.sent + 1, received: normalizeEnergyGiftQuota(fromQ.data(), dayKey).received }, { merge: true });
    return { ok: true, giftId, remainingToday: Math.max(0, ENERGY_GIFT_SEND_PER_DAY - senderQuota.sent - 1), replayed: false };
  });
  console.log(`${LOG} send:done ${JSON.stringify({ ...ctx, giftId: giftId.slice(0, 12), replayed: response.replayed, ms: Date.now() - started })}`);
  return { ok: response.ok, giftId: response.giftId, remainingToday: response.remainingToday };
}

export async function handleEnergyGiftClaim(request: CallableRequest): Promise<Record<string, unknown>> {
  if (!request.auth?.uid) reject('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const started = Date.now();
  const giftId = String(request.data?.giftId ?? '').trim();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.stableId ?? '').trim() || undefined);
  const ctx = { me: uidTag(stableUid), gift: giftId.slice(0, 12) };
  console.log(`${LOG} claim:enter ${JSON.stringify(ctx)}`);
  if (!GIFT_ID_RE.test(giftId)) reject('invalid-argument', 'invalid_gift_id', ctx);
  if (!(await giftEnabled(db))) reject('failed-precondition', 'disabled', ctx);

  const now = Date.now();
  const dayKey = energyGiftDayKey(now);
  const giftRef = db.collection('users').doc(stableUid).collection('energy_gifts').doc(giftId);
  const quotaRef = db.collection('energy_gift_quota').doc(stableUid);
  const userRef = db.collection('users').doc(stableUid);

  const result = await db.runTransaction(async (tx) => {
    const [giftSnap, quotaSnap, userSnap] = await Promise.all([tx.get(giftRef), tx.get(quotaRef), tx.get(userRef)]);
    if (!giftSnap.exists) reject('not-found', 'gift_not_found', ctx);
    const gift = giftSnap.data() as Record<string, unknown>;
    const quota = normalizeEnergyGiftQuota(quotaSnap.data(), dayKey);
    const decision = energyGiftClaimDecision({
      status: gift.status, createdAtMs: gift.createdAtMs, nowMs: now,
      receiverHasPlus: hasPlus(userSnap.data(), now), receiverQuota: quota,
    });
    console.log(`${LOG} claim:decision ${JSON.stringify({ ...ctx, decision: decision.kind, reason: 'reason' in decision ? decision.reason : null, received: quota.received })}`);
    if (decision.kind === 'already') return { ok: true, bank: 0, applied: false };
    if (decision.kind === 'quota_receiver') reject('resource-exhausted', 'quota_receiver', { ...ctx, received: quota.received, limit: ENERGY_GIFT_CLAIM_PER_DAY });
    if (decision.kind === 'void') {
      if (gift.status === 'pending') tx.update(giftRef, { status: 'void', voidReason: decision.reason, voidAtMs: now });
      return { ok: true, bank: 0, applied: false };
    }
    tx.update(giftRef, { status: 'claimed', claimedAtMs: now });
    tx.set(quotaRef, { dayKey, received: quota.received + 1, sent: quota.sent }, { merge: true });
    return { ok: true, bank: ENERGY_GIFT_AMOUNT, applied: true };
  });
  console.log(`${LOG} claim:done ${JSON.stringify({ ...ctx, applied: result.applied, ms: Date.now() - started })}`);
  return result;
}

export const energyGiftSend = onCall(CALLABLE_BASE, handleEnergyGiftSend);
export const energyGiftClaim = onCall(CALLABLE_BASE, handleEnergyGiftClaim);
