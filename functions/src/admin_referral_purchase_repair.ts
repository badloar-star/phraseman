import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { applyReferralPairBonusInTransaction } from './friends_together';
import { isStorePremiumActive } from './premium_status';
import {
  attributionDeadlineMs,
  canQualifyAt,
  policyTimestampMs,
  referralRoulettePolicyFromData,
  type ReferralRoulettePolicy,
} from './referral_roulette_policy';

const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const ADMIN_COMMAND_OPERATIONS = 'admin_command_operations';
const ADMIN_LOG = 'admin_log';
const REPAIR_ACTION = 'referral.purchase.repair';
const REPAIR_OPERATION_PREFIX = 'referral_purchase_repair_';
const REPAIR_RESUME_LIMIT = 10;
const OPERATOR_REASON_MAX_BYTES = 500;
const COMMAND_TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;

export type AdminReferralPurchaseRepairInput = Readonly<{
  refereeStableId: string;
  reason: string;
  requestId: string;
  idempotencyKey: string;
}>;

export type ReferralPurchaseRepairOutcome =
  | 'qualified'
  | 'already_qualified'
  | 'not_eligible'
  | 'expired'
  | 'blocked'
  | 'revoked';

function isSafeBoundedDocumentId(value: string): boolean {
  return Boolean(value)
    && value !== '.'
    && value !== '..'
    && !value.includes('/')
    && Buffer.byteLength(value, 'utf8') <= 160;
}

export function normalizeAdminReferralPurchaseRepairInput(
  data: unknown,
): AdminReferralPurchaseRepairInput {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'referral purchase repair command required');
  }
  const row = data as Record<string, unknown>;
  const allowed = new Set(['refereeStableId', 'reason', 'requestId', 'idempotencyKey']);
  const refereeStableId = String(row.refereeStableId ?? '').trim();
  const reason = String(row.reason ?? '').trim();
  const requestId = String(row.requestId ?? '').trim();
  const idempotencyKey = String(row.idempotencyKey ?? '').trim();
  if (
    Object.keys(row).some((key) => !allowed.has(key))
    || !isSafeBoundedDocumentId(refereeStableId)
    || !reason
    || Buffer.byteLength(reason, 'utf8') > 500
    || !COMMAND_TOKEN_RE.test(requestId)
    || !COMMAND_TOKEN_RE.test(idempotencyKey)
    || idempotencyKey.length > 120
  ) {
    throw new HttpsError('invalid-argument', 'referral purchase repair command required');
  }
  return Object.freeze({ refereeStableId, reason, requestId, idempotencyKey });
}

export function normalizeAdminReferralRepairResumeInput(
  data: unknown,
): Readonly<{ operationId: string }> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'referral repair resume command required');
  }
  const row = data as Record<string, unknown>;
  const operationId = String(row.operationId ?? '').trim();
  if (Object.keys(row).some((key) => key !== 'operationId')
    || !operationId.startsWith(REPAIR_OPERATION_PREFIX)
    || !isSafeBoundedDocumentId(operationId)) {
    throw new HttpsError('invalid-argument', 'referral repair resume command required');
  }
  return Object.freeze({ operationId });
}

export function storedReferralRepairOperatorReason(
  operation: Readonly<Record<string, unknown>>,
): string {
  const reason = typeof operation.operatorReason === 'string' ? operation.operatorReason : '';
  if (!reason || reason !== reason.trim() || Buffer.byteLength(reason, 'utf8') > OPERATOR_REASON_MAX_BYTES) {
    throw new HttpsError('failed-precondition', 'REFERRAL_REPAIR_OPERATOR_REASON_INVALID');
  }
  return reason;
}

export function referralRepairFingerprint(
  input: AdminReferralPurchaseRepairInput,
): string {
  return JSON.stringify({ action: REPAIR_ACTION, refereeStableId: input.refereeStableId, reason: input.reason });
}

