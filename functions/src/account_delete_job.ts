import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const ACCOUNT_DELETE_JOBS = 'account_deletion_jobs';
export const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';
export const ACCOUNT_DELETE_AUTH_MARKERS = 'account_deletion_auth_markers';
export const ACCOUNT_DELETE_PERMANENT_DENIALS = 'account_deletion_permanent_denials';
export const ACCOUNT_DELETE_CREDENTIAL_RECEIPTS = 'account_deletion_credential_receipts';
export const ACCOUNT_DELETE_CREDENTIAL_RECEIPT_TTL_MS = 7 * 24 * 60 * 60_000;

export type AccountDeleteJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AccountDeleteJobDocument = {
  jobId: string;
  authUid: string;
  stableUid: string;
  authUidHash: string;
  stableUidHash: string;
  status: AccountDeleteJobStatus;
  attempts: number;
  createdAtMs: number;
  updatedAtMs: number;
  identityClosure: string[];
  identityClosureHash: string;
  identityClosureVersion: 1;
  closureCutoffMs: number;
  nextAttemptAtMs?: number;
  retentionUntilMs?: number;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
};

export type AccountDeleteEnqueueResult = {
  jobId: string;
  status: AccountDeleteJobStatus;
  created: boolean;
};

export type AccountDeleteCredentialReceiptInput = {
  operationId: string;
  capabilityHash: string;
};

export async function fenceAccountDeletionRoots(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  stableUid: string,
  nowMs = Date.now(),
): Promise<{ jobId: string }> {
  const jobId = accountDeleteJobId(authUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid);
  const roots = [authUid, stableUid].map((identity) => ({
    identity,
    ref: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(identity)),
  }));
  await db.runTransaction(async (tx) => {
    const rootSnaps = await Promise.all(roots.map(({ ref }) => tx.get(ref)));
    const common = {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    tx.set(authMarkerRef, common, { merge: true });
    tx.set(tombstoneRef, common, { merge: true });
    roots.forEach(({ identity, ref }, index) => {
      if (rootSnaps[index].exists) return;
      tx.set(ref, {
        ...common,
        identityHash: sha256(identity),
        identityKind: identity === authUid ? 'auth' : 'stable',
        createdAtMs: nowMs,
      });
    });
  });
  return { jobId };
}

