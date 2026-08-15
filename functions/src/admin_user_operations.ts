import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { type AdminPermission, hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { isAllowedReportTransition } from './admin_reports_center';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';

type Row = Record<string, unknown>;
type CommandMeta = Readonly<{ reason: string; requestId: string; idempotencyKey: string }>;
type Actor = Readonly<{ actorUid: string; actorEmail: string; role: AdminRole }>;

const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const PROFILE_FIELDS = ['user_name', 'user_total_xp', 'streak_count'] as const;
const RESET_TYPES = ['achievements'] as const;
const REPORT_ACTIONS = ['warn', 'rename', 'ban', 'status'] as const;
const MAX_MIGRATION_UIDS = 200;

type ProfileField = typeof PROFILE_FIELDS[number];
type ResetType = typeof RESET_TYPES[number];
type ReportAction = typeof REPORT_ACTIONS[number];

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseUid(value: unknown, label = 'uid'): string {
  const uid = text(value, 161);
  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', `${label} is invalid`);
  return uid;
}

function parseMeta(data: Row): CommandMeta {
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 161);
  const idempotencyKey = text(data.idempotencyKey, 161);
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  }
  return Object.freeze({ reason, requestId, idempotencyKey });
}

function inputRecord(data: unknown): Row {
  if (!record(data)) throw new HttpsError('invalid-argument', 'admin command required');
  return data;
}

export function requireAdminUserOperationActor(
  request: { auth?: { uid?: string; token?: Row } | null },
  permission: AdminPermission,
): Actor {
  const actorUid = text(request.auth?.uid, 160);
  const token = request.auth?.token;
  const role: AdminRole = token && hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!actorUid || token?.admin !== true || !hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', 'Admin permission required');
  }
  return Object.freeze({ actorUid, actorEmail: text(token.email, 320) || actorUid, role });
}

export function assertAdminUserOperationReplay(operation: Row, fingerprint: string, actorUid: string): void {
  if (operation.requestFingerprint !== fingerprint || operation.actorUid !== actorUid) {
    throw new HttpsError('already-exists', 'idempotency key replay mismatch');
  }
}

function operationResult(operation: Row): Row {
  return record(operation.result) ? operation.result : {};
}

export interface AdminProfileFieldCommand extends CommandMeta {
  readonly uid: string;
  readonly field: ProfileField;
  readonly value: string | number;
}

export function normalizeAdminProfileFieldCommand(data: unknown): AdminProfileFieldCommand {
  const input = inputRecord(data);
  const uid = parseUid(input.uid);
  const field = text(input.field, 40) as ProfileField;
  if (!(PROFILE_FIELDS as readonly string[]).includes(field)) throw new HttpsError('invalid-argument', 'profile field is not allowlisted');
  let value: string | number;
  if (field === 'user_name') {
    value = text(input.value, 80);
    if (!value) throw new HttpsError('invalid-argument', 'user name is required');
  } else {
    const parsed = typeof input.value === 'number' ? input.value : Number(input.value);
    const maximum = field === 'user_total_xp' ? 1_000_000_000 : 100_000;
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) throw new HttpsError('invalid-argument', 'profile number is out of range');
    value = parsed;
  }
  return Object.freeze({ uid, field, value, ...parseMeta(input) });
}

export interface AdminWarningCommand extends CommandMeta {
  readonly uid: string;
  readonly name: string;
  readonly message: string;
}

export function normalizeAdminWarningCommand(data: unknown): AdminWarningCommand {
  const input = inputRecord(data);
  const uid = parseUid(input.uid);
  const name = text(input.name, 80);
  const message = text(input.message, 1000);
  if (!message) throw new HttpsError('invalid-argument', 'warning message is required');
  return Object.freeze({ uid, name, message, ...parseMeta(input) });
}

export interface AdminReportModerationCommand extends CommandMeta {
  readonly uid: string;
  readonly reportId: string;
  readonly expectedStatus: string;
  readonly action: ReportAction;
  readonly nextStatus: string;
  readonly name: string;
  readonly message: string;
  readonly newName: string;
}

