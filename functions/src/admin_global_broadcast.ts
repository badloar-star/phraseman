import * as admin from 'firebase-admin';
import { createHash, randomBytes } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS } from './callable_options';
import {
  FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS,
  GLOBAL_BROADCAST_PUBLIC_SCHEMA_HASH,
  GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION,
  PUBLIC_GLOBAL_BROADCAST_FIELDS,
  inspectGlobalBroadcastPublicAuthority,
} from './global_broadcast_public_schema';

export {
  FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS,
  PUBLIC_GLOBAL_BROADCAST_FIELDS,
} from './global_broadcast_public_schema';

const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const SCRUB_CURSOR_RE = /^[A-Za-z0-9_-]{32}$/;
const SCRUB_CURSOR_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_BROADCASTS = 100;
const MAX_OPERATION_STATUS_IDS = 8;
const MAX_SCRUB_PAGE = 50;
export const GLOBAL_BROADCAST_FINAL_VERIFY_CAP = 500;
const MAX_SHARD_REWARD = 1000;
const LANGUAGE_KEYS = ['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl'] as const;
const LANGUAGE_SUFFIXES = {
  ru: 'Ru',
  uk: 'Uk',
  es: 'Es',
  ptBr: 'PtBr',
  vi: 'Vi',
  id: 'Id',
  tr: 'Tr',
  pl: 'Pl',
} as const;
const REWARD_TYPES = [
  'none',
  'shards',
  'xp_boost_2x_24h',
  'xp_boost_2x_48h',
  'chain_shield_1',
  'chain_shield_3',
  'club_boost_free',
  'wager_discount_25',
  'pack_trial_48h',
] as const;

type Row = Record<string, unknown>;
type LanguageKey = (typeof LANGUAGE_KEYS)[number];
type RewardType = (typeof REWARD_TYPES)[number];
type LocalizedText = Readonly<Record<LanguageKey, string>>;

export const GLOBAL_BROADCAST_SOURCE_ARTIFACT_HASHES = Object.freeze({
  globalBroadcastClaimSourceSha256: '69e02143c6503ffbd98065de88c59910164908a2d8c96251d88fe5cba66f4a59',
  globalBroadcastPublicSourceSha256: '8a8780755ec2a5bac303073f901bbf955df500d4c20612f8ba99d9c17f7b1c4e',
  communityPacksSourceSha256: '86df771985c056e98d9dd45a3454fd65a11ce80317047ad2ad7cad988145b553',
});
export const GLOBAL_BROADCAST_APP_QUERY_ARTIFACT = Object.freeze({
  version: 'global-broadcast-callable-reader-v2',
  sourceSha256: '28a658b4a66ac5ba697fc959bff3f7a39a3bc4f6df18993985c115ed0b2247e9',
});

export interface GlobalBroadcastPublishInput {
  readonly rewardType: RewardType;
  readonly rewardAmount: number;
  readonly titles: LocalizedText;
  readonly messages: LocalizedText;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

export interface GlobalBroadcastDeactivateInput {
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

export interface GlobalBroadcastScrubInput extends GlobalBroadcastDeactivateInput {
  readonly dryRun: boolean;
  readonly limit: number;
  readonly cursor: string | null;
}

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function requiredCommandFields(data: Row): GlobalBroadcastDeactivateInput {
  const reason = text(data.reason, 500);
  const idempotencyKey = text(data.idempotencyKey, 160);
  const requestId = text(data.requestId, 160);
  if (!reason || !TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
  }
  return Object.freeze({ reason, idempotencyKey, requestId });
}

function localizedText(value: unknown, max: number, field: string): LocalizedText {
  const source = isRecord(value) ? value : {};
  const ru = text(source.ru, max);
  if (!ru) throw new HttpsError('invalid-argument', `RU ${field} is required`);
  return Object.freeze(Object.fromEntries(
    LANGUAGE_KEYS.map((language) => [language, text(source[language], max) || ru]),
  ) as Record<LanguageKey, string>);
}

function rewardType(value: unknown): RewardType {
  const candidate = text(value, 40);
  if (!(REWARD_TYPES as readonly string[]).includes(candidate)) {
    throw new HttpsError('invalid-argument', 'unsupported broadcast reward');
  }
  return candidate as RewardType;
}

export function normalizeGlobalBroadcastPublishInput(data: unknown): GlobalBroadcastPublishInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'publish request required');
  const command = requiredCommandFields(data);
  const normalizedRewardType = rewardType(data.rewardType);
  const rawRewardAmount = Number(data.rewardAmount ?? 0);
  if (!Number.isFinite(rawRewardAmount)) throw new HttpsError('invalid-argument', 'rewardAmount is invalid');
  const integerRewardAmount = Math.floor(rawRewardAmount);
  if (normalizedRewardType === 'shards' && (integerRewardAmount < 1 || integerRewardAmount > MAX_SHARD_REWARD)) {
    throw new HttpsError('invalid-argument', `shard reward must be between 1 and ${MAX_SHARD_REWARD}`);
  }
  const rewardAmount = normalizedRewardType === 'shards' ? integerRewardAmount : 0;
  return Object.freeze({
    rewardType: normalizedRewardType,
    rewardAmount,
    titles: localizedText(data.titles, 160, 'title'),
    messages: localizedText(data.messages, 2000, 'message'),
    ...command,
  });
}

