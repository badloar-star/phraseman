import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { executeAccountDeletion } from './account_delete';
import { ACCOUNT_DELETE_JOBS, ACCOUNT_DELETE_TOMBSTONES, processAccountDeletionJob } from './account_delete_job';

export const ACCOUNT_DELETE_WORKER_OPTIONS = {
  document: `${ACCOUNT_DELETE_JOBS}/{jobId}`,
  region: 'us-central1',
  retry: true,
  timeoutSeconds: 540,
  memory: '1GiB' as const,
} as const;

export const ACCOUNT_DELETE_RETRY_OPTIONS = {
  schedule: 'every 5 minutes',
  region: 'us-central1',
  retryCount: 3,
  timeoutSeconds: 540,
  memory: '1GiB' as const,
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
  process: typeof processAccountDeletionJob = processAccountDeletionJob,
): Promise<void> {
  const jobs = db.collection(ACCOUNT_DELETE_JOBS);
  const [due, stranded, expired, expiredTombstones] = await Promise.all([
    jobs.where('nextAttemptAtMs', '<=', nowMs).limit(20).get(),
    jobs.where('leaseUntilMs', '<=', nowMs).limit(20).get(),
    jobs.where('retentionUntilMs', '<=', nowMs).limit(50).get(),
    db.collection(ACCOUNT_DELETE_TOMBSTONES).where('retentionUntilMs', '<=', nowMs).limit(50).get(),
  ]);

  const recoverableIds = new Set([
    ...due.docs.map((doc) => doc.id),
    ...stranded.docs.map((doc) => doc.id),
  ]);
  await Promise.allSettled(
    Array.from(recoverableIds, (jobId) => process(db, jobId, executeAccountDeletion, nowMs)),
  );
  await Promise.allSettled([
    ...expired.docs.map((doc) => doc.ref.delete()),
    ...expiredTombstones.docs.map((doc) => doc.ref.delete()),
  ]);
}

export const accountDeleteRetryCron = onSchedule(
  ACCOUNT_DELETE_RETRY_OPTIONS,
  async () => {
    await sweepAccountDeletionJobs(admin.firestore());
  },
);