export function normalizeAdminReportModerationCommand(data: unknown): AdminReportModerationCommand {
  const input = inputRecord(data);
  const reportId = text(input.reportId, 161);
  const expectedStatus = text(input.expectedStatus, 40).toLowerCase();
  const action = text(input.action, 20) as ReportAction;
  if (!TOKEN_RE.test(reportId) || !expectedStatus || !(REPORT_ACTIONS as readonly string[]).includes(action)) {
    throw new HttpsError('invalid-argument', 'report moderation command is invalid');
  }
  const uid = action === 'status' ? text(input.uid, 160) : parseUid(input.uid);
  const name = text(input.name, 80);
  const message = text(input.message, 1000);
  const newName = text(input.newName, 80);
  const nextStatus = action === 'ban'
    ? 'banned'
    : action === 'status'
      ? text(input.nextStatus, 40).toLowerCase()
      : 'reviewed';
  if (action === 'warn' && !message) throw new HttpsError('invalid-argument', 'warning message is required');
  if (action === 'rename' && !newName) throw new HttpsError('invalid-argument', 'newName is required');
  if (action === 'status' && !isAllowedReportTransition('user_reports', expectedStatus, nextStatus)) {
    throw new HttpsError('invalid-argument', 'report status transition is not allowed');
  }
  if (action !== 'status' && !['new', 'reviewed'].includes(expectedStatus)) {
    throw new HttpsError('invalid-argument', 'report action requires an active report');
  }
  return Object.freeze({ uid, reportId, expectedStatus, action, nextStatus, name, message, newName, ...parseMeta(input) });
}

export interface AdminMergeRequest extends CommandMeta { readonly sourceUid: string; readonly targetUid: string }
function normalizeAdminMergeRequest(data: unknown): AdminMergeRequest {
  const input = inputRecord(data);
  const sourceUid = parseUid(input.sourceUid, 'sourceUid');
  const targetUid = parseUid(input.targetUid, 'targetUid');
  if (sourceUid === targetUid) throw new HttpsError('invalid-argument', 'source and target must differ');
  return Object.freeze({ sourceUid, targetUid, ...parseMeta(input) });
}

export interface AdminAliasDeleteCommand extends CommandMeta { readonly uid: string; readonly expectedCanonicalUid: string }
export function normalizeAdminAliasDeleteCommand(data: unknown): AdminAliasDeleteCommand {
  const input = inputRecord(data);
  const uid = parseUid(input.uid);
  const expectedCanonicalUid = parseUid(input.expectedCanonicalUid, 'expectedCanonicalUid');
  if (uid === expectedCanonicalUid) throw new HttpsError('invalid-argument', 'alias must differ from canonical user');
  return Object.freeze({ uid, expectedCanonicalUid, ...parseMeta(input) });
}

export function assertSafeDuplicateAlias(
  alias: Row,
  canonical: Row,
  uid: string,
  expectedCanonicalUid: string,
  subcollectionCount: number,
  authLinkCount: number,
): void {
  if (alias.identityHidden !== true || text(alias.canonicalStableId, 160) !== expectedCanonicalUid || uid === expectedCanonicalUid) {
    throw new HttpsError('failed-precondition', 'user is not the expected hidden alias');
  }
  if (canonical.identityHidden === true) throw new HttpsError('failed-precondition', 'canonical target is hidden');
  if (subcollectionCount !== 0) throw new HttpsError('failed-precondition', 'alias has subcollections and requires offline migration');
  if (authLinkCount !== 0) throw new HttpsError('failed-precondition', 'alias is still referenced by auth_links');
}

