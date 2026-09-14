import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, ENFORCE_APP_CHECK, requireAdminAppCheck } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { createAuditRecord } from './admin/audit_contract';
import { assertAdminUserOperationReplay, requireAdminUserOperationActor } from './admin_user_operations';
import { enqueueAdminAlert } from './admin_alert_outbox';

const REGION = 'us-central1';
const IDEAS_COLLECTION = 'user_ideas';
const REPORTS_SUBCOLLECTION = 'idea_reports';
const REPORT_RATE_COLLECTION = 'user_idea_report_rate_limits';
const REPORT_RATE_WINDOW_MS = 60 * 60 * 1000;
const REPORT_RATE_MAX = 30;
const AUTO_HIDE_REPORT_COUNT = 3;
const PUBLIC_STATUSES = ['published', 'approved', 'in_progress', 'implemented'] as const;
const REPORT_REASONS = ['inappropriate', 'spam', 'personal_data', 'other'] as const;

type Row = Record<string, unknown>;
type ReportReason = typeof REPORT_REASONS[number];

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numeric(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function reportReason(value: unknown): ReportReason {
  const parsed = text(value, 40) as ReportReason;
  if (!REPORT_REASONS.includes(parsed)) throw new HttpsError('invalid-argument', 'invalid_report_reason');
  return parsed;
}

function safeIdeaId(value: unknown): string {
  const id = text(value, 180);
  if (!id || id.includes('/') || id === '.' || id === '..') throw new HttpsError('invalid-argument', 'ideaId_required');
  return id;
}

function reportReceiptId(stableUid: string): string {
  return createHash('sha256').update(`idea-report-v1\0${stableUid}`, 'utf8').digest('hex').slice(0, 48);
}

function ideaReportRateId(stableUid: string): string {
  return createHash('sha256').update(`idea-report-rate-v1\0${stableUid}`, 'utf8').digest('hex').slice(0, 48);
}

function publicStatus(value: unknown): string {
  const status = text(value, 30);
  return PUBLIC_STATUSES.includes(status as (typeof PUBLIC_STATUSES)[number]) ? status : '';
}

/**
 * A report is a server-owned receipt. The same stable user can report an idea
 * only once per moderation cycle; retries return the same count without
 * inflating the threshold.
 */
export const reportUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const ideaId = safeIdeaId(request.data?.ideaId);
    const reason = reportReason(request.data?.reason);
    const db = admin.firestore();
    const reporterUid = await resolveStableUidForAuth(db, request.auth.uid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const reportRef = ideaRef.collection(REPORTS_SUBCOLLECTION).doc(reportReceiptId(reporterUid));
    const rateRef = db.collection(REPORT_RATE_COLLECTION).doc(ideaReportRateId(reporterUid));
    const now = Date.now();

    return db.runTransaction(async (tx) => {
      const [ideaSnap, existingReportSnap, rateSnap] = await Promise.all([
        tx.get(ideaRef),
        tx.get(reportRef),
        tx.get(rateRef),
      ]);
      if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = ideaSnap.data() || {};
      const status = publicStatus(idea.status);
      if (!status) throw new HttpsError('not-found', 'idea_not_found');
      const authorUid = text(idea.uid, 180);
      if (!authorUid) throw new HttpsError('failed-precondition', 'idea_missing_author');
      if (authorUid === reporterUid) throw new HttpsError('failed-precondition', 'cannot_report_own_idea');

      const resetAtMs = numeric(idea.reportsResetAtMs);
      const existingReport = existingReportSnap.data() || {};
      const alreadyReported = existingReportSnap.exists && numeric(existingReport.lastReportedAtMs) >= resetAtMs;
      const currentCount = Math.max(0, Math.floor(numeric(idea.reportCount)));
      if (alreadyReported) {
        return { ok: true, ideaId, reportCount: currentCount, alreadyReported: true, autoHidden: status === 'deleted' };
      }

      const rate = rateSnap.data() || {};
      const windowStartMs = numeric(rate.windowStartMs);
      const sameWindow = now - windowStartMs < REPORT_RATE_WINDOW_MS;
      const count = sameWindow ? Math.max(0, Math.floor(numeric(rate.count))) : 0;
      if (count >= REPORT_RATE_MAX) throw new HttpsError('resource-exhausted', 'rate_limited');

      const nextCount = currentCount + 1;
      const shouldAutoHide = nextCount >= AUTO_HIDE_REPORT_COUNT;
      const reportPayload = {
        ideaId,
        authorUid,
        reporterUid,
        reason,
        lastReportedAtMs: now,
        createdAtMs: numeric(existingReport.createdAtMs, now) || now,
        updatedAtMs: now,
        status: 'open',
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.set(reportRef, reportPayload, { merge: true });
      tx.set(rateRef, {
        stableUid: reporterUid,
        windowStartMs: sameWindow ? windowStartMs : now,
        count: count + 1,
        updatedAtMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.update(ideaRef, {
        reportCount: nextCount,
        lastReportReason: reason,
        lastReportedAtMs: now,
        moderationStatus: shouldAutoHide ? 'auto_hidden' : 'flagged',
        ...(shouldAutoHide
          ? {
            status: 'deleted',
            moderationPreviousStatus: status,
            autoHiddenAtMs: now,
            autoHiddenReason: 'three_unique_reports',
          }
          : {}),
        updatedAtMs: now,
      });
      return { ok: true, ideaId, reportCount: nextCount, autoHidden: shouldAutoHide };
    });
  },
);

type AdminIdeaReportRestoreInput = Readonly<{
  ideaId: string;
  reason: string;
  requestId: string;
  idempotencyKey: string;
}>;

function parseAdminRestoreInput(data: unknown): AdminIdeaReportRestoreInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'admin command required');
  const ideaId = safeIdeaId(data.ideaId);
  const reason = text(data.reason, 600);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId) || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  }
  return Object.freeze({ ideaId, reason, requestId, idempotencyKey });
}

