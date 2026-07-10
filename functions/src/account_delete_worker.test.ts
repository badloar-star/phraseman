import {
  ACCOUNT_DELETE_WORKER_OPTIONS,
  ACCOUNT_DELETE_RETRY_OPTIONS,
  accountDeleteWorker,
  accountDeleteRetryCron,
  sweepAccountDeletionJobs,
} from './account_delete_worker';

describe('account deletion worker binding', () => {
  it('uses a retryable long-running Firestore trigger', () => {
    expect(ACCOUNT_DELETE_WORKER_OPTIONS).toMatchObject({
      document: 'account_deletion_jobs/{jobId}',
      region: 'us-central1',
      retry: true,
      timeoutSeconds: 540,
      memory: '1GiB',
    });
    expect(accountDeleteWorker).toBeDefined();
  });

  it('adds a scheduled due-job sweeper instead of relying on self-trigger retries', () => {
    expect(ACCOUNT_DELETE_RETRY_OPTIONS).toMatchObject({
      schedule: 'every 5 minutes',
      region: 'us-central1',
      timeoutSeconds: 540,
    });
    expect(accountDeleteRetryCron).toBeDefined();
  });

  it('processes due queued jobs and purges expired scrubbed audit jobs', async () => {
    const expiredDelete = jest.fn(async () => undefined);
    const process = jest.fn(async () => undefined);
    const queryFor = (field: string) => ({
      where: () => ({
        limit: () => ({
          get: async () => ({
            docs: field === 'nextAttemptAtMs'
              ? [{ id: 'queued-job', ref: { delete: jest.fn() } }]
              : field === 'leaseUntilMs'
                ? [{ id: 'stranded-running-job', ref: { delete: jest.fn() } }]
                : [{ id: 'expired-job', ref: { delete: expiredDelete } }],
          }),
        }),
      }),
    });
    const db = {
      collection: () => ({
        where: (field: string) => queryFor(field).where(),
      }),
    } as unknown as FirebaseFirestore.Firestore;

    await sweepAccountDeletionJobs(db, 10_000, process);

    expect(process).toHaveBeenCalledWith(db, 'queued-job', expect.any(Function), 10_000);
    expect(process).toHaveBeenCalledWith(db, 'stranded-running-job', expect.any(Function), 10_000);
    expect(expiredDelete).toHaveBeenCalledTimes(1);
  });
});
