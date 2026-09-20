import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import {
  advanceArenaTargetPublicationBridge,
  arenaPublicationExactEqual,
  arenaPublicationJobPath,
  arenaPublicationSha256,
  parseArenaPublicationRequest,
  parseArenaPublicationSource,
  publicationStateFromSource,
  readArenaPublicationCheckpoint,
  readReadyArenaPublicationCheckpoint,
  type ArenaPublicationBridgePersistence,
  type ArenaPublicationRequest,
} from './arena_target_publication_bridge';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { ARENA_CONFIG_DOC_ID } from './arena_config_contract';
import {
  arenaTargetPublicationDisabled,
  arenaTargetPublicationPointer,
  parseArenaTargetPublications,
  resolveArenaTargetPublication,
  type ArenaStudyTarget,
  type ArenaTargetPublication,
  type ArenaTargetPublicationState,
} from './arena_target_registry';
import { ARENA_V2_COLLECTIONS } from './arena_v2_core';
import {
  arenaTargetApprovalReceiptPaths,
  tournamentV11TargetBundleRootPath,
} from './tournament_pool_v11_bundle';

type Row = Record<string, unknown>;
const db = admin.firestore();

function requirePublicationAdmin(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  role: AdminRole;
} {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) throw new HttpsError('permission-denied', 'Admin role required');
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot use application.config.write');
  }
  return { actorUid, role };
}

function requestOrThrow(value: unknown): ArenaPublicationRequest {
  const parsed = parseArenaPublicationRequest(value);
  if (!parsed) throw new HttpsError('invalid-argument', 'arena_publication_request_invalid');
  return parsed;
}

function configRef(): admin.firestore.DocumentReference {
  return db.collection(ARENA_V2_COLLECTIONS.config).doc(ARENA_CONFIG_DOC_ID);
}

function sourcePaths(request: ArenaPublicationRequest) {
  const rootPath = tournamentV11TargetBundleRootPath(request.studyTarget, request.bundleSha256);
  return {
    rootPath,
    checkpointPath: `${rootPath}/internal/publication_checkpoint`,
    jobPath: arenaPublicationJobPath(request.studyTarget, request.bundleSha256, request.requestId),
  } as const;
}

class FirestoreArenaPublicationPersistence implements ArenaPublicationBridgePersistence {
  async get(path: string): Promise<unknown | null> {
    const snap = await db.doc(path).get();
    return snap.exists ? snap.data() ?? null : null;
  }

  async create(path: string, value: unknown): Promise<void> {
    try {
      await db.doc(path).create(value as admin.firestore.DocumentData);
    } catch (error) {
      if ((error as { code?: number | string }).code === 6
        || (error as { code?: number | string }).code === 'already-exists') throw new Error('already_exists');
      throw error;
    }
  }

  async compareAndSet(path: string, expectedRevision: number, value: unknown): Promise<void> {
    await db.runTransaction(async (tx) => {
      const ref = db.doc(path);
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.revision !== expectedRevision) {
        throw new Error('arena_publication_revision_conflict');
      }
      tx.set(ref, value as admin.firestore.DocumentData);
    });
  }

  async list(rootPath: string, afterId: string | null, limit: number) {
    let query: admin.firestore.Query = db.collection(rootPath)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
    if (afterId) query = query.startAfter(afterId);
    const snap = await query.get();
    return snap.docs.map((doc) => ({ id: doc.id, value: doc.data() }));
  }

  async createExactMany(entries: readonly Readonly<{ path: string; value: unknown }>[]) {
    if (entries.length > 400) throw new Error('arena_publication_page_invalid');
    const refs = entries.map((entry) => db.doc(entry.path));
    const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
    const missing: number[] = [];
    snaps.forEach((snap, index) => {
      if (!snap.exists) missing.push(index);
      else if (!arenaPublicationExactEqual(snap.data(), entries[index].value)) {
        throw new Error('arena_publication_task_conflict');
      }
    });
    if (missing.length > 0) {
      const batch = db.batch();
      missing.forEach((index) => batch.create(refs[index], entries[index].value as admin.firestore.DocumentData));
      try {
        await batch.commit();
      } catch (error) {
        const raced = await db.getAll(...refs);
        if (raced.some((snap, index) => !snap.exists
          || !arenaPublicationExactEqual(snap.data(), entries[index].value))) throw error;
        return { created: 0, reused: entries.length };
      }
    }
    return { created: missing.length, reused: entries.length - missing.length };
  }

  async getCurrentTargetPublication(studyTarget: ArenaStudyTarget): Promise<ArenaTargetPublication | null> {
    const snap = await configRef().get();
    return resolveArenaTargetPublication(snap.data(), studyTarget);
  }
}

