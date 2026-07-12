import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { cacheDocumentFingerprint } from './admin_cache_control';
import { ENFORCE_APP_CHECK } from './callable_options';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const REMOTE_CONFIG_ID = 'app';
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
type Row = Record<string, unknown>;

export const COMPASS_BOOL_DEFAULTS = Object.freeze({
  compass_enabled: true,
  compass_ai_voice_enabled: true,
  compass_deep_dive_enabled: true,
  compass_lesson_invite_enabled: true,
  compass_economy_enabled: true,
  compass_retention_enabled: true,
  compass_topic_map_enabled: true,
});

export const COMPASS_TEXT_DEFAULTS = Object.freeze({
  compass_voice_fallback_ru: '',
  compass_voice_fallback_uk: '',
  compass_voice_fallback_es: '',
});

export type CompassBoolKey = keyof typeof COMPASS_BOOL_DEFAULTS;
export type CompassTextKey = keyof typeof COMPASS_TEXT_DEFAULTS;
export interface CompassPatch { bools?: Partial<Record<CompassBoolKey, boolean>>; texts?: Partial<Record<CompassTextKey, string>> }

const BOOL_KEYS = new Set(Object.keys(COMPASS_BOOL_DEFAULTS));
const TEXT_KEYS = new Set(Object.keys(COMPASS_TEXT_DEFAULTS));
const EMERGENCY_KEYS = new Set<CompassBoolKey>(['compass_enabled', 'compass_ai_voice_enabled']);

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max = 500): string { return String(value ?? '').trim().slice(0, max); }

export function parseCompassPatch(value: unknown): CompassPatch {
  const raw = record(value);
  const unknownBranches = Object.keys(raw).filter((key) => key !== 'bools' && key !== 'texts');
  if (unknownBranches.length) throw new Error('unsupported_compass_branch');
  const patch: CompassPatch = {};
  if ('bools' in raw) {
    const bools = record(raw.bools);
    const next: Partial<Record<CompassBoolKey, boolean>> = {};
    for (const [key, item] of Object.entries(bools)) {
      if (!BOOL_KEYS.has(key)) throw new Error('unsupported_compass_key');
      if (typeof item !== 'boolean') throw new Error('invalid_compass_boolean');
      next[key as CompassBoolKey] = item;
    }
    if (Object.keys(next).length) patch.bools = next;
  }
  if ('texts' in raw) {
    const texts = record(raw.texts);
    const next: Partial<Record<CompassTextKey, string>> = {};
    for (const [key, item] of Object.entries(texts)) {
      if (!TEXT_KEYS.has(key)) throw new Error('unsupported_compass_key');
      if (typeof item !== 'string') throw new Error('invalid_compass_text');
      if (item.length > 500) throw new Error('compass_fallback_too_long');
      next[key as CompassTextKey] = item;
    }
    if (Object.keys(next).length) patch.texts = next;
  }
  if (!patch.bools && !patch.texts) throw new Error('empty_compass_patch');
  return patch;
}

export function compassPatchIsEmergencyOff(patch: CompassPatch): boolean {
  if (patch.texts && Object.keys(patch.texts).length) return false;
  const entries = Object.entries(patch.bools || {}) as Array<[CompassBoolKey, boolean]>;
  return entries.length > 0 && entries.every(([key, value]) => EMERGENCY_KEYS.has(key) && value === false);
}

export function buildCompassWorkspaceConfig(value: unknown) {
  const config = record(value);
  const configuredBools = record(config.bools);
  const configuredTexts = record(config.texts);
  const bools = Object.fromEntries((Object.entries(COMPASS_BOOL_DEFAULTS) as Array<[CompassBoolKey, boolean]>).map(([key, defaultValue]) => {
    const configured = typeof configuredBools[key] === 'boolean' ? configuredBools[key] as boolean : null;
    return [key, { configured, effective: configured ?? defaultValue, defaultValue }];
  })) as Record<CompassBoolKey, { configured: boolean | null; effective: boolean; defaultValue: boolean }>;
  const texts = Object.fromEntries((Object.entries(COMPASS_TEXT_DEFAULTS) as Array<[CompassTextKey, string]>).map(([key, defaultValue]) => {
    const configured = typeof configuredTexts[key] === 'string' ? String(configuredTexts[key]).slice(0, 500) : null;
    const effective = configured ?? defaultValue;
    return [key, { configured, effective, usesBuiltIn: !effective }];
  })) as Record<CompassTextKey, { configured: string | null; effective: string; usesBuiltIn: boolean }>;
  const revision = Number(config.revision || 0);
  return { revision: Number.isInteger(revision) && revision >= 0 ? revision : 0, bools, texts };
}

