"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const local_runner_transport_1 = require("./local_runner_transport");
class MemoryLocalRunnerRepository {
    constructor() {
        this.documents = new Map();
    }
    async get(path) { return this.documents.get(path) ?? null; }
    async listQueuedCodePrepareJobs() {
        return [...this.documents.entries()]
            .filter(([path]) => path.startsWith('agent_manager_execution_jobs/'))
            .map(([, document]) => document);
    }
    async runTransaction(body) {
        const staged = new Map(this.documents);
        const result = await body({
            get: async (path) => staged.get(path) ?? null,
            create: (path, data) => {
                if (staged.has(path))
                    throw new Error(`already exists: ${path}`);
                staged.set(path, { id: path.split('/').at(-1) ?? '', data: structuredClone(data) });
            },
            update: (path, data) => {
                const existing = staged.get(path);
                if (!existing)
                    throw new Error(`missing: ${path}`);
                staged.set(path, { ...existing, data: { ...existing.data, ...structuredClone(data) } });
            },
        });
        this.documents.clear();
        staged.forEach((value, key) => this.documents.set(key, value));
        return result;
    }
}
const NOW = 2000000000000;
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
const random = (...values) => {
    const copy = [...values];
    return () => {
        const value = copy.shift();
        if (!value)
            throw new Error('test random exhausted');
        return value;
    };
};
function seedQueuedCodeTask(repository, taskId = 'task-001', revision = 3) {
    const jobId = `${taskId}__r${revision}`;
    const idempotencyKey = `exec:${hash(`${taskId}:r${revision}`)}`;
    repository.documents.set(`agent_manager_tasks/${taskId}`, { id: taskId, data: {
            schemaVersion: 1, taskId, title: 'Prepare a safe code change', brief: 'Prepare code only for owner review with no external effect.',
            priority: 'normal', deadlineAtMs: null, allowedScope: 'code_prepare', sourceLinks: [], status: 'queued',
            assignedAgentId: 'developer', createdByUid: 'owner-001', createdAtMs: NOW - 1000, updatedAtMs: NOW - 1000,
            revision, result: null,
        } });
    repository.documents.set(`agent_manager_execution_jobs/${jobId}`, { id: jobId, data: {
            schemaVersion: 1, taskId, taskRevision: revision, scope: 'code_prepare', handlerVersion: 'code-prepare-v1',
            state: 'queued', attempts: 0, maxAttempts: 2, leaseUntilMs: null, idempotencyKey, idempotencyKeyHash: hash(idempotencyKey),
            createdAtMs: NOW - 1000, updatedAtMs: NOW - 1000, leasedAtMs: null, finishedAtMs: null, outputRef: null, outputHash: null,
        } });
    return jobId;
}
async function paired(repository) {
    const pairing = await (0, local_runner_transport_1.createLocalRunnerPairing)(repository, { ownerUid: 'owner-001' }, NOW, random('pair-001', 'code-raw'));
    return (0, local_runner_transport_1.exchangeLocalRunnerPairing)(repository, { pairingId: pairing.pairingId, code: pairing.code }, NOW + 1, random('cap-001', 'cap-token-raw'));
}
describe('agent-manager local runner transport', () => {
    test('stores only a hash of the one-time pairing code and returns the raw code once', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const pairing = await (0, local_runner_transport_1.createLocalRunnerPairing)(repository, { ownerUid: 'owner-001' }, NOW, random('pair-001', 'code-raw'));
        expect(pairing).toEqual({ pairingId: 'pair-001', code: 'code-raw', expiresAtMs: NOW + 10 * 60 * 1000 });
        const saved = repository.documents.get('agent_manager_local_runner_pairings/pair-001')?.data;
        expect(saved).toMatchObject({ pairingId: 'pair-001', ownerUid: 'owner-001', codeHash: hash('code-raw'), consumedAtMs: null, revokedAtMs: null });
        expect(JSON.stringify(saved)).not.toContain('code-raw');
    });
    test('exchanges a valid pairing only once and stores only a capability hash', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const pairing = await (0, local_runner_transport_1.createLocalRunnerPairing)(repository, { ownerUid: 'owner-001' }, NOW, random('pair-001', 'code-raw'));
        const capability = await (0, local_runner_transport_1.exchangeLocalRunnerPairing)(repository, { pairingId: pairing.pairingId, code: pairing.code }, NOW + 1, random('cap-001', 'cap-token-raw'));
        expect(capability).toEqual({ capabilityId: 'cap-001', token: 'cap-token-raw', expiresAtMs: NOW + 1 + 30 * 24 * 60 * 60 * 1000 });
        expect(JSON.stringify(repository.documents.get('agent_manager_local_runner_capabilities/cap-001')?.data)).not.toContain('cap-token-raw');
        await expect((0, local_runner_transport_1.exchangeLocalRunnerPairing)(repository, { pairingId: pairing.pairingId, code: pairing.code }, NOW + 2, random('cap-002', 'second-cap-token'))).rejects.toThrow('pairing code is unavailable');
    });
    test('does not exchange expired or revoked pairing codes', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const pairing = await (0, local_runner_transport_1.createLocalRunnerPairing)(repository, { ownerUid: 'owner-001' }, NOW, random('pair-001', 'code-raw'));
        await expect((0, local_runner_transport_1.exchangeLocalRunnerPairing)(repository, { pairingId: pairing.pairingId, code: pairing.code }, NOW + 10 * 60 * 1000, random('cap-001', 'cap-token-raw'))).rejects.toThrow('pairing code is unavailable');
    });
    test('claims exactly one queued code_prepare job with a capability-bound lease', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const jobId = seedQueuedCodeTask(repository);
        seedQueuedCodeTask(repository, 'task-002');
        const capability = await paired(repository);
        const claim = await (0, local_runner_transport_1.claimOneLocalRunnerJob)(repository, capability, NOW + 2, random('lease-raw'));
        expect(claim).toEqual(expect.objectContaining({ jobId, taskId: 'task-001', taskRevision: 3, leaseToken: 'lease-raw' }));
        expect(repository.documents.get(`agent_manager_execution_jobs/${jobId}`)?.data).toMatchObject({ state: 'leased', attempts: 1 });
        const lease = repository.documents.get(`agent_manager_local_runner_leases/${jobId}`)?.data;
        expect(lease).toMatchObject({ capabilityId: capability.capabilityId, tokenHash: hash('lease-raw') });
        expect(JSON.stringify(lease)).not.toContain('lease-raw');
    });
    test('rejects non-code jobs and expired or revoked capabilities', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const jobId = seedQueuedCodeTask(repository);
        const job = repository.documents.get(`agent_manager_execution_jobs/${jobId}`);
        repository.documents.set(`agent_manager_execution_jobs/${jobId}`, { ...job, data: { ...job.data, scope: 'analysis_only', handlerVersion: 'analysis-only-v1' } });
        const capability = await paired(repository);
        await expect((0, local_runner_transport_1.claimOneLocalRunnerJob)(repository, capability, NOW + 2, random('lease-raw'))).resolves.toBeNull();
        await (0, local_runner_transport_1.revokeLocalRunnerCapability)(repository, { ownerUid: 'owner-001', capabilityId: capability.capabilityId }, NOW + 3);
        await expect((0, local_runner_transport_1.claimOneLocalRunnerJob)(repository, capability, NOW + 4, random('lease-two'))).rejects.toThrow('local runner capability is unavailable');
    });
    test('accepts only the live capability-bound lease and writes a bounded needs-review result', async () => {
        const repository = new MemoryLocalRunnerRepository();
        const jobId = seedQueuedCodeTask(repository);
        const capability = await paired(repository);
        const claim = await (0, local_runner_transport_1.claimOneLocalRunnerJob)(repository, capability, NOW + 2, random('lease-raw'));
        if (!claim)
            throw new Error('claim expected');
        const outcome = await (0, local_runner_transport_1.submitLocalRunnerReview)(repository, {
            capability,
            jobId,
            leaseToken: claim.leaseToken,
            result: { summary: 'Prepared an isolated change plan and focused checks for owner review.', outcome: 'needs_review' },
        }, NOW + 3);
        expect(outcome).toEqual({ outcome: 'succeeded', taskId: 'task-001' });
        expect(repository.documents.get('agent_manager_tasks/task-001')?.data).toMatchObject({ status: 'needs_review', revision: 5, result: { outcome: 'needs_review' } });
        expect(repository.documents.get(`agent_manager_execution_jobs/${jobId}`)?.data).toMatchObject({ state: 'succeeded', outputRef: expect.stringMatching(/^execution_output:[a-f0-9]{64}$/) });
        await expect((0, local_runner_transport_1.submitLocalRunnerReview)(repository, { capability, jobId, leaseToken: claim.leaseToken, result: { summary: 'Repeat', outcome: 'needs_review' } }, NOW + 4)).rejects.toThrow('local runner lease is unavailable');
    });
});
//# sourceMappingURL=local_runner_transport.test.js.map