const persistence = new FirestoreArenaPublicationPersistence();

async function sourceDocuments(request: ArenaPublicationRequest) {
  const paths = sourcePaths(request);
  const [root, checkpoint] = await Promise.all([
    persistence.get(paths.rootPath),
    persistence.get(paths.checkpointPath),
  ]);
  const approvalReceiptDocuments = await Promise.all(
    arenaTargetApprovalReceiptPaths(root).map((path) => persistence.get(path)),
  );
  return { paths, root, checkpoint, approvalReceiptDocuments };
}

function callableError(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  const message = error instanceof Error ? error.message : 'arena_publication_failed';
  const conflict = message.includes('conflict') || message.includes('revision');
  throw new HttpsError(conflict ? 'aborted' : 'failed-precondition', message);
}

export const adminArenaPublicationStage = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requirePublicationAdmin(request as { auth?: { uid?: string; token?: Row } });
    const input = requestOrThrow(request.data);
    try {
      const source = await sourceDocuments(input);
      return await advanceArenaTargetPublicationBridge({
        request: input,
        sourceRoot: source.root,
        sourceCheckpoint: source.checkpoint,
        approvalReceiptDocuments: source.approvalReceiptDocuments,
        persistence,
      });
    } catch (error) {
      return callableError(error);
    }
  },
);

export const adminArenaPublicationStatus = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requirePublicationAdmin(request as { auth?: { uid?: string; token?: Row } });
    const input = requestOrThrow(request.data);
    try {
      const source = await sourceDocuments(input);
      const parsedSource = parseArenaPublicationSource(
        source.root, source.checkpoint, input, source.approvalReceiptDocuments,
      );
      if (!parsedSource) throw new Error('arena_publication_source_not_ready');
      const checkpoint = readArenaPublicationCheckpoint(await persistence.get(source.paths.jobPath), input);
      return {
        ok: true,
        studyTarget: input.studyTarget,
        bundleSha256: input.bundleSha256,
        publicationFingerprint: parsedSource.publicationFingerprint,
        phase: checkpoint?.phase ?? 'missing',
        stagedCount: checkpoint?.stagedCount ?? 0,
        verifiedCount: checkpoint?.verifiedCount ?? 0,
        continuation: checkpoint?.phase !== 'ready',
      };
    } catch (error) {
      return callableError(error);
    }
  },
);

function immutableReceiptPath(action: 'activate' | 'rollback', input: ArenaPublicationRequest): string {
  return `arena_target_publication_receipts/${arenaPublicationSha256({ action, ...input })}`;
}

function currentTargetSlot(raw: unknown, studyTarget: ArenaStudyTarget): ArenaTargetPublicationState {
  const publications = parseArenaTargetPublications((raw as Row | null)?.targetPublications);
  if (!publications) throw new Error('arena_target_publications_invalid');
  return publications[studyTarget];
}

