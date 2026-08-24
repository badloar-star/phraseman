import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { resolveCanonicalAdminAccessTarget } from './admin_access_controls';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_JOBS,
  ACCOUNT_DELETE_TOMBSTONES,
} from './account_delete_job';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { writeAccessProjectionFromPatch } from './access_projection';

type Row = Record<string, unknown>;
type PremiumPlan = 'monthly' | 'yearly';

const ID_RE = /^[A-Za-z0-9._:-]{2,256}$/;
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{2,160}$/;
const DAY_MS = 86_400_000;

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function positiveMs(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export interface TelegramPromoInspectionInput {
  readonly activationCode: string;
}

export function normalizeTelegramPromoInspectionInput(data: unknown): TelegramPromoInspectionInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'promo inspection command required');
  const activationCode = text(data.activationCode, 32).toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(activationCode)) {
    throw new HttpsError('invalid-argument', 'valid activation code required');
  }
  return Object.freeze({ activationCode });
}

export function telegramPromoInspectionProjection(
  promo: Readonly<Row> | null,
  canonicalUid: string,
): Readonly<{ kind: 'code_pending' | 'redeemed' | 'redeemed_ambiguous'; redeemedBy: string; canonicalUid: string }> {
  const redeemedBy = text(promo?.lastRedeemedBy, 160);
  const hasMarker = Boolean(redeemedBy || positiveMs(promo?.lastRedeemedAtMs) || positiveMs(promo?.usedCount));
  return Object.freeze({
    kind: hasMarker ? (canonicalUid ? 'redeemed' : 'redeemed_ambiguous') : 'code_pending',
    redeemedBy,
    canonicalUid: text(canonicalUid, 160),
  });
}

export interface TelegramManualActivationInput {
  readonly orderId: string;
  readonly telegramPaymentChargeId: string;
  readonly requestedUid: string;
  readonly expectedPlan: PremiumPlan;
  readonly requestId: string;
}

export function normalizeTelegramManualActivationInput(data: unknown): TelegramManualActivationInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'activation command required');
  const orderId = text(data.orderId, 256);
  const telegramPaymentChargeId = text(data.telegramPaymentChargeId, 256);
  const requestedUid = text(data.requestedUid, 160);
  const expectedPlan = text(data.expectedPlan, 20) as PremiumPlan;
  const requestId = text(data.requestId, 160);
  if (!ID_RE.test(orderId) || !ID_RE.test(telegramPaymentChargeId) || orderId !== telegramPaymentChargeId) {
    throw new HttpsError('invalid-argument', 'exact order and payment identity required');
  }
  if (!UID_RE.test(requestedUid) || !['monthly', 'yearly'].includes(expectedPlan) || !REQUEST_ID_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'uid, paid plan, and request id are required');
  }
  return Object.freeze({ orderId, telegramPaymentChargeId, requestedUid, expectedPlan, requestId });
}

export type TelegramActivationDecision =
  | Readonly<{ kind: 'already_redeemed'; uid: string; requestedUid: string; activationCode: string }>
  | Readonly<{ kind: 'replayed'; uid: string; requestedUid: string; plan: PremiumPlan; expiresAtMs: number }>
  | Readonly<{ kind: 'grant'; uid: string; requestedUid: string; plan: PremiumPlan }>;