export function normalizeGlobalBroadcastDeactivateInput(data: unknown): GlobalBroadcastDeactivateInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'deactivation request required');
  return requiredCommandFields(data);
}

export function normalizeGlobalBroadcastScrubInput(data: unknown): GlobalBroadcastScrubInput {
  if (!isRecord(data) || typeof data.dryRun !== 'boolean') {
    throw new HttpsError('invalid-argument', 'scrub command and dryRun are required');
  }
  const command = requiredCommandFields(data);
  const requestedLimit = Number(data.limit ?? 25);
  if (!Number.isFinite(requestedLimit)) throw new HttpsError('invalid-argument', 'limit is invalid');
  const rawCursor = data.cursor == null || data.cursor === '' ? null : text(data.cursor, 160);
  if (rawCursor !== null && !SCRUB_CURSOR_RE.test(rawCursor)) throw new HttpsError('invalid-argument', 'cursor is invalid');
  return Object.freeze({
    ...command,
    dryRun: data.dryRun,
    limit: Math.max(1, Math.min(MAX_SCRUB_PAGE, Math.floor(requestedLimit))),
    cursor: rawCursor,
  });
}

export function createGlobalBroadcastScrubCursorToken(): string {
  return randomBytes(24).toString('base64url');
}

export function resolveGlobalBroadcastScrubCursorOperation(
  token: string,
  operation: Row,
  actorUid: string,
  nowMs: number,
): string {
  const documentId = operation.cursorAfterDocumentId;
  if (
    !SCRUB_CURSOR_RE.test(token)
    || operation.action !== 'global_broadcast_scrub_cursor'
    || operation.actorUid !== actorUid
    || typeof documentId !== 'string'
    || documentId.length === 0
    || documentId.includes('/')
    || Buffer.byteLength(documentId, 'utf8') > 1500
    || !Number.isFinite(Number(operation.expiresAtMs))
    || Number(operation.expiresAtMs) <= nowMs
  ) {
    throw new HttpsError('failed-precondition', 'scrub_cursor_invalid_or_expired');
  }
  return documentId;
}

export function normalizeGlobalBroadcastListInput(data: unknown): { limit: number; operationIds: string[] } {
  const input = isRecord(data) ? data : {};
  const requested = Number(input.limit ?? 20);
  const finite = Number.isFinite(requested) ? Math.floor(requested) : 20;
  const rawOperationIds = input.operationIds == null ? [] : input.operationIds;
  if (!Array.isArray(rawOperationIds)) throw new HttpsError('invalid-argument', 'operationIds must be an array');
  if (rawOperationIds.length > MAX_OPERATION_STATUS_IDS) {
    throw new HttpsError('resource-exhausted', `at most ${MAX_OPERATION_STATUS_IDS} operationIds are allowed`);
  }
  const operationIds = [...new Set(rawOperationIds.map((value) => text(value, 160)))];
  if (operationIds.some((operationId) => !TOKEN_RE.test(operationId))) {
    throw new HttpsError('invalid-argument', 'operationIds contain an invalid id');
  }
  return Object.freeze({ limit: Math.max(1, Math.min(50, finite)), operationIds });
}

