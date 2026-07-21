import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const ACCOUNT_DELETE_JOBS = 'account_deletion_jobs';
export const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones';

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
) => Promise<AccountDeletionStats>;

const ACCOUNT_DELETE_JOB_LEASE_MS = 10 * 60_000;
const ACCOUNT_DELETE_JOB_MAX_ATTEMPTS = 8;
const ACCOUNT_DELETE_JOB_INITIAL_BACKOFF_MS = 30_000;
const ACCOUNT_DELETE_JOB_MAX_BACKOFF_MS = 30 * 60_000;
const ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60_000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function accountDeleteJobId(authUid: string): string {
  return `adel_${sha256(authUid).slice(0, 40)}`;
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
): Promise<AccountDeleteEnqueueResult> {
  const jobId = accountDeleteJobId(authUid);
  const ref = db.collection(ACCOUNT_DELETE_JOBS).doc(jobId);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid);

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const tombstone = {
      jobId,
      status: 'pending',
      authUidHash: sha256(authUid),
      stableUidHash: sha256(stableUid),
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (snapshot.exists) {
      const existing = snapshot.data() ?? {};
      const status = jobStatus(existing.status);
      const identityMatches =
        (existing.authUid === authUid && existing.stableUid === stableUid) ||
        (
          existing.authUid === undefined &&
          existing.stableUid === undefined &&
          existing.authUidHash === sha256(authUid) &&
          existing.stableUidHash === sha256(stableUid)
        );
      if (!identityMatches) {
        throw new HttpsError('failed-precondition', 'account_delete_job_identity_mismatch');
      }
      tx.set(tombstoneRef, tombstone, { merge: true });
      if (status === 'completed') {
        tx.set(ref, {
          updatedAtMs: nowMs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { jobId, status, created: false };
      }
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
        }, { merge: true });
        return { jobId, status: 'queued' as const, created: false };
      }
      tx.set(ref, {
        updatedAtMs: nowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return { jobId, status, created: false };
    }

    tx.set(tombstoneRef, tombstone, { merge: true });
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
    if (!authUid || !stableUid) {
      throw new Error('account_delete_job_identity_missing');
    }
    const previousAttempts = Math.max(0, Math.floor(Number(data.attempts) || 0));
    if (previousAttempts >= ACCOUNT_DELETE_JOB_MAX_ATTEMPTS) {
      tx.update(ref, {
        status: 'failed',
        leaseUntilMs: admin.firestore.FieldValue.delete(),
        retentionUntilMs: nowMs + ACCOUNT_DELETE_JOB_AUDIT_RETENTION_MS,
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
    return { authUid, stableUid, attempts, leaseToken };
  });

  if (!claimed) return;

  try {
    const stats = await execute(db, claimed.stableUid, claimed.authUid);
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
      ...stats,
    }, { merge: true });
    batch.set(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(claimed.stableUid), {
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
