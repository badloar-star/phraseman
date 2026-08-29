import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import {
  ACCOUNT_DELETE_JOBS,
  accountDeleteJobId,
  enqueueAccountDeletionJob,
  fenceAccountDeletionRoots,
} from './account_delete_job';
import { resolveAccountDeleteIdentityClosure } from './account_delete';

const REGION = 'us-central1';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const ADMIN_COMMAND_OPERATIONS = 'admin_command_operations';
const ADMIN_LOG = 'admin_log';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;

const ADMIN_ACCOUNT_DELETE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
  timeoutSeconds: 30,
  memory: '256MiB' as const,
} as const;

type Row = Record<string, unknown>;

export type AdminAccountDeleteInput = Readonly<{
  uid: string;
  reason: string;
  requestId: string;
  idempotencyKey: string;
}>;

export type AdminAccountDeleteIdentity = Readonly<{
  stableUid: string;
  authUid: string;
}>;

type IdentityDocumentEvidence = Readonly<{
  id: string;
  data: Row;
}>;

export type AdminAccountDeleteIdentityEvidence = Readonly<{
  requestedUid: string;
  requestedUser: Row | null;
  canonicalUser: IdentityDocumentEvidence | null;
  authLinks: readonly IdentityDocumentEvidence[];
  authOwners: readonly IdentityDocumentEvidence[];
  authRecordUid: string | null;
}>;

type AuthHardeningResult = Readonly<{
  status: 'complete' | 'partial' | 'failed';
  disabled: boolean;
  refreshTokensRevoked: boolean;
  errors: readonly Readonly<{ step: 'disable' | 'revoke_refresh_tokens'; code: string }>[];
}>;

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeUid(value: unknown): string {
  const uid = text(value, 160);
  return UID_RE.test(uid) ? uid : '';
}

export function normalizeAdminAccountDeleteInput(data: unknown): AdminAccountDeleteInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'account deletion command required');
  const uid = safeUid(data.uid);
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!uid || !reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError(
      'invalid-argument',
      'uid, reason, requestId and idempotencyKey are required',
    );
  }
  return Object.freeze({ uid, reason, requestId, idempotencyKey });
}

function linkedAuthUid(user: Row): string {
  const linked = isRecord(user.linkedAuth) ? user.linkedAuth : {};
  return safeUid(linked.providerUid);
}

function canonicalStableEvidence(
  requestedUid: string,
  requestedUser: Row | null,
  canonicalUser: IdentityDocumentEvidence | null,
): Readonly<{ stableUid: string; stableUser: Row }> {
  if (!requestedUser) throw new HttpsError('not-found', 'TARGET_USER_NOT_FOUND');
  if (requestedUser.identityHidden === true) {
    const canonicalStableId = safeUid(requestedUser.canonicalStableId);
    if (
      !canonicalStableId
      || canonicalStableId === requestedUid
      || !canonicalUser
      || canonicalUser.id !== canonicalStableId
      || canonicalUser.data.identityHidden === true
    ) {
      throw new HttpsError('failed-precondition', 'TARGET_CANONICAL_IDENTITY_UNRESOLVED');
    }
    return { stableUid: canonicalStableId, stableUser: canonicalUser.data };
  }
  const conflictingCanonical = safeUid(requestedUser.canonicalStableId);
  if (conflictingCanonical && conflictingCanonical !== requestedUid) {
    throw new HttpsError('failed-precondition', 'TARGET_CANONICAL_IDENTITY_AMBIGUOUS');
  }
  return { stableUid: requestedUid, stableUser: requestedUser };
}

/**
 * Pure fail-closed identity proof. All evidence is collected server-side; the
 * callable never accepts an auth uid from the browser.
 */