export function decideTelegramManualActivation(params: {
  order: Readonly<Row>;
  promo: Readonly<Row> | null;
  requestedUid: string;
  canonicalRequestedUid: string;
  canonicalRedeemedUid: string | null;
  canonicalActivatedUid: string | null;
}): TelegramActivationDecision {
  const activationCode = text(params.order.activationCode, 64);
  if (activationCode) {
    const redeemedBy = text(params.promo?.lastRedeemedBy, 160);
    const hasRedemptionMarker = Boolean(
      redeemedBy
      || positiveMs(params.promo?.lastRedeemedAtMs)
      || positiveMs(params.promo?.usedCount),
    );
    if (!hasRedemptionMarker) {
      throw new HttpsError('failed-precondition', 'code order must be activated only by redeeming its code');
    }
    if (!redeemedBy || !params.canonicalRedeemedUid) {
      throw new HttpsError('failed-precondition', 'redeemed code recipient cannot be attributed safely');
    }
    return Object.freeze({
      kind: 'already_redeemed',
      uid: params.canonicalRedeemedUid,
      requestedUid: params.requestedUid,
      activationCode,
    });
  }

  const plan = text(params.order.plan, 20) as PremiumPlan;
  const isActivated = params.order.testerActivationStatus === 'activated' || text(params.order.status, 64) === 'vip_activated';
  if (isActivated) {
    if (!params.canonicalActivatedUid || params.canonicalActivatedUid !== params.canonicalRequestedUid) {
      throw new HttpsError('already-exists', 'order is already activated for another canonical profile');
    }
    return Object.freeze({
      kind: 'replayed',
      uid: params.canonicalActivatedUid,
      requestedUid: params.requestedUid,
      plan,
      expiresAtMs: positiveMs(params.order.activatedUntil),
    });
  }

  if (text(params.order.status, 64) !== 'paid_pending_manual_activation') {
    throw new HttpsError('failed-precondition', 'order is not eligible for manual activation');
  }
  if (!params.canonicalRequestedUid || !['monthly', 'yearly'].includes(plan)) {
    throw new HttpsError('failed-precondition', 'canonical recipient and paid plan are required');
  }
  return Object.freeze({ kind: 'grant', uid: params.canonicalRequestedUid, requestedUid: params.requestedUid, plan });
}

export interface TelegramManualVipPatch {
  readonly updates: Readonly<Row>;
  readonly before: Readonly<Row>;
  readonly after: Readonly<Row>;
  readonly expiresAtMs: number;
}

export interface TelegramTargetAuthLinkEvidence {
  readonly id: string;
  readonly data: Readonly<Row>;
}

export function telegramTargetAuthAnchors(
  user: Readonly<Row>,
  authLinks: readonly TelegramTargetAuthLinkEvidence[],
): string[] {
  const linkedAuth = record(user.linkedAuth) ? user.linkedAuth : {};
  const anchors = new Set<string>();
  const add = (value: unknown) => {
    const uid = text(value, 160);
    if (UID_RE.test(uid)) anchors.add(uid);
  };
  add(user.firebaseAuthUid);
  add(linkedAuth.providerUid);
  for (const link of authLinks) {
    add(link.id);
    add(link.data.providerUid);
  }
  return [...anchors];
}

export function assertTelegramTargetDeletionNotPending(evidence: Readonly<{
  tombstoneExists: boolean;
  deletionJobs: readonly Readonly<Row>[];
  authMarkers: readonly Readonly<{ authUid: string; exists: boolean }>[];
}>): void {
  if (
    evidence.tombstoneExists
    || evidence.deletionJobs.length > 0
    || evidence.authMarkers.some((marker) => marker.exists)
  ) {
    throw new HttpsError('failed-precondition', 'account_delete_pending');
  }
}

export function buildTelegramManualVipPatch(user: Readonly<Row>, plan: PremiumPlan, nowMs: number): TelegramManualVipPatch {
  const progress = record(user.progress) ? user.progress : {};
  const currentUntil = positiveMs(progress.vip_until);
  const baseMs = Math.max(nowMs, currentUntil);
  const expiresAtMs = baseMs + (plan === 'yearly' ? 366 : 31) * DAY_MS;
  const before = {
    vip_active: progress.vip_active ?? null,
    vip_plan: progress.vip_plan ?? null,
    vip_from: progress.vip_from ?? null,
    vip_until: progress.vip_until ?? null,
    vip_admin_override: progress.vip_admin_override ?? null,
    vip_admin_grant_at: progress.vip_admin_grant_at ?? null,
  };
  const after = {
    vip_active: 'true',
    vip_plan: 'telegram_tester',
    vip_from: String(nowMs),
    vip_until: String(expiresAtMs),
    vip_admin_override: 'true',
    vip_admin_grant_at: String(nowMs),
  };
  return Object.freeze({
    updates: Object.freeze({
      'progress.vip_active': after.vip_active,
      'progress.vip_plan': after.vip_plan,
      'progress.vip_from': after.vip_from,
      'progress.vip_until': after.vip_until,
      'progress.vip_admin_override': after.vip_admin_override,
      'progress.vip_admin_grant_at': after.vip_admin_grant_at,
    }),
    before: Object.freeze(before),
    after: Object.freeze(after),
    expiresAtMs,
  });
}

