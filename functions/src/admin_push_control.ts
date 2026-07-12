import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { normalizeAdminPushJob, readTargetUsers, type AdminPushJob } from './admin_push_jobs';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const PREVIEW_TTL_MS = 15 * 60 * 1000;
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const MASS_MODES = new Set(['segment', 'reactivate', 'scheduled']);
const ALLOWED_SCHEDULED_AUDIENCES = new Set(['all', 'premium', 'free', 'inactive7']);

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
}

function clean(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const token = record(request.auth?.token);
  if (token.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(token);
  if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
  return role;
}

function requireFields(data: Row): { reason: string; idempotencyKey: string; requestId: string } {
  const reason = clean(data.reason, 500);
  const idempotencyKey = clean(data.idempotencyKey, 160);
  const requestId = clean(data.requestId, 160);
  if (!reason || !idempotencyKey || !requestId) throw new HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
  return { reason, idempotencyKey, requestId };
}

export function parsePushPreviewRequest(value: unknown): AdminPushJob {
  const raw = record(value);
  let job: AdminPushJob;
  try { job = normalizeAdminPushJob('preview', raw); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid push campaign'); }
  if (job.mode === 'scheduled') {
    if (!ALLOWED_SCHEDULED_AUDIENCES.has(job.audience || 'all')) throw new HttpsError('invalid-argument', 'unsupported scheduled audience');
    if (!job.scheduledAtMs || job.scheduledAtMs <= Date.now()) throw new HttpsError('invalid-argument', 'scheduledAt must be in the future');
  }
  return Object.freeze(job);
}

export function pushJobCanBeCancelled(status: unknown): boolean {
  return status === 'pending' || status === 'scheduled';
}

function jobPayload(job: AdminPushJob): Row {
  return {
    mode: job.mode,
    notification: job.notification,
    ...(job.action ? { action: job.action } : {}),
    ...(job.uid ? { uid: job.uid } : {}),
    ...(job.segment ? { segment: job.segment } : {}),
    ...(job.reactivation ? { reactivation: job.reactivation } : {}),
    ...(job.scheduledAtMs ? { scheduledAt: new Date(job.scheduledAtMs).toISOString(), scheduledAtMs: job.scheduledAtMs } : {}),
    ...(job.audience ? { audience: job.audience } : {}),
  };
}

function jobSummary(job: AdminPushJob): Row {
  return { mode: job.mode, title: job.notification.title, body: job.notification.body, action: job.action || '', uid: job.uid || '', segment: job.segment || null, reactivation: job.reactivation || null, scheduledAtMs: job.scheduledAtMs || 0, audience: job.audience || '' };
}

function assertOperationActor(operation: Row, actorUid: string): void {
  if (clean(operation.actorUid, 160) && clean(operation.actorUid, 160) !== actorUid) throw new HttpsError('permission-denied', 'admin operation belongs to another actor');
}

export const adminPreviewPushAudience = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.read')) throw new HttpsError('permission-denied', 'Role cannot preview campaigns');
    const job = parsePushPreviewRequest(request.data);
    const nowMs = Date.now();
    const targets = await readTargetUsers(admin.firestore(), job, nowMs);
    if (!targets.length) throw new HttpsError('failed-precondition', 'push audience is empty');
    const previewRef = admin.firestore().collection('admin_push_previews').doc();
    const expiresAtMs = nowMs + (MASS_MODES.has(job.mode) ? APPROVAL_TTL_MS : PREVIEW_TTL_MS);
    await previewRef.create({ actorUid: request.auth!.uid, job: jobPayload(job), audienceCount: targets.length, createdAtMs: nowMs, expiresAtMs });
    return { ok: true, previewId: previewRef.id, summary: jobSummary(job), audienceCount: targets.length, generatedAtMs: nowMs, expiresAtMs, requiresApproval: MASS_MODES.has(job.mode), scheduledAudienceRecomputedAtSend: job.mode === 'scheduled' };
  },
);