export function assertReferralRepairReplayIdentity(
  operation: FirebaseFirestore.DocumentData,
  actorUid: string,
  requestFingerprint: string,
): void {
  if (operation.actorUid !== actorUid || operation.requestFingerprint !== requestFingerprint) {
    throw new HttpsError('already-exists', 'idempotency key replay mismatch');
  }
}

function assertReferralRepairActor(operation: FirebaseFirestore.DocumentData, actorUid: string): void {
  if (operation.actorUid !== actorUid) {
    throw new HttpsError('permission-denied', 'REFERRAL_REPAIR_OPERATION_NOT_OWNED');
  }
}

export function evaluateReferralPurchaseRepair(input: Readonly<{
  attribution: Readonly<Record<string, unknown>> | null;
  refereeProgress: Record<string, unknown> | null | undefined;
  policy: ReferralRoulettePolicy;
  nowMs: number;
}>): Readonly<{ outcome: ReferralPurchaseRepairOutcome; referrerStableId?: string; deadlineAtMs?: number }> {
  if (!input.attribution) return { outcome: 'not_eligible' };
  const status = String(input.attribution.status ?? 'pending');
  if (status === 'qualified' || status === 'rewarded') return { outcome: 'already_qualified' };
  if (status === 'expired') return { outcome: 'expired' };
  if (status !== 'pending') return { outcome: 'not_eligible' };
  const referrerStableId = String(input.attribution.referrerStableId ?? '').trim();
  if (!isSafeBoundedDocumentId(referrerStableId)
    || referrerStableId === String(input.attribution.id ?? '')) return { outcome: 'not_eligible' };
  if (!isStorePremiumActive(input.refereeProgress, input.nowMs)) return { outcome: 'not_eligible' };
  if (input.policy.emergencyStop) return { outcome: 'blocked' };
  const createdAtMs = policyTimestampMs(input.attribution.createdAt)
    || policyTimestampMs(input.attribution.createdAtMs);
  const deadlineAtMs = attributionDeadlineMs(createdAtMs);
  if (!canQualifyAt(input.policy, createdAtMs, input.nowMs)) {
    return { outcome: 'expired', referrerStableId, deadlineAtMs };
  }
  return { outcome: 'qualified', referrerStableId, deadlineAtMs };
}

export function evaluateReferralRepairContinuation(input: Readonly<{
  operationId: string;
  refereeStableId: string;
  referrerStableId: string;
  qualifiedAtMs: number;
  attribution: Readonly<Record<string, unknown>> | null;
}>): 'qualified' | 'blocked' | 'revoked' {
  if (!input.attribution) return 'blocked';
  const status = String(input.attribution.status ?? '');
  if (status === 'revoked') return 'revoked';
  if (status !== 'qualified' && status !== 'rewarded') return 'blocked';
  if (String(input.attribution.referrerStableId ?? '') !== input.referrerStableId) return 'blocked';
  const marker = String(input.attribution.qualificationOperationId ?? '');
  if (marker) return marker === input.operationId ? 'qualified' : 'blocked';
  return String(input.attribution.qualifiedBy ?? '') === 'premium_purchase'
    && policyTimestampMs(input.attribution.qualifiedAtMs) === input.qualifiedAtMs
    ? 'qualified'
    : 'blocked';
}

export type ReferralRepairReceipt = Readonly<{
  ok: true;
  outcome: ReferralPurchaseRepairOutcome;
  operationId: string;
  auditId: string;
}>;

type ReferralRepairPhase =
  | Readonly<{ phase: 'completed'; result: ReferralRepairReceipt; replayed: boolean }>
  | Readonly<{ phase: 'qualification_committed'; refereeStableId: string; referrerStableId: string; nowMs: number }>;