function requireMoneyAdmin(request: { auth?: { uid?: string; token?: Row } | null }): { actorUid: string; role: NonNullable<ReturnType<typeof roleFromAdminToken>> } {
  const actorUid = text(request.auth?.uid, 160);
  const role = roleFromAdminToken(request.auth?.token);
  if (!actorUid || !role || !hasPermission(role, 'money.manual_access.write')) {
    throw new HttpsError('permission-denied', 'Admin money permission required');
  }
  return { actorUid, role };
}

/** Narrow server inspection for the Telegram UI; promo_codes stays browser-inaccessible. */
export const adminInspectTelegramPromoCode = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  requireMoneyAdmin(request as { auth?: { uid?: string; token?: Row } | null });
  const input = normalizeTelegramPromoInspectionInput(request.data);
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(db.collection('promo_codes').doc(input.activationCode));
    const promo = snapshot.exists ? (snapshot.data() ?? {}) : null;
    const redeemedBy = text(promo?.lastRedeemedBy, 160);
    let canonicalUid = '';
    if (redeemedBy) {
      try {
        canonicalUid = (await resolveCanonicalAdminAccessTarget(tx, db, redeemedBy)).uid;
      } catch {
        canonicalUid = '';
      }
    }
    return { ok: true, ...telegramPromoInspectionProjection(promo, canonicalUid) };
  });
});

