import {
  accountDeleteJobId,
  enqueueAccountDeletionJob,
  processAccountDeletionJob,
  type AccountDeleteJobDocument,
} from './account_delete_job';

type StoredDoc = Record<string, unknown>;

function makeDbStub(initial?: StoredDoc) {
  let stored: StoredDoc | undefined = initial ? { ...initial } : undefined;

  const snapshot = () => ({
    exists: stored !== undefined,
    data: () => stored,
  });

  const ref = {
    get: async () => snapshot(),
    create: async (value: StoredDoc) => {
      if (stored) throw new Error('already-exists');
      stored = { ...value };
    },
    set: async (value: StoredDoc, options?: { merge?: boolean }) => {
      const next = options?.merge ? { ...(stored ?? {}) } : {};
      Object.entries(value).forEach(([key, entry]) => {
        if ((entry as { constructor?: { name?: string } } | null)?.constructor?.name === 'DeleteTransform') {
          delete next[key];
        } else {
          next[key] = entry;
        }
      });
      stored = next;
    },
  };

  const db = {
    collection: (_name: string) => ({ doc: (_id: string) => ref }),
    runTransaction: async <T>(fn: (tx: {
      get: (_ref: unknown) => Promise<ReturnType<typeof snapshot>>;
      create: (_ref: unknown, value: StoredDoc) => void;
      set: (_ref: unknown, value: StoredDoc, options?: { merge?: boolean }) => void;
      update: (_ref: unknown, value: StoredDoc) => void;
    }) => Promise<T>) => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: async () => snapshot(),
        create: (_ignored, value) => writes.push(() => {
          if (stored) throw new Error('already-exists');
          stored = { ...value };
        }),
        set: (_ignored, value, options) => writes.push(() => {
          const next = options?.merge ? { ...(stored ?? {}) } : {};
          Object.entries(value).forEach(([key, entry]) => {
            if ((entry as { constructor?: { name?: string } } | null)?.constructor?.name === 'DeleteTransform') {
              delete next[key];
            } else {
              next[key] = entry;
            }
          });
          stored = next;
        }),
        update: (_ignored, value) => writes.push(() => {
          if (!stored) throw new Error('not-found');
          stored = { ...stored, ...value };
        }),
      });
      writes.forEach((write) => write());
      return result;
    },
  };

  return {
    db: db as unknown as FirebaseFirestore.Firestore,
    read: () => stored as AccountDeleteJobDocument | undefined,
  };
}

describe('account deletion job enqueue', () => {
  it('uses a deterministic non-plaintext job id', () => {
    const first = accountDeleteJobId('auth-456');
    expect(first).toBe(accountDeleteJobId('auth-456'));
    expect(first).not.toContain('auth-456');
    expect(first).toMatch(/^adel_[a-f0-9]{40}$/);
  });

  it('creates one queued job and returns the existing job on duplicate enqueue', async () => {
    const { db, read } = makeDbStub();

    const first = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 1_000);
    const duplicate = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 2_000);

    expect(first).toEqual({ jobId: accountDeleteJobId('auth-456'), status: 'queued', created: true });
    expect(duplicate).toEqual({ jobId: first.jobId, status: 'queued', created: false });
    expect(read()).toMatchObject({
      authUid: 'auth-456',
      stableUid: 'stable-123',
      status: 'queued',
      attempts: 0,
      createdAtMs: 1_000,
      updatedAtMs: 2_000,
    });
  });

  it('rejects a duplicate request that resolves to a different stable uid', async () => {
    const { db } = makeDbStub();
    await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 1_000);

    await expect(
      enqueueAccountDeletionJob(db, 'auth-456', 'stable-other', 2_000),
    ).rejects.toThrow('account_delete_job_identity_mismatch');
  });

  it('keeps a completed job terminal on duplicate enqueue', async () => {
    const jobId = accountDeleteJobId('auth-456');
    const { db, read } = makeDbStub({
      jobId,
      authUid: 'auth-456',
      stableUid: 'stable-123',
      status: 'completed',
      attempts: 1,
      createdAtMs: 1_000,
      updatedAtMs: 1_500,
    });

    const result = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 2_000);

    expect(result).toEqual({ jobId, status: 'completed', created: false });
    expect(read()?.status).toBe('completed');
  });

  it('requeues a terminal failed job when the authenticated user retries deletion', async () => {
    const jobId = accountDeleteJobId('auth-456');
    const { db, read } = makeDbStub({
      jobId,
      authUid: 'auth-456',
      stableUid: 'stable-123',
      status: 'failed',
      attempts: 8,
      lastError: 'permanent failure',
      createdAtMs: 1_000,
      updatedAtMs: 1_500,
    });

    const result = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 2_000);

    expect(result).toEqual({ jobId, status: 'queued', created: false });
    expect(read()).toMatchObject({ status: 'queued', attempts: 0, updatedAtMs: 2_000 });
  });
});

