"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const account_delete_job_1 = require("./account_delete_job");
function makeDbStub(initial) {
    const docs = new Map();
    if (initial)
        docs.set(`account_deletion_jobs/${String(initial.jobId ?? 'job-1')}`, { ...initial });
    const applySet = (key, value, options) => {
        const next = options?.merge ? { ...(docs.get(key) ?? {}) } : {};
        Object.entries(value).forEach(([field, entry]) => {
            if (entry?.constructor?.name === 'DeleteTransform') {
                delete next[field];
            }
            else {
                next[field] = entry;
            }
        });
        docs.set(key, next);
    };
    const makeRef = (collection, id) => {
        const key = `${collection}/${id}`;
        return {
            key,
            get: async () => ({ exists: docs.has(key), data: () => docs.get(key) }),
            create: async (value) => {
                if (docs.has(key))
                    throw new Error('already-exists');
                docs.set(key, { ...value });
            },
            set: async (value, options) => applySet(key, value, options),
        };
    };
    const db = {
        collection: (name) => ({ doc: (id) => makeRef(name, id) }),
        batch: () => {
            const writes = [];
            return {
                set: (ref, value, options) => {
                    writes.push(() => applySet(ref.key, value, options));
                },
                commit: async () => { writes.forEach((write) => write()); },
            };
        },
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: async (ref) => ({ exists: docs.has(ref.key), data: () => docs.get(ref.key) }),
                create: (ref, value) => writes.push(() => {
                    if (docs.has(ref.key))
                        throw new Error('already-exists');
                    docs.set(ref.key, { ...value });
                }),
                set: (ref, value, options) => writes.push(() => applySet(ref.key, value, options)),
                update: (ref, value) => writes.push(() => {
                    if (!docs.has(ref.key))
                        throw new Error('not-found');
                    applySet(ref.key, value, { merge: true });
                }),
            });
            writes.forEach((write) => write());
            return result;
        },
    };
    return {
        db: db,
        read: () => Array.from(docs.entries()).find(([key]) => key.startsWith('account_deletion_jobs/'))?.[1],
    };
}
describe('account deletion job enqueue', () => {
    it('uses a deterministic non-plaintext job id', () => {
        const first = (0, account_delete_job_1.accountDeleteJobId)('auth-456');
        expect(first).toBe((0, account_delete_job_1.accountDeleteJobId)('auth-456'));
        expect(first).not.toContain('auth-456');
        expect(first).toMatch(/^adel_[a-f0-9]{40}$/);
    });
    it('creates one queued job and returns the existing job on duplicate enqueue', async () => {
        const { db, read } = makeDbStub();
        const first = await (0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-123', 1000);
        const duplicate = await (0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-123', 2000);
        expect(first).toEqual({ jobId: (0, account_delete_job_1.accountDeleteJobId)('auth-456'), status: 'queued', created: true });
        expect(duplicate).toEqual({ jobId: first.jobId, status: 'queued', created: false });
        expect(read()).toMatchObject({
            authUid: 'auth-456',
            stableUid: 'stable-123',
            status: 'queued',
            attempts: 0,
            createdAtMs: 1000,
            updatedAtMs: 2000,
        });
    });
    it('rejects a duplicate request that resolves to a different stable uid', async () => {
        const { db } = makeDbStub();
        await (0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-123', 1000);
        await expect((0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-other', 2000)).rejects.toThrow('account_delete_job_identity_mismatch');
    });
    it('keeps a completed job terminal on duplicate enqueue', async () => {
        const jobId = (0, account_delete_job_1.accountDeleteJobId)('auth-456');
        const { db, read } = makeDbStub({
            jobId,
            authUid: 'auth-456',
            stableUid: 'stable-123',
            status: 'completed',
            attempts: 1,
            createdAtMs: 1000,
            updatedAtMs: 1500,
        });
        const result = await (0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-123', 2000);
        expect(result).toEqual({ jobId, status: 'completed', created: false });
        expect(read()?.status).toBe('completed');
    });
    it('requeues a terminal failed job when the authenticated user retries deletion', async () => {
        const jobId = (0, account_delete_job_1.accountDeleteJobId)('auth-456');
        const { db, read } = makeDbStub({
            jobId,
            authUid: 'auth-456',
            stableUid: 'stable-123',
            status: 'failed',
            attempts: 8,
            lastError: 'permanent failure',
            createdAtMs: 1000,
            updatedAtMs: 1500,
        });
        const result = await (0, account_delete_job_1.enqueueAccountDeletionJob)(db, 'auth-456', 'stable-123', 2000);
        expect(result).toEqual({ jobId, status: 'queued', created: false });
        expect(read()).toMatchObject({ status: 'queued', attempts: 0, updatedAtMs: 2000 });
    });
});
describe('account deletion job worker', () => {
    const queuedJob = () => ({
        jobId: 'job-1',
        authUid: 'auth-456',
        stableUid: 'stable-123',
        authUidHash: 'auth-hash',
        stableUidHash: 'stable-hash',
        status: 'queued',
        attempts: 0,
        createdAtMs: 1000,
        updatedAtMs: 1000,
    });
    it('claims a queued job, runs the deletion, and marks it completed', async () => {
        const { db, read } = makeDbStub(queuedJob());
        const execute = jest.fn(async () => ({
            docsDeleted: 12,
            docsUpdated: 3,
            queriesRun: 7,
            authDeleted: true,
        }));
        await (0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000);
        expect(execute).toHaveBeenCalledWith(db, 'stable-123', 'auth-456');
        expect(read()).toMatchObject({
            status: 'completed',
            attempts: 1,
            completedAtMs: 2000,
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
        await expect((0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000)).rejects.toThrow('boom');
        expect(read()).toMatchObject({
            status: 'queued',
            attempts: 1,
            lastError: 'boom',
        });
        expect(Number(read()?.nextAttemptAtMs)).toBeGreaterThan(2000);
    });
    it('does not consume an attempt before a queued job is due', async () => {
        const { db, read } = makeDbStub({ ...queuedJob(), nextAttemptAtMs: 10000 });
        const execute = jest.fn();
        await (0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000);
        expect(execute).not.toHaveBeenCalled();
        expect(read()).toMatchObject({ status: 'queued', attempts: 0, nextAttemptAtMs: 10000 });
    });
    it('does not execute a completed job again', async () => {
        const { db } = makeDbStub({ ...queuedJob(), status: 'completed', attempts: 1 });
        const execute = jest.fn();
        await (0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000);
        expect(execute).not.toHaveBeenCalled();
    });
    it('does not execute a running job while its lease is live', async () => {
        const { db } = makeDbStub({
            ...queuedJob(),
            status: 'running',
            attempts: 1,
            leaseUntilMs: 10000,
        });
        const execute = jest.fn();
        await (0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000);
        expect(execute).not.toHaveBeenCalled();
    });
    it('marks an exhausted queued job failed without executing it again', async () => {
        const { db, read } = makeDbStub({ ...queuedJob(), attempts: 8 });
        const execute = jest.fn();
        await (0, account_delete_job_1.processAccountDeletionJob)(db, 'job-1', execute, 2000);
        expect(execute).not.toHaveBeenCalled();
        expect(read()).toMatchObject({ status: 'failed', attempts: 8 });
    });
});
//# sourceMappingURL=account_delete_job.test.js.map