export function resolveAdminAccountDeleteIdentityEvidence(
  input: AdminAccountDeleteIdentityEvidence,
): AdminAccountDeleteIdentity {
  const canonical = canonicalStableEvidence(
    input.requestedUid,
    input.requestedUser,
    input.canonicalUser,
  );
  const authCandidates = new Set<string>();
  const addAuthCandidate = (value: unknown) => {
    const uid = safeUid(value);
    if (uid) authCandidates.add(uid);
  };
  addAuthCandidate(canonical.stableUser.firebaseAuthUid);
  addAuthCandidate(linkedAuthUid(canonical.stableUser));

  for (const link of input.authLinks) {
    const linkedStableId = safeUid(link.data.stable_id ?? link.data.stableUid);
    if (linkedStableId !== canonical.stableUid) {
      throw new HttpsError('failed-precondition', 'TARGET_AUTH_LINK_CONFLICT');
    }
    addAuthCandidate(link.id);
    addAuthCandidate(link.data.providerUid);
  }
  if (authCandidates.size !== 1) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_IDENTITY_AMBIGUOUS');
  }
  const authUid = [...authCandidates][0];
  if (safeUid(input.authRecordUid) !== authUid) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_RECORD_UNRESOLVED');
  }
  if (input.authLinks.length === 0) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_LINK_MISSING');
  }

  let canonicalOwnerFound = false;
  for (const owner of input.authOwners) {
    if (owner.id === canonical.stableUid && owner.data.identityHidden !== true) {
      canonicalOwnerFound = true;
      continue;
    }
    if (
      owner.data.identityHidden === true
      && safeUid(owner.data.canonicalStableId) === canonical.stableUid
    ) {
      continue;
    }
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_OWNER_AMBIGUOUS');
  }
  if (!canonicalOwnerFound) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_OWNER_MISSING');
  }
  return Object.freeze({ stableUid: canonical.stableUid, authUid });
}

export function assertAdminAccountDeleteNotSelf(input: Readonly<{
  actorAuthUid: string;
  actorStableUids: readonly string[];
  target: AdminAccountDeleteIdentity;
}>): void {
  if (
    input.actorAuthUid === input.target.authUid
    || input.actorStableUids.includes(input.target.stableUid)
  ) {
    throw new HttpsError('failed-precondition', 'ADMIN_CANNOT_DELETE_SELF');
  }
}

export function assertIdentityQueryNotTruncated(
  sizes: readonly number[],
  limit: number,
): void {
  if (!Number.isInteger(limit) || limit < 1 || sizes.some((size) => size >= limit)) {
    throw new HttpsError('failed-precondition', 'IDENTITY_EVIDENCE_LIMIT');
  }
}

export function assertAdminAccountDeleteIdentityAnchors(input: Readonly<{
  requestedUid: string;
  requestedUser: Row | null;
  stableUser: Row | null;
  authLink: Row | null;
  target: AdminAccountDeleteIdentity;
}>): void {
  if (!input.requestedUser || !input.stableUser || input.stableUser.identityHidden === true) {
    throw new HttpsError('failed-precondition', 'TARGET_IDENTITY_ANCHOR_MISSING');
  }
  if (input.requestedUser.identityHidden === true) {
    if (safeUid(input.requestedUser.canonicalStableId) !== input.target.stableUid) {
      throw new HttpsError('failed-precondition', 'TARGET_CANONICAL_IDENTITY_CHANGED');
    }
  } else if (input.requestedUid !== input.target.stableUid) {
    throw new HttpsError('failed-precondition', 'TARGET_CANONICAL_IDENTITY_CHANGED');
  }
  const userAuthUids = new Set([
    safeUid(input.stableUser.firebaseAuthUid),
    linkedAuthUid(input.stableUser),
  ].filter(Boolean));
  if (userAuthUids.size !== 1 || !userAuthUids.has(input.target.authUid)) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_IDENTITY_CHANGED');
  }
  if (!input.authLink) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_LINK_MISSING');
  }
  const linkedStableUid = safeUid(input.authLink.stable_id ?? input.authLink.stableUid);
  const directLinkAuthUid = safeUid(input.authLink.providerUid);
  if (
    linkedStableUid !== input.target.stableUid
    || (directLinkAuthUid && directLinkAuthUid !== input.target.authUid)
  ) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_LINK_CHANGED');
  }
}