export function globalBroadcastFingerprint(
  action: 'publish' | 'deactivate',
  input: GlobalBroadcastPublishInput | GlobalBroadcastDeactivateInput,
): string {
  if (action === 'publish') {
    const publish = input as GlobalBroadcastPublishInput;
    return createHash('sha256').update(JSON.stringify({
      action,
      rewardType: publish.rewardType,
      rewardAmount: publish.rewardAmount,
      titles: { ru: publish.titles.ru, uk: publish.titles.uk },
      messages: { ru: publish.messages.ru, uk: publish.messages.uk },
      reason: publish.reason,
    })).digest('hex');
  }
  return createHash('sha256').update(JSON.stringify({ action, reason: input.reason })).digest('hex');
}

function globalBroadcastScrubFingerprint(input: GlobalBroadcastScrubInput): string {
  return createHash('sha256').update(JSON.stringify({
    action: 'global_broadcast_metadata_scrub',
    dryRun: input.dryRun,
    limit: input.limit,
    cursor: input.cursor,
    reason: input.reason,
  })).digest('hex');
}

function globalBroadcastPrivacyVerifyFingerprint(input: GlobalBroadcastDeactivateInput): string {
  return createHash('sha256').update(JSON.stringify({
    action: 'global_broadcast_privacy_verify',
    reason: input.reason,
  })).digest('hex');
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(text(value, 80));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function projectGlobalBroadcastRow(id: string, row: Row): Readonly<Row> {
  const legacyAmount = Math.max(0, Math.floor(Number(row.rewardAmount ?? row.shards ?? 0) || 0));
  const rawRewardType = text(row.rewardType, 40);
  const normalizedRewardType = (REWARD_TYPES as readonly string[]).includes(rawRewardType)
    ? rawRewardType
    : legacyAmount > 0 ? 'shards' : 'none';
  const projected: Row = {
    id,
    active: row.active === true,
    rewardType: normalizedRewardType,
    rewardAmount: normalizedRewardType === 'shards' ? legacyAmount : 0,
    createdAt: text(row.createdAt, 80),
    createdAtMs: millis(row.createdAtMs ?? row.createdAt),
    deactivatedAt: text(row.deactivatedAt, 80) || null,
    replacedAt: text(row.replacedAt, 80) || null,
  };
  for (const language of LANGUAGE_KEYS) {
    const suffix = LANGUAGE_SUFFIXES[language];
    projected[`title${suffix}`] = text(row[`title${suffix}`], 160);
    projected[`message${suffix}`] = text(row[`message${suffix}`], 2000);
  }
  return Object.freeze(projected);
}

export function forbiddenGlobalBroadcastMetadataKeys(row: Row): string[] {
  return FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(row, field));
}

export function planGlobalBroadcastMetadataMigration(row: Row): {
  forbiddenKeys: string[];
  unknownKeys: string[];
  needsPublicMarker: boolean;
  needsPublicValidation: boolean;
} {
  const publicFields = new Set<string>(PUBLIC_GLOBAL_BROADCAST_FIELDS);
  const forbiddenFields = new Set<string>(FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS);
  return {
    forbiddenKeys: forbiddenGlobalBroadcastMetadataKeys(row),
    unknownKeys: Object.keys(row).filter((field) => !publicFields.has(field) && !forbiddenFields.has(field)).sort(),
    needsPublicMarker: row.publicPayloadSchemaVersion !== GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION,
    needsPublicValidation: row.publicPayloadValidatedV1 !== true,
  };
}

function globalBroadcastMetadataDeletePatch(row: Row): Row {
  const plan = planGlobalBroadcastMetadataMigration(row);
  if (plan.unknownKeys.length > 0) return {};
  const patch: Row = Object.fromEntries(
    plan.forbiddenKeys.map((field) => [field, admin.firestore.FieldValue.delete()]),
  );
  if (plan.needsPublicMarker) {
    patch.publicPayloadSchemaVersion = GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION;
  }
  if (plan.needsPublicValidation) patch.publicPayloadValidatedV1 = true;
  return patch;
}