describe('account deletion job worker', () => {
  const queuedJob = (): StoredDoc => ({
    jobId: 'job-1',
    authUid: 'auth-456',
    stableUid: 'stable-123',
    authUidHash: 'auth-hash',
    stableUidHash: 'stable-hash',
    status: 'queued',
    attempts: 0,
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
  });

  it('claims a queued job, runs the deletion, and marks it completed', async () => {
    const { db, read } = makeDbStub(queuedJob());
    const execute = jest.fn(async () => ({
      docsDeleted: 12,
      docsUpdated: 3,
      queriesRun: 7,
      authDeleted: true,
    }));

    await processAccountDeletionJob(db, 'job-1', execute, 2_000);

    expect(execute).toHaveBeenCalledWith(db, 'stable-123', 'auth-456');
    expect(read()).toMatchObject({
      status: 'completed',
      attempts: 1,
      completedAtMs: 2_000,
      docsDeleted: 12,
      authDeleted: true,
    });
    expect(read()).not.toHaveProperty('authUid');
    expect(read()).not.toHaveProperty('stableUid');
  });

  it('returns a failed execution to queued and rethrows for platform retry', async () => {
    const { db, read } = makeDbStub(queuedJob());
    const execute = jest.fn(async () => {
      throw new Error('boom');
    });

    await expect(processAccountDeletionJob(db, 'job-1', execute, 2_000)).rejects.toThrow('boom');

    expect(read()).toMatchObject({
      status: 'queued',
      attempts: 1,
      lastError: 'boom',
    });
    expect(Number(read()?.nextAttemptAtMs)).toBeGreaterThan(2_000);
  });

  it('does not consume an attempt before a queued job is due', async () => {
    const { db, read } = makeDbStub({ ...queuedJob(), nextAttemptAtMs: 10_000 });
    const execute = jest.fn();

    await processAccountDeletionJob(db, 'job-1', execute, 2_000);

    expect(execute).not.toHaveBeenCalled();
    expect(read()).toMatchObject({ status: 'queued', attempts: 0, nextAttemptAtMs: 10_000 });
  });

  it('does not execute a completed job again', async () => {
    const { db } = makeDbStub({ ...queuedJob(), status: 'completed', attempts: 1 });
    const execute = jest.fn();

    await processAccountDeletionJob(db, 'job-1', execute, 2_000);

    expect(execute).not.toHaveBeenCalled();
  });

  it('does not execute a running job while its lease is live', async () => {
    const { db } = makeDbStub({
      ...queuedJob(),
      status: 'running',
      attempts: 1,
      leaseUntilMs: 10_000,
    });
    const execute = jest.fn();

    await processAccountDeletionJob(db, 'job-1', execute, 2_000);

    expect(execute).not.toHaveBeenCalled();
  });

  it('marks an exhausted queued job failed without executing it again', async () => {
    const { db, read } = makeDbStub({ ...queuedJob(), attempts: 8 });
    const execute = jest.fn();

    await processAccountDeletionJob(db, 'job-1', execute, 2_000);

    expect(execute).not.toHaveBeenCalled();
    expect(read()).toMatchObject({ status: 'failed', attempts: 8 });
  });
});