export const adminRequestPushApproval = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot request campaign approval');
    const data = record(request.data);
    const previewId = clean(data.previewId, 160);
    const fields = requireFields(data);
    const db = admin.firestore();
    const previewRef = db.collection('admin_push_previews').doc(previewId);
    const approvalRef = db.collection('admin_approval_requests').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const actorUid = request.auth!.uid;
    const fingerprint = JSON.stringify({ previewId, kind: 'push_campaign' });
    return db.runTransaction(async (tx) => {
      const [previewSnap, operationSnap] = await Promise.all([tx.get(previewRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const op = operationSnap.data() ?? {}; assertOperationActor(op, actorUid); if (op.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotency conflict'); return { ok: true, approvalId: clean(op.approvalId, 160), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'push preview not found');
      const preview = previewSnap.data() ?? {};
      if (preview.actorUid !== actorUid || Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'push preview expired or belongs to another actor');
      const job = parsePushPreviewRequest(preview.job);
      if (!MASS_MODES.has(job.mode)) throw new HttpsError('failed-precondition', 'UID push does not require approval');
      const nowMs = Date.now();
      const previewExpiresAtMs = Number(preview.expiresAtMs || 0);
      const approval = { type: 'push_campaign', status: 'pending', previewId, requestedBy: actorUid, requestedAtMs: nowMs, expiresAtMs: Math.min(nowMs + APPROVAL_TTL_MS, previewExpiresAtMs), previewExpiresAtMs, reason: fields.reason, summary: jobSummary(job), audienceCount: Number(preview.audienceCount || 0) };
      const audit = createAuditRecord({ action: 'push_approval.request', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalRef.id }, reason: fields.reason, before: {}, after: approval, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.create(approvalRef, approval);
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, approvalId: approvalRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, approvalId: approvalRef.id, replayed: false };
    });
  },
);

export const adminApprovePushCampaign = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot approve campaigns');
    const data = record(request.data);
    const approvalId = clean(data.approvalId, 160);
    const fields = requireFields(data);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const approvalRef = db.collection('admin_approval_requests').doc(approvalId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ approvalId, decision: 'approved' });
    return db.runTransaction(async (tx) => {
      const [approvalSnap, operationSnap] = await Promise.all([tx.get(approvalRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const op = operationSnap.data() ?? {}; assertOperationActor(op, actorUid); if (op.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotency conflict'); return { ok: true, replayed: true }; }
      if (!approvalSnap.exists) throw new HttpsError('not-found', 'approval request not found');
      const before = approvalSnap.data() ?? {};
      if (before.type !== 'push_campaign' || !clean(before.requestedBy, 160) || before.status !== 'pending' || Number(before.expiresAtMs || 0) <= Date.now() || Number(before.previewExpiresAtMs || before.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'approval is not pending');
      if (before.requestedBy === actorUid) throw new HttpsError('failed-precondition', 'second administrator must approve mass push');
      const after = { ...before, status: 'approved', approvedBy: actorUid, approvedAtMs: Date.now(), approvalReason: fields.reason };
      const audit = createAuditRecord({ action: 'push_approval.approve', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalId }, reason: fields.reason, before, after, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.update(approvalRef, { status: 'approved', approvedBy: actorUid, approvedAtMs: after.approvedAtMs, approvalReason: fields.reason });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, approvalId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false };
    });
  },
);

export const adminCreatePushJob = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot create push jobs');
    const data = record(request.data);
    const previewId = clean(data.previewId, 160);
    const approvalId = clean(data.approvalId, 160);
    const fields = requireFields(data);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_push_previews').doc(previewId);
    const approvalRef = approvalId ? db.collection('admin_approval_requests').doc(approvalId) : null;
    const jobRef = db.collection('admin_push_jobs').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ previewId, approvalId });
    return db.runTransaction(async (tx) => {
      const reads = [tx.get(previewRef), tx.get(operationRef), ...(approvalRef ? [tx.get(approvalRef)] : [])];
      const [previewSnap, operationSnap, approvalSnap] = await Promise.all(reads);
      if (operationSnap.exists) { const op = operationSnap.data() ?? {}; assertOperationActor(op, actorUid); if (op.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotency conflict'); return { ok: true, jobId: clean(op.jobId, 160), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'push preview not found');
      const preview = previewSnap.data() ?? {};
      if (Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'push preview expired');
      const job = parsePushPreviewRequest(preview.job);
      if (!MASS_MODES.has(job.mode) && preview.actorUid !== actorUid) throw new HttpsError('permission-denied', 'UID preview belongs to another actor');
      if (Number(preview.consumedAtMs || 0) > 0 || clean(preview.jobId, 160)) throw new HttpsError('failed-precondition', 'push preview already consumed');
      if (MASS_MODES.has(job.mode)) {
        if (!approvalSnap?.exists) throw new HttpsError('failed-precondition', 'approved request required for mass push');
        const approval = approvalSnap.data() ?? {};
        const requestedBy = clean(approval.requestedBy, 160);
        const approvedBy = clean(approval.approvedBy, 160);
        if (approval.type !== 'push_campaign' || approval.status !== 'approved' || approval.previewId !== previewId || requestedBy !== clean(preview.actorUid, 160) || !approvedBy || approvedBy === requestedBy || Number(approval.expiresAtMs || 0) <= Date.now() || Number(approval.expiresAtMs || 0) > Number(preview.expiresAtMs || 0)) throw new HttpsError('failed-precondition', 'approval is invalid or expired');
      }
      const nowMs = Date.now();
      const createdAt = new Date(nowMs).toISOString();
      const payload = { ...jobPayload(job), status: 'pending', createdAt, createdAtMs: nowMs, createdBy: clean(record(request.auth?.token).email, 160) || actorUid, createdByUid: actorUid, reason: fields.reason, previewId, audiencePreviewCount: Number(preview.audienceCount || 0), ...(approvalId ? { approvalId } : {}) };
      const audit = createAuditRecord({ action: 'push_job.create', actorUid, role, entity: { collection: 'admin_push_jobs', id: jobRef.id }, reason: fields.reason, before: {}, after: { ...jobSummary(job), audienceCount: payload.audiencePreviewCount }, requestId: fields.requestId, timestamp: createdAt });
      tx.create(jobRef, payload);
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, jobId: jobRef.id });
      if (approvalRef) tx.update(approvalRef, { status: 'consumed', consumedAtMs: nowMs, consumedBy: actorUid, jobId: jobRef.id });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, jobId: jobRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, jobId: jobRef.id, replayed: false };
    });
  },
);