export function buildGlobalBroadcastPrivacyVerificationResult(input: {
  rows: readonly Row[];
  projectId: string;
  environment: string;
  generation: number;
  operationId: string;
  actorUid: string;
  auditId: string;
  startedAtMs: number;
  finishedAtMs: number;
}): Readonly<Row> {
  const truncated = input.rows.length > GLOBAL_BROADCAST_FINAL_VERIFY_CAP;
  const rows = input.rows.slice(0, GLOBAL_BROADCAST_FINAL_VERIFY_CAP);
  const inspections = rows.map(inspectGlobalBroadcastPublicAuthority);
  const unsafeCount = inspections.filter((inspection) => !inspection.valid).length;
  const unknownCount = inspections.filter((inspection) => inspection.unknownKeys.length > 0).length;
  const forbiddenCount = inspections.filter((inspection) => inspection.forbiddenKeys.length > 0).length;
  const unvalidatedCount = inspections.filter((inspection) => !inspection.serverValidationValid).length;
  const wrongSchemaCount = inspections.filter((inspection) => !inspection.schemaVersionValid).length;
  const complete = !truncated;
  const ready = complete && unsafeCount === 0;
  const verificationReceipt = ready ? Object.freeze({
    receiptType: 'global_broadcast_privacy_final_v1',
    scope: 'aggregate',
    projectId: input.projectId,
    environment: input.environment,
    schemaVersion: GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION,
    schemaAllowlistHash: GLOBAL_BROADCAST_PUBLIC_SCHEMA_HASH,
    generation: input.generation,
    scannedCount: rows.length,
    unsafeCount,
    unknownCount,
    forbiddenCount,
    unvalidatedCount,
    wrongSchemaCount,
    complete: true,
    functionArtifactHashes: GLOBAL_BROADCAST_SOURCE_ARTIFACT_HASHES,
    appQueryArtifact: GLOBAL_BROADCAST_APP_QUERY_ARTIFACT,
    startedAtMs: input.startedAtMs,
    finishedAtMs: input.finishedAtMs,
    operationId: input.operationId,
    actorUid: input.actorUid,
    auditId: input.auditId,
  }) : null;
  return Object.freeze({
    ready,
    complete,
    truncated,
    scannedCount: rows.length,
    unsafeCount,
    unknownCount,
    forbiddenCount,
    unvalidatedCount,
    wrongSchemaCount,
    verificationReceipt,
    sourceHealth: {
      state: ready ? 'ready' : truncated ? 'partial' : 'error',
      complete,
      truncated,
    },
  });
}

