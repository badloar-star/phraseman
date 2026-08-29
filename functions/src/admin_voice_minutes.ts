/**
 * Protected individual voice-minute grants from the live admin user drawer.
 *
 * The callable never edits a wallet balance directly. It appends one immutable,
 * idempotent admin event and lets the shared voice-minute domain rebuild the
 * wallet projection in the same Firestore transaction.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { resolveCanonicalAdminAccessTarget } from './admin_access_controls';
import { requireAdminUserOperationActor } from './admin_user_operations';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  appendVoiceMinuteEventInTransaction,
  createVoiceMinuteAdminGrantEvent,
} from './voice_minutes';

type Row = Record<string, unknown>;
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const MIN_GRANT_MINUTES = 1;
const MAX_GRANT_MINUTES = 10_000;

export interface AdminVoiceMinuteGrantInput {
  readonly uid: string;
  readonly minutes: number;
  readonly reason: string;
  readonly comment: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeAdminVoiceMinuteGrantInput(data: unknown): AdminVoiceMinuteGrantInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'voice-minute grant command required');
  const uid = boundedText(data.uid, 161);
  const minutes = data.minutes;
  const reason = boundedText(data.reason, 500);
  const comment = boundedText(data.comment, 200);
  const idempotencyKey = boundedText(data.idempotencyKey, 161);
  const requestId = boundedText(data.requestId, 161);

  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes)
    || minutes < MIN_GRANT_MINUTES || minutes > MAX_GRANT_MINUTES) {
    throw new HttpsError(
      'invalid-argument',
      `minutes must be an integer from ${MIN_GRANT_MINUTES} to ${MAX_GRANT_MINUTES}`,
    );
  }
  if (!reason) throw new HttpsError('invalid-argument', 'reason is required');
  if (!TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'idempotencyKey and requestId are required');
  }
  return Object.freeze({ uid, minutes, reason, comment, idempotencyKey, requestId });
}

export function adminVoiceMinuteGrantFingerprint(input: AdminVoiceMinuteGrantInput): string {
  return JSON.stringify({
    action: 'grant_voice_minutes',
    uid: input.uid,
    minutes: input.minutes,
    reason: input.reason,
    comment: input.comment,
  });
}

export function assertAdminVoiceMinuteGrantReplay(
  operation: Readonly<Row>,
  fingerprint: string,
  actorUid: string,
): void {
  if (operation.action !== 'grant_voice_minutes') {
    throw new HttpsError('already-exists', 'idempotencyKey belongs to another admin action');
  }
  if (operation.requestFingerprint !== fingerprint) {
    throw new HttpsError('already-exists', 'idempotencyKey reused for another voice-minute grant');
  }
  if (operation.actorUid !== actorUid) {
    throw new HttpsError('permission-denied', 'admin operation belongs to another actor');
  }
}

export const adminGrantVoiceMinutes = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireAdminUserOperationActor(
      request as { auth?: { uid?: string; token?: Row } | null },
      'money.manual_access.write',
    );
    const input = normalizeAdminVoiceMinuteGrantInput(request.data);
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations')
      .doc(`voice_minutes_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = adminVoiceMinuteGrantFingerprint(input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertAdminVoiceMinuteGrantReplay(operation, fingerprint, actor.actorUid);
        return { ...(record(operation.result) ? operation.result : {}), replayed: true };
      }

      const target = await resolveCanonicalAdminAccessTarget(tx, db, input.uid);
      const event = createVoiceMinuteAdminGrantEvent({
        sourceId: operationRef.id,
        ownerStableId: target.uid,
        grantedMinutes: input.minutes,
        occurredAtMs: nowMs,
        actorUid: actor.actorUid,
        requestId: input.requestId,
        reason: input.reason,
        comment: input.comment,
      });
      const appended = await appendVoiceMinuteEventInTransaction(tx, db, event);
      if (!appended.applied) {
        throw new HttpsError('already-exists', 'voice-minute grant event exists without operation receipt');
      }
      const beforeSeconds = Math.max(0, appended.wallet.availableSeconds - event.seconds);
      const audit = createAuditRecord({
        action: 'grant_voice_minutes',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: 'users', id: target.uid },
        reason: input.reason,
        before: { availableVoiceSeconds: beforeSeconds },
        after: {
          availableVoiceSeconds: appended.wallet.availableSeconds,
          grantedMinutes: input.minutes,
          grantedSeconds: event.seconds,
          eventId: event.eventId,
          comment: input.comment || null,
        },
        rollbackReference: null,
        requestId: input.requestId,
        timestamp: nowIso,
      });
      const result = {
        ok: true,
        uid: target.uid,
        requestedUid: input.uid,
        minutes: input.minutes,
        seconds: event.seconds,
        availableSeconds: appended.wallet.availableSeconds,
        eventId: event.eventId,
        auditId: auditRef.id,
        operationId: operationRef.id,
      };

      tx.create(auditRef, { ...audit, operationId: operationRef.id });
      tx.create(operationRef, {
        operationId: operationRef.id,
        action: 'grant_voice_minutes',
        requestFingerprint: fingerprint,
        actorUid: actor.actorUid,
        actorEmail: actor.actorEmail,
        targetUid: target.uid,
        auditId: auditRef.id,
        eventId: event.eventId,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ...result, replayed: false };
    });
  },
);
