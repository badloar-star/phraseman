import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole, type AdminPermission } from './admin/permissions';
import { buildBanWrites, buildUnbanWrites } from './admin_global_ban_core';
import {
  buildPolicyEvidence,
  buildUserReportsCsv,
  filterBanSummaries,
  filterSafetyFlagSummaries,
  filterUserReportSummaries,
  namedSourceState,
  projectBanSummary,
  projectConsentAggregateInput,
  projectSafetyFlagSummary,
  projectUserReport,
  type SafetyModerationView,
} from './admin_safety_moderation_core';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const PAGE_MAX = 100;
const SNAPSHOT_TTL_MS = 30 * 60 * 1_000;
const SNAPSHOT_CHUNK_CHARS = 700_000;
const SNAPSHOT_MAX_ENCODED_CHARS = 8_000_000;
const REPORTS_LIMIT = 5_000;
const FLAGS_LIMIT = 5_000;
const CONSENTS_LIMIT = 8_000;
const BANS_LIMIT = 1_000;
const DEFINITION_VERSION = 'admin_safety_moderation_v1';
const PREVIEW_TTL_MS = 30 * 60 * 1_000;

type Row = Record<string, unknown>;
type ExactFieldState = Record<string, Readonly<{ present: boolean; value?: unknown }>>;

const REPORT_MUTABLE_FIELDS = ['status', 'reviewedAtMs', 'reviewedAt', 'reviewedBy', 'archivedAt', 'warningId'] as const;
const SAFETY_MUTABLE_FIELDS = ['handled', 'disposition', 'handlingNote', 'handledBy', 'handledAtMs', 'handledAt'] as const;
const NAME_INDEX_MUTABLE_FIELDS = ['uid', 'name', 'nameLower', 'authUid', 'identityHidden', 'updatedAt'] as const;
const USER_IDENTITY_FIELDS = ['updatedAt'] as const;
const LEADERBOARD_IDENTITY_FIELDS = ['name', 'nameLower', 'updatedAt'] as const;
const PROFILE_IDENTITY_FIELDS = ['uid', 'name', 'nameLower', 'updatedAt'] as const;