export function protectedCompassChanges(beforeValue: unknown, patchValue: unknown): string[] {
  const before = record(beforeValue);
  const patch = record(patchValue);
  const changed: string[] = [];
  for (const [branch, keys] of [['bools', BOOL_KEYS], ['texts', TEXT_KEYS]] as const) {
    const beforeBranch = record(before[branch]);
    const patchBranch = record(patch[branch]);
    for (const [key, value] of Object.entries(patchBranch)) {
      if (keys.has(key) && beforeBranch[key] !== value) changed.push(`${branch}.${key}`);
    }
  }
  return changed.sort();
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const role = resolveAdminRole(record(request.auth?.token));
  if (!request.auth || !role) throw new HttpsError('permission-denied', 'Admin only');
  return role;
}

function mutationFields(data: Row): { reason: string; requestId: string; idempotencyKey: string } {
  const reason = clean(data.reason, 500);
  const requestId = clean(data.requestId, 160);
  const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  return { reason, requestId, idempotencyKey };
}

function parsePatchOrHttps(value: unknown): CompassPatch {
  try { return parseCompassPatch(value); } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_compass_patch');
  }
}

function exactCompassValues(configValue: unknown) {
  const workspace = buildCompassWorkspaceConfig(configValue);
  return {
    bools: Object.fromEntries(Object.entries(workspace.bools).map(([key, value]) => [key, value.effective])),
    texts: Object.fromEntries(Object.entries(workspace.texts).map(([key, value]) => [key, value.configured ?? ''])),
  };
}

function applyCompassPatch(configValue: unknown, patch: CompassPatch): Row {
  const config = record(configValue);
  const bools = { ...record(config.bools), ...(patch.bools || {}) };
  const texts = { ...record(config.texts), ...(patch.texts || {}) };
  return { ...config, bools, texts };
}

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const result = await query.count().get();
  return Number(result.data().count || 0);
}

async function compassAnalytics(db: FirebaseFirestore.Firestore, rangeDays: number, nowMs: number) {
  const cache = db.collection('compass_briefings');
  const billing = db.collection('compass_billing').where('createdAtMs', '>=', nowMs - rangeDays * 24 * 60 * 60 * 1000);
  const [cacheTotal, ready, pending, rejected, attempts, published, rejectedAttempts] = await Promise.all([
    countQuery(cache), countQuery(cache.where('status', '==', 'ready')), countQuery(cache.where('status', '==', 'pending')), countQuery(cache.where('status', '==', 'rejected')),
    countQuery(billing), countQuery(billing.where('published', '==', true)), countQuery(billing.where('published', '==', false)),
  ]);
  return {
    rangeDays,
    cache: { total: cacheTotal, ready, pending, rejected, other: Math.max(0, cacheTotal - ready - pending - rejected) },
    billing: { attempts, published, rejected: rejectedAttempts },
    cacheHitRate: null,
    cacheHitNote: 'True cache-hit rate is unavailable because cache hits are not logged.',
  };
}

