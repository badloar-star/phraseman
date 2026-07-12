import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  buildEmailPreviewPlan,
  emailCampaignCancellationTarget,
  parseEmailCampaignDraft,
  readEmailAudienceCandidates,
  selectEmailCampaignAudience,
} from './admin_email_campaigns';
import { assertMarketingEmailConfiguration, loadSuppressedEmails } from './email_unsubscribe';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const CANCELLATION_HOLD_MS = 5 * 60 * 1000;
const adminEmailFrom = defineString('ADMIN_EMAIL_FROM', { default: 'Phraseman <onboarding@resend.dev>' });
type Row = Record<string, unknown>;

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max = 500): string { return String(value ?? '').trim().slice(0, max); }

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const role = resolveAdminRole(record(request.auth?.token));
  if (!request.auth || !role) throw new HttpsError('permission-denied', 'Admin only');
  return role;
}

function required(data: Row) {
  const reason = clean(data.reason, 500);
  const requestId = clean(data.requestId, 160);
  const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  return { reason, requestId, idempotencyKey };
}

function assertReplay(operation: Row, actorUid: string, fingerprint: string): void {
  if (clean(operation.actorUid, 160) !== actorUid) throw new HttpsError('permission-denied', 'operation belongs to another actor');
  if (clean(operation.requestFingerprint, 500) !== fingerprint) throw new HttpsError('already-exists', 'idempotency conflict');
}

export const adminPreviewEmailCampaign = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot preview email campaigns');
    let draft;
    try { draft = parseEmailCampaignDraft(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_email_campaign'); }
    const db = admin.firestore();
    const nowMs = Date.now();
    const [candidates, suppressed] = await Promise.all([readEmailAudienceCandidates(db, nowMs), loadSuppressedEmails(db)]);
    const selection = selectEmailCampaignAudience(candidates, draft.audience, suppressed, nowMs);
    if (!selection.recipients.length) throw new HttpsError('failed-precondition', 'email audience is empty after exclusions');
    if (selection.recipients.length > 5_000) throw new HttpsError('resource-exhausted', 'email audience exceeds 5000 contacts');
    const previewRef = db.collection('admin_email_previews').doc();
    const plan = buildEmailPreviewPlan(previewRef.id, draft, selection, request.auth!.uid, nowMs);
    const batch = db.batch();
    batch.create(previewRef, plan.document);
    for (const shard of plan.shards) batch.create(previewRef.collection('recipient_shards').doc(shard.id), { contactIds: shard.contactIds, count: shard.count, createdAtMs: nowMs });
    await batch.commit();
    return plan.response;
  },
);