export function queuedDeletionJobMatchesIdentity(
  jobId: string,
  job: Row,
  target: AdminAccountDeleteIdentity,
): boolean {
  if (jobId !== accountDeleteJobId(target.authUid)) return false;
  if (!['queued', 'running', 'completed', 'failed'].includes(text(job.status, 20))) return false;
  const authUidHash = createHash('sha256').update(target.authUid).digest('hex');
  const stableUidHash = createHash('sha256').update(target.stableUid).digest('hex');
  if (
    text(job.authUidHash, 64) !== authUidHash
    || text(job.stableUidHash, 64) !== stableUidHash
  ) return false;
  const storedAuthUid = safeUid(job.authUid);
  const storedStableUid = safeUid(job.stableUid);
  return (!storedAuthUid || storedAuthUid === target.authUid)
    && (!storedStableUid || storedStableUid === target.stableUid);
}

function documentEvidence(
  snapshot: FirebaseFirestore.DocumentSnapshot,
): IdentityDocumentEvidence {
  return { id: snapshot.id, data: snapshot.data() ?? {} };
}

function uniqueDocumentEvidence(
  snapshots: readonly FirebaseFirestore.DocumentSnapshot[],
): IdentityDocumentEvidence[] {
  const byId = new Map<string, IdentityDocumentEvidence>();
  for (const snapshot of snapshots) {
    if (snapshot.exists) byId.set(snapshot.id, documentEvidence(snapshot));
  }
  return [...byId.values()];
}

async function resolveAdminAccountDeleteTarget(
  db: FirebaseFirestore.Firestore,
  requestedUid: string,
): Promise<AdminAccountDeleteIdentity> {
  const requestedSnapshot = await db.collection(USERS).doc(requestedUid).get();
  const requestedUser = requestedSnapshot.exists ? requestedSnapshot.data() ?? {} : null;
  const canonicalStableId = requestedUser?.identityHidden === true
    ? safeUid(requestedUser.canonicalStableId)
    : requestedUid;
  const canonicalSnapshot = canonicalStableId && canonicalStableId !== requestedUid
    ? await db.collection(USERS).doc(canonicalStableId).get()
    : null;
  const canonicalUser = canonicalSnapshot?.exists ? documentEvidence(canonicalSnapshot) : null;
  const stableEvidence = canonicalStableEvidence(requestedUid, requestedUser, canonicalUser);

  const [stableIdLinks, legacyStableIdLinks] = await Promise.all([
    db.collection(AUTH_LINKS).where('stable_id', '==', stableEvidence.stableUid).limit(3).get(),
    db.collection(AUTH_LINKS).where('stableUid', '==', stableEvidence.stableUid).limit(3).get(),
  ]);
  assertIdentityQueryNotTruncated([stableIdLinks.size, legacyStableIdLinks.size], 3);
  const mappedLinks = uniqueDocumentEvidence([...stableIdLinks.docs, ...legacyStableIdLinks.docs]);
  const preliminaryAuthCandidates = new Set<string>();
  const add = (value: unknown) => {
    const uid = safeUid(value);
    if (uid) preliminaryAuthCandidates.add(uid);
  };
  add(stableEvidence.stableUser.firebaseAuthUid);
  add(linkedAuthUid(stableEvidence.stableUser));
  for (const link of mappedLinks) {
    add(link.id);
    add(link.data.providerUid);
  }
  if (preliminaryAuthCandidates.size !== 1) {
    throw new HttpsError('failed-precondition', 'TARGET_AUTH_IDENTITY_AMBIGUOUS');
  }
  const authUid = [...preliminaryAuthCandidates][0];

  const [directLink, firebaseOwners, providerOwners, directAuthUser, authRecord] = await Promise.all([
    db.collection(AUTH_LINKS).doc(authUid).get(),
    db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(3).get(),
    db.collection(USERS).where('linkedAuth.providerUid', '==', authUid).limit(3).get(),
    db.collection(USERS).doc(authUid).get(),
    admin.auth().getUser(authUid).catch((error: unknown) => {
      const code = text((error as { code?: unknown })?.code, 80);
      if (code === 'auth/user-not-found') return null;
      throw new HttpsError('unavailable', 'TARGET_AUTH_LOOKUP_FAILED');
    }),
  ]);
  assertIdentityQueryNotTruncated([firebaseOwners.size, providerOwners.size], 3);
  const authLinks = uniqueDocumentEvidence([
    ...stableIdLinks.docs,
    ...legacyStableIdLinks.docs,
    directLink,
  ]);
  const authOwners = uniqueDocumentEvidence([
    ...firebaseOwners.docs,
    ...providerOwners.docs,
    directAuthUser,
    requestedSnapshot,
    ...(canonicalSnapshot ? [canonicalSnapshot] : []),
  ]).filter((owner) => (
    owner.id === stableEvidence.stableUid
    || owner.data.identityHidden === true
    || safeUid(owner.data.firebaseAuthUid) === authUid
    || linkedAuthUid(owner.data) === authUid
  ));

  return resolveAdminAccountDeleteIdentityEvidence({
    requestedUid,
    requestedUser,
    canonicalUser,
    authLinks,
    authOwners,
    authRecordUid: authRecord?.uid ?? null,
  });
}

