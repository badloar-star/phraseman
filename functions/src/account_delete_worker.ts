import * as admin from 'firebase-admin';
import { withCronHeartbeat } from './cron_heartbeat';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { executeAccountDeletion } from './account_delete';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_JOBS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  processAccountDeletionJob,
} from './account_delete_job';

export const ACCOUNT_DELETE_PERMANENT_DENIAL_GC_POLICY = {
  collection: ACCOUNT_DELETE_PERMANENT_DENIALS,
  purge: false,
} as const;

export const ACCOUNT_DELETE_WORKER_OPTIONS = {
  document: `${ACCOUNT_DELETE_JOBS}/{jobId}`,
  region: 'us-central1',
  retry: true,
  timeoutSeconds: 540,
  memory: '1GiB' as const,
} as const;

export const ACCOUNT_DELETE_RETRY_OPTIONS = {
  schedule: 'every 30 minutes',
  region: 'us-central1',
  retryCount: 3,
  timeoutSeconds: 60,
  memory: '256MiB' as const,
} as const;

export const accountDeleteWorker = onDocumentWritten(
  ACCOUNT_DELETE_WORKER_OPTIONS,
  async (event) => {
    await processAccountDeletionJob(
      admin.firestore(),
      event.params.jobId,
      executeAccountDeletion,
    );
  },
);

export async function sweepAccountDeletionJobs(
  db: FirebaseFirestore.Firestore,
  nowMs = Date.now(),
): Promise<void> {
  const jobs = db.collection(ACCOUNT_DELETE_JOBS);
  const [due, stranded, expired, expiredTombstones, expiredAuthMarkers] = await Promise.all([
    jobs.where('nextAttemptAtMs', '<=', nowMs).limit(20).get(),
    jobs.where('leaseUntilMs', '<=', nowMs).limit(20).get(),
    jobs.where('retentionUntilMs', '<=', nowMs).limit(50).get(),
    db.collection(ACCOUNT_DELETE_TOMBSTONES).where('retentionUntilMs', '<=', nowMs).limit(50).get(),
    db.collection(ACCOUNT_DELETE_AUTH_MARKERS).where('retentionUntilMs', '<=', nowMs).limit(50).get(),
  ]);

  // A failed deletion is a permanent deny/retry state, not disposable audit
  // history. Keep legacy failed jobs that already carry retentionUntilMs too.
  const deletableExpiredJobs = expired.docs.filter((doc) => doc.data().status === 'completed');
  const expiredIds = new Set(deletableExpiredJobs.map((doc) => doc.id));
  const terminalStatuses = new Set(['completed', 'failed']);
  const recoverable = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const doc of [...due.docs, ...stranded.docs]) {
    const status = String(doc.data().status ?? '');
    if (!expiredIds.has(doc.id) && !terminalStatuses.has(status)) recoverable.set(doc.id, doc.ref);
  }

  const batch = db.batch();
  for (const ref of recoverable.values()) {
    batch.set(ref, {
      retryRequestedAtMs: nowMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  for (const doc of deletableExpiredJobs) batch.delete(doc.ref);
  for (const doc of expiredTombstones.docs) batch.delete(doc.ref);
  for (const doc of expiredAuthMarkers.docs) batch.delete(doc.ref);
  if (recoverable.size + deletableExpiredJobs.length + expiredTombstones.size + expiredAuthMarkers.size > 0) {
    await batch.commit();
  }
}

export const accountDeleteRetryCron = onSchedule(
  ACCOUNT_DELETE_RETRY_OPTIONS,
  withCronHeartbeat('accountDeleteRetryCron', async () => {
    await sweepAccountDeletionJobs(admin.firestore());
  }));