export interface AdminPremiumMigrationCommand extends CommandMeta { readonly uids: readonly string[] }
export function normalizeAdminPremiumMigrationCommand(data: unknown): AdminPremiumMigrationCommand {
  const input = inputRecord(data);
  if (!Array.isArray(input.uids) || input.uids.length < 1 || input.uids.length > MAX_MIGRATION_UIDS) {
    throw new HttpsError('invalid-argument', `uids must contain 1..${MAX_MIGRATION_UIDS} entries`);
  }
  const uids = input.uids.map((uid) => parseUid(uid));
  if (new Set(uids).size !== uids.length) throw new HttpsError('invalid-argument', 'uids must be unique');
  return Object.freeze({ uids: Object.freeze(uids), ...parseMeta(input) });
}

export interface AdminProgressResetCommand extends CommandMeta { readonly uid: string; readonly reset: ResetType }
export function normalizeAdminProgressResetCommand(data: unknown): AdminProgressResetCommand {
  const input = inputRecord(data);
  const uid = parseUid(input.uid);
  const reset = text(input.reset, 40) as ResetType;
  if (!(RESET_TYPES as readonly string[]).includes(reset)) throw new HttpsError('invalid-argument', 'reset type is not allowlisted');
  return Object.freeze({ uid, reset, ...parseMeta(input) });
}

function fingerprint(action: string, command: object): string {
  const { requestId: _requestId, idempotencyKey: _idempotencyKey, ...material } = command as Row;
  return JSON.stringify({ action, ...material });
}

function auditRecord(
  actor: Actor,
  action: string,
  entity: { collection: string; id: string },
  reason: string,
  requestId: string,
  before: Row,
  after: Row,
  nowMs: number,
): ReturnType<typeof createAuditRecord> {
  return createAuditRecord({
    action, actorUid: actor.actorUid, role: actor.role, entity, reason, requestId,
    before, after, timestamp: new Date(nowMs).toISOString(),
  });
}

function assertSecondaryPermission(actor: Actor, permission: AdminPermission): void {
  if (!hasPermission(actor.role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
}

export const adminUpdateUserProfileField = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminProfileFieldCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'users.write');
  const db = admin.firestore();
  const userRef = db.collection('users').doc(input.uid);
  const leaderboardRef = db.collection('leaderboard').doc(input.uid);
  const operationRef = db.collection('admin_command_operations').doc(`profile_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('profile_field_update', input);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const [operationSnap, userSnap, leaderboardSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef), tx.get(leaderboardRef)]);
    if (operationSnap.exists) {
      const operation = operationSnap.data() ?? {};
      assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid);
      return { ...operationResult(operation), replayed: true };
    }
    if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
    const progress = record(userSnap.data()?.progress) ? userSnap.data()?.progress as Row : {};
    const before = { [input.field]: progress[input.field] ?? null };
    const after = { [input.field]: input.value };
    tx.update(userRef, { [`progress.${input.field}`]: input.value, updatedAt: nowMs });
    if (leaderboardSnap.exists) {
      if (input.field === 'user_name') tx.update(leaderboardRef, { name: input.value, nameLower: String(input.value).toLowerCase() });
      if (input.field === 'user_total_xp') tx.update(leaderboardRef, { points: input.value });
      if (input.field === 'streak_count') tx.update(leaderboardRef, { streak: input.value });
    }
    const audit = auditRecord(actor, 'user_profile_field_update', { collection: 'users', id: input.uid }, input.reason, input.requestId, before, after, nowMs);
    const result = { ok: true, uid: input.uid, field: input.field, value: input.value, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'profile_field_update', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});

export const adminWarnUser = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminWarningCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'community.moderate');
  const db = admin.firestore();
  const userRef = db.collection('users').doc(input.uid);
  const warningRef = db.collection('user_warnings').doc(`admin_${input.idempotencyKey}`);
  const operationRef = db.collection('admin_command_operations').doc(`warning_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('warn_user', input);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const [operationSnap, userSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef)]);
    if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid); return { ...operationResult(operation), replayed: true }; }
    if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
    const nowIso = new Date(nowMs).toISOString();
    tx.create(warningRef, { uid: input.uid, name: input.name, message: input.message, createdAt: nowIso, createdBy: actor.actorUid, operationId: operationRef.id });
    const audit = auditRecord(actor, 'warn_user', { collection: 'users', id: input.uid }, input.reason, input.requestId, {}, { warningId: warningRef.id }, nowMs);
    const result = { ok: true, uid: input.uid, warningId: warningRef.id, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'warn_user', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});