export async function fenceAccountDeletionCredential(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  stableUid: string,
  nowMs: number,
  receipt: AccountDeleteCredentialReceiptInput,
): Promise<{ stage: 'closure_fenced' | 'closure_committed' | 'credential_safe'; jobId: string }> {
  const jobId = accountDeleteJobId(authUid);
  const receiptRef = db.collection(ACCOUNT_DELETE_CREDENTIAL_RECEIPTS)
    .doc(accountDeleteCredentialReceiptId(receipt.operationId));
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid);
  const rootDenialRefs = [authUid, stableUid].map((identity) => ({
    identity,
    ref: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(identity)),
  }));
  return db.runTransaction(async (tx) => {
    const receiptSnapshot = await tx.get(receiptRef);
    const rootDenialSnapshots = await Promise.all(rootDenialRefs.map(({ ref }) => tx.get(ref)));
    const existing = receiptSnapshot.exists ? receiptSnapshot.data() ?? {} : null;
    if (
      existing
      && existing.stage !== 'closure_fenced'
      && existing.stage !== 'closure_committed'
      && existing.stage !== 'credential_safe'
    ) {
      throw new HttpsError('failed-precondition', 'account_delete_receipt_stage_invalid');
    }
    if (
      existing
      && (
        existing.capabilityHash !== receipt.capabilityHash
        || existing.jobId !== jobId
        || (existing.authUid != null && existing.authUid !== authUid)
        || (existing.stableUid != null && existing.stableUid !== stableUid)
      )
    ) {
      throw new HttpsError('failed-precondition', 'account_delete_receipt_mismatch');
    }
    const stage = (existing?.stage ?? 'closure_fenced') as 'closure_fenced' | 'closure_committed' | 'credential_safe';
    tx.set(authMarkerRef, {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(tombstoneRef, {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    rootDenialRefs.forEach(({ identity, ref }, index) => {
      if (rootDenialSnapshots[index].exists) return;
      tx.set(ref, {
        status: 'denied',
        identityHash: sha256(identity),
        identityKind: identity === authUid ? 'auth' : 'stable',
        authUidHash: sha256(authUid),
        stableUidHash: sha256(stableUid),
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    tx.set(receiptRef, {
      jobId,
      authUid,
      stableUid,
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      operationIdHash: sha256(receipt.operationId),
      capabilityHash: receipt.capabilityHash,
      stage,
      attempts: Number(existing?.attempts ?? 0),
      createdAtMs: Number(existing?.createdAtMs ?? nowMs),
      updatedAtMs: nowMs,
      expiresAtMs: Number(existing?.expiresAtMs ?? (nowMs + ACCOUNT_DELETE_CREDENTIAL_RECEIPT_TTL_MS)),
      createdAt: existing?.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { stage, jobId };
  });
}

export type AccountDeletionStats = {
  docsDeleted: number;
  docsUpdated: number;
  queriesRun: number;
  authDeleted: boolean;
};

export type AccountDeletionExecutor = (
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
  closureCutoffMs: number,
  identityClosure: readonly string[],
) => Promise<AccountDeletionStats>;

const ACCOUNT_DELETE_JOB_LEASE_MS = 10 * 60_000;
const ACCOUNT_DELETE_JOB_MAX_ATTEMPTS = 8;
const ACCOUNT_DELETE_JOB_INITIAL_BACKOFF_MS = 30_000;
const ACCOUNT_DELETE_JOB_MAX_BACKOFF_MS = 30 * 60_000;
const ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60_000;
const ACCOUNT_DELETE_MAX_IDENTITIES = 64;
const ACCOUNT_DELETE_IDENTITY_CLOSURE_VERSION = 1 as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function accountDeleteJobId(authUid: string): string {
  return `adel_${sha256(authUid).slice(0, 40)}`;
}

function cleanIdentityClosure(
  authUid: string,
  stableUid: string,
  values?: readonly string[],
): string[] {
  const raw = values ?? [authUid, stableUid];
  if (raw.some((value) => (
    typeof value !== 'string'
    || value !== value.trim()
    || value.length < 1
    || value.length > 180
    || value.includes('/')
  ))) {
    throw new HttpsError('failed-precondition', 'account_delete_job_closure_invalid');
  }
  const normalized = [...new Set(raw)].sort();
  if (
    normalized.length < 1
    || normalized.length > ACCOUNT_DELETE_MAX_IDENTITIES
    || !normalized.includes(authUid)
    || !normalized.includes(stableUid)
  ) {
    throw new HttpsError('failed-precondition', 'account_delete_job_closure_invalid');
  }
  return normalized;
}

export function accountDeleteIdentityClosureHash(values: readonly string[]): string {
  return sha256(values.map((value) => `${value.length}:${value}`).join('|'));
}

export function accountDeletePermanentDenialId(identity: string): string {
  return `adel_deny_${sha256(identity)}`;
}

export function accountDeleteCredentialReceiptId(operationId: string): string {
  return `adel_cred_${sha256(operationId)}`;
}

function jobStatus(value: unknown): AccountDeleteJobStatus {
  if (value === 'running' || value === 'completed' || value === 'failed') return value;
  return 'queued';
}

export async function enqueueAccountDeletionJob(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  stableUid: string,
  nowMs = Date.now(),
  receipt?: AccountDeleteCredentialReceiptInput,
  identityClosure?: readonly string[],
): Promise<AccountDeleteEnqueueResult> {
  const jobId = accountDeleteJobId(authUid);
  const ref = db.collection(ACCOUNT_DELETE_JOBS).doc(jobId);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const receiptRef = receipt
    ? db.collection(ACCOUNT_DELETE_CREDENTIAL_RECEIPTS)
      .doc(accountDeleteCredentialReceiptId(receipt.operationId))
    : null;
  const frozenClosure = cleanIdentityClosure(authUid, stableUid, identityClosure);
  const identityClosureHash = accountDeleteIdentityClosureHash(frozenClosure);
  const denialRefs = frozenClosure.map((identity) => ({
    identity,
    ref: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(identity)),
  }));

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const receiptSnapshot = receiptRef ? await tx.get(receiptRef) : null;
    const denialSnapshots = await Promise.all(denialRefs.map(({ ref: denialRef }) => tx.get(denialRef)));
    const existingReceipt = receiptSnapshot?.exists ? receiptSnapshot.data() ?? {} : null;
    if (
      existingReceipt
      && existingReceipt.stage !== 'closure_fenced'
      && existingReceipt.stage !== 'closure_committed'
      && existingReceipt.stage !== 'credential_safe'
    ) {
      throw new HttpsError('failed-precondition', 'account_delete_receipt_stage_invalid');
    }
    if (receipt && !existingReceipt) {
      throw new HttpsError('failed-precondition', 'account_delete_receipt_not_fenced');
    }
    if (
      receipt
      && existingReceipt
      && (
        existingReceipt.capabilityHash !== receipt.capabilityHash
        || existingReceipt.jobId !== jobId
      )
    ) {
      throw new HttpsError('failed-precondition', 'account_delete_receipt_mismatch');
    }
    if (receipt && receiptRef) {
      tx.set(receiptRef, {
        jobId,
        operationIdHash: sha256(receipt.operationId),
        capabilityHash: receipt.capabilityHash,
        stage: existingReceipt?.stage === 'credential_safe'
          ? 'credential_safe'
          : 'closure_committed',
        attempts: Number(existingReceipt?.attempts ?? 0),
        createdAtMs: Number(existingReceipt?.createdAtMs ?? nowMs),
        updatedAtMs: nowMs,
        expiresAtMs: Number(
          existingReceipt?.expiresAtMs
          ?? (Number(existingReceipt?.createdAtMs ?? nowMs) + ACCOUNT_DELETE_CREDENTIAL_RECEIPT_TTL_MS),
        ),
        createdAt: existingReceipt?.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    tx.set(authMarkerRef, {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(tombstoneRef, {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    const permanentDenial = {
      status: 'denied',
      stableUidHash: sha256(stableUid),
      authUidHash: sha256(authUid),
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    denialRefs.forEach(({ identity, ref: denialRef }, index) => {
      if (denialSnapshots[index].exists) return;
      tx.set(denialRef, {
        ...permanentDenial,
        identityHash: sha256(identity),
        identityKind: identity === authUid ? 'auth' : identity === stableUid ? 'stable' : 'alias',
      });
    });
    if (snapshot.exists) {
      const existing = snapshot.data() ?? {};
      const status = jobStatus(existing.status);
      if (status === 'completed') {
        tx.set(ref, {
          updatedAtMs: nowMs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { jobId, status, created: false };
      }
      if (existing.authUid !== authUid || existing.stableUid !== stableUid) {
        throw new HttpsError('failed-precondition', 'account_delete_job_identity_mismatch');
      }
      if (existing.identityClosureHash && existing.identityClosureHash !== identityClosureHash) {
        throw new HttpsError('failed-precondition', 'account_delete_job_closure_mismatch');
      }
      const closureMigration = existing.identityClosureHash ? {} : {
        identityClosure: frozenClosure,
        identityClosureHash,
        identityClosureVersion: ACCOUNT_DELETE_IDENTITY_CLOSURE_VERSION,
        closureCutoffMs: Number(existing.createdAtMs ?? nowMs),
      };
      if (status === 'failed') {
        tx.set(ref, {
          status: 'queued',
          attempts: 0,
          leaseUntilMs: admin.firestore.FieldValue.delete(),
          nextAttemptAtMs: nowMs,
          updatedAtMs: nowMs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastError: admin.firestore.FieldValue.delete(),
          retentionUntilMs: admin.firestore.FieldValue.delete(),
          ...closureMigration,
        }, { merge: true });
        return { jobId, status: 'queued' as const, created: false };
      }
      tx.set(ref, {
        updatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...closureMigration,
      }, { merge: true });
      return { jobId, status, created: false };
    }

    tx.create(ref, {
      jobId,
      authUid,
      stableUid,
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      status: 'queued',
      attempts: 0,
      nextAttemptAtMs: nowMs,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      identityClosure: frozenClosure,
      identityClosureHash,
      identityClosureVersion: ACCOUNT_DELETE_IDENTITY_CLOSURE_VERSION,
      closureCutoffMs: nowMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } satisfies AccountDeleteJobDocument);

    return { jobId, status: 'queued', created: true };
  });
}

function boundedError(error: unknown): string {
  return String((error as { message?: unknown })?.message ?? error)
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export async function processAccountDeletionJob(
  db: FirebaseFirestore.Firestore,
  jobId: string,
  execute: AccountDeletionExecutor,
  nowMs = Date.now(),
): Promise<void> {
  const ref = db.collection(ACCOUNT_DELETE_JOBS).doc(jobId);
  const claimed = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    const status = jobStatus(data.status);
    const leaseUntilMs = Number(data.leaseUntilMs ?? 0);
    const nextAttemptAtMs = Number(data.nextAttemptAtMs ?? 0);
    if (status === 'completed' || status === 'failed') return null;
    if (status === 'queued' && Number.isFinite(nextAttemptAtMs) && nextAttemptAtMs > nowMs) return null;
    if (status === 'running' && Number.isFinite(leaseUntilMs) && leaseUntilMs > nowMs) return null;

    const authUid = typeof data.authUid === 'string' ? data.authUid : '';
    const stableUid = typeof data.stableUid === 'string' ? data.stableUid : '';
    const closureCutoffMs = Number(data.closureCutoffMs ?? data.createdAtMs ?? 0);
    const identityClosure = cleanIdentityClosure(
      authUid,
      stableUid,
      Array.isArray(data.identityClosure) ? data.identityClosure : [],
    );
    if (
      data.identityClosureVersion !== ACCOUNT_DELETE_IDENTITY_CLOSURE_VERSION
      || data.identityClosureHash !== accountDeleteIdentityClosureHash(identityClosure)
    ) {
      throw new Error('account_delete_job_closure_invalid');
    }
    if (!authUid || !stableUid) {
      throw new Error('account_delete_job_identity_missing');
    }
    const previousAttempts = Math.max(0, Math.floor(Number(data.attempts) || 0));
    if (previousAttempts >= ACCOUNT_DELETE_JOB_MAX_ATTEMPTS) {
      tx.update(ref, {
        status: 'failed',
        leaseUntilMs: admin.firestore.FieldValue.delete(),
        retentionUntilMs: admin.firestore.FieldValue.delete(),
        updatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }
    const attempts = previousAttempts + 1;
    const leaseToken = `${jobId}:${attempts}:${nowMs}`;
    tx.update(ref, {
      status: 'running',
      attempts,
      leaseToken,
      leaseUntilMs: nowMs + ACCOUNT_DELETE_JOB_LEASE_MS,
      nextAttemptAtMs: admin.firestore.FieldValue.delete(),
      startedAtMs: nowMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: admin.firestore.FieldValue.delete(),
    });
    return { authUid, stableUid, attempts, leaseToken, closureCutoffMs, identityClosure };
  });

  if (!claimed) return;

  try {
    const stats = await execute(
      db,
      claimed.stableUid,
      claimed.authUid,
      claimed.closureCutoffMs,
      claimed.identityClosure,
    );
    const batch = db.batch();
    batch.set(ref, {
      status: 'completed',
      leaseUntilMs: admin.firestore.FieldValue.delete(),
      nextAttemptAtMs: admin.firestore.FieldValue.delete(),
      completedAtMs: nowMs,
      retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      authUid: admin.firestore.FieldValue.delete(),
      stableUid: admin.firestore.FieldValue.delete(),
      identityClosure: admin.firestore.FieldValue.delete(),
      ...stats,
    }, { merge: true });
    batch.set(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(claimed.stableUid), {
      status: 'completed',
      completedAtMs: nowMs,
      retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(claimed.authUid), {
      status: 'completed',
      completedAtMs: nowMs,
      retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  } catch (error) {
    const backoffMs = Math.min(
      ACCOUNT_DELETE_JOB_INITIAL_BACKOFF_MS * (2 ** Math.max(0, claimed.attempts - 1)),
      ACCOUNT_DELETE_JOB_MAX_BACKOFF_MS,
    );
    await ref.set({
      status: 'queued',
      leaseUntilMs: admin.firestore.FieldValue.delete(),
      nextAttemptAtMs: nowMs + backoffMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: boundedError(error),
    }, { merge: true });
    throw error;
  }
}
