"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const account_delete_worker_1 = require("./account_delete_worker");
describe('account deletion worker binding', () => {
    it('uses a retryable long-running Firestore trigger', () => {
        expect(account_delete_worker_1.ACCOUNT_DELETE_WORKER_OPTIONS).toMatchObject({
            document: 'account_deletion_jobs/{jobId}',
            region: 'us-central1',
            retry: true,
            timeoutSeconds: 540,
            memory: '1GiB',
        });
        expect(account_delete_worker_1.accountDeleteWorker).toBeDefined();
    });
    it('uses a lightweight retry dispatcher and preserves the heavy worker', () => {
        expect(account_delete_worker_1.ACCOUNT_DELETE_RETRY_OPTIONS).toMatchObject({
            schedule: 'every 30 minutes',
            region: 'us-central1',
            retryCount: 3,
            timeoutSeconds: 60,
            memory: '256MiB',
        });
        expect(account_delete_worker_1.ACCOUNT_DELETE_WORKER_OPTIONS).toMatchObject({
            retry: true,
            timeoutSeconds: 540,
            memory: '1GiB',
        });
        expect(account_delete_worker_1.accountDeleteWorker).toBeDefined();
        expect(account_delete_worker_1.accountDeleteRetryCron).toBeDefined();
    });
    it('wakes due jobs once and purges expired audit jobs and deletion tombstones', async () => {
        const dueRef = { path: 'account_deletion_jobs/due' };
        const sharedRef = { path: 'account_deletion_jobs/shared' };
        const failedExpiredRef = { path: 'account_deletion_jobs/failed-expired' };
        const expiredTombstoneRef = { path: 'account_deletion_tombstones/expired' };
        const batchSet = jest.fn();
        const batchDelete = jest.fn();
        const batchCommit = jest.fn(async () => undefined);
        const docsFor = (collection, field) => {
            if (collection === 'account_deletion_tombstones') {
                return [{ id: 'expired-tombstone', ref: expiredTombstoneRef }];
            }
            if (field === 'nextAttemptAtMs') {
                return [
                    { id: 'due', ref: dueRef, data: () => ({ status: 'queued' }) },
                    { id: 'shared', ref: sharedRef, data: () => ({ status: 'queued' }) },
                    { id: 'failed-expired', ref: failedExpiredRef, data: () => ({ status: 'failed' }) },
                ];
            }
            if (field === 'leaseUntilMs') {
                return [{ id: 'shared', ref: sharedRef, data: () => ({ status: 'running' }) }];
            }
            return [{ id: 'failed-expired', ref: failedExpiredRef, data: () => ({ status: 'failed' }) }];
        };
        const db = {
            collection: (collection) => ({
                where: (field) => ({
                    limit: () => ({
                        get: async () => {
                            const docs = docsFor(collection, field);
                            return { docs, size: docs.length };
                        },
                    }),
                }),
            }),
            batch: () => ({ set: batchSet, delete: batchDelete, commit: batchCommit }),
        };
        await (0, account_delete_worker_1.sweepAccountDeletionJobs)(db, 10000);
        expect(batchSet).toHaveBeenCalledWith(dueRef, expect.objectContaining({
            retryRequestedAtMs: 10000,
            updatedAtMs: 10000,
        }), { merge: true });
        expect(batchSet).toHaveBeenCalledWith(sharedRef, expect.objectContaining({
            retryRequestedAtMs: 10000,
            updatedAtMs: 10000,
        }), { merge: true });
        expect(batchSet.mock.calls.filter(([ref]) => ref === sharedRef)).toHaveLength(1);
        expect(batchSet.mock.calls.some(([ref]) => ref === failedExpiredRef)).toBe(false);
        expect(batchDelete).toHaveBeenCalledWith(failedExpiredRef);
        expect(batchDelete).toHaveBeenCalledWith(expiredTombstoneRef);
        expect(batchCommit).toHaveBeenCalledTimes(1);
    });
    it('does not wake a non-expired terminal job', async () => {
        const completedRef = { path: 'account_deletion_jobs/completed' };
        const batchSet = jest.fn();
        const batchDelete = jest.fn();
        const batchCommit = jest.fn(async () => undefined);
        const db = {
            collection: (collection) => ({
                where: (field) => ({
                    limit: () => ({
                        get: async () => {
                            const docs = collection === 'account_deletion_jobs' && field === 'nextAttemptAtMs'
                                ? [{ id: 'completed', ref: completedRef, data: () => ({ status: 'completed' }) }]
                                : [];
                            return { docs, size: docs.length };
                        },
                    }),
                }),
            }),
            batch: () => ({ set: batchSet, delete: batchDelete, commit: batchCommit }),
        };
        await (0, account_delete_worker_1.sweepAccountDeletionJobs)(db, 10000);
        expect(batchSet).not.toHaveBeenCalled();
        expect(batchDelete).not.toHaveBeenCalled();
        expect(batchCommit).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=account_delete_worker.test.js.map