/** Restore an auto-hidden idea and start a fresh report cycle. */
export const adminRestoreUserIdea = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const input = parseAdminRestoreInput(request.data);
    const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'ideas.decide');
    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(input.ideaId);
    const operationRef = db.collection('admin_command_operations').doc(`idea_restore_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = JSON.stringify({ action: 'restore_user_idea', ...input });
    const now = Date.now();
    return db.runTransaction(async (tx) => {
      const [operationSnap, ideaSnap] = await Promise.all([tx.get(operationRef), tx.get(ideaRef)]);
      if (operationSnap.exists) {
        const operation = operationSnap.data() || {};
        assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
        return { ...(record(operation.result) ? operation.result : {}), replayed: true };
      }
      if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = ideaSnap.data() || {};
      const status = text(idea.status, 30);
      const previousStatus = publicStatus(idea.moderationPreviousStatus) || 'published';
      if (status !== 'deleted' || numeric(idea.reportCount) < 1) {
        throw new HttpsError('failed-precondition', 'idea_is_not_flagged');
      }
      const audit = createAuditRecord({
        action: 'restore_user_idea',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: IDEAS_COLLECTION, id: input.ideaId },
        reason: input.reason,
        before: { status, reportCount: numeric(idea.reportCount), moderationStatus: text(idea.moderationStatus, 40) },
        after: { status: previousStatus, reportCount: 0, moderationStatus: 'restored' },
        requestId: input.requestId,
        timestamp: new Date(now).toISOString(),
      });
      tx.update(ideaRef, {
        status: previousStatus,
        reportCount: 0,
        reportsResetAtMs: now,
        moderationStatus: 'restored',
        moderationResolvedAtMs: now,
        moderationResolvedBy: actor.actorUid,
        moderationPreviousStatus: null,
        updatedAtMs: now,
      });
      const result = { ok: true, ideaId: input.ideaId, status: previousStatus, reportCount: 0, auditId: auditRef.id };
      tx.create(auditRef, { ...audit, operationId: operationRef.id });
      tx.create(operationRef, {
        action: 'restore_user_idea',
        requestFingerprint,
        actorUid: actor.actorUid,
        auditId: auditRef.id,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    });
  },
);

type AdminIdeaRestrictionInput = Readonly<{
  uid: string;
  blocked: boolean;
  reason: string;
  requestId: string;
  idempotencyKey: string;
}>;

function parseAdminRestrictionInput(data: unknown): AdminIdeaRestrictionInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'admin command required');
  const uid = text(data.uid, 160);
  const reason = text(data.reason, 600);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!/^[A-Za-z0-9._-]{2,160}$/.test(uid) || typeof data.blocked !== 'boolean'
    || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId) || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'invalid idea submission restriction');
  }
  return Object.freeze({ uid, blocked: data.blocked, reason, requestId, idempotencyKey });
}

/** Audited admin switch used by the ideas moderation panel. */
export const adminSetIdeaSubmissionRestriction = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const input = parseAdminRestrictionInput(request.data);
    const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'community.moderate');
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(`idea_restriction_${input.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = JSON.stringify({ action: 'set_idea_submission_restriction', ...input });
    const now = Date.now();
    return db.runTransaction(async (tx) => {
      const [operationSnap, userSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef)]);
      if (operationSnap.exists) {
        const operation = operationSnap.data() || {};
        assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
        return { ...(record(operation.result) ? operation.result : {}), replayed: true };
      }
      if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
      const beforeBlocked = userSnap.data()?.ideaSubmissionBlocked === true;
      const audit = createAuditRecord({
        action: input.blocked ? 'restrict_idea_submission' : 'restore_idea_submission',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: 'users', id: input.uid },
        reason: input.reason,
        before: { blocked: beforeBlocked },
        after: { blocked: input.blocked },
        requestId: input.requestId,
        timestamp: new Date(now).toISOString(),
      });
      tx.update(userRef, {
        ideaSubmissionBlocked: input.blocked,
        ideaSubmissionRestrictionReason: input.blocked ? input.reason : null,
        ideaSubmissionBlockedAtMs: input.blocked ? now : null,
        ideaSubmissionBlockedBy: input.blocked ? actor.actorUid : null,
        updatedAt: now,
      });
      const result = { ok: true, uid: input.uid, blocked: input.blocked, auditId: auditRef.id };
      tx.create(auditRef, { ...audit, operationId: operationRef.id });
      tx.create(operationRef, {
        action: 'set_idea_submission_restriction',
        requestFingerprint,
        actorUid: actor.actorUid,
        auditId: auditRef.id,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return result;
    });
  },
);