export const adminActivateTelegramPremiumOrder = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeTelegramManualActivationInput(request.data);
  const actor = requireMoneyAdmin(request as { auth?: { uid?: string; token?: Row } | null });
  const db = admin.firestore();
  const orderRef = db.collection('telegram_premium_orders').doc(input.orderId);
  const auditRef = db.collection('admin_log').doc();
  const nowMs = Date.now();

  return db.runTransaction(async (tx) => {
    const orderSnapshot = await tx.get(orderRef);
    if (!orderSnapshot.exists) throw new HttpsError('not-found', 'Telegram Premium order not found');
    const order = orderSnapshot.data() ?? {};
    const storedPaymentChargeId = text(order.telegramPaymentChargeId, 256);
    const storedPlan = text(order.plan, 20);
    if (storedPaymentChargeId !== input.telegramPaymentChargeId || storedPaymentChargeId !== input.orderId) {
      throw new HttpsError('failed-precondition', 'payment identity mismatch');
    }
    if (storedPlan !== input.expectedPlan) throw new HttpsError('failed-precondition', 'paid plan mismatch');

    const activationCode = text(order.activationCode, 64);
    let promo: Row | null = null;
    let canonicalRedeemedUid: string | null = null;
    if (activationCode) {
      const promoSnapshot = await tx.get(db.collection('promo_codes').doc(activationCode));
      promo = promoSnapshot.exists ? (promoSnapshot.data() ?? {}) : null;
      const redeemedBy = text(promo?.lastRedeemedBy, 160);
      if (redeemedBy) canonicalRedeemedUid = (await resolveCanonicalAdminAccessTarget(tx, db, redeemedBy)).uid;
    }

    const target = await resolveCanonicalAdminAccessTarget(tx, db, input.requestedUid);
    const activatedUserId = text(order.activatedUserId, 160);
    const canonicalActivatedUid = activatedUserId
      ? (await resolveCanonicalAdminAccessTarget(tx, db, activatedUserId)).uid
      : null;
    const decision = decideTelegramManualActivation({
      order,
      promo,
      requestedUid: input.requestedUid,
      canonicalRequestedUid: target.uid,
      canonicalRedeemedUid,
      canonicalActivatedUid,
    });

    if (decision.kind === 'already_redeemed') {
      return { ok: true, outcome: decision.kind, uid: decision.uid, requestedUid: decision.requestedUid, activationCode: decision.activationCode };
    }
    if (decision.kind === 'replayed') {
      return { ok: true, outcome: decision.kind, replayed: true, uid: decision.uid, requestedUid: decision.requestedUid, plan: decision.plan, expiresAtMs: decision.expiresAtMs };
    }

    const targetData = target.snapshot.data() ?? {};
    const [deletionTombstone, deletionJobs, stableIdLinks, legacyStableUidLinks] = await Promise.all([
      tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(target.uid)),
      tx.get(db.collection(ACCOUNT_DELETE_JOBS).where('stableUid', '==', target.uid).limit(1)),
      tx.get(db.collection('auth_links').where('stable_id', '==', target.uid)),
      tx.get(db.collection('auth_links').where('stableUid', '==', target.uid)),
    ]);
    const authLinksById = new Map<string, TelegramTargetAuthLinkEvidence>();
    for (const link of [...stableIdLinks.docs, ...legacyStableUidLinks.docs]) {
      authLinksById.set(link.id, { id: link.id, data: link.data() ?? {} });
    }
    const authAnchors = telegramTargetAuthAnchors(targetData, [...authLinksById.values()]);
    const authMarkerSnapshots = await Promise.all(authAnchors.map((authUid) => (
      tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid))
    )));
    assertTelegramTargetDeletionNotPending({
      tombstoneExists: deletionTombstone.exists,
      deletionJobs: deletionJobs.docs.map((snapshot) => snapshot.data() ?? {}),
      authMarkers: authMarkerSnapshots.map((snapshot, index) => ({
        authUid: authAnchors[index],
        exists: snapshot.exists,
      })),
    });

    const patch = buildTelegramManualVipPatch(targetData, decision.plan, nowMs);
    const orderBefore = {
      status: order.status ?? null,
      testerActivationStatus: order.testerActivationStatus ?? null,
      activatedUserId: order.activatedUserId ?? null,
      activatedPeriod: order.activatedPeriod ?? null,
      activatedUntil: order.activatedUntil ?? null,
    };
    const orderAfter = {
      status: 'vip_activated',
      testerActivationStatus: 'activated',
      activatedUserId: target.uid,
      activatedPeriod: decision.plan,
      activatedUntil: String(patch.expiresAtMs),
    };
    const audit = createAuditRecord({
      action: 'activate_telegram_premium_manual',
      actorUid: actor.actorUid,
      role: actor.role,
      entity: { collection: 'telegram_premium_orders', id: input.orderId },
      reason: `Paid Telegram order ${input.telegramPaymentChargeId}; canonical recipient ${target.uid}`,
      before: { order: orderBefore, userVip: patch.before },
      after: { order: orderAfter, userVip: patch.after },
      requestId: input.requestId,
      timestamp: new Date(nowMs).toISOString(),
    });

    tx.update(target.ref, { ...patch.updates, updatedAt: nowMs });
    writeAccessProjectionFromPatch(
      tx,
      target.ref,
      (target.snapshot.data()?.progress ?? {}) as Record<string, unknown>,
      patch.updates,
      nowMs,
    );
    tx.update(orderRef, { ...orderAfter, activatedAt: String(nowMs) });
    tx.create(auditRef, audit);
    return {
      ok: true,
      outcome: 'activated',
      replayed: false,
      uid: target.uid,
      requestedUid: input.requestedUid,
      plan: decision.plan,
      expiresAtMs: patch.expiresAtMs,
      auditId: auditRef.id,
    };
  });
});