export const adminListPushJobs = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.read')) throw new HttpsError('permission-denied', 'Role cannot read campaigns');
    const db = admin.firestore();
    const [jobsSnap, approvalsSnap] = await Promise.all([
      db.collection('admin_push_jobs').orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('admin_approval_requests').where('type', '==', 'push_campaign').limit(100).get(),
    ]);
    const jobs = jobsSnap.docs.map((doc) => projectPushJob(doc.id, doc.data()));
    const approvals = approvalsSnap.docs.map((doc): Row & { id: string } => ({ id: doc.id, ...(doc.data() as Row) })).sort((a, b) => Number(b.requestedAtMs || 0) - Number(a.requestedAtMs || 0));
    return { ok: true, jobs, approvals, fetchedAtMs: Date.now() };
  },
);

export function projectPushJob(id: string, data: Row): Row {
  return { id, mode: clean(data.mode, 32), notification: record(data.notification), action: clean(data.action, 160), uid: clean(data.uid, 160), segment: record(data.segment), reactivation: record(data.reactivation), scheduledAtMs: Number(data.scheduledAtMs || 0), scheduledAt: clean(data.scheduledAt, 80), audience: clean(data.audience, 32), status: clean(data.status, 32) || 'pending', createdAt: clean(data.createdAt, 80), createdAtMs: Number(data.createdAtMs || 0), createdBy: clean(data.createdBy, 160), audiencePreviewCount: Number(data.audiencePreviewCount || 0), targetCount: Number(data.targetCount || 0), sentCount: Number(data.sentCount || 0), failedCount: Number(data.failedCount || 0), error: clean(data.error, 300), cancelable: pushJobCanBeCancelled(data.status) };
}

export const adminCancelPushJob = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot cancel push jobs');
    const data = record(request.data);
    const jobId = clean(data.jobId, 160);
    const fields = requireFields(data);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const jobRef = db.collection('admin_push_jobs').doc(jobId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ jobId, action: 'cancel' });
    return db.runTransaction(async (tx) => {
      const [jobSnap, operationSnap] = await Promise.all([tx.get(jobRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const op = operationSnap.data() ?? {}; assertOperationActor(op, actorUid); if (op.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotency conflict'); return { ok: true, replayed: true }; }
      if (!jobSnap.exists) throw new HttpsError('not-found', 'push job not found');
      const before = jobSnap.data() ?? {};
      if (!pushJobCanBeCancelled(before.status)) throw new HttpsError('failed-precondition', 'push job already started or finished');
      const after = { ...before, status: 'cancelled', cancelledAtMs: Date.now(), cancelledBy: actorUid, cancelReason: fields.reason };
      const audit = createAuditRecord({ action: 'push_job.cancel', actorUid, role, entity: { collection: 'admin_push_jobs', id: jobId }, reason: fields.reason, before: { status: before.status }, after: { status: 'cancelled' }, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.update(jobRef, { status: 'cancelled', cancelledAtMs: after.cancelledAtMs, cancelledBy: actorUid, cancelReason: fields.reason, updatedAtMs: Date.now() });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, jobId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false };
    });
  },
);