export async function continueAdminReferralPurchaseRepair(input: Readonly<{
  reserve: () => Promise<ReferralRepairPhase>;
  finalize: (phase: Extract<ReferralRepairPhase, { phase: 'qualification_committed' }>) => Promise<ReferralRepairReceipt & Readonly<{ replayed: boolean }>>;
}>): Promise<ReferralRepairReceipt & Readonly<{ replayed: boolean }>> {
  const phase = await input.reserve();
  if (phase.phase === 'completed') return { ...phase.result, replayed: phase.replayed };
  return input.finalize(phase);
}

function storedOperationResult(data: FirebaseFirestore.DocumentData | undefined): ReferralRepairReceipt {
  const result = data?.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new HttpsError('failed-precondition', 'REFERRAL_REPAIR_RECEIPT_INVALID');
  }
  return result as ReferralRepairReceipt;
}

export function assertAdminReferralRepairAccess(auth: unknown): 'owner' {
  if (!auth || typeof auth !== 'object') throw new HttpsError('unauthenticated', 'Auth required');
  const verified = auth as { uid?: unknown; token?: unknown };
  if (typeof verified.uid !== 'string' || !verified.uid.trim()) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const role = roleFromAdminToken(verified.token);
  if (role !== 'owner' || !hasPermission(role, 'money.manual_access.write')) {
    throw new HttpsError('permission-denied', 'OWNER_MANUAL_ACCESS_REQUIRED');
  }
  return role;
}

export async function listPendingReferralPurchaseRepairOperations(
  db: admin.firestore.Firestore,
  actorUid: string,
): Promise<Readonly<{
  rows: ReadonlyArray<{ operationId: string; refereeStableId: string; createdAtMs: number }>;
  truncated: boolean;
}>> {
  const snapshot = await db.collection(ADMIN_COMMAND_OPERATIONS)
    .where('action', '==', REPAIR_ACTION)
    .where('actorUid', '==', actorUid)
    .where('phase', '==', 'qualification_committed')
    .orderBy('createdAtMs', 'desc')
    .limit(REPAIR_RESUME_LIMIT + 1)
    .get();
  return Object.freeze({
    rows: snapshot.docs.slice(0, REPAIR_RESUME_LIMIT).map((doc) => {
      const data = doc.data();
      return Object.freeze({
        operationId: doc.id,
        refereeStableId: String(data.refereeStableId ?? ''),
        createdAtMs: Math.max(0, Number(data.createdAtMs) || 0),
      });
    }),
    truncated: snapshot.docs.length > REPAIR_RESUME_LIMIT,
  });
}