export const adminGetCompassWorkspace = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.compass.read')) throw new HttpsError('permission-denied', 'Role cannot read Compass workspace');
    const rangeDays = [7, 28, 90].includes(Number(record(request.data).rangeDays)) ? Number(record(request.data).rangeDays) : 28;
    const db = admin.firestore();
    const nowMs = Date.now();
    const [configSnap, analytics, approvalsSnap] = await Promise.all([
      db.collection('remote_config').doc(REMOTE_CONFIG_ID).get(),
      compassAnalytics(db, rangeDays, nowMs),
      db.collection('admin_approval_requests').where('type', '==', 'compass_config').orderBy('requestedAtMs', 'desc').limit(50).get(),
    ]);
    const config = configSnap.data() || {};
    const approvals = approvalsSnap.docs.map((doc) => {
      const value = doc.data() as Row;
      return {
        id: doc.id, type: 'compass_config', status: clean(value.status, 32), previewId: clean(value.previewId, 160),
        requestedBy: clean(value.requestedBy, 160), requestedAtMs: Number(value.requestedAtMs || 0), expiresAtMs: Number(value.expiresAtMs || 0), previewExpiresAtMs: Number(value.previewExpiresAtMs || 0),
        revision: Number(value.revision || 0), patch: record(value.patch), before: record(value.before), after: record(value.after), fingerprint: clean(value.fingerprint, 64), confirmation: clean(value.confirmation, 160), reason: clean(value.reason, 500), previewRequestId: clean(value.previewRequestId, 160),
        risk: clean(value.risk, 500), rollbackPath: clean(value.rollbackPath, 500),
        approvedBy: clean(value.approvedBy, 160), approvalReason: clean(value.approvalReason, 500),
      };
    });
    return { ok: true, config: buildCompassWorkspaceConfig(config), analytics, approvals, fetchedAtMs: nowMs };
  },
);

export const adminPreviewCompassChange = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.compass.write')) throw new HttpsError('permission-denied', 'Role cannot change Compass');
    const data = record(request.data);
    const reason = clean(data.reason, 500);
    const requestId = clean(data.requestId, 160);
    const expectedRevision = Number(data.expectedRevision);
    if (!reason || !requestId || !Number.isInteger(expectedRevision) || expectedRevision < 0) throw new HttpsError('invalid-argument', 'reason, requestId and expectedRevision are required');
    const patch = parsePatchOrHttps(data.patch);
    const db = admin.firestore();
    const configSnap = await db.collection('remote_config').doc(REMOTE_CONFIG_ID).get();
    const config = configSnap.data() || {};
    const revision = Number(config.revision || 0);
    if (revision !== expectedRevision) throw new HttpsError('failed-precondition', 'remote config changed; reload before preview');
    const before = exactCompassValues(config);
    const after = exactCompassValues(applyCompassPatch(config, patch));
    const nowMs = Date.now();
    const requiresApproval = !compassPatchIsEmergencyOff(patch);
    const risk = requiresApproval
      ? 'Changes live Compass behavior or content. Incorrect values can affect active learners.'
      : 'Emergency-off only. Users may temporarily lose Compass or AI voice functionality.';
    const rollbackPath = 'Restore the previous Compass values from the remote_config_history record created by apply.';
    const fingerprint = cacheDocumentFingerprint({ revision, patch, before, after, reason, requestId, risk, rollbackPath });
    const confirmation = `COMPASS/${revision}/${fingerprint.slice(0, 12)}`;
    const previewRef = db.collection('admin_compass_previews').doc();
    const preview = {
      type: 'compass_config', actorUid: request.auth!.uid, revision, patch, before, after, fingerprint,
      confirmation, requiresApproval, reason, requestId, risk, rollbackPath, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS,
    };
    await previewRef.create(preview);
    return { ok: true, previewId: previewRef.id, revision, patch, before, after, fingerprint, confirmation, requiresApproval, reason, requestId, risk, rollbackPath, createdAtMs: nowMs, expiresAtMs: preview.expiresAtMs };
  },
);