export const adminResolveUserReport = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminReportModerationCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'reports.status.write');
  if (input.action !== 'status') assertSecondaryPermission(actor, 'community.moderate');
  const db = admin.firestore();
  const reportRef = db.collection('user_reports').doc(input.reportId);
  const userRef = input.uid ? db.collection('users').doc(input.uid) : null;
  const leaderboardRef = input.uid ? db.collection('leaderboard').doc(input.uid) : null;
  const banRef = input.uid ? db.collection('banned_users').doc(input.uid) : null;
  const warningRef = input.action === 'warn' ? db.collection('user_warnings').doc(`report_${input.idempotencyKey}`) : null;
  const operationRef = db.collection('admin_command_operations').doc(`report_moderation_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('resolve_user_report', input);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid); return { ...operationResult(operation), replayed: true }; }
    const reportSnap = await tx.get(reportRef);
    if (!reportSnap.exists) throw new HttpsError('not-found', 'report not found');
    const currentStatus = text(reportSnap.data()?.status, 40).toLowerCase() || 'new';
    if (currentStatus !== input.expectedStatus) throw new HttpsError('failed-precondition', `report status changed to ${currentStatus}`);
    const userSnap = userRef ? await tx.get(userRef) : null;
    const leaderboardSnap = leaderboardRef ? await tx.get(leaderboardRef) : null;
    if (userRef && (!userSnap || !userSnap.exists)) throw new HttpsError('not-found', 'reported user not found');
    const nowIso = new Date(nowMs).toISOString();
    if (input.action === 'warn' && warningRef) tx.create(warningRef, { uid: input.uid, name: input.name, message: input.message, createdAt: nowIso, createdBy: actor.actorUid, reportId: input.reportId, operationId: operationRef.id });
    if (input.action === 'rename' && userRef) {
      tx.update(userRef, { 'progress.user_name': input.newName, updatedAt: nowMs });
      if (leaderboardRef && leaderboardSnap?.exists) tx.update(leaderboardRef, { name: input.newName, nameLower: input.newName.toLowerCase() });
    }
    if (input.action === 'ban' && userRef && banRef) {
      tx.update(userRef, { banned: true, bannedAt: nowIso, updatedAt: nowMs });
      tx.set(banRef, { uid: input.uid, name: input.name, reason: input.reason, bannedAt: nowIso, bannedBy: actor.actorUid, operationId: operationRef.id });
      if (leaderboardRef && leaderboardSnap?.exists) tx.delete(leaderboardRef);
    }
    tx.update(reportRef, { status: input.nextStatus, reviewedAt: nowIso, adminStatusUpdatedAtMs: nowMs, adminStatusUpdatedBy: actor.actorUid });
    const audit = auditRecord(actor, `user_report_${input.action}`, { collection: 'user_reports', id: input.reportId }, input.reason, input.requestId, { status: currentStatus }, { status: input.nextStatus, uid: input.uid || null }, nowMs);
    const result = { ok: true, reportId: input.reportId, uid: input.uid || null, action: input.action, status: input.nextStatus, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'resolve_user_report', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});

export const adminRequestUserMerge = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminMergeRequest(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'users.auth_repair');
  const db = admin.firestore();
  const operationRef = db.collection('admin_command_operations').doc(`merge_blocked_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('request_user_merge', input);
  const nowMs = Date.now();
  await db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (operationSnap.exists) { assertAdminUserOperationReplay(operationSnap.data() ?? {}, requestFingerprint, actor.actorUid); return; }
    const audit = auditRecord(actor, 'user_merge_blocked', { collection: 'users', id: input.sourceUid }, input.reason, input.requestId, { sourceUid: input.sourceUid, targetUid: input.targetUid }, { blocked: true, requiredBoundary: 'offline_identity_migration' }, nowMs);
    const result = { ok: false, code: 'admin_user_merge_requires_offline_migration', sourceUid: input.sourceUid, targetUid: input.targetUid, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'request_user_merge', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  throw new HttpsError('failed-precondition', 'admin_user_merge_requires_offline_migration');
});