export const adminArenaPublicationActivate = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requirePublicationAdmin(request as { auth?: { uid?: string; token?: Row } });
    const input = requestOrThrow(request.data);
    try {
      const sourceDocs = await sourceDocuments(input);
      const source = parseArenaPublicationSource(
        sourceDocs.root, sourceDocs.checkpoint, input, sourceDocs.approvalReceiptDocuments,
      );
      if (!source) throw new Error('arena_publication_source_not_ready');
      const job = readReadyArenaPublicationCheckpoint(await persistence.get(sourceDocs.paths.jobPath), input);
      if (!arenaPublicationExactEqual(job.source, source)) throw new Error('arena_publication_source_conflict');
      const next = publicationStateFromSource(source);
      const receiptRef = db.doc(immutableReceiptPath('activate', input));
      const auditRef = db.collection('admin_log').doc();
      const now = new Date().toISOString();
      const receiptCreatedAt = new Date(job.createdAtMs).toISOString();
      const receipt = {
        schemaVersion: 'arena-target-publication-activation-receipt-v1',
        action: 'activate', request: input, actorUid: actor.actorUid, role: actor.role,
        source, previousTargetPublication: job.previousTargetPublication, nextTargetPublication: next,
        createdAt: receiptCreatedAt,
      } as const;
      await db.runTransaction(async (tx) => {
        const [configSnap, receiptSnap] = await Promise.all([tx.get(configRef()), tx.get(receiptRef)]);
        if (!configSnap.exists) throw new Error('arena_config_missing');
        const current = currentTargetSlot(configSnap.data(), input.studyTarget);
        if (receiptSnap.exists) {
          if (!arenaPublicationExactEqual(receiptSnap.data(), receipt)
            || arenaTargetPublicationPointer(current) !== next.publicationFingerprint) {
            throw new Error('arena_publication_activation_conflict');
          }
          return;
        }
        if (arenaTargetPublicationPointer(current)
          !== arenaTargetPublicationPointer(job.previousTargetPublication)) {
          throw new Error('arena_publication_activation_cas_conflict');
        }
        tx.update(configRef(), { [`targetPublications.${input.studyTarget}`]: next });
        tx.create(receiptRef, receipt);
        tx.create(auditRef, createAuditRecord({
          action: 'arena_target_publication_activate', actorUid: actor.actorUid, role: actor.role,
          entity: { collection: ARENA_V2_COLLECTIONS.config, id: ARENA_CONFIG_DOC_ID },
          reason: `activate:${input.studyTarget}:${input.bundleSha256}`,
          before: job.previousTargetPublication ?? arenaTargetPublicationDisabled(input.studyTarget),
          after: next, requestId: input.requestId, timestamp: now,
        }));
      });
      return { ok: true, studyTarget: input.studyTarget, publicationFingerprint: next.publicationFingerprint };
    } catch (error) {
      return callableError(error);
    }
  },
);

export const adminArenaPublicationRollback = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requirePublicationAdmin(request as { auth?: { uid?: string; token?: Row } });
    const input = requestOrThrow(request.data);
    try {
      const sourceDocs = await sourceDocuments(input);
      const source = parseArenaPublicationSource(
        sourceDocs.root, sourceDocs.checkpoint, input, sourceDocs.approvalReceiptDocuments,
      );
      if (!source) throw new Error('arena_publication_source_not_ready');
      const job = readReadyArenaPublicationCheckpoint(await persistence.get(sourceDocs.paths.jobPath), input);
      const previous = job.previousTargetPublication ?? arenaTargetPublicationDisabled(input.studyTarget);
      const receiptRef = db.doc(immutableReceiptPath('rollback', input));
      const auditRef = db.collection('admin_log').doc();
      const now = new Date().toISOString();
      const receiptCreatedAt = new Date(job.createdAtMs).toISOString();
      const receipt = {
        schemaVersion: 'arena-target-publication-rollback-receipt-v1',
        action: 'rollback', request: input, actorUid: actor.actorUid, role: actor.role,
        source,
        rolledBackPublicationFingerprint: source.publicationFingerprint,
        restoredTargetPublication: previous, createdAt: receiptCreatedAt,
      } as const;
      await db.runTransaction(async (tx) => {
        const [configSnap, receiptSnap] = await Promise.all([tx.get(configRef()), tx.get(receiptRef)]);
        if (!configSnap.exists) throw new Error('arena_config_missing');
        const current = currentTargetSlot(configSnap.data(), input.studyTarget);
        if (receiptSnap.exists) {
          if (!arenaPublicationExactEqual(receiptSnap.data(), receipt)
            || arenaTargetPublicationPointer(current) !== arenaTargetPublicationPointer(previous)) {
            throw new Error('arena_publication_rollback_conflict');
          }
          return;
        }
        if (arenaTargetPublicationPointer(current) !== source.publicationFingerprint) {
          throw new Error('arena_publication_rollback_cas_conflict');
        }
        tx.update(configRef(), { [`targetPublications.${input.studyTarget}`]: previous });
        tx.create(receiptRef, receipt);
        tx.create(auditRef, createAuditRecord({
          action: 'arena_target_publication_rollback', actorUid: actor.actorUid, role: actor.role,
          entity: { collection: ARENA_V2_COLLECTIONS.config, id: ARENA_CONFIG_DOC_ID },
          reason: `rollback:${input.studyTarget}:${input.bundleSha256}`,
          before: publicationStateFromSource(source), after: previous,
          requestId: input.requestId, timestamp: now,
        }));
      });
      return { ok: true, studyTarget: input.studyTarget,
        publicationFingerprint: arenaTargetPublicationPointer(previous), disabled: previous.ready === false };
    } catch (error) {
      return callableError(error);
    }
  },
);