function assertOperationReplay(operation: Row, actorUid: string, requestFingerprint: string): void {
  if (operation.actorUid !== actorUid || operation.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency conflict');
}

export const adminRequestCompassApproval = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.compass.write')) throw new HttpsError('permission-denied', 'Role cannot request Compass approval');
    const data = record(request.data);
    const fields = mutationFields(data);
    const previewId = clean(data.previewId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_compass_previews').doc(previewId);
    const approvalRef = db.collection('admin_approval_requests').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = cacheDocumentFingerprint({ type: 'compass_config', previewId });
    return db.runTransaction(async (tx) => {
      const [previewSnap, operationSnap] = await Promise.all([tx.get(previewRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() || {};
        assertOperationReplay(previous, actorUid, requestFingerprint);
        return { ok: true, approvalId: clean(previous.approvalId, 160), replayed: true };
      }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'Compass preview not found');
      const preview = previewSnap.data() || {};
      if (preview.actorUid !== actorUid || preview.requiresApproval !== true || Number(preview.expiresAtMs || 0) <= Date.now() || Number(preview.consumedAtMs || 0) > 0) throw new HttpsError('failed-precondition', 'Compass preview is not eligible for approval');
      if (fields.reason !== clean(preview.reason, 500)) throw new HttpsError('failed-precondition', 'Compass approval request reason must match preview');
      const nowMs = Date.now();
      const approval = {
        type: 'compass_config', status: 'pending', previewId, requestedBy: actorUid, requestedAtMs: nowMs,
        expiresAtMs: Math.min(Number(preview.expiresAtMs), nowMs + APPROVAL_TTL_MS), previewExpiresAtMs: Number(preview.expiresAtMs),
        revision: Number(preview.revision), patch: record(preview.patch), before: record(preview.before), after: record(preview.after),
        fingerprint: clean(preview.fingerprint, 64), confirmation: clean(preview.confirmation, 160), reason: clean(preview.reason, 500), previewRequestId: clean(preview.requestId, 160),
        risk: clean(preview.risk, 500), rollbackPath: clean(preview.rollbackPath, 500),
      };
      const audit = createAuditRecord({ action: 'compass_config.approval.request', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalRef.id }, reason: clean(preview.reason, 500), before: {}, after: approval, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.create(approvalRef, approval);
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, approvalId: approvalRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, approvalId: approvalRef.id, replayed: false };
    });
  },
);

export const adminApproveCompassChange = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.compass.approve')) throw new HttpsError('permission-denied', 'Role cannot approve Compass changes');
    const data = record(request.data);
    const fields = mutationFields(data);
    const approvalId = clean(data.approvalId, 160);
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const approvalRef = db.collection('admin_approval_requests').doc(approvalId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = cacheDocumentFingerprint({ approvalId, decision: 'approved' });
    return db.runTransaction(async (tx) => {
      const [approvalSnap, operationSnap] = await Promise.all([tx.get(approvalRef), tx.get(operationRef)]);
      if (operationSnap.exists) { const previous = operationSnap.data() || {}; assertOperationReplay(previous, actorUid, requestFingerprint); return { ok: true, replayed: true }; }
      if (!approvalSnap.exists) throw new HttpsError('not-found', 'Compass approval not found');
      const approval = approvalSnap.data() || {};
      if (approval.type !== 'compass_config' || approval.status !== 'pending' || approval.requestedBy === actorUid || Number(approval.expiresAtMs || 0) <= Date.now() || Number(approval.previewExpiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'Compass approval is not pending or requires another administrator');
      const nowMs = Date.now();
      const audit = createAuditRecord({ action: 'compass_config.approval.approve', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalId }, reason: fields.reason, before: approval, after: { ...approval, status: 'approved', approvedBy: actorUid, approvedAtMs: nowMs }, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.update(approvalRef, { status: 'approved', approvedBy: actorUid, approvedAtMs: nowMs, approvalReason: fields.reason });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, approvalId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false };
    });
  },
);

export const adminApplyCompassChange = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'application.compass.write')) throw new HttpsError('permission-denied', 'Role cannot apply Compass changes');
    const data = record(request.data);
    const fields = mutationFields(data);
    const previewId = clean(data.previewId, 160);
    const approvalId = clean(data.approvalId, 160);
    const confirmation = clean(data.confirmation, 160);
    if (!previewId || !confirmation) throw new HttpsError('invalid-argument', 'previewId and confirmation are required');
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const previewRef = db.collection('admin_compass_previews').doc(previewId);
    const configRef = db.collection('remote_config').doc(REMOTE_CONFIG_ID);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('remote_config_history').doc();
    const requestFingerprint = cacheDocumentFingerprint({ previewId, approvalId, confirmation });
    return db.runTransaction(async (tx) => {
      const [operationSnap, previewSnap, configSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef), tx.get(configRef)]);
      if (operationSnap.exists) { const previous = operationSnap.data() || {}; assertOperationReplay(previous, actorUid, requestFingerprint); return { ok: true, revision: Number(previous.revision || 0), replayed: true }; }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'Compass preview not found');
      const preview = previewSnap.data() || {};
      if (preview.type !== 'compass_config' || preview.actorUid !== actorUid || Number(preview.expiresAtMs || 0) <= Date.now() || Number(preview.consumedAtMs || 0) > 0 || preview.confirmation !== confirmation) throw new HttpsError('failed-precondition', 'Compass preview expired, consumed, mismatched or belongs to another actor');
      if (fields.reason !== clean(preview.reason, 500)) throw new HttpsError('failed-precondition', 'Compass apply reason must match preview');
      const config = configSnap.data() || {};
      const revision = Number(config.revision || 0);
      if (revision !== Number(preview.revision)) throw new HttpsError('failed-precondition', 'remote config changed after Compass preview');
      if (cacheDocumentFingerprint({ revision, patch: preview.patch, before: preview.before, after: preview.after, reason: preview.reason, requestId: preview.requestId, risk: preview.risk, rollbackPath: preview.rollbackPath }) !== preview.fingerprint) throw new HttpsError('failed-precondition', 'Compass preview fingerprint mismatch');
      const requiresApproval = preview.requiresApproval === true;
      let approvalRef: FirebaseFirestore.DocumentReference | null = null;
      let approval: Row = {};
      if (requiresApproval) {
        if (!approvalId) throw new HttpsError('failed-precondition', 'second administrator approval required');
        approvalRef = db.collection('admin_approval_requests').doc(approvalId);
        const approvalSnap = await tx.get(approvalRef);
        if (!approvalSnap.exists) throw new HttpsError('failed-precondition', 'Compass approval not found');
        approval = approvalSnap.data() || {};
        const approvalFingerprint = cacheDocumentFingerprint({ revision: approval.revision, patch: approval.patch, before: approval.before, after: approval.after, reason: approval.reason, requestId: approval.previewRequestId, risk: approval.risk, rollbackPath: approval.rollbackPath });
        if (approval.type !== 'compass_config' || approval.status !== 'approved' || approval.previewId !== previewId || approval.requestedBy !== actorUid || !approval.approvedBy || approval.approvedBy === actorUid || approval.fingerprint !== preview.fingerprint || approvalFingerprint !== preview.fingerprint || Number(approval.expiresAtMs || 0) <= Date.now() || Number(approval.previewExpiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'Compass approval is invalid or expired');
      }
      const patch = parsePatchOrHttps(preview.patch);
      if (!requiresApproval && !compassPatchIsEmergencyOff(patch)) throw new HttpsError('failed-precondition', 'Compass preview approval policy mismatch');
      const nextRevision = revision + 1;
      const afterConfig = { ...applyCompassPatch(config, patch), revision: nextRevision, updatedBy: actorUid };
      const nowMs = Date.now();
      const audit = createAuditRecord({ action: 'compass_config.apply', actorUid, role, entity: { collection: 'remote_config', id: REMOTE_CONFIG_ID }, reason: clean(preview.reason, 500), before: record(preview.before), after: record(preview.after), rollbackReference: historyRef.id, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.set(configRef, { ...afterConfig, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: fields.idempotencyKey });
      if (approvalRef) tx.update(approvalRef, { status: 'consumed', consumedAtMs: nowMs, consumedBy: actorUid });
      tx.create(historyRef, { ...audit, operationId: fields.idempotencyKey, revision: nextRevision, scope: 'compass' });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, revision: nextRevision, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, revision: nextRevision, replayed: false };
    });
  },
);