function invalidateGlobalBroadcastPrivacyVerification(
  tx: FirebaseFirestore.Transaction,
  stateRef: FirebaseFirestore.DocumentReference,
  nowMs: number,
): void {
  tx.set(stateRef, {
    generation: admin.firestore.FieldValue.increment(1),
    latestVerificationOperationId: admin.firestore.FieldValue.delete(),
    latestVerificationAuditId: admin.firestore.FieldValue.delete(),
    lastVerificationReady: false,
    verificationInvalidatedAtMs: nowMs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

function roleFor(request: { auth?: { uid?: string; token?: Row } }, permission: 'campaigns.read' | 'campaigns.write'): {
  actorUid: string;
  actorEmail: string;
  role: AdminRole;
} {
  const actorUid = text(request.auth?.uid, 160);
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return { actorUid, actorEmail: text(token.email, 320) || actorUid, role };
}

function assertReplay(operation: Row, fingerprint: string, actorUid: string, action: string): void {
  if (operation.action !== action) {
    throw new HttpsError('already-exists', 'idempotencyKey belongs to another admin action');
  }
  if (operation.requestFingerprint !== fingerprint) {
    throw new HttpsError('already-exists', 'idempotencyKey reused for another broadcast command');
  }
  if (!operation.actorUid || operation.actorUid !== actorUid) {
    throw new HttpsError('permission-denied', 'admin operation belongs to another actor');
  }
}

function replayResult(operation: Row): Row {
  const result = isRecord(operation.result) ? operation.result : {};
  if (operation.action === 'global_broadcast_metadata_scrub') {
    const truncated = result.truncated === true;
    const blockedUnknownCount = Math.max(0, Math.floor(Number(result.blockedUnknownCount ?? 0) || 0));
    const complete = !truncated && blockedUnknownCount === 0;
    return {
      ok: true,
      replayed: true,
      dryRun: result.dryRun === true,
      cursor: text(result.cursor, 160) || null,
      nextCursor: text(result.nextCursor, 160) || null,
      scannedCount: Math.max(0, Math.floor(Number(result.scannedCount ?? 0) || 0)),
      affectedCount: Math.max(0, Math.floor(Number(result.affectedCount ?? 0) || 0)),
      changedCount: Math.max(0, Math.floor(Number(result.changedCount ?? 0) || 0)),
      blockedUnknownCount,
      truncated,
      sourceHealth: { state: blockedUnknownCount > 0 ? 'error' : truncated ? 'partial' : 'ready', complete, truncated },
      auditId: text(operation.auditId, 160),
    };
  }
  if (operation.action === 'global_broadcast_privacy_verify') {
    return {
      ok: true,
      replayed: true,
      ...result,
      auditId: text(operation.auditId, 160),
    };
  }
  return {
    ok: true,
    replayed: true,
    broadcastId: text(result.broadcastId, 160) || null,
    deactivatedCount: Math.max(0, Math.floor(Number(result.deactivatedCount ?? 0) || 0)),
    auditId: text(operation.auditId, 160),
  };
}

export function projectGlobalBroadcastOperationStatus(
  operationId: string,
  operation: Row,
  actorUid: string,
): Readonly<Row> {
  const action = text(operation.action, 80);
  const owned = text(operation.actorUid, 160) === actorUid;
  if (!owned || ![
    'global_broadcast_send',
    'global_broadcast_deactivate',
    'global_broadcast_metadata_scrub',
    'global_broadcast_privacy_verify',
  ].includes(action)) {
    return Object.freeze({ operationId, status: 'conflict' });
  }
  return Object.freeze({
    operationId,
    status: 'completed',
    receipt: replayResult(operation),
  });
}

export function buildGlobalBroadcastPublicDocument(input: GlobalBroadcastPublishInput, nowMs: number): Row {
  const createdAt = new Date(nowMs).toISOString();
  const document: Row = {
    publicPayloadSchemaVersion: GLOBAL_BROADCAST_PUBLIC_SCHEMA_VERSION,
    publicPayloadValidatedV1: true,
    kind: 'general',
    premiumAudience: 'all',
    active: true,
    rewardType: input.rewardType,
    rewardAmount: input.rewardAmount,
    shards: input.rewardType === 'shards' ? input.rewardAmount : 0,
    createdAt,
    createdAtMs: nowMs,
  };
  for (const language of LANGUAGE_KEYS) {
    const suffix = LANGUAGE_SUFFIXES[language];
    document[`title${suffix}`] = input.titles[language];
    document[`message${suffix}`] = input.messages[language];
  }
  return document;
}

export const adminListGlobalBroadcasts = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const context = roleFor(request, 'campaigns.read');
    const input = normalizeGlobalBroadcastListInput(request.data);
    const db = admin.firestore();
    const collection = db.collection('global_broadcast_modals');
    const operationRefs = input.operationIds.map((operationId) => db.collection('admin_command_operations').doc(operationId));
    const [activeSnapshot, historySnapshot, operationSnapshots] = await Promise.all([
      collection.where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1).get(),
      collection.orderBy('createdAt', 'desc').limit(input.limit + 1).get(),
      operationRefs.length ? db.getAll(...operationRefs) : Promise.resolve([]),
    ]);
    const historyTruncated = historySnapshot.size > input.limit;
    const historyDocs = historySnapshot.docs.slice(0, input.limit);
    const merged = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const doc of [...activeSnapshot.docs, ...historyDocs]) merged.set(doc.id, doc);
    return {
      ok: true,
      items: [...merged.values()].map((doc) => projectGlobalBroadcastRow(doc.id, doc.data() as Row)),
      activeCount: activeSnapshot.size,
      activeTruncated: activeSnapshot.size > MAX_ACTIVE_BROADCASTS,
      historyTruncated,
      operations: input.operationIds.map((operationId, index) => {
        const snapshot = operationSnapshots[index];
        return snapshot?.exists
          ? projectGlobalBroadcastOperationStatus(operationId, snapshot.data() as Row, context.actorUid)
          : { operationId, status: 'not_found' };
      }),
      fetchedAtMs: Date.now(),
    };
  },
);