async function finalizeReferralRepairOperation(input: Readonly<{
  db: admin.firestore.Firestore;
  operationRef: admin.firestore.DocumentReference;
  actorUid: string;
  role: 'owner';
}>): Promise<ReferralRepairReceipt & Readonly<{ replayed: boolean }>> {
  const { db, operationRef, actorUid, role } = input;
  return db.runTransaction(async (tx) => {
    const operationSnapshot = await tx.get(operationRef);
    if (!operationSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'REFERRAL_REPAIR_OPERATION_MISSING');
    }
    const operation = operationSnapshot.data() ?? {};
    assertReferralRepairActor(operation, actorUid);
    if (operation.phase === 'completed') return { ...storedOperationResult(operation), replayed: true };
    if (operation.phase !== 'qualification_committed'
      || !isSafeBoundedDocumentId(String(operation.refereeStableId ?? ''))
      || !isSafeBoundedDocumentId(String(operation.referrerStableId ?? ''))
      || !isSafeBoundedDocumentId(String(operation.finalAuditId ?? ''))
      || !COMMAND_TOKEN_RE.test(String(operation.requestId ?? ''))) {
      throw new HttpsError('failed-precondition', 'REFERRAL_REPAIR_OPERATION_INVALID');
    }

    const refereeStableId = String(operation.refereeStableId);
    const referrerStableId = String(operation.referrerStableId);
    const qualifiedAtMs = Math.max(0, Number(operation.qualifiedAtMs) || 0);
    const attributionRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(refereeStableId);
    const attributionSnapshot = await tx.get(attributionRef);
    const continuation = evaluateReferralRepairContinuation({
      operationId: operationRef.id,
      refereeStableId,
      referrerStableId,
      qualifiedAtMs,
      attribution: attributionSnapshot.exists ? attributionSnapshot.data() ?? {} : null,
    });
    if (continuation === 'qualified') {
      await applyReferralPairBonusInTransaction(db, tx, referrerStableId, refereeStableId, qualifiedAtMs);
    }

    const completedAtMs = Date.now();
    const auditId = String(operation.finalAuditId);
    const result: ReferralRepairReceipt = {
      ok: true,
      outcome: continuation,
      operationId: operationRef.id,
      auditId,
    };
    const audit = createAuditRecord({
      action: 'referral.purchase.repair.complete',
      actorUid,
      role,
      entity: { collection: ADMIN_COMMAND_OPERATIONS, id: operationRef.id },
      reason: storedReferralRepairOperatorReason(operation),
      before: { phase: 'qualification_committed' },
      after: { phase: 'completed', outcome: continuation },
      requestId: String(operation.requestId),
      timestamp: new Date(completedAtMs).toISOString(),
    });
    tx.create(db.collection(ADMIN_LOG).doc(auditId), { ...audit, operationId: operationRef.id });
    if (continuation === 'qualified') {
      tx.set(attributionRef, {
        repairCompletedOperationId: operationRef.id,
        repairCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        repairCompletedAtMs: completedAtMs,
      }, { merge: true });
    }
    tx.set(operationRef, {
      phase: 'completed',
      result,
      completionOutcome: continuation,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAtMs,
    }, { merge: true });
    return { ...result, replayed: false };
  });
}