export interface SafetyModerationSnapshotPayload {
  definitionVersion: string;
  generatedAtMs: number;
  view: string;
  items: Row[];
  summary: Row;
  sources: Row[];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function clean(value: unknown, max = 2_000): string {
  return String(value ?? '').trim().slice(0, max);
}

function finite(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(0, Math.floor(result)) : 0;
}

function safeId(value: unknown, max = 180): string {
  return clean(value, max).replace(/[^a-zA-Z0-9_.:-]/g, '').replace(/^\.+/, '');
}

function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item === undefined ? null : item)).join(',')}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === 'object') {
    const serializable = value as { toJSON?: () => unknown };
    if (typeof serializable.toJSON === 'function') {
      const jsonValue = serializable.toJSON();
      if (jsonValue !== value) return stableSerialize(jsonValue);
    }
    const row = value as Row;
    return `{${Object.keys(row).sort().filter((key) => row[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableSerialize(row[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function hash(value: unknown): string {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

export function captureExactFields(value: unknown, fields: readonly string[]): ExactFieldState {
  const row = record(value);
  return Object.freeze(Object.fromEntries(fields.map((field) => [field, Object.prototype.hasOwnProperty.call(row, field)
    ? Object.freeze({ present: true, value: row[field] })
    : Object.freeze({ present: false })])));
}

function patchExactFieldState(stateValue: unknown, patch: Row): ExactFieldState {
  const state = record(stateValue);
  return Object.freeze(Object.fromEntries(Object.keys(state).map((field) => {
    if (Object.prototype.hasOwnProperty.call(patch, field)) return [field, Object.freeze({ present: true, value: patch[field] })];
    const prior = record(state[field]);
    return [field, Object.freeze(prior.present === true && Object.prototype.hasOwnProperty.call(prior, 'value')
      ? { present: true, value: prior.value }
      : { present: false })];
  })));
}

export function restoreExactFieldPatch(stateValue: unknown): Row {
  const state = record(stateValue);
  return Object.fromEntries(Object.entries(state).map(([field, entryValue]) => {
    const entry = record(entryValue);
    return [field, entry.present === true ? entry.value : admin.firestore.FieldValue.delete()];
  }));
}

function rawFromExactFieldState(stateValue: unknown): Row {
  const state = record(stateValue);
  return Object.fromEntries(Object.entries(state).flatMap(([field, entryValue]) => {
    const entry = record(entryValue);
    return entry.present === true ? [[field, entry.value]] : [];
  }));
}

function reportMutationState(id: string, value: unknown): Row {
  return { ...projectUserReport(id, value), mutableFields: captureExactFields(value, REPORT_MUTABLE_FIELDS) };
}

function safetyMutationState(id: string, value: unknown): Row {
  return { ...projectSafetyFlagSummary(id, value), mutableFields: captureExactFields(value, SAFETY_MUTABLE_FIELDS) };
}

function withShallowPatch(value: unknown, patch: Row, deleteFields: readonly string[] = []): Row {
  const next = { ...record(value), ...patch };
  deleteFields.forEach((field) => delete next[field]);
  return next;
}

function renameMutationState(input: {
  uid: string;
  user: unknown;
  leaderboard: unknown | null;
  publicProfile: unknown | null;
  reportId: string;
  report: unknown;
  oldNameIndex: unknown | null;
  newNameIndex: unknown | null;
}): Row {
  const user = record(input.user);
  const progress = record(user.progress);
  return {
    uid: input.uid,
    currentName: clean(progress.user_name, 32),
    currentNameLower: clean(progress.user_name_lower ?? progress.user_name, 32).toLowerCase(),
    authUid: clean(user.firebaseAuthUid ?? record(user.linkedAuth).providerUid, 180),
    oldNameOwnerUid: input.oldNameIndex ? clean(record(input.oldNameIndex).uid, 180) : '',
    newNameOwnerUid: input.newNameIndex ? clean(record(input.newNameIndex).uid, 180) : '',
    leaderboard: input.leaderboard ? record(input.leaderboard) : null,
    publicProfile: input.publicProfile ? record(input.publicProfile) : null,
    report: reportMutationState(input.reportId, input.report),
    userProgressFields: captureExactFields(progress, ['user_name', 'user_name_lower']),
    userIdentityFields: captureExactFields(user, USER_IDENTITY_FIELDS),
    oldNameIndex: input.oldNameIndex ? captureExactFields(input.oldNameIndex, NAME_INDEX_MUTABLE_FIELDS) : null,
    newNameIndex: input.newNameIndex ? captureExactFields(input.newNameIndex, NAME_INDEX_MUTABLE_FIELDS) : null,
    leaderboardIdentityFields: input.leaderboard ? captureExactFields(input.leaderboard, LEADERBOARD_IDENTITY_FIELDS) : null,
    publicProfileIdentityFields: input.publicProfile ? captureExactFields(input.publicProfile, PROFILE_IDENTITY_FIELDS) : null,
  };
}

function requestScope(value: unknown): string {
  return hash(value).slice(0, 24);
}

const VIEWS: readonly SafetyModerationView[] = ['overview', 'user-reports', 'safety-flags', 'age-consent', 'policy-evidence', 'ban-list', 'other-reports'];

export type SafetyModerationMutationAction =
  | 'report_set_status'
  | 'report_archive_bulk'
  | 'report_warn'
  | 'report_rename'
  | 'safety_set_disposition'
  | 'safety_handle_bulk'
  | 'user_ban'
  | 'user_unban'
  | 'restore_operation';

const MUTATION_ACTIONS: readonly SafetyModerationMutationAction[] = [
  'report_set_status', 'report_archive_bulk', 'report_warn', 'report_rename', 'safety_set_disposition',
  'safety_handle_bulk', 'user_ban', 'user_unban', 'restore_operation',
];

function normalizeTargetIds(value: unknown): string[] {
  const targetIds = [...new Set((Array.isArray(value) ? value : []).map((item) => safeId(item, 180)).filter(Boolean))];
  if (targetIds.length > 400) throw new Error('bulk_target_limit');
  return targetIds;
}

function normalizeMutationPayload(action: SafetyModerationMutationAction, value: unknown): Row {
  const payload = record(value);
  if (action === 'report_set_status') {
    const status = clean(payload.status, 30).toLowerCase();
    if (!['new', 'reviewed', 'archived'].includes(status)) throw new Error('report_status_invalid');
    return Object.freeze({ status });
  }
  if (action === 'report_archive_bulk') return Object.freeze({ targetIds: normalizeTargetIds(payload.targetIds), status: 'archived' });
  if (action === 'report_warn') return Object.freeze({ uid: safeId(payload.uid, 180), name: clean(payload.name, 160), message: clean(payload.message, 2_000) });
  if (action === 'report_rename') return Object.freeze({ uid: safeId(payload.uid, 180), oldName: clean(payload.oldName, 32), newName: clean(payload.newName, 32), sourceReportId: safeId(payload.sourceReportId, 180) });
  if (action === 'safety_set_disposition') return Object.freeze({ handled: payload.handled !== false, disposition: clean(payload.disposition, 80).toLowerCase(), note: clean(payload.note, 1_000) });
  if (action === 'safety_handle_bulk') return Object.freeze({ targetIds: normalizeTargetIds(payload.targetIds), disposition: clean(payload.disposition, 80).toLowerCase(), note: clean(payload.note, 1_000) });
  if (action === 'user_ban') return Object.freeze({ name: clean(payload.name, 160), sourceReportId: safeId(payload.sourceReportId, 180), source: clean(payload.source, 80) || (payload.sourceReportId ? 'user_report' : 'manual') });
  if (action === 'user_unban') return Object.freeze({ historyId: safeId(payload.historyId, 180) });
  return Object.freeze({ operationId: safeId(payload.operationId ?? payload.historyId, 180) });
}

export function parseSafetyModerationMutationInput(value: unknown) {
  const input = record(value);
  const action = clean(input.action, 40) as SafetyModerationMutationAction;
  if (!MUTATION_ACTIONS.includes(action)) throw new Error('safety_action_invalid');
  const targetId = safeId(input.targetId, 180);
  const reason = clean(input.reason, 500);
  const requestId = safeId(input.requestId, 160);
  if (!targetId || !reason || !requestId) throw new Error('mutation_fields_required');
  const payload = normalizeMutationPayload(action, input.payload);
  if ((action === 'report_archive_bulk' || action === 'safety_handle_bulk') && !(payload.targetIds as unknown[]).length) throw new Error('bulk_targets_required');
  if (action === 'report_warn' && (!payload.uid || !payload.message)) throw new Error('warning_fields_required');
  if (action === 'report_rename' && (!payload.uid || !payload.newName)) throw new Error('rename_fields_required');
  return Object.freeze({ action, targetId, reason, requestId, payload });
}

export function requiredSafetyModerationMutationPermission(action: SafetyModerationMutationAction): AdminPermission {
  if (action === 'report_set_status' || action === 'report_archive_bulk') return 'reports.status.write';
  if (action === 'report_rename') return 'users.moderation.identity.write';
  if (action === 'user_ban' || action === 'user_unban') return 'users.moderation.ban.write';
  if (action === 'restore_operation') return 'users.moderation.restore';
  return 'users.moderation.write';
}

export function buildSafetyModerationPreview(
  input: ReturnType<typeof parseSafetyModerationMutationInput>,
  before: unknown,
  nowMs: number,
  actorUid: string,
  role: string,
) {
  const restoredAction = input.action === 'restore_operation' ? clean(record(before).action, 40) : '';
  const requiresApproval = ['report_rename', 'user_ban', 'user_unban'].includes(input.action)
    || restoredAction === 'report_rename';
  const irreversible = input.action === 'report_warn';
  const beforeFingerprint = hash(before ?? null);
  const risk = input.action === 'user_ban'
    ? 'Creates a global account block and removes the current leaderboard projection.'
    : input.action === 'user_unban'
      ? 'Removes a global account block; independent chat restrictions remain unchanged.'
      : input.action === 'report_rename'
        ? 'Changes the public identity across the canonical nickname projections.'
        : restoredAction === 'report_rename'
          ? 'Restores a previous public identity across all canonical nickname projections.'
        : irreversible
          ? 'Creates a warning that may already be delivered by installed clients.'
          : 'Changes moderation state for the exact previewed targets.';
  const rollbackPath = irreversible
    ? 'Warning delivery cannot be recalled by the current client protocol.'
    : requiresApproval
      ? 'Create a separately audited restore operation guarded by CAS checks.'
      : 'Create a restore preview while the target still matches the recorded after-state.';
  const packet = { ...input, actorUid: clean(actorUid, 180), role: clean(role, 40), beforeFingerprint, effectiveAtMs: nowMs, requiresApproval, irreversible, risk, rollbackPath };
  const fingerprint = hash(packet);
  const confirmation = `${input.action.toUpperCase()}/${input.targetId}/${fingerprint.slice(0, 12)}`;
  return Object.freeze({ ...packet, fingerprint, confirmation, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS });
}

export function assertModerationOperationReplay(operation: unknown, actorUid: string, requestFingerprint: string): void {
  const row = record(operation);
  if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new Error('idempotency_conflict');
}

export function assertSafetyApprovalCanBeApproved(value: unknown, actorUid: string, nowMs: number): void {
  const approval = record(value);
  if (approval.type !== 'safety_moderation' || approval.status !== 'pending' || finite(approval.expiresAtMs) <= nowMs) throw new Error('approval_invalid');
  if (approval.requestedBy === actorUid) throw new Error('self_approval_forbidden');
}

export function assertSafetyApprovalForApply(approvalValue: unknown, previewValue: unknown, actorUid: string, nowMs: number): void {
  const approval = record(approvalValue);
  const preview = record(previewValue);
  if (
    approval.type !== 'safety_moderation'
    || approval.status !== 'approved'
    || approval.previewId !== preview.id
    || approval.requestedBy !== actorUid
    || !approval.approvedBy
    || approval.approvedBy === actorUid
    || approval.fingerprint !== preview.fingerprint
    || finite(approval.expiresAtMs) <= nowMs
    || finite(preview.expiresAtMs) <= nowMs
  ) throw new Error('approval_mismatch');
}

export function resolveBanHistoryIdForUnban(banValue: unknown, requestedHistoryId: unknown, targetId: string): string {
  const canonicalHistoryId = safeId(record(banValue).banHistoryId, 180);
  const requested = safeId(requestedHistoryId, 180);
  if (!canonicalHistoryId) throw new Error('ban_history_missing');
  if (requested && requested !== canonicalHistoryId) throw new Error('ban_history_mismatch');
  if (!safeId(targetId, 180)) throw new Error('ban_history_target_mismatch');
  return canonicalHistoryId;
}

export function assertBanHistoryForUnban(historyValue: unknown, targetId: string): void {
  const history = record(historyValue);
  if (history.action !== 'user_ban' || clean(history.targetId, 180) !== clean(targetId, 180)) throw new Error('ban_history_target_mismatch');
}

export function projectSafetyModerationApproval(id: string, value: unknown, actorUid: string, nowMs: number) {
  const row = record(value);
  if (row.type !== 'safety_moderation' || row.status !== 'pending' || finite(row.expiresAtMs) <= nowMs) return null;
  const requestedBy = clean(row.requestedBy, 180);
  return Object.freeze({
    approvalId: safeId(id, 180),
    action: clean(row.action, 40),
    targetId: clean(row.targetId, 180),
    requestedBy,
    requestedAtMs: finite(row.requestedAtMs),
    expiresAtMs: finite(row.expiresAtMs),
    reason: clean(row.reason, 500),
    risk: clean(row.risk, 1_000),
    fingerprint: clean(row.fingerprint, 64),
    canApprove: Boolean(requestedBy && requestedBy !== actorUid),
  });
}

export function buildModerationAuditProjection(previewValue: unknown, targetCount: number) {
  const preview = record(previewValue);
  return Object.freeze({
    action: clean(preview.action, 40),
    targetId: clean(preview.targetId, 180),
    targetCount: Math.max(0, Math.floor(Number(targetCount) || 0)),
    beforeFingerprint: clean(preview.beforeFingerprint, 64),
    afterFingerprint: clean(preview.fingerprint, 64),
  });
}

export function encodeSafetyModerationCursor(snapshotId: string, offset: number, scope: string): string {
  return Buffer.from(JSON.stringify({ v: 1, snapshotId, offset, scope })).toString('base64url');
}

export function decodeSafetyModerationCursor(value: string, scope: string): { snapshotId: string; offset: number } | null {
  if (!value) return null;
  if (value.length > 500) throw new Error('cursor_too_long');
  try {
    const cursor = record(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    const snapshotId = safeId(cursor.snapshotId, 160);
    const offset = Math.floor(Number(cursor.offset));
    if (cursor.v !== 1 || cursor.scope !== scope || !snapshotId || !Number.isFinite(offset) || offset < 0) throw new Error('cursor_mismatch');
    return { snapshotId, offset };
  } catch (error) {
    throw new Error(error instanceof Error && error.message === 'cursor_mismatch' ? error.message : 'invalid_cursor');
  }
}

export function safetyModerationAccessScope(requestScopeValue: string, role: string, permission: AdminPermission): string {
  return requestScope({
    definitionVersion: DEFINITION_VERSION,
    requestScope: clean(requestScopeValue, 64),
    role: clean(role, 40),
    permission,
  });
}

export function parseSafetyModerationRequest(value: unknown) {
  const input = record(value);
  const candidate = clean(input.view, 40) as SafetyModerationView;
  const view: SafetyModerationView = VIEWS.includes(candidate) ? candidate : 'overview';
  const rawFilters = record(input.filters);
  const requestedSort = clean(rawFilters.sort, 30).toLowerCase();
  const filters = Object.freeze({
    status: clean(rawFilters.status, 30).toLowerCase(),
    reason: clean(rawFilters.reason, 80).toLowerCase(),
    category: clean(rawFilters.category, 80).toLowerCase(),
    query: clean(rawFilters.query, 200).toLowerCase(),
    sort: ['date_desc', 'date_asc', 'name'].includes(requestedSort) ? requestedSort : 'date_desc',
  });
  const uid = safeId(input.uid, 180);
  const pageSize = Math.min(PAGE_MAX, Math.max(10, finite(input.pageSize) || 50));
  const exportCsv = input.exportCsv === true;
  const scope = requestScope({ definitionVersion: DEFINITION_VERSION, view, filters, uid, exportCsv });
  const cursorToken = clean(input.cursor, 500);
  return { view, filters, uid, pageSize, exportCsv, scope, cursorToken };
}

export function requiredSafetyModerationPermission(view: SafetyModerationView, exportCsv: boolean): AdminPermission {
  if (exportCsv) return 'users.moderation.export';
  if (view === 'safety-flags' || view === 'ban-list') return 'users.moderation.safety.read';
  if (view === 'age-consent' || view === 'policy-evidence') return 'users.moderation.aggregate.read';
  if (view === 'other-reports') return 'reports.read';
  return 'users.moderation.read';
}

export function packSafetyModerationSnapshot(payload: SafetyModerationSnapshotPayload): string[] {
  const encoded = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8')).toString('base64');
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += SNAPSHOT_CHUNK_CHARS) chunks.push(encoded.slice(offset, offset + SNAPSHOT_CHUNK_CHARS));
  return chunks;
}

export function unpackSafetyModerationSnapshot(chunks: readonly string[]): SafetyModerationSnapshotPayload {
  const value = record(JSON.parse(gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8')));
  if (!Array.isArray(value.items) || !Array.isArray(value.sources) || !value.summary) throw new Error('safety_snapshot_corrupt');
  return {
    definitionVersion: clean(value.definitionVersion, 80),
    generatedAtMs: finite(value.generatedAtMs),
    view: clean(value.view, 40),
    items: value.items.map(record),
    summary: record(value.summary),
    sources: value.sources.map(record),
  };
}

export function assertSafetySnapshotBatchFits(chunks: readonly string[]): void {
  const encodedLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  if (!chunks.length || chunks.length > 11 || encodedLength > SNAPSHOT_MAX_ENCODED_CHARS) throw new Error('safety_snapshot_too_large');
}

function requireRole(request: { auth?: { token?: Row } }, permission: AdminPermission) {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Role cannot access Safety & Moderation');
  return role;
}

function emptyPayload(view: SafetyModerationView, nowMs: number): SafetyModerationSnapshotPayload {
  return { definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view, items: [], summary: {}, sources: [] };
}

async function exactCount(db: FirebaseFirestore.Firestore, collectionName: string): Promise<{ count: number; error: string }> {
  try {
    const snap = await db.collection(collectionName).count().get();
    return { count: finite(snap.data().count), error: '' };
  } catch (error) {
    return { count: 0, error: clean(error instanceof Error ? error.message : error, 240) || 'source_unavailable' };
  }
}

async function readOverview(db: FirebaseFirestore.Firestore, role: ReturnType<typeof resolveAdminRole>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  const tasks: Array<Promise<{ name: string; count: number; error: string }>> = [
    exactCount(db, 'user_reports').then((result) => ({ name: 'user_reports', ...result })),
  ];
  if (role && hasPermission(role, 'users.moderation.safety.read')) tasks.push(
    exactCount(db, 'safety_flags').then((result) => ({ name: 'safety_flags', ...result })),
    exactCount(db, 'banned_users').then((result) => ({ name: 'banned_users', ...result })),
  );
  if (role && hasPermission(role, 'users.moderation.aggregate.read')) tasks.push(exactCount(db, 'user_consents').then((result) => ({ name: 'user_consents', ...result })));
  const results = await Promise.all(tasks);
  return {
    ...emptyPayload('overview', nowMs),
    summary: { counts: Object.fromEntries(results.map((result) => [result.name, result.count])) },
    sources: results.map((result) => namedSourceState(result.name, { scanned: result.count, matched: result.count, cap: 0, hasMore: false, capturedAtMs: nowMs, error: result.error })),
  };
}

async function readUserReports(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('user_reports').orderBy('createdAtMs', 'desc').limit(REPORTS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, REPORTS_LIMIT).map((doc) => projectUserReport(doc.id, doc.data()));
    const filtered = filterUserReportSummaries(projected, input.filters).filter((row) => !input.uid || row.reportedUid === input.uid || row.reporterUid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length },
      sources: [namedSourceState('user_reports', { scanned: Math.min(snap.size, REPORTS_LIMIT), matched: filtered.length, cap: REPORTS_LIMIT, hasMore: snap.size > REPORTS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('user_reports', { scanned: 0, matched: 0, cap: REPORTS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function readSafetyFlags(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('safety_flags').orderBy('createdAtMs', 'desc').limit(FLAGS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, FLAGS_LIMIT).map((doc) => projectSafetyFlagSummary(doc.id, doc.data()));
    const filtered = filterSafetyFlagSummaries(projected, input.filters).filter((row) => !input.uid || row.uid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length, open: projected.filter((row) => !row.handled).length, handled: projected.filter((row) => row.handled).length },
      sources: [namedSourceState('safety_flags', { scanned: Math.min(snap.size, FLAGS_LIMIT), matched: filtered.length, cap: FLAGS_LIMIT, hasMore: snap.size > FLAGS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('safety_flags', { scanned: 0, matched: 0, cap: FLAGS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function readConsentEvidence(db: FirebaseFirestore.Firestore, view: 'age-consent' | 'policy-evidence'): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('user_consents').limit(CONSENTS_LIMIT + 1).get();
    const projected = snap.docs.slice(0, CONSENTS_LIMIT).map((doc) => projectConsentAggregateInput(doc.id, doc.data()));
    const evidence = buildPolicyEvidence(projected, { nowMs, declaredMinimumAge: 16, runtimeMinimumAge: null });
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view, items: [], summary: evidence as unknown as Row,
      sources: [namedSourceState('user_consents', { scanned: Math.min(snap.size, CONSENTS_LIMIT), matched: projected.length, cap: CONSENTS_LIMIT, hasMore: snap.size > CONSENTS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(view, nowMs), sources: [namedSourceState('user_consents', { scanned: 0, matched: 0, cap: CONSENTS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function getAllInChunks(db: FirebaseFirestore.Firestore, refs: FirebaseFirestore.DocumentReference[]): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const result: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let offset = 0; offset < refs.length; offset += 100) result.push(...await db.getAll(...refs.slice(offset, offset + 100)));
  return result;
}

async function readBans(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  const nowMs = Date.now();
  try {
    const snap = await db.collection('banned_users').limit(BANS_LIMIT + 1).get();
    const docs = snap.docs.slice(0, BANS_LIMIT);
    const userSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('users').doc(doc.id)));
    const leaderboardSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('leaderboard').doc(doc.id)));
    const chatSnaps = await getAllInChunks(db, docs.map((doc) => db.collection('league_chat_bans').doc(doc.id)));
    const projected = docs.map((doc, index) => projectBanSummary(doc.id, {
      ...doc.data(),
      usersBanned: userSnaps[index]?.exists ? record(userSnaps[index].data()).banned === true : false,
      leaderboardPresent: leaderboardSnaps[index]?.exists === true,
      chatRestricted: chatSnaps[index]?.exists === true,
    }));
    const filtered = filterBanSummaries(projected, input.filters).filter((row) => !input.uid || row.uid === input.uid);
    return {
      definitionVersion: DEFINITION_VERSION, generatedAtMs: nowMs, view: input.view, items: filtered as unknown as Row[],
      summary: { totalLoaded: projected.length, totalMatched: filtered.length, inconsistent: projected.filter((row) => row.consistency === 'inconsistent').length },
      sources: [namedSourceState('banned_users', { scanned: Math.min(snap.size, BANS_LIMIT), matched: filtered.length, cap: BANS_LIMIT, hasMore: snap.size > BANS_LIMIT, capturedAtMs: nowMs })],
    };
  } catch (error) {
    return { ...emptyPayload(input.view, nowMs), sources: [namedSourceState('banned_users', { scanned: 0, matched: 0, cap: BANS_LIMIT, hasMore: false, capturedAtMs: nowMs, error: error instanceof Error ? error.message : error })] };
  }
}

async function buildSnapshotPayload(db: FirebaseFirestore.Firestore, role: ReturnType<typeof resolveAdminRole>, input: ReturnType<typeof parseSafetyModerationRequest>): Promise<SafetyModerationSnapshotPayload> {
  if (input.view === 'overview') return readOverview(db, role);
  if (input.view === 'user-reports') return readUserReports(db, input);
  if (input.view === 'safety-flags') return readSafetyFlags(db, input);
  if (input.view === 'age-consent' || input.view === 'policy-evidence') return readConsentEvidence(db, input.view);
  if (input.view === 'ban-list') return readBans(db, input);
  return { ...emptyPayload('other-reports', Date.now()), summary: { delegatedRoute: 'report-center' }, sources: [{ name: 'admin_reports_center', status: 'ready', scanned: 0, matched: 0, cap: 0, capturedAtMs: Date.now(), reason: '' }] };
}

async function cleanupSnapshots(db: FirebaseFirestore.Firestore): Promise<void> {
  try {
    const expired = await db.collection('admin_safety_moderation_snapshots').where('expiresAtMs', '<=', Date.now()).limit(10).get();
    await Promise.all(expired.docs.map((doc) => db.recursiveDelete(doc.ref)));
  } catch {
    // Best-effort retention cleanup must not make an otherwise valid read fail.
  }
}

async function persistSnapshot(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  accessScope: string,
  role: string,
  permission: AdminPermission,
  payload: SafetyModerationSnapshotPayload,
): Promise<string> {
  const ref = db.collection('admin_safety_moderation_snapshots').doc();
  const chunks = packSafetyModerationSnapshot(payload);
  try { assertSafetySnapshotBatchFits(chunks); } catch { throw new HttpsError('resource-exhausted', 'safety_snapshot_too_large'); }
  const nowMs = Date.now();
  const batch = db.batch();
  batch.create(ref, { actorUid, accessScope, role, permission, definitionVersion: DEFINITION_VERSION, chunkCount: chunks.length, generatedAtMs: payload.generatedAtMs, createdAtMs: nowMs, expiresAtMs: nowMs + SNAPSHOT_TTL_MS });
  chunks.forEach((data, index) => batch.create(ref.collection('chunks').doc(String(index).padStart(4, '0')), { index, data }));
  await batch.commit();
  return ref.id;
}

async function loadSnapshot(
  db: FirebaseFirestore.Firestore,
  actorUid: string,
  accessScope: string,
  role: string,
  permission: AdminPermission,
  snapshotId: string,
): Promise<SafetyModerationSnapshotPayload> {
  const ref = db.collection('admin_safety_moderation_snapshots').doc(snapshotId);
  const metaSnap = await ref.get();
  if (!metaSnap.exists) throw new HttpsError('failed-precondition', 'safety_snapshot_expired');
  const meta = record(metaSnap.data());
  if (
    meta.actorUid !== actorUid
    || meta.accessScope !== accessScope
    || meta.role !== role
    || meta.permission !== permission
    || meta.definitionVersion !== DEFINITION_VERSION
    || finite(meta.expiresAtMs) <= Date.now()
  ) throw new HttpsError('failed-precondition', 'safety_snapshot_expired');
  const chunkCount = finite(meta.chunkCount);
  if (chunkCount < 1 || chunkCount > 11) throw new HttpsError('data-loss', 'safety_snapshot_corrupt');
  const chunks = await db.getAll(...Array.from({ length: chunkCount }, (_, index) => ref.collection('chunks').doc(String(index).padStart(4, '0'))));
  if (chunks.some((chunk) => !chunk.exists)) throw new HttpsError('data-loss', 'safety_snapshot_corrupt');
  try { return unpackSafetyModerationSnapshot(chunks.map((chunk) => clean(record(chunk.data()).data, SNAPSHOT_CHUNK_CHARS + 10))); }
  catch { throw new HttpsError('data-loss', 'safety_snapshot_corrupt'); }
}

export const adminGetSafetyModerationWorkspace = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    let input: ReturnType<typeof parseSafetyModerationRequest>;
    try { input = parseSafetyModerationRequest(request.data); }
    catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_safety_moderation_request'); }
    const permission = requiredSafetyModerationPermission(input.view, input.exportCsv);
    const role = requireRole(request, permission);
    const accessScope = safetyModerationAccessScope(input.scope, role, permission);
    let cursor: ReturnType<typeof decodeSafetyModerationCursor>;
    try { cursor = decodeSafetyModerationCursor(input.cursorToken, accessScope); }
    catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_cursor'); }
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    let snapshotId = cursor?.snapshotId || '';
    let payload: SafetyModerationSnapshotPayload;
    if (cursor) payload = await loadSnapshot(db, actorUid, accessScope, role, permission, cursor.snapshotId);
    else {
      await cleanupSnapshots(db);
      payload = await buildSnapshotPayload(db, role, input);
      snapshotId = await persistSnapshot(db, actorUid, accessScope, role, permission, payload);
    }
    const offset = cursor?.offset || 0;
    const items = payload.items.slice(offset, offset + input.pageSize);
    const nextOffset = offset + items.length;
    const csv = input.exportCsv && input.view === 'user-reports' ? buildUserReportsCsv(payload.items as never[]) : null;
    return {
      definitionVersion: DEFINITION_VERSION,
      generatedAtMs: payload.generatedAtMs,
      view: input.view,
      items,
      totalMatched: payload.items.length,
      nextCursor: nextOffset < payload.items.length ? encodeSafetyModerationCursor(snapshotId, nextOffset, accessScope) : '',
      snapshotCursor: encodeSafetyModerationCursor(snapshotId, 0, accessScope),
      summary: payload.summary,
      sources: payload.sources,
      csv,
      exportedCount: csv == null ? 0 : payload.items.length,
    };
  },
);

export const adminGetSafetyModerationSensitiveDetail = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '512MiB' },
  async (request) => {
    const role = requireRole(request, 'users.moderation.sensitive.read');
    const input = record(request.data);
    const flagId = safeId(input.flagId, 180);
    const reason = clean(input.reason, 500);
    const requestId = safeId(input.requestId, 160);
    if (!flagId || !reason || !requestId) throw new HttpsError('invalid-argument', 'flagId, reason and requestId required');
    const db = admin.firestore();
    const flagSnap = await db.collection('safety_flags').doc(flagId).get();
    if (!flagSnap.exists) throw new HttpsError('not-found', 'safety_flag_not_found');
    const value = record(flagSnap.data());
    const category = clean(value.category, 80);
    const userText = clean(value.userText ?? value.text, 8_000);
    const historyContext = (Array.isArray(value.historyContext) ? value.historyContext : []).slice(-20).map((entry) => {
      const row = record(entry);
      return Object.freeze({ role: clean(row.role, 40), text: clean(row.text ?? row.content, 2_000) });
    });
    const auditId = await writeSensitiveAccessAudit(db, { actorUid: request.auth!.uid, role, flagId, category, reason, requestId });
    return { ok: true, flagId, category, userText, historyContext, auditId };
  },
);

async function readMutationBefore(db: FirebaseFirestore.Firestore, input: ReturnType<typeof parseSafetyModerationMutationInput>): Promise<Row> {
  if (input.action === 'report_archive_bulk') {
    const targetIds = input.payload.targetIds as string[];
    const snaps = await getAllInChunks(db, targetIds.map((id) => db.collection('user_reports').doc(id)));
    if (snaps.some((snap) => !snap.exists)) throw new HttpsError('not-found', 'bulk_report_target_not_found');
    return { targets: snaps.map((snap) => projectUserReport(snap.id, snap.data())) };
  }
  if (input.action === 'safety_handle_bulk') {
    const targetIds = input.payload.targetIds as string[];
    const snaps = await getAllInChunks(db, targetIds.map((id) => db.collection('safety_flags').doc(id)));
    if (snaps.some((snap) => !snap.exists)) throw new HttpsError('not-found', 'bulk_safety_target_not_found');
    return { targets: snaps.map((snap) => projectSafetyFlagSummary(snap.id, snap.data())) };
  }
  if (input.action === 'report_set_status') {
    const snap = await db.collection('user_reports').doc(input.targetId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'user_report_not_found');
    return reportMutationState(snap.id, snap.data());
  }
  if (input.action === 'report_warn') {
    const snap = await db.collection('user_reports').doc(input.targetId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'user_report_not_found');
    return projectUserReport(snap.id, snap.data()) as unknown as Row;
  }
  if (input.action === 'safety_set_disposition') {
    const snap = await db.collection('safety_flags').doc(input.targetId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'safety_flag_not_found');
    return safetyMutationState(snap.id, snap.data());
  }
  if (input.action === 'report_rename') {
    const uid = clean(input.payload.uid, 180);
    const newNameLower = clean(input.payload.newName, 32).toLowerCase();
    const [userSnap, leaderboardSnap, profileSnap, newIndexSnap, reportSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('leaderboard').doc(uid).get(),
      db.collection('public_profiles').doc(uid).get(),
      db.collection('name_index').doc(newNameLower).get(),
      db.collection('user_reports').doc(input.targetId).get(),
    ]);
    if (!userSnap.exists || !reportSnap.exists) throw new HttpsError('not-found', 'rename_target_not_found');
    const user = record(userSnap.data());
    const progress = record(user.progress);
    const currentNameLower = clean(progress.user_name_lower ?? progress.user_name, 32).toLowerCase();
    const oldIndexSnap = currentNameLower ? await db.collection('name_index').doc(currentNameLower).get() : null;
    return renameMutationState({
      uid,
      user: userSnap.data(),
      leaderboard: leaderboardSnap.exists ? leaderboardSnap.data() : null,
      publicProfile: profileSnap.exists ? profileSnap.data() : null,
      reportId: reportSnap.id,
      report: reportSnap.data(),
      oldNameIndex: oldIndexSnap?.exists ? oldIndexSnap.data() : null,
      newNameIndex: newIndexSnap.exists ? newIndexSnap.data() : null,
    });
  }
  if (input.action === 'user_ban' || input.action === 'user_unban') {
    const sourceReportId = input.action === 'user_ban' ? clean(input.payload.sourceReportId, 180) : '';
    const [banSnap, userSnap, leaderboardSnap, chatBanSnap, sourceReportSnap] = await Promise.all([
      db.collection('banned_users').doc(input.targetId).get(),
      db.collection('users').doc(input.targetId).get(),
      db.collection('leaderboard').doc(input.targetId).get(),
      db.collection('league_chat_bans').doc(input.targetId).get(),
      sourceReportId ? db.collection('user_reports').doc(sourceReportId).get() : Promise.resolve(null),
    ]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'ban_user_not_found');
    if (sourceReportId && !sourceReportSnap?.exists) throw new HttpsError('not-found', 'ban_source_report_not_found');
    const sourceReport = sourceReportSnap?.exists ? projectUserReport(sourceReportSnap.id, sourceReportSnap.data()) : null;
    if (sourceReport && clean(sourceReport.reportedUid, 180) !== input.targetId) throw new HttpsError('failed-precondition', 'ban_source_report_uid_mismatch');
    const ban = banSnap.exists ? record(banSnap.data()) : null;
    let banHistory: Row | null = null;
    if (input.action === 'user_unban') {
      let historyId = '';
      try { historyId = resolveBanHistoryIdForUnban(ban, input.payload.historyId, input.targetId); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'ban_history_invalid'); }
      const historySnap = await db.collection('admin_safety_moderation_history').doc(historyId).get();
      if (!historySnap.exists) throw new HttpsError('failed-precondition', 'ban_history_missing');
      banHistory = record(historySnap.data());
      try { assertBanHistoryForUnban(banHistory, input.targetId); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'ban_history_invalid'); }
    }
    return {
      uid: input.targetId,
      ban,
      usersBanned: record(userSnap.data()).banned === true,
      leaderboard: leaderboardSnap.exists ? record(leaderboardSnap.data()) : null,
      chatRestricted: chatBanSnap.exists,
      banHistory,
      sourceReport,
    };
  }
  const operationId = clean(input.payload.operationId, 180) || input.targetId;
  const historySnap = await db.collection('admin_safety_moderation_history').doc(operationId).get();
  if (!historySnap.exists) throw new HttpsError('not-found', 'moderation_history_not_found');
  const history = record(historySnap.data());
  const sourceAction = clean(history.action, 40);
  const targetId = clean(history.targetId, 180);
  let current: Row = {};
  if (sourceAction === 'report_set_status') {
    const snap = await db.collection('user_reports').doc(targetId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = reportMutationState(snap.id, snap.data());
  } else if (sourceAction === 'safety_set_disposition') {
    const snap = await db.collection('safety_flags').doc(targetId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = safetyMutationState(snap.id, snap.data());
  } else if (sourceAction === 'report_rename') {
    const originalBefore = record(history.before);
    const originalAfter = record(history.after);
    const uid = clean(originalBefore.uid, 180);
    const oldNameLower = clean(originalBefore.currentNameLower, 32);
    const newNameLower = clean(originalAfter.currentNameLower, 32);
    const [userSnap, leaderboardSnap, profileSnap, reportSnap, oldIndexSnap, newIndexSnap] = await Promise.all([
      db.collection('users').doc(uid).get(), db.collection('leaderboard').doc(uid).get(), db.collection('public_profiles').doc(uid).get(),
      db.collection('user_reports').doc(targetId).get(), db.collection('name_index').doc(oldNameLower).get(), db.collection('name_index').doc(newNameLower).get(),
    ]);
    if (!userSnap.exists || !reportSnap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = renameMutationState({
      uid, user: userSnap.data(), leaderboard: leaderboardSnap.exists ? leaderboardSnap.data() : null,
      publicProfile: profileSnap.exists ? profileSnap.data() : null, reportId: targetId, report: reportSnap.data(),
      oldNameIndex: oldIndexSnap.exists ? oldIndexSnap.data() : null, newNameIndex: newIndexSnap.exists ? newIndexSnap.data() : null,
    });
  } else throw new HttpsError('failed-precondition', 'restore_action_not_supported');
  return { id: historySnap.id, action: sourceAction, targetId, before: record(history.before), after: record(history.after), afterFingerprint: clean(history.afterFingerprint, 64), current };
}

function parseMutationOrHttps(value: unknown) {
  try { return parseSafetyModerationMutationInput(value); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_safety_mutation'); }
}

function controlFields(value: unknown) {
  const data = record(value);
  const previewId = safeId(data.previewId, 180);
  const approvalId = safeId(data.approvalId, 180);
  const reason = clean(data.reason, 500);
  const requestId = safeId(data.requestId, 160);
  const idempotencyKey = safeId(data.idempotencyKey, 180);
  const confirmation = clean(data.confirmation, 260);
  if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey required');
  return { previewId, approvalId, reason, requestId, idempotencyKey, confirmation };
}

function assertReplayOrHttps(operation: unknown, actorUid: string, requestFingerprint: string): void {
  try { assertModerationOperationReplay(operation, actorUid, requestFingerprint); }
  catch { throw new HttpsError('already-exists', 'idempotency_conflict'); }
}

export const adminPreviewSafetyModerationMutation = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const input = parseMutationOrHttps(request.data);
    const role = requireRole(request, requiredSafetyModerationMutationPermission(input.action));
    const db = admin.firestore();
    const before = await readMutationBefore(db, input);
    const nowMs = Date.now();
    const preview = buildSafetyModerationPreview(input, before, nowMs, request.auth!.uid, role);
    const previewRef = db.collection('admin_safety_moderation_previews').doc();
    await previewRef.create(preview);
    return {
      ok: true,
      previewId: previewRef.id,
      action: preview.action,
      targetId: preview.targetId,
      reason: preview.reason,
      before,
      fingerprint: preview.fingerprint,
      confirmation: preview.confirmation,
      requiresApproval: preview.requiresApproval,
      irreversible: preview.irreversible,
      risk: preview.risk,
      rollbackPath: preview.rollbackPath,
      createdAtMs: preview.createdAtMs,
      expiresAtMs: preview.expiresAtMs,
    };
  },
);

export const adminRequestSafetyModerationApproval = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    const fields = controlFields(request.data);
    if (!fields.previewId) throw new HttpsError('invalid-argument', 'previewId required');
    const actorUid = request.auth?.uid || '';
    if (!actorUid) throw new HttpsError('permission-denied', 'Admin only');
    const db = admin.firestore();
    const previewRef = db.collection('admin_safety_moderation_previews').doc(fields.previewId);
    const approvalRef = db.collection('admin_approval_requests').doc();
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = hash({ type: 'safety_moderation_approval_request', previewId: fields.previewId });
    return db.runTransaction(async (tx) => {
      const [previewSnap, operationSnap] = await Promise.all([tx.get(previewRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        assertReplayOrHttps(operationSnap.data(), actorUid, requestFingerprint);
        return { ok: true, approvalId: clean(operationSnap.data()?.approvalId, 180), replayed: true };
      }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'safety_preview_not_found');
      const preview = record(previewSnap.data());
      const action = clean(preview.action, 40) as SafetyModerationMutationAction;
      const role = requireRole(request, requiredSafetyModerationMutationPermission(action));
      if (preview.actorUid !== actorUid || preview.requiresApproval !== true || finite(preview.expiresAtMs) <= Date.now() || preview.consumedAtMs) throw new HttpsError('failed-precondition', 'safety_preview_not_eligible_for_approval');
      if (fields.reason !== clean(preview.reason, 500)) throw new HttpsError('failed-precondition', 'approval_reason_mismatch');
      const nowMs = Date.now();
      const approval = {
        type: 'safety_moderation', status: 'pending', previewId: fields.previewId, requestedBy: actorUid,
        requestedAtMs: nowMs, expiresAtMs: Math.min(finite(preview.expiresAtMs), nowMs + PREVIEW_TTL_MS),
        action, targetId: clean(preview.targetId, 180), fingerprint: clean(preview.fingerprint, 64),
        reason: clean(preview.reason, 500), risk: clean(preview.risk, 1_000),
        previewRequestId: clean(preview.requestId, 160),
      };
      const audit = createAuditRecord({ action: 'safety_moderation.approval.request', actorUid, role, entity: { collection: 'admin_approval_requests', id: approvalRef.id }, reason: fields.reason, before: {}, after: { action, targetId: approval.targetId, fingerprint: approval.fingerprint }, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.create(approvalRef, approval);
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, approvalId: approvalRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, approvalId: approvalRef.id, replayed: false };
    });
  },
);

export const adminListSafetyModerationApprovals = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requireRole(request, 'users.moderation.approve');
    const actorUid = request.auth!.uid;
    const nowMs = Date.now();
    const snap = await admin.firestore().collection('admin_approval_requests')
      .where('status', '==', 'pending')
      .limit(100)
      .get();
    const items = snap.docs
      .map((doc) => projectSafetyModerationApproval(doc.id, doc.data(), actorUid, nowMs))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.requestedAtMs - a.requestedAtMs);
    return { ok: true, generatedAtMs: nowMs, items };
  },
);

export const adminApproveSafetyModerationMutation = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    const fields = controlFields(request.data);
    if (!fields.approvalId) throw new HttpsError('invalid-argument', 'approvalId required');
    const role = requireRole(request, 'users.moderation.approve');
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const approvalRef = db.collection('admin_approval_requests').doc(fields.approvalId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = hash({ type: 'safety_moderation_approval', approvalId: fields.approvalId });
    return db.runTransaction(async (tx) => {
      const [approvalSnap, operationSnap] = await Promise.all([tx.get(approvalRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        assertReplayOrHttps(operationSnap.data(), actorUid, requestFingerprint);
        return { ok: true, replayed: true };
      }
      if (!approvalSnap.exists) throw new HttpsError('not-found', 'safety_approval_not_found');
      const approval = record(approvalSnap.data());
      try { assertSafetyApprovalCanBeApproved(approval, actorUid, Date.now()); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'approval_invalid'); }
      const nowMs = Date.now();
      const audit = createAuditRecord({ action: 'safety_moderation.approval.approve', actorUid, role, entity: { collection: 'admin_approval_requests', id: fields.approvalId }, reason: fields.reason, before: { status: approval.status }, after: { status: 'approved', action: approval.action, targetId: approval.targetId }, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.update(approvalRef, { status: 'approved', approvedBy: actorUid, approvedAtMs: nowMs, approvalReason: fields.reason });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, { actorUid, requestFingerprint, approvalId: fields.approvalId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false };
    });
  },
);

function normalizedAdminNickname(value: unknown): { name: string; nameLower: string } {
  const name = String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 32);
  if (name.length < 2 || /[\r\n\t]/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name) || /[@#]/.test(name)) throw new HttpsError('invalid-argument', 'name_invalid');
  return { name, nameLower: name.toLowerCase() };
}

async function readMutationBeforeInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  input: ReturnType<typeof parseSafetyModerationMutationInput>,
): Promise<Row> {
  if (input.action === 'report_archive_bulk') {
    const ids = input.payload.targetIds as string[];
    const snaps = await Promise.all(ids.map((id) => tx.get(db.collection('user_reports').doc(id))));
    if (snaps.some((snap) => !snap.exists)) throw new HttpsError('not-found', 'bulk_report_target_not_found');
    return { targets: snaps.map((snap) => projectUserReport(snap.id, snap.data())) };
  }
  if (input.action === 'safety_handle_bulk') {
    const ids = input.payload.targetIds as string[];
    const snaps = await Promise.all(ids.map((id) => tx.get(db.collection('safety_flags').doc(id))));
    if (snaps.some((snap) => !snap.exists)) throw new HttpsError('not-found', 'bulk_safety_target_not_found');
    return { targets: snaps.map((snap) => projectSafetyFlagSummary(snap.id, snap.data())) };
  }
  if (input.action === 'report_set_status') {
    const snap = await tx.get(db.collection('user_reports').doc(input.targetId));
    if (!snap.exists) throw new HttpsError('not-found', 'user_report_not_found');
    return reportMutationState(snap.id, snap.data());
  }
  if (input.action === 'report_warn') {
    const snap = await tx.get(db.collection('user_reports').doc(input.targetId));
    if (!snap.exists) throw new HttpsError('not-found', 'user_report_not_found');
    return projectUserReport(snap.id, snap.data()) as unknown as Row;
  }
  if (input.action === 'safety_set_disposition') {
    const snap = await tx.get(db.collection('safety_flags').doc(input.targetId));
    if (!snap.exists) throw new HttpsError('not-found', 'safety_flag_not_found');
    return safetyMutationState(snap.id, snap.data());
  }
  if (input.action === 'report_rename') {
    const uid = clean(input.payload.uid, 180);
    const { nameLower } = normalizedAdminNickname(input.payload.newName);
    const userRef = db.collection('users').doc(uid);
    const [userSnap, leaderboardSnap, profileSnap, newIndexSnap, reportSnap] = await Promise.all([
      tx.get(userRef), tx.get(db.collection('leaderboard').doc(uid)), tx.get(db.collection('public_profiles').doc(uid)),
      tx.get(db.collection('name_index').doc(nameLower)), tx.get(db.collection('user_reports').doc(input.targetId)),
    ]);
    if (!userSnap.exists || !reportSnap.exists) throw new HttpsError('not-found', 'rename_target_not_found');
    const user = record(userSnap.data());
    const progress = record(user.progress);
    const currentNameLower = clean(progress.user_name_lower ?? progress.user_name, 32).toLowerCase();
    const oldIndexSnap = currentNameLower ? await tx.get(db.collection('name_index').doc(currentNameLower)) : null;
    return renameMutationState({
      uid,
      user: userSnap.data(),
      leaderboard: leaderboardSnap.exists ? leaderboardSnap.data() : null,
      publicProfile: profileSnap.exists ? profileSnap.data() : null,
      reportId: reportSnap.id,
      report: reportSnap.data(),
      oldNameIndex: oldIndexSnap?.exists ? oldIndexSnap.data() : null,
      newNameIndex: newIndexSnap.exists ? newIndexSnap.data() : null,
    });
  }
  if (input.action === 'user_ban' || input.action === 'user_unban') {
    const refs = [
      db.collection('banned_users').doc(input.targetId), db.collection('users').doc(input.targetId),
      db.collection('leaderboard').doc(input.targetId), db.collection('league_chat_bans').doc(input.targetId),
    ];
    const [banSnap, userSnap, leaderboardSnap, chatBanSnap] = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (!userSnap.exists) throw new HttpsError('not-found', 'ban_user_not_found');
    const ban = banSnap.exists ? record(banSnap.data()) : null;
    const sourceReportId = input.action === 'user_ban' ? clean(input.payload.sourceReportId, 180) : '';
    const sourceReportSnap = sourceReportId ? await tx.get(db.collection('user_reports').doc(sourceReportId)) : null;
    if (sourceReportId && !sourceReportSnap?.exists) throw new HttpsError('not-found', 'ban_source_report_not_found');
    const sourceReport = sourceReportSnap?.exists ? projectUserReport(sourceReportSnap.id, sourceReportSnap.data()) : null;
    if (sourceReport && clean(sourceReport.reportedUid, 180) !== input.targetId) throw new HttpsError('failed-precondition', 'ban_source_report_uid_mismatch');
    let banHistory: Row | null = null;
    if (input.action === 'user_unban') {
      let historyId = '';
      try { historyId = resolveBanHistoryIdForUnban(ban, input.payload.historyId, input.targetId); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'ban_history_invalid'); }
      const historySnap = await tx.get(db.collection('admin_safety_moderation_history').doc(historyId));
      if (!historySnap.exists) throw new HttpsError('failed-precondition', 'ban_history_missing');
      banHistory = record(historySnap.data());
      try { assertBanHistoryForUnban(banHistory, input.targetId); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'ban_history_invalid'); }
    }
    return { uid: input.targetId, ban, usersBanned: record(userSnap.data()).banned === true, leaderboard: leaderboardSnap.exists ? record(leaderboardSnap.data()) : null, chatRestricted: chatBanSnap.exists, banHistory, sourceReport };
  }
  const historyId = clean(input.payload.operationId, 180) || input.targetId;
  const historySnap = await tx.get(db.collection('admin_safety_moderation_history').doc(historyId));
  if (!historySnap.exists) throw new HttpsError('not-found', 'moderation_history_not_found');
  const history = record(historySnap.data());
  const sourceAction = clean(history.action, 40);
  const targetId = clean(history.targetId, 180);
  let current: Row = {};
  if (sourceAction === 'report_set_status') {
    const snap = await tx.get(db.collection('user_reports').doc(targetId));
    if (!snap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = reportMutationState(snap.id, snap.data());
  } else if (sourceAction === 'safety_set_disposition') {
    const snap = await tx.get(db.collection('safety_flags').doc(targetId));
    if (!snap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = safetyMutationState(snap.id, snap.data());
  } else if (sourceAction === 'report_rename') {
    const originalBefore = record(history.before);
    const originalAfter = record(history.after);
    const uid = clean(originalBefore.uid, 180);
    const oldNameLower = clean(originalBefore.currentNameLower, 32);
    const newNameLower = clean(originalAfter.currentNameLower, 32);
    const [userSnap, leaderboardSnap, profileSnap, reportSnap, oldIndexSnap, newIndexSnap] = await Promise.all([
      tx.get(db.collection('users').doc(uid)), tx.get(db.collection('leaderboard').doc(uid)), tx.get(db.collection('public_profiles').doc(uid)),
      tx.get(db.collection('user_reports').doc(targetId)), tx.get(db.collection('name_index').doc(oldNameLower)), tx.get(db.collection('name_index').doc(newNameLower)),
    ]);
    if (!userSnap.exists || !reportSnap.exists) throw new HttpsError('not-found', 'restore_target_not_found');
    current = renameMutationState({
      uid, user: userSnap.data(), leaderboard: leaderboardSnap.exists ? leaderboardSnap.data() : null,
      publicProfile: profileSnap.exists ? profileSnap.data() : null, reportId: targetId, report: reportSnap.data(),
      oldNameIndex: oldIndexSnap.exists ? oldIndexSnap.data() : null, newNameIndex: newIndexSnap.exists ? newIndexSnap.data() : null,
    });
  } else throw new HttpsError('failed-precondition', 'restore_action_not_supported');
  return { id: historySnap.id, action: sourceAction, targetId, before: record(history.before), after: record(history.after), afterFingerprint: clean(history.afterFingerprint, 64), current };
}

async function assertNoNicknameCollision(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  name: string,
  nameLower: string,
  newNameOwnerUid: string,
): Promise<void> {
  if (newNameOwnerUid && newNameOwnerUid !== uid) {
    const ownerSnap = await tx.get(db.collection('users').doc(newNameOwnerUid));
    const owner = record(ownerSnap.data());
    if (ownerSnap.exists && owner.identityHidden !== true && owner.banned !== true) throw new HttpsError('already-exists', 'name_taken');
  }
  const [usersLower, usersExact, leaderboard] = await Promise.all([
    tx.get(db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5)),
    tx.get(db.collection('users').where('progress.user_name', '==', name).limit(5)),
    tx.get(db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5)),
  ]);
  const candidateUids = new Set([...usersLower.docs, ...usersExact.docs, ...leaderboard.docs].map((doc) => doc.id).filter((id) => id !== uid));
  for (const candidateUid of candidateUids) {
    const ownerSnap = usersLower.docs.find((doc) => doc.id === candidateUid) || usersExact.docs.find((doc) => doc.id === candidateUid) || await tx.get(db.collection('users').doc(candidateUid));
    const owner = record(ownerSnap.data());
    if (ownerSnap.exists && owner.identityHidden !== true && owner.banned !== true) throw new HttpsError('already-exists', 'name_taken');
  }
}

export const adminApplySafetyModerationMutation = onCall(
  { region: REGION, enforceAppCheck: true, timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    const fields = controlFields(request.data);
    if (!fields.previewId || !fields.confirmation) throw new HttpsError('invalid-argument', 'previewId and confirmation required');
    const actorUid = request.auth?.uid || '';
    if (!actorUid) throw new HttpsError('permission-denied', 'Admin only');
    const db = admin.firestore();
    const previewRef = db.collection('admin_safety_moderation_previews').doc(fields.previewId);
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('admin_safety_moderation_history').doc();
    const requestFingerprint = hash({ type: 'safety_moderation_apply', previewId: fields.previewId, approvalId: fields.approvalId, confirmation: fields.confirmation });
    return db.runTransaction(async (tx) => {
      const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
      if (operationSnap.exists) {
        assertReplayOrHttps(operationSnap.data(), actorUid, requestFingerprint);
        const prior = record(operationSnap.data());
        return { ok: true, action: prior.action, targetId: prior.targetId, historyId: prior.historyId, auditId: prior.auditId, replayed: true };
      }
      if (!previewSnap.exists) throw new HttpsError('not-found', 'safety_preview_not_found');
      const preview = record(previewSnap.data());
      const action = clean(preview.action, 40) as SafetyModerationMutationAction;
      const role = requireRole(request, requiredSafetyModerationMutationPermission(action));
      const nowMs = Date.now();
      if (preview.actorUid !== actorUid || preview.confirmation !== fields.confirmation || preview.reason !== fields.reason || finite(preview.expiresAtMs) <= nowMs || preview.consumedAtMs) throw new HttpsError('failed-precondition', 'safety_preview_invalid');
      const input = parseMutationOrHttps({ action, targetId: preview.targetId, reason: preview.reason, requestId: preview.requestId, payload: preview.payload });
      let approvalRef: FirebaseFirestore.DocumentReference | null = null;
      if (preview.requiresApproval === true) {
        if (!fields.approvalId) throw new HttpsError('failed-precondition', 'second_administrator_approval_required');
        approvalRef = db.collection('admin_approval_requests').doc(fields.approvalId);
        const approvalSnap = await tx.get(approvalRef);
        if (!approvalSnap.exists) throw new HttpsError('failed-precondition', 'safety_approval_not_found');
        try { assertSafetyApprovalForApply(approvalSnap.data(), { id: fields.previewId, ...preview }, actorUid, nowMs); }
        catch { throw new HttpsError('failed-precondition', 'approval_mismatch'); }
      }
      const before = await readMutationBeforeInTransaction(tx, db, input);
      if (hash(before) !== preview.beforeFingerprint) throw new HttpsError('failed-precondition', 'safety_target_changed');
      const payload = record(input.payload);
      let after: Row = {};
      let targetCount = 1;

      if (action === 'report_set_status') {
        const status = clean(payload.status, 30);
        const patch: Row = { status, reviewedAtMs: nowMs, reviewedAt: new Date(nowMs).toISOString(), reviewedBy: actorUid };
        if (status === 'archived') patch.archivedAt = new Date(nowMs).toISOString();
        tx.update(db.collection('user_reports').doc(input.targetId), patch);
        after = { ...projectUserReport(input.targetId, { ...before, ...patch }), mutableFields: patchExactFieldState(before.mutableFields, patch) };
      } else if (action === 'report_archive_bulk') {
        const ids = payload.targetIds as string[];
        targetCount = ids.length;
        ids.forEach((id) => tx.update(db.collection('user_reports').doc(id), { status: 'archived', reviewedAtMs: nowMs, reviewedAt: new Date(nowMs).toISOString(), reviewedBy: actorUid, archivedAt: new Date(nowMs).toISOString() }));
        after = { targetIds: ids, status: 'archived' };
      } else if (action === 'report_warn') {
        const uid = clean(payload.uid, 180);
        if (clean(before.reportedUid, 180) !== uid) throw new HttpsError('failed-precondition', 'warning_uid_mismatch');
        const warningId = `warn-${hash({ reportId: input.targetId, requestId: input.requestId }).slice(0, 32)}`;
        tx.create(db.collection('user_warnings').doc(warningId), { uid, name: clean(payload.name, 160), message: clean(payload.message, 2_000), active: true, reportId: input.targetId, createdAtMs: nowMs, createdAt: new Date(nowMs).toISOString(), createdBy: actorUid });
        tx.update(db.collection('user_reports').doc(input.targetId), { status: 'reviewed', reviewedAtMs: nowMs, reviewedAt: new Date(nowMs).toISOString(), reviewedBy: actorUid, warningId });
        after = projectUserReport(input.targetId, { ...before, status: 'reviewed' }) as unknown as Row;
      } else if (action === 'safety_set_disposition') {
        const handled = payload.handled !== false;
        const patch = { handled, disposition: clean(payload.disposition, 80), handlingNote: clean(payload.note, 1_000), handledBy: actorUid, handledAtMs: nowMs, handledAt: new Date(nowMs).toISOString() };
        tx.update(db.collection('safety_flags').doc(input.targetId), patch);
        after = { ...projectSafetyFlagSummary(input.targetId, { ...before, ...patch }), mutableFields: patchExactFieldState(before.mutableFields, patch) };
      } else if (action === 'safety_handle_bulk') {
        const ids = payload.targetIds as string[];
        targetCount = ids.length;
        ids.forEach((id) => tx.update(db.collection('safety_flags').doc(id), { handled: true, disposition: clean(payload.disposition, 80), handlingNote: clean(payload.note, 1_000), handledBy: actorUid, handledAtMs: nowMs, handledAt: new Date(nowMs).toISOString() }));
        after = { targetIds: ids, handled: true, disposition: clean(payload.disposition, 80) };
      } else if (action === 'report_rename') {
        const uid = clean(payload.uid, 180);
        const nickname = normalizedAdminNickname(payload.newName);
        await assertNoNicknameCollision(tx, db, uid, nickname.name, nickname.nameLower, clean(before.newNameOwnerUid, 180));
        const currentNameLower = clean(before.currentNameLower, 32);
        const newIndexRef = db.collection('name_index').doc(nickname.nameLower);
        const authUid = clean(before.authUid, 180);
        tx.set(newIndexRef, {
          uid,
          name: nickname.name,
          nameLower: nickname.nameLower,
          authUid: authUid || admin.firestore.FieldValue.delete(),
          identityHidden: admin.firestore.FieldValue.delete(),
          updatedAt: nowMs,
        }, { merge: true });
        if (currentNameLower && currentNameLower !== nickname.nameLower && before.oldNameOwnerUid === uid) tx.delete(db.collection('name_index').doc(currentNameLower));
        tx.set(db.collection('users').doc(uid), { progress: { user_name: nickname.name, user_name_lower: nickname.nameLower }, updatedAt: nowMs }, { merge: true });
        if (before.leaderboard) tx.set(db.collection('leaderboard').doc(uid), { name: nickname.name, nameLower: nickname.nameLower, updatedAt: nowMs }, { merge: true });
        if (before.publicProfile) tx.set(db.collection('public_profiles').doc(uid), { uid, name: nickname.name, nameLower: nickname.nameLower, updatedAt: nowMs }, { merge: true });
        const reportPatch = { status: 'reviewed', reviewedAtMs: nowMs, reviewedAt: new Date(nowMs).toISOString(), reviewedBy: actorUid };
        tx.update(db.collection('user_reports').doc(input.targetId), reportPatch);
        const previousOldIndex = before.oldNameIndex ? rawFromExactFieldState(before.oldNameIndex) : null;
        const previousNewIndex = before.newNameIndex ? rawFromExactFieldState(before.newNameIndex) : null;
        const newIndexAfter = withShallowPatch(previousNewIndex, {
          uid, name: nickname.name, nameLower: nickname.nameLower, updatedAt: nowMs,
          ...(authUid ? { authUid } : {}),
        }, authUid ? ['identityHidden'] : ['authUid', 'identityHidden']);
        const oldIndexAfter = currentNameLower === nickname.nameLower
          ? newIndexAfter
          : currentNameLower && before.oldNameOwnerUid === uid
            ? null
            : previousOldIndex;
        const reportBefore = record(before.report);
        const reportAfter = withShallowPatch(
          { ...reportBefore, ...rawFromExactFieldState(reportBefore.mutableFields) },
          reportPatch,
          ['mutableFields'],
        );
        const userAfter = {
          firebaseAuthUid: authUid,
          progress: { user_name: nickname.name, user_name_lower: nickname.nameLower },
          ...rawFromExactFieldState(before.userIdentityFields),
          updatedAt: nowMs,
        };
        const leaderboardAfter = before.leaderboard
          ? withShallowPatch(before.leaderboard, { name: nickname.name, nameLower: nickname.nameLower, updatedAt: nowMs })
          : null;
        const publicProfileAfter = before.publicProfile
          ? withShallowPatch(before.publicProfile, { uid, name: nickname.name, nameLower: nickname.nameLower, updatedAt: nowMs })
          : null;
        after = renameMutationState({
          uid,
          user: userAfter,
          leaderboard: leaderboardAfter,
          publicProfile: publicProfileAfter,
          reportId: input.targetId,
          report: reportAfter,
          oldNameIndex: oldIndexAfter,
          newNameIndex: newIndexAfter,
        });
      } else if (action === 'user_ban') {
        if (before.ban) throw new HttpsError('failed-precondition', 'user_already_banned');
        const writes = buildBanWrites({ uid: input.targetId, name: payload.name, reason: input.reason, actorUid, nowMs, leaderboardBefore: before.leaderboard, sourceReportId: payload.sourceReportId, source: payload.source });
        tx.create(db.collection('banned_users').doc(input.targetId), { ...writes.bannedDocument, banHistoryId: historyRef.id });
        tx.set(db.collection('users').doc(input.targetId), writes.userPatch, { merge: true });
        if (before.leaderboard) tx.delete(db.collection('leaderboard').doc(input.targetId));
        if (writes.reportPatch && payload.sourceReportId) tx.update(db.collection('user_reports').doc(clean(payload.sourceReportId, 180)), writes.reportPatch);
        after = { globalState: 'banned', uid: input.targetId, leaderboardCaptured: Boolean(before.leaderboard), chatRestrictionChanged: false, banWrites: writes };
      } else if (action === 'user_unban') {
        if (!before.ban) throw new HttpsError('failed-precondition', 'user_not_banned');
        const priorHistory = record(record(before.banHistory).after);
        const leaderboardBefore = record(priorHistory.banWrites).history ? record(record(priorHistory.banWrites).history).leaderboardBefore : null;
        const writes = buildUnbanWrites({ uid: input.targetId, actorUid, nowMs, leaderboardBefore, leaderboardCurrent: before.leaderboard });
        tx.delete(db.collection('banned_users').doc(input.targetId));
        tx.set(db.collection('users').doc(input.targetId), writes.userPatch, { merge: true });
        if (writes.restoreLeaderboard) tx.create(db.collection('leaderboard').doc(input.targetId), writes.restoreLeaderboard);
        after = { globalState: 'active', uid: input.targetId, leaderboardRestoreState: writes.restoreState, chatRestrictionChanged: false };
      } else {
        const history = before;
        const current = record(history.current);
        if (hash(current) !== clean(history.afterFingerprint, 64)) throw new HttpsError('failed-precondition', 'restore_target_changed');
        const originalBefore = record(history.before);
        if (history.action === 'report_set_status') {
          tx.update(db.collection('user_reports').doc(clean(history.targetId, 180)), restoreExactFieldPatch(originalBefore.mutableFields));
        } else if (history.action === 'safety_set_disposition') {
          tx.update(db.collection('safety_flags').doc(clean(history.targetId, 180)), restoreExactFieldPatch(originalBefore.mutableFields));
        } else if (history.action === 'report_rename') {
          const uid = clean(originalBefore.uid, 180);
          const oldNameLower = clean(originalBefore.currentNameLower, 32);
          const newNameLower = clean(record(history.after).currentNameLower, 32);
          const progressPatch = restoreExactFieldPatch(originalBefore.userProgressFields);
          const userPatch: Row = restoreExactFieldPatch(originalBefore.userIdentityFields);
          Object.entries(progressPatch).forEach(([field, value]) => { userPatch[`progress.${field}`] = value; });
          tx.update(db.collection('users').doc(uid), userPatch);
          if (originalBefore.leaderboardIdentityFields) tx.set(db.collection('leaderboard').doc(uid), restoreExactFieldPatch(originalBefore.leaderboardIdentityFields), { merge: true });
          if (originalBefore.publicProfileIdentityFields) tx.set(db.collection('public_profiles').doc(uid), restoreExactFieldPatch(originalBefore.publicProfileIdentityFields), { merge: true });
          tx.update(db.collection('user_reports').doc(clean(history.targetId, 180)), restoreExactFieldPatch(record(originalBefore.report).mutableFields));
          if (oldNameLower === newNameLower) {
            const originalIndex = originalBefore.oldNameIndex || originalBefore.newNameIndex;
            if (originalIndex) tx.set(db.collection('name_index').doc(oldNameLower), restoreExactFieldPatch(originalIndex), { merge: true });
            else tx.delete(db.collection('name_index').doc(oldNameLower));
          } else {
            if (originalBefore.oldNameIndex) tx.set(db.collection('name_index').doc(oldNameLower), restoreExactFieldPatch(originalBefore.oldNameIndex), { merge: true });
            else tx.delete(db.collection('name_index').doc(oldNameLower));
            if (originalBefore.newNameIndex) tx.set(db.collection('name_index').doc(newNameLower), restoreExactFieldPatch(originalBefore.newNameIndex), { merge: true });
            else tx.delete(db.collection('name_index').doc(newNameLower));
          }
        }
        after = { restoredHistoryId: history.id, restoredAction: history.action, targetId: history.targetId };
      }

      const afterFingerprint = hash(after);
      const auditProjection = buildModerationAuditProjection(preview, targetCount);
      const audit = createAuditRecord({ action: `safety_moderation.${action}`, actorUid, role, entity: { collection: 'admin_safety_moderation_history', id: historyRef.id }, reason: fields.reason, before: { fingerprint: preview.beforeFingerprint }, after: auditProjection, rollbackReference: preview.irreversible === true ? null : `admin_safety_moderation_history/${historyRef.id}`, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
      tx.create(historyRef, { action, targetId: input.targetId, targetCount, actorUid, role, reason: fields.reason, requestId: fields.requestId, before, after, beforeFingerprint: preview.beforeFingerprint, afterFingerprint, irreversible: preview.irreversible === true, createdAtMs: nowMs, operationId: fields.idempotencyKey });
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: fields.idempotencyKey });
      if (approvalRef) tx.update(approvalRef, { status: 'consumed', consumedAtMs: nowMs, consumedBy: actorUid });
      tx.create(operationRef, { actorUid, requestFingerprint, action, targetId: input.targetId, targetCount, historyId: historyRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, action, targetId: input.targetId, targetCount, historyId: historyRef.id, auditId: auditRef.id, replayed: false };
    });
  },
);

async function writeSensitiveAccessAudit(db: FirebaseFirestore.Firestore, input: { actorUid: string; role: string; flagId: string; category: string; reason: string; requestId: string }): Promise<string> {
  const auditRef = db.collection('admin_log').doc();
  const audit = createAuditRecord({
    action: 'safety_moderation.sensitive_detail.view',
    actorUid: input.actorUid,
    role: input.role as never,
    entity: { collection: 'safety_flags', id: input.flagId },
    reason: input.reason,
    before: {},
    after: { category: input.category, fieldsViewed: ['message', 'conversation_context'] },
    requestId: input.requestId,
    timestamp: new Date().toISOString(),
  });
  await auditRef.create(audit);
  return auditRef.id;
}