export const adminDeleteDuplicateUser = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminAliasDeleteCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'users.delete');
  const db = admin.firestore();
  const aliasRef = db.collection('users').doc(input.uid);
  const canonicalRef = db.collection('users').doc(input.expectedCanonicalUid);
  const leaderboardRef = db.collection('leaderboard').doc(input.uid);
  const archiveRef = db.collection('users_dedup_archive').doc(input.uid);
  const operationRef = db.collection('admin_command_operations').doc(`delete_alias_${input.idempotencyKey}`);
  const cleanupJobRef = db.collection('admin_duplicate_cleanup_jobs').doc(operationRef.id);
  const auditRef = db.collection('admin_log').doc();
  const authLinkRef = db.collection('auth_links').doc(input.uid);
  const authLinkQuery = db.collection('auth_links').where('stable_id', '==', input.uid).limit(1);
  const requestFingerprint = fingerprint('delete_duplicate_alias', input);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid); return { ...operationResult(operation), replayed: true }; }
    const [aliasSnap, canonicalSnap, leaderboardSnap, authLinkSnap, authLinkQuerySnap] = await Promise.all([
      tx.get(aliasRef), tx.get(canonicalRef), tx.get(leaderboardRef), tx.get(authLinkRef), tx.get(authLinkQuery),
    ]);
    if (!aliasSnap.exists) throw new HttpsError('not-found', 'duplicate alias not found');
    if (!canonicalSnap.exists) throw new HttpsError('failed-precondition', 'canonical target does not exist');
    const authLinkCount = (authLinkSnap.exists ? 1 : 0) + authLinkQuerySnap.size;
    assertSafeDuplicateAlias(aliasSnap.data() ?? {}, canonicalSnap.data() ?? {}, input.uid, input.expectedCanonicalUid, 0, authLinkCount);
    const nowIso = new Date(nowMs).toISOString();
    const tombstone = {
      identityHidden: true,
      canonicalStableId: input.expectedCanonicalUid,
      duplicateCleanupStatus: 'queued',
      duplicateCleanupJobId: cleanupJobRef.id,
      duplicateCleanupQueuedAt: nowMs,
      duplicateCleanupQueuedBy: actor.actorUid,
      accessBlocked: true,
    };
    tx.set(aliasRef, tombstone, { merge: true });
    if (leaderboardSnap.exists) tx.set(leaderboardRef, { identityHidden: true, duplicateCleanupStatus: 'queued', duplicateCleanupJobId: cleanupJobRef.id, updatedAt: nowMs }, { merge: true });
    tx.set(archiveRef, { archivedAt: nowMs, archivedAtISO: nowIso, sourceCollection: 'users', canonicalStableId: input.expectedCanonicalUid, queuedBy: actor.actorUid, reason: input.reason, snapshot: aliasSnap.data() ?? {}, tombstone, status: 'queued', physicallyDeleted: false, operationId: operationRef.id }, { merge: true });
    tx.create(cleanupJobRef, {
      type: 'duplicate_alias_offline_cleanup',
      status: 'queued',
      aliasUid: input.uid,
      canonicalUid: input.expectedCanonicalUid,
      archiveId: archiveRef.id,
      preserveFirebaseAuthUser: true,
      discoverSubcollectionsOffline: true,
      requestedBy: actor.actorUid,
      reason: input.reason,
      requestId: input.requestId,
      operationId: operationRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const audit = auditRecord(actor, 'queue_duplicate_alias_cleanup', { collection: 'users', id: input.uid }, input.reason, input.requestId, { canonicalStableId: input.expectedCanonicalUid, identityHidden: true }, { archived: true, tombstoned: true, status: 'queued', cleanupJobId: cleanupJobRef.id, physicallyDeleted: false }, nowMs);
    const result = { ok: true, uid: input.uid, canonicalUid: input.expectedCanonicalUid, archiveId: archiveRef.id, cleanupJobId: cleanupJobRef.id, auditId: auditRef.id, status: 'queued', tombstoned: true, hidden: true, physicallyDeleted: false };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'delete_duplicate_alias', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});