export const adminPublishGlobalBroadcast = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const context = roleFor(request, 'campaigns.write');
    const input = normalizeGlobalBroadcastPublishInput(request.data);
    const db = admin.firestore();
    const broadcastRef = db.collection('global_broadcast_modals').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const privacyStateRef = db.collection('admin_config').doc('global_broadcast_privacy_state');
    const fingerprint = globalBroadcastFingerprint('publish', input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const activeQuery = db.collection('global_broadcast_modals').where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1);

    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_send');
        return replayResult(operation);
      }

      const activeSnapshot = await tx.get(activeQuery);
      if (activeSnapshot.size > MAX_ACTIVE_BROADCASTS) {
        throw new HttpsError('failed-precondition', 'too many active broadcasts to replace safely');
      }
      const activeIds = activeSnapshot.docs.map((doc) => doc.id).sort();
      const document = buildGlobalBroadcastPublicDocument(input, nowMs);
      for (const active of activeSnapshot.docs) {
        tx.update(active.ref, {
          active: false,
          replacedAt: nowIso,
          replacedAtMs: nowMs,
        });
      }
      const audit = createAuditRecord({
        action: 'global_broadcast_send',
        actorUid: context.actorUid,
        role: context.role,
        entity: { collection: 'global_broadcast_modals', id: broadcastRef.id },
        reason: input.reason,
        before: { activeIds },
        after: {
          broadcastId: broadcastRef.id,
          active: true,
          rewardType: input.rewardType,
          rewardAmount: input.rewardAmount,
          titleRu: input.titles.ru,
          messageRu: input.messages.ru,
        },
        rollbackReference: activeIds[0] ?? null,
        requestId: input.requestId,
        timestamp: nowIso,
      });
      const result = { broadcastId: broadcastRef.id, deactivatedCount: activeIds.length };
      invalidateGlobalBroadcastPrivacyVerification(tx, privacyStateRef, nowMs);
      tx.create(broadcastRef, document);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        action: 'global_broadcast_send',
        requestFingerprint: fingerprint,
        actorUid: context.actorUid,
        auditId: auditRef.id,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
  },
);

export const adminDeactivateGlobalBroadcast = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const context = roleFor(request, 'campaigns.write');
    const input = normalizeGlobalBroadcastDeactivateInput(request.data);
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const privacyStateRef = db.collection('admin_config').doc('global_broadcast_privacy_state');
    const fingerprint = globalBroadcastFingerprint('deactivate', input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const activeQuery = db.collection('global_broadcast_modals').where('active', '==', true).limit(MAX_ACTIVE_BROADCASTS + 1);

    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_deactivate');
        return replayResult(operation);
      }

      const activeSnapshot = await tx.get(activeQuery);
      if (activeSnapshot.size > MAX_ACTIVE_BROADCASTS) {
        throw new HttpsError('failed-precondition', 'too many active broadcasts to deactivate safely');
      }
      const activeIds = activeSnapshot.docs.map((doc) => doc.id).sort();
      for (const active of activeSnapshot.docs) {
        tx.update(active.ref, {
          active: false,
          deactivatedAt: nowIso,
          deactivatedAtMs: nowMs,
        });
      }
      const audit = createAuditRecord({
        action: 'global_broadcast_deactivate',
        actorUid: context.actorUid,
        role: context.role,
        entity: { collection: 'global_broadcast_modals', id: 'active' },
        reason: input.reason,
        before: { activeIds },
        after: { activeIds: [], deactivatedCount: activeIds.length },
        rollbackReference: activeIds[0] ?? null,
        requestId: input.requestId,
        timestamp: nowIso,
      });
      const result = { broadcastId: null, deactivatedCount: activeIds.length };
      if (activeIds.length > 0) invalidateGlobalBroadcastPrivacyVerification(tx, privacyStateRef, nowMs);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        action: 'global_broadcast_deactivate',
        requestFingerprint: fingerprint,
        actorUid: context.actorUid,
        auditId: auditRef.id,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
  },
);