export const adminRequestEmailCampaignApproval = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot request email approval');
    const data = record(request.data);
    const fields = required(data);
    const previewId = clean(data.previewId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_email_previews').doc(previewId);
    const approvalRef = db.collection('admin_approval_requests').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ previewId, type: 'email_campaign' });
    return db.runTransaction(async (tx) => {
      const [previewSnap, operationSnap] = await Promise.all([tx.get(previewRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertReplay(operation, actorUid, fingerprint); return { ok: true, approvalId: clean(operation.approvalId, 160), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'email preview not found');
      const preview = previewSnap.data() ?? {};
      const previewExpiresAtMs = Number(preview.expiresAtMs || 0);
      if (preview.actorUid !== actorUid || previewExpiresAtMs <= Date.now() || Number(preview.consumedAtMs || 0) > 0) throw new HttpsError('failed-precondition', 'email preview expired, consumed or belongs to another actor');
      const nowMs = Date.now();
      const approval = {
        type: 'email_campaign', status: 'pending', previewId, requestedBy: actorUid, requestedAtMs: nowMs,
        expiresAtMs: Math.min(nowMs + APPROVAL_TTL_MS, previewExpiresAtMs), previewExpiresAtMs,
        reason: fields.reason, content: { subject: clean(preview.subject, 140), text: clean(preview.text, 6000) },
        audience: record(preview.audience), summary: record(preview.summary), recipientCount: Number(preview.recipientCount || 0),
      };
      const audit = createAuditRecord({ action: 'email_campaign.approval.request', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalRef.id }, reason: fields.reason, before: {}, after: approval, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.create(approvalRef, approval);
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, approvalId: approvalRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, approvalId: approvalRef.id, replayed: false };
    });
  },
);

export const adminApproveEmailCampaign = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.approve')) throw new HttpsError('permission-denied', 'Role cannot approve email campaigns');
    const data = record(request.data);
    const fields = required(data);
    const approvalId = clean(data.approvalId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const approvalRef = db.collection('admin_approval_requests').doc(approvalId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ approvalId, decision: 'approved' });
    return db.runTransaction(async (tx) => {
      const [approvalSnap, operationSnap] = await Promise.all([tx.get(approvalRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertReplay(operation, actorUid, fingerprint); return { ok: true, replayed: true }; }
      if (!approvalSnap.exists) throw new HttpsError('not-found', 'email approval not found');
      const before = approvalSnap.data() ?? {};
      if (before.type !== 'email_campaign' || before.status !== 'pending' || !clean(before.requestedBy, 160) || Number(before.expiresAtMs || 0) <= Date.now() || Number(before.previewExpiresAtMs || before.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'email approval is not pending');
      if (before.requestedBy === actorUid) throw new HttpsError('failed-precondition', 'second administrator must approve email campaign');
      const approvedAtMs = Date.now();
      const audit = createAuditRecord({ action: 'email_campaign.approval.approve', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalId }, reason: fields.reason, before, after: { ...before, status: 'approved', approvedBy: actorUid, approvedAtMs }, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.update(approvalRef, { status: 'approved', approvedBy: actorUid, approvedAtMs, approvalReason: fields.reason });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, approvalId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false };
    });
  },
);

export const adminCreateEmailCampaign = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.write')) throw new HttpsError('permission-denied', 'Role cannot create email campaigns');
    const data = record(request.data);
    const fields = required(data);
    const previewId = clean(data.previewId, 160);
    const approvalId = clean(data.approvalId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_email_previews').doc(previewId);
    const approvalRef = db.collection('admin_approval_requests').doc(approvalId);
    const campaignRef = db.collection('email_campaigns').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ previewId, approvalId });
    return db.runTransaction(async (tx) => {
      const [previewSnap, approvalSnap, operationSnap] = await Promise.all([tx.get(previewRef), tx.get(approvalRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertReplay(operation, actorUid, fingerprint); return { ok: true, campaignId: clean(operation.campaignId, 160), replayed: true }; }
      try { assertMarketingEmailConfiguration(adminEmailFrom.value()); } catch (error) {
        throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'email_configuration_invalid');
      }
      if (!previewSnap.exists || !approvalSnap.exists) throw new HttpsError('failed-precondition', 'preview and approval are required');
      const preview = previewSnap.data() ?? {};
      const approval = approvalSnap.data() ?? {};
      const requestedBy = clean(approval.requestedBy, 160);
      const approvedBy = clean(approval.approvedBy, 160);
      if (Number(preview.expiresAtMs || 0) <= Date.now() || Number(preview.consumedAtMs || 0) > 0) throw new HttpsError('failed-precondition', 'email preview expired or consumed');
      if (approval.type !== 'email_campaign' || approval.status !== 'approved' || approval.previewId !== previewId || requestedBy !== clean(preview.actorUid, 160) || !approvedBy || approvedBy === requestedBy || Number(approval.expiresAtMs || 0) <= Date.now() || Number(approval.expiresAtMs || 0) > Number(preview.expiresAtMs || 0)) throw new HttpsError('failed-precondition', 'email approval is invalid or expired');
      const nowMs = Date.now();
      const campaign = {
        status: 'queued_hold', previewId, approvalId, subject: clean(preview.subject, 140), text: clean(preview.text, 6000), audience: record(preview.audience), summary: record(preview.summary),
        recipientPreviewCount: Number(preview.recipientCount || 0), shardCount: Number(preview.shardCount || 0), holdUntilMs: nowMs + CANCELLATION_HOLD_MS,
        createdAtMs: nowMs, createdAt: new Date(nowMs).toISOString(), createdBy: clean(record(request.auth?.token).email, 160) || actorUid, createdByUid: actorUid, reason: fields.reason,
      };
      const audit = createAuditRecord({ action: 'email_campaign.create', actorUid, role, entity: { collection: 'email_campaigns', id: campaignRef.id }, reason: fields.reason, before: {}, after: { status: campaign.status, subject: campaign.subject, audience: campaign.audience, recipientPreviewCount: campaign.recipientPreviewCount, holdUntilMs: campaign.holdUntilMs }, requestId: fields.requestId, timestamp: campaign.createdAt });
      tx.create(campaignRef, campaign);
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, campaignId: campaignRef.id });
      tx.update(approvalRef, { status: 'consumed', consumedAtMs: nowMs, consumedBy: actorUid, campaignId: campaignRef.id });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, campaignId: campaignRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, campaignId: campaignRef.id, replayed: false, holdUntilMs: campaign.holdUntilMs };
    });
  },
);