export const adminRepairPendingReferralPurchase = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  await requireAdminAppCheck(request);
  const role = assertAdminReferralRepairAccess(request.auth);
  const input = normalizeAdminReferralPurchaseRepairInput(request.data);
  const actorUid = request.auth!.uid;
  const db = admin.firestore();
  const attributionRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(input.refereeStableId);
  const userRef = db.collection(USERS).doc(input.refereeStableId);
  const configRef = db.collection('remote_config').doc('app');
  const operationRef = db.collection(ADMIN_COMMAND_OPERATIONS)
    .doc(`${REPAIR_OPERATION_PREFIX}${input.idempotencyKey}`);
  const phaseAuditRef = db.collection(ADMIN_LOG).doc();
  const finalAuditRef = db.collection(ADMIN_LOG).doc();
  const nowMs = Date.now();
  const requestFingerprint = referralRepairFingerprint(input);

  const reserve = async (): Promise<ReferralRepairPhase> => db.runTransaction(async (tx) => {
    const operationSnapshot = await tx.get(operationRef);
    if (operationSnapshot.exists) {
      const operation = operationSnapshot.data() ?? {};
      assertReferralRepairReplayIdentity(operation, actorUid, requestFingerprint);
      if (operation.phase === 'completed') {
        return { phase: 'completed', result: storedOperationResult(operation), replayed: true };
      }
      if (operation.phase === 'qualification_committed'
        && operation.refereeStableId === input.refereeStableId
        && typeof operation.referrerStableId === 'string') {
        return {
          phase: 'qualification_committed',
          refereeStableId: input.refereeStableId,
          referrerStableId: operation.referrerStableId,
          nowMs: Number(operation.qualifiedAtMs) || nowMs,
        };
      }
      throw new HttpsError('failed-precondition', 'REFERRAL_REPAIR_OPERATION_INVALID');
    }

    const [attributionSnapshot, userSnapshot, configSnapshot] = await Promise.all([
      tx.get(attributionRef),
      tx.get(userRef),
      tx.get(configRef),
    ]);
    const attribution = attributionSnapshot.exists ? attributionSnapshot.data() ?? {} : null;
    const progress = (userSnapshot.data() as { progress?: Record<string, unknown> } | undefined)?.progress;
    const policy = referralRoulettePolicyFromData(
      configSnapshot.data() as { numbers?: Record<string, unknown> } | undefined,
    );
    const decision = evaluateReferralPurchaseRepair({
      attribution: attribution ? { id: input.refereeStableId, ...attribution } : null,
      refereeProgress: progress,
      policy,
      nowMs,
    });

    if (decision.outcome === 'qualified' && decision.referrerStableId) {
      tx.set(attributionRef, {
        status: 'qualified',
        qualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        qualifiedAtMs: nowMs,
        qualifiedBy: 'premium_purchase',
        qualificationOperationId: operationRef.id,
        deadlineAtMs: decision.deadlineAtMs ?? 0,
        rewardKind: 'referrer_spin',
      }, { merge: true });
      const phaseAudit = createAuditRecord({
        action: 'referral.purchase.repair.phase',
        actorUid,
        role,
        entity: { collection: ADMIN_COMMAND_OPERATIONS, id: operationRef.id },
        reason: input.reason,
        before: { phase: 'absent' },
        after: { phase: 'qualification_committed', pairEffectPending: true },
        requestId: input.requestId,
        timestamp: new Date(nowMs).toISOString(),
      });
      tx.create(phaseAuditRef, { ...phaseAudit, operationId: operationRef.id });
      tx.create(operationRef, {
        action: REPAIR_ACTION,
        phase: 'qualification_committed',
        actorUid,
        requestFingerprint,
        refereeStableId: input.refereeStableId,
        referrerStableId: decision.referrerStableId,
        requestId: input.requestId,
        operatorReason: input.reason,
        phaseAuditId: phaseAuditRef.id,
        finalAuditId: finalAuditRef.id,
        qualifiedAtMs: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
      });
      return { phase: 'qualification_committed', refereeStableId: input.refereeStableId, referrerStableId: decision.referrerStableId, nowMs };
    }

    if (decision.outcome === 'expired' && attributionSnapshot.exists
      && String(attribution?.status ?? 'pending') === 'pending') {
      tx.set(attributionRef, {
        status: 'expired',
        deadlineAtMs: decision.deadlineAtMs ?? 0,
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredAtMs: nowMs,
        expiryReason: 'qualification_deadline',
      }, { merge: true });
    }
    const auditId = finalAuditRef.id;
    const result: ReferralRepairReceipt = { ok: true, outcome: decision.outcome, operationId: operationRef.id, auditId };
    const audit = createAuditRecord({
      action: REPAIR_ACTION,
      actorUid,
      role,
      entity: { collection: ADMIN_COMMAND_OPERATIONS, id: operationRef.id },
      reason: input.reason,
      before: { phase: 'absent' },
      after: { phase: 'completed', outcome: decision.outcome },
      requestId: input.requestId,
      timestamp: new Date(nowMs).toISOString(),
    });
    tx.create(finalAuditRef, { ...audit, operationId: operationRef.id, operatorReasonPresent: true });
    tx.create(operationRef, {
      action: REPAIR_ACTION,
      phase: 'completed',
      actorUid,
      requestFingerprint,
      refereeStableId: input.refereeStableId,
      requestId: input.requestId,
      operatorReason: input.reason,
      auditId,
      finalAuditId: auditId,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAtMs: nowMs,
    });
    return { phase: 'completed', result, replayed: false };
  });

  return continueAdminReferralPurchaseRepair({
    reserve,
    finalize: async () => finalizeReferralRepairOperation({ db, operationRef, actorUid, role }),
  });
});

export const adminResumePendingReferralPurchaseRepair = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    await requireAdminAppCheck(request);
    const role = assertAdminReferralRepairAccess(request.auth);
    const input = normalizeAdminReferralRepairResumeInput(request.data);
    const db = admin.firestore();
    return finalizeReferralRepairOperation({
      db,
      operationRef: db.collection(ADMIN_COMMAND_OPERATIONS).doc(input.operationId),
      actorUid: request.auth!.uid,
      role,
    });
  },
);