async function actorStableUids(
  db: FirebaseFirestore.Firestore,
  actorAuthUid: string,
): Promise<string[]> {
  const [link, firebaseOwners, providerOwners, directUser] = await Promise.all([
    db.collection(AUTH_LINKS).doc(actorAuthUid).get(),
    db.collection(USERS).where('firebaseAuthUid', '==', actorAuthUid).limit(20).get(),
    db.collection(USERS).where('linkedAuth.providerUid', '==', actorAuthUid).limit(20).get(),
    db.collection(USERS).doc(actorAuthUid).get(),
  ]);
  assertIdentityQueryNotTruncated([firebaseOwners.size, providerOwners.size], 20);
  const stableUids = new Set<string>();
  const add = (value: unknown) => {
    const uid = safeUid(value);
    if (uid) stableUids.add(uid);
  };
  add(link.data()?.stable_id ?? link.data()?.stableUid);
  for (const owner of uniqueDocumentEvidence([
    ...firebaseOwners.docs,
    ...providerOwners.docs,
    directUser,
  ])) {
    add(owner.id);
    add(owner.data.canonicalStableId);
  }
  return [...stableUids];
}

function replayOperation(
  operation: Row,
  requestFingerprint: string,
  actorUid: string,
): Readonly<{ identity: AdminAccountDeleteIdentity; auditId: string; result: Row | null }> {
  if (
    operation.requestFingerprint !== requestFingerprint
    || operation.actorUid !== actorUid
  ) {
    throw new HttpsError('already-exists', 'idempotency key replay mismatch');
  }
  const stableUid = safeUid(operation.stableUid);
  const authUid = safeUid(operation.authUid);
  const auditId = safeUid(operation.auditId);
  if (!stableUid || !authUid || !auditId) {
    throw new HttpsError('failed-precondition', 'ACCOUNT_DELETE_OPERATION_CORRUPT');
  }
  return {
    identity: { stableUid, authUid },
    auditId,
    result: isRecord(operation.result) ? operation.result : null,
  };
}

function hardeningErrorCode(error: unknown): string {
  const code = text((error as { code?: unknown })?.code, 80);
  return /^auth\/[a-z0-9-]+$/.test(code) ? code : 'auth/hardening-failed';
}