export function projectEmailCampaign(id: string, data: Row) {
  return {
    id, status: clean(data.status, 40) || 'queued_hold', subject: clean(data.subject, 140), textPreview: clean(data.textPreview ?? data.text, 500),
    audience: record(data.audience), summary: record(data.summary), recipientPreviewCount: Number(data.recipientPreviewCount || 0), targetCount: Number(data.targetCount || 0),
    acceptedCount: Number(data.acceptedCount || 0), failedCount: Number(data.failedCount || 0), suppressedAtSendCount: Number(data.suppressedAtSendCount || 0),
    uncertainCount: Number(data.uncertainCount || 0), providerMetricLabel: clean(data.providerMetricLabel, 64) || 'accepted_by_provider',
    createdAtMs: Number(data.createdAtMs || 0), holdUntilMs: Number(data.holdUntilMs || 0), finishedAtMs: Number(data.finishedAtMs || 0), createdBy: clean(data.createdBy, 160),
    cancelable: emailCampaignCancellationTarget(data.status) !== null, error: clean(data.error, 300),
  };
}

export const adminListEmailCampaigns = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.read')) throw new HttpsError('permission-denied', 'Role cannot read email campaigns');
    const db = admin.firestore();
    const [campaignsSnap, approvalsSnap] = await Promise.all([
      db.collection('email_campaigns').orderBy('createdAtMs', 'desc').limit(100).get(),
      db.collection('admin_approval_requests').where('type', '==', 'email_campaign').orderBy('requestedAtMs', 'desc').limit(100).get(),
    ]);
    const campaigns = campaignsSnap.docs.map((doc) => projectEmailCampaign(doc.id, doc.data() as Row));
    const approvals = approvalsSnap.docs.map((doc) => {
      const data = doc.data() as Row;
      return { id: doc.id, type: 'email_campaign', status: clean(data.status, 32), previewId: clean(data.previewId, 160), requestedBy: clean(data.requestedBy, 160), requestedAtMs: Number(data.requestedAtMs || 0), expiresAtMs: Number(data.expiresAtMs || 0), previewExpiresAtMs: Number(data.previewExpiresAtMs || 0), reason: clean(data.reason, 500), content: record(data.content), audience: record(data.audience), summary: record(data.summary), recipientCount: Number(data.recipientCount || 0), approvedBy: clean(data.approvedBy, 160), approvalReason: clean(data.approvalReason, 500) };
    }).sort((a, b) => b.requestedAtMs - a.requestedAtMs);
    return { ok: true, campaigns, approvals, fetchedAtMs: Date.now() };
  },
);

export const adminCancelEmailCampaign = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.campaigns.cancel')) throw new HttpsError('permission-denied', 'Role cannot cancel email campaigns');
    const data = record(request.data);
    const fields = required(data);
    const campaignId = clean(data.campaignId ?? data.jobId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const campaignRef = db.collection('email_campaigns').doc(campaignId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ campaignId, action: 'cancel' });
    return db.runTransaction(async (tx) => {
      const [campaignSnap, operationSnap] = await Promise.all([tx.get(campaignRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertReplay(operation, actorUid, fingerprint); return { ok: true, replayed: true }; }
      if (!campaignSnap.exists) throw new HttpsError('not-found', 'email campaign not found');
      const before = campaignSnap.data() ?? {};
      const nextStatus = emailCampaignCancellationTarget(before.status);
      if (!nextStatus) throw new HttpsError('failed-precondition', 'email campaign cannot be cancelled');
      const nowMs = Date.now();
      const audit = createAuditRecord({ action: 'email_campaign.cancel', actorUid, role, entity: { collection: 'email_campaigns', id: campaignId }, reason: fields.reason, before: { status: before.status }, after: { status: nextStatus }, requestId: fields.requestId, timestamp: new Date().toISOString() });
      tx.update(campaignRef, { status: nextStatus, cancelRequestedAtMs: nowMs, cancelledBy: actorUid, cancelReason: fields.reason, updatedAtMs: nowMs });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint: fingerprint, campaignId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, status: nextStatus, replayed: false };
    });
  },
);