export const adminMigrateLegacyAdminPremium = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminPremiumMigrationCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'money.manual_access.write');
  const db = admin.firestore();
  const userRefs = input.uids.map((uid) => db.collection('users').doc(uid));
  const operationRef = db.collection('admin_command_operations').doc(`premium_migration_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('migrate_legacy_admin_premium', input);
  const nowMs = Date.now();
  return db.runTransaction(async (tx) => {
    const operationSnap = await tx.get(operationRef);
    if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid); return { ...operationResult(operation), replayed: true }; }
    const snapshots = await Promise.all(userRefs.map((ref) => tx.get(ref)));
    const migrated: string[] = [];
    const skipped: string[] = [];
    snapshots.forEach((snapshot, index) => {
      const uid = input.uids[index];
      if (!snapshot.exists) { skipped.push(uid); return; }
      const progress = record(snapshot.data()?.progress) ? snapshot.data()?.progress as Row : {};
      const expiry = Number(progress.premium_expiry) || 0;
      const hasLegacyProvenance = progress.premium_plan === 'admin_grant' && String(progress.admin_premium_override ?? '') === 'true';
      if (!hasLegacyProvenance || (expiry !== 0 && expiry <= nowMs)) { skipped.push(uid); return; }
      const grantAt = String(progress.premium_admin_grant_at || nowMs);
      tx.update(snapshot.ref, {
        'progress.vip_active': 'true', 'progress.vip_plan': 'admin_vip', 'progress.vip_from': grantAt,
        'progress.vip_until': String(expiry), 'progress.vip_admin_override': 'true',
        'progress.vip_admin_grant_at': grantAt, 'progress.vip_migrated_from_admin_grant_at': String(nowMs), updatedAt: nowMs,
      });
      migrated.push(uid);
    });
    const audit = auditRecord(actor, 'migrate_legacy_admin_premium', { collection: 'users', id: 'explicit_candidates' }, input.reason, input.requestId, { requested: input.uids.length }, { migrated: migrated.length, skipped: skipped.length }, nowMs);
    const result = { ok: true, checked: input.uids.length, migrated, skipped, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'migrate_legacy_admin_premium', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});

export const adminResetUserProgress = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  requireAdminAppCheck(request);
  const input = normalizeAdminProgressResetCommand(request.data);
  const actor = requireAdminUserOperationActor(request as { auth?: { uid?: string; token?: Row } }, 'users.write');
  const db = admin.firestore();
  const userRef = db.collection('users').doc(input.uid);
  const operationRef = db.collection('admin_command_operations').doc(`progress_reset_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const requestFingerprint = fingerprint('reset_user_progress', input);
  const nowMs = Date.now();
  const field = 'achievements_state';
  return db.runTransaction(async (tx) => {
    const [operationSnap, userSnap] = await Promise.all([tx.get(operationRef), tx.get(userRef)]);
    if (operationSnap.exists) { const operation = operationSnap.data() ?? {}; assertAdminUserOperationReplay(operation, requestFingerprint, actor.actorUid); return { ...operationResult(operation), replayed: true }; }
    if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
    const before = { [field]: userSnap.data()?.[field] ?? null };
    tx.update(userRef, { [field]: '', updatedAt: nowMs });
    const audit = auditRecord(actor, `reset_${input.reset}`, { collection: 'users', id: input.uid }, input.reason, input.requestId, before, { [field]: '' }, nowMs);
    const result = { ok: true, uid: input.uid, reset: input.reset, field, auditId: auditRef.id };
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { action: 'reset_user_progress', requestFingerprint, actorUid: actor.actorUid, result, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return result;
  });
});