async function hardenTargetAuth(identity: AdminAccountDeleteIdentity): Promise<AuthHardeningResult> {
  const [disableOutcome, revokeOutcome] = await Promise.allSettled([
    admin.auth().updateUser(identity.authUid, { disabled: true }),
    admin.auth().revokeRefreshTokens(identity.authUid),
  ]);
  const disabled = disableOutcome.status === 'fulfilled';
  const refreshTokensRevoked = revokeOutcome.status === 'fulfilled';
  const errors: Array<{ step: 'disable' | 'revoke_refresh_tokens'; code: string }> = [];
  if (disableOutcome.status === 'rejected') {
    errors.push({ step: 'disable', code: hardeningErrorCode(disableOutcome.reason) });
  }
  if (revokeOutcome.status === 'rejected') {
    errors.push({ step: 'revoke_refresh_tokens', code: hardeningErrorCode(revokeOutcome.reason) });
  }
  return Object.freeze({
    status: disabled && refreshTokensRevoked ? 'complete' : disabled || refreshTokensRevoked ? 'partial' : 'failed',
    disabled,
    refreshTokensRevoked,
    errors: Object.freeze(errors),
  });
}

export const adminQueueAccountDeletion = onCall(ADMIN_ACCOUNT_DELETE_OPTIONS, async (request) => {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const actorUid = safeUid(request.auth?.uid);
  if (!actorUid) throw new HttpsError('unauthenticated', 'auth_required');
  const role = roleFromAdminToken(request.auth?.token);
  if (!role || !hasPermission(role, 'users.delete')) {
    throw new HttpsError('permission-denied', 'USERS_DELETE_REQUIRED');
  }
  const input = normalizeAdminAccountDeleteInput(request.data);
  const db = admin.firestore();
  const operationRef = db
    .collection(ADMIN_COMMAND_OPERATIONS)
    .doc(`account_delete_${input.idempotencyKey}`);
  const requestFingerprint = JSON.stringify({
    action: 'account.delete.queue',
    uid: input.uid,
    reason: input.reason,
    requestId: input.requestId,
  });

  const existingOperation = await operationRef.get();
  let resolvedIdentity: AdminAccountDeleteIdentity | null = null;
  if (!existingOperation.exists) {
    resolvedIdentity = await resolveAdminAccountDeleteTarget(db, input.uid);
  }
  const actorIdentities = await actorStableUids(db, actorUid);
  const prepared = await db.runTransaction(async (tx) => {
    const operationSnapshot = await tx.get(operationRef);
    if (operationSnapshot.exists) {
      const replay = replayOperation(operationSnapshot.data() ?? {}, requestFingerprint, actorUid);
      if (replay.result?.ok === true) return replay;
      const [requestedAnchor, stableAnchor, authLinkAnchor, queuedJob] = await Promise.all([
        tx.get(db.collection(USERS).doc(input.uid)),
        tx.get(db.collection(USERS).doc(replay.identity.stableUid)),
        tx.get(db.collection(AUTH_LINKS).doc(replay.identity.authUid)),
        tx.get(db.collection(ACCOUNT_DELETE_JOBS).doc(accountDeleteJobId(replay.identity.authUid))),
      ]);
      try {
        assertAdminAccountDeleteIdentityAnchors({
          requestedUid: input.uid,
          requestedUser: requestedAnchor.exists ? requestedAnchor.data() ?? {} : null,
          stableUser: stableAnchor.exists ? stableAnchor.data() ?? {} : null,
          authLink: authLinkAnchor.exists ? authLinkAnchor.data() ?? {} : null,
          target: replay.identity,
        });
      } catch (anchorError) {
        if (
          !queuedJob.exists
          || !queuedDeletionJobMatchesIdentity(
            queuedJob.id,
            queuedJob.data() ?? {},
            replay.identity,
          )
        ) {
          throw anchorError;
        }
      }
      assertAdminAccountDeleteNotSelf({
        actorAuthUid: actorUid,
        actorStableUids: actorIdentities,
        target: replay.identity,
      });
      return replay;
    }
    if (!resolvedIdentity) {
      throw new HttpsError('aborted', 'TARGET_IDENTITY_RETRY_REQUIRED');
    }
    const [requestedAnchor, stableAnchor, authLinkAnchor] = await Promise.all([
      tx.get(db.collection(USERS).doc(input.uid)),
      tx.get(db.collection(USERS).doc(resolvedIdentity.stableUid)),
      tx.get(db.collection(AUTH_LINKS).doc(resolvedIdentity.authUid)),
    ]);
    assertAdminAccountDeleteIdentityAnchors({
      requestedUid: input.uid,
      requestedUser: requestedAnchor.exists ? requestedAnchor.data() ?? {} : null,
      stableUser: stableAnchor.exists ? stableAnchor.data() ?? {} : null,
      authLink: authLinkAnchor.exists ? authLinkAnchor.data() ?? {} : null,
      target: resolvedIdentity,
    });
    assertAdminAccountDeleteNotSelf({
      actorAuthUid: actorUid,
      actorStableUids: actorIdentities,
      target: resolvedIdentity,
    });
    const auditRef = db.collection(ADMIN_LOG).doc();
    tx.create(operationRef, {
      action: 'account.delete.queue',
      state: 'pending_enqueue',
      requestFingerprint,
      actorUid,
      stableUid: resolvedIdentity.stableUid,
      authUid: resolvedIdentity.authUid,
      auditId: auditRef.id,
      reason: input.reason,
      requestId: input.requestId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    });
    return { identity: resolvedIdentity, auditId: auditRef.id, result: null };
  });
  if (prepared.result?.ok === true) {
    return { ...prepared.result, replayed: true };
  }

  const identity = prepared.identity;
  const closureCutoffMs = Date.now();
  await fenceAccountDeletionRoots(db, identity.authUid, identity.stableUid, closureCutoffMs);
  const identityClosure = await resolveAccountDeleteIdentityClosure(
    db,
    identity.stableUid,
    identity.authUid,
  );
  const queue = await enqueueAccountDeletionJob(
    db,
    identity.authUid,
    identity.stableUid,
    closureCutoffMs,
    undefined,
    identityClosure,
  );
  const authHardening = await hardenTargetAuth(identity);
  const nowMs = Date.now();
  const result: Row = {
    ok: true,
    stableUid: identity.stableUid,
    jobId: queue.jobId,
    queueStatus: queue.status,
    queueCreated: queue.created,
    authHardening,
    auditId: prepared.auditId,
    replayed: false,
  };

  return db.runTransaction(async (tx) => {
    const operationSnapshot = await tx.get(operationRef);
    if (!operationSnapshot.exists) {
      throw new HttpsError('aborted', 'ACCOUNT_DELETE_OPERATION_MISSING');
    }
    const replay = replayOperation(operationSnapshot.data() ?? {}, requestFingerprint, actorUid);
    if (replay.result?.ok === true) return { ...replay.result, replayed: true };
    const auditRef = db.collection(ADMIN_LOG).doc(replay.auditId);
    const audit = createAuditRecord({
      action: 'account.delete.queue',
      actorUid,
      role,
      entity: { collection: USERS, id: identity.stableUid },
      reason: input.reason,
      before: {
        deletionQueued: false,
        requestedUid: input.uid,
        stableUid: identity.stableUid,
      },
      after: {
        deletionQueued: true,
        jobId: queue.jobId,
        queueStatus: queue.status,
        queueCreated: queue.created,
        authHardening,
      },
      rollbackReference: null,
      requestId: input.requestId,
      timestamp: new Date(nowMs).toISOString(),
    });
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.update(operationRef, {
      state: 'completed',
      result,
      queueJobId: queue.jobId,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAtMs: nowMs,
    });
    return result;
  });
});