export const adminScrubGlobalBroadcastMetadata = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const context = roleFor(request, 'campaigns.write');
    if (context.role !== 'owner') throw new HttpsError('permission-denied', 'Owner role required for broadcast privacy scrub');
    const input = normalizeGlobalBroadcastScrubInput(request.data);
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const privacyStateRef = db.collection('admin_config').doc('global_broadcast_privacy_state');
    const fingerprint = globalBroadcastScrubFingerprint(input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_metadata_scrub');
        return replayResult(operation);
      }
      let cursorAfterDocumentId: string | null = null;
      if (input.cursor) {
        const cursorSnapshot = await tx.get(db.collection('admin_command_operations').doc(`gbc_${input.cursor}`));
        if (!cursorSnapshot.exists) throw new HttpsError('failed-precondition', 'scrub_cursor_invalid_or_expired');
        cursorAfterDocumentId = resolveGlobalBroadcastScrubCursorOperation(
          input.cursor,
          cursorSnapshot.data() ?? {},
          context.actorUid,
          nowMs,
        );
      }
      let pageQuery: FirebaseFirestore.Query = db.collection('global_broadcast_modals')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(input.limit + 1);
      if (cursorAfterDocumentId !== null) pageQuery = pageQuery.startAfter(cursorAfterDocumentId);
      const pageSnapshot = await tx.get(pageQuery);
      const truncated = pageSnapshot.size > input.limit;
      const page = pageSnapshot.docs.slice(0, input.limit);
      const planned = page.map((doc) => {
        const row = doc.data() as Row;
        return { doc, plan: planGlobalBroadcastMetadataMigration(row), patch: globalBroadcastMetadataDeletePatch(row) };
      });
      const blockedUnknownCount = planned.filter(({ plan }) => plan.unknownKeys.length > 0).length;
      const affected = planned
        .filter(({ patch }) => Object.keys(patch).length > 0);
      if (!input.dryRun) {
        for (const { doc, patch } of affected) tx.update(doc.ref, patch);
        if (affected.length > 0) invalidateGlobalBroadcastPrivacyVerification(tx, privacyStateRef, nowMs);
      }
      const nextCursor = truncated && page.length ? createGlobalBroadcastScrubCursorToken() : null;
      const result = {
        dryRun: input.dryRun,
        cursor: input.cursor,
        nextCursor,
        scannedCount: page.length,
        affectedCount: affected.length,
        changedCount: input.dryRun ? 0 : affected.length,
        blockedUnknownCount,
        truncated,
        sourceHealth: {
          state: blockedUnknownCount > 0 ? 'error' : truncated ? 'partial' : 'ready',
          complete: !truncated && blockedUnknownCount === 0,
          truncated,
        },
      };
      const audit = createAuditRecord({
        action: 'global_broadcast_metadata_scrub',
        actorUid: context.actorUid,
        role: context.role,
        entity: { collection: 'global_broadcast_modals', id: input.cursor ?? 'start' },
        reason: input.reason,
        before: { scannedCount: page.length, affectedCount: affected.length, blockedUnknownCount, cursorPresent: input.cursor !== null },
        after: { dryRun: input.dryRun, changedCount: result.changedCount, blockedUnknownCount, truncated, nextCursorPresent: nextCursor !== null },
        requestId: input.requestId,
        timestamp: nowIso,
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      if (nextCursor) {
        tx.create(db.collection('admin_command_operations').doc(`gbc_${nextCursor}`), {
          action: 'global_broadcast_scrub_cursor',
          actorUid: context.actorUid,
          cursorAfterDocumentId: page[page.length - 1].id,
          sourceOperationId: input.idempotencyKey,
          createdAtMs: nowMs,
          expiresAtMs: nowMs + SCRUB_CURSOR_TTL_MS,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        action: 'global_broadcast_metadata_scrub',
        requestFingerprint: fingerprint,
        actorUid: context.actorUid,
        auditId: auditRef.id,
        result,
        createdAtMs: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
  },
);

export const adminVerifyGlobalBroadcastPrivacyReadiness = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const context = roleFor(request, 'campaigns.write');
    if (context.role !== 'owner') throw new HttpsError('permission-denied', 'Owner role required for broadcast privacy verification');
    const input = normalizeGlobalBroadcastDeactivateInput(request.data);
    const db = admin.firestore();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const privacyStateRef = db.collection('admin_config').doc('global_broadcast_privacy_state');
    const fingerprint = globalBroadcastPrivacyVerifyFingerprint(input);
    const startedAtMs = Date.now();
    const projectId = String(process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? admin.app().options.projectId ?? '').trim();
    const environment = process.env.FUNCTIONS_EMULATOR === 'true' ? 'emulator' : 'production';
    if (!projectId) throw new HttpsError('internal', 'broadcast_privacy_project_identity_missing');
    const aggregateQuery = db.collection('global_broadcast_modals')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(GLOBAL_BROADCAST_FINAL_VERIFY_CAP + 1);

    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertReplay(operation, fingerprint, context.actorUid, 'global_broadcast_privacy_verify');
        return replayResult(operation);
      }
      const [stateSnapshot, aggregateSnapshot] = await Promise.all([
        tx.get(privacyStateRef),
        tx.get(aggregateQuery),
      ]);
      const state = stateSnapshot.data() ?? {};
      const generation = Number.isSafeInteger(Number(state.generation)) && Number(state.generation) >= 0
        ? Number(state.generation)
        : 0;
      const finishedAtMs = Date.now();
      const result = buildGlobalBroadcastPrivacyVerificationResult({
        rows: aggregateSnapshot.docs.map((doc) => doc.data() as Row),
        projectId,
        environment,
        generation,
        operationId: input.idempotencyKey,
        actorUid: context.actorUid,
        auditId: auditRef.id,
        startedAtMs,
        finishedAtMs,
      });
      const audit = createAuditRecord({
        action: 'global_broadcast_privacy_verify',
        actorUid: context.actorUid,
        role: context.role,
        entity: { collection: 'global_broadcast_modals', id: 'aggregate' },
        reason: input.reason,
        before: { generation, projectId, environment },
        after: {
          ready: result.ready === true,
          complete: result.complete === true,
          scannedCount: result.scannedCount,
          unsafeCount: result.unsafeCount,
          unknownCount: result.unknownCount,
          truncated: result.truncated === true,
        },
        requestId: input.requestId,
        timestamp: new Date(finishedAtMs).toISOString(),
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        action: 'global_broadcast_privacy_verify',
        requestFingerprint: fingerprint,
        actorUid: context.actorUid,
        auditId: auditRef.id,
        result,
        createdAtMs: finishedAtMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const statePatch: Row = {
        generation,
        lastVerificationOperationId: input.idempotencyKey,
        lastVerificationReady: result.ready === true,
        lastVerificationFinishedAtMs: finishedAtMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (result.ready === true) {
        statePatch.latestVerificationOperationId = input.idempotencyKey;
        statePatch.latestVerificationAuditId = auditRef.id;
      } else if (stateSnapshot.exists) {
        statePatch.latestVerificationOperationId = admin.firestore.FieldValue.delete();
        statePatch.latestVerificationAuditId = admin.firestore.FieldValue.delete();
      }
      tx.set(privacyStateRef, statePatch, { merge: true });
      return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
  },
);

// Compatibility export for the not-yet-deployed plural source name. The live
// admin and the narrow deploy profile use the canonical singular endpoint.
export const adminDeactivateGlobalBroadcasts = adminDeactivateGlobalBroadcast;