export async function sendUserIdeaReportTelegramAlert(input: {
  readonly ideaId: string;
  readonly reportId: string;
  readonly occurredAtMs: number;
  readonly title: unknown;
  readonly reason: unknown;
  readonly reportCount: unknown;
  readonly autoHidden: boolean;
}): Promise<boolean> {
  const result = await enqueueAdminAlert(admin.firestore(), {
    eventType: 'ideaOrCommunityReport',
    source: 'idea.report',
    sourceId: `${input.ideaId}:${input.reportId}`,
    occurredAtMs: input.occurredAtMs,
    payload: {
      category: String(input.reason ?? '').trim(),
      count: Math.max(0, Math.floor(numeric(input.reportCount))),
      status: input.autoHidden ? 'auto_hidden' : 'flagged',
      route: '#ideas',
    },
  });
  return result.created;
}

/** Queue durably; the dispatcher enriches the owner's message with report context. */
export const adminAlertOnUserIdeaReport = onDocumentCreated(
  { document: `${IDEAS_COLLECTION}/{ideaId}/${REPORTS_SUBCOLLECTION}/{reportId}`, region: REGION, retry: true },
  async (event) => {
    const report = event.data?.data() || {};
    const ideaId = text(event.params.ideaId, 180);
    if (!ideaId) return;
    const ideaSnap = await admin.firestore().collection(IDEAS_COLLECTION).doc(ideaId).get();
    const idea = ideaSnap?.data() || {};
    await sendUserIdeaReportTelegramAlert({
      ideaId,
      reportId: text(event.params.reportId, 180),
      occurredAtMs: numeric(report.createdAtMs, Date.now()),
      title: idea.title || 'Без названия',
      reason: report.reason || 'не указана',
      reportCount: idea.reportCount,
      autoHidden: text(idea.moderationStatus, 40) === 'auto_hidden',
    });
  },
);
