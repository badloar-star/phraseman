"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("../agent_office/contracts");
const execution_worker_1 = require("./execution_worker");
class MemoryExecutionRepository {
    constructor() {
        this.documents = new Map();
        this.afterTransaction = null;
        this.transactionCount = 0;
    }
    async get(path) { return this.documents.get(path) ?? null; }
    async listEligibleJobs() {
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
        this.transactionCount += 1;
        this.afterTransaction?.(this.transactionCount);
        return result;
    }
}
const NOW = 2000000000000;
const TASK_ID = 'task-001';
const JOB_ID = `${TASK_ID}__r3`;
function task(overrides = {}) {
    return {
        schemaVersion: 1, taskId: TASK_ID, title: 'Safe support review', brief: 'Prepare a review-only support draft.',
        priority: 'normal', deadlineAtMs: null, allowedScope: 'support_draft', sourceLinks: [], status: 'queued',
        assignedAgentId: 'support', createdByUid: 'owner-001', createdAtMs: NOW - 1000, updatedAtMs: NOW - 1000,
        revision: 3, result: null, ...overrides,
    };
}
function job(overrides = {}) {
    const idempotencyKey = `exec:${(0, contracts_1.sha256)(`${TASK_ID}:r3`)}`;
    return {
        schemaVersion: 1, taskId: TASK_ID, taskRevision: 3, scope: 'support_draft', handlerVersion: 'support-draft-v1',
        state: 'queued', attempts: 0, maxAttempts: 2, leaseUntilMs: null, idempotencyKey, idempotencyKeyHash: (0, contracts_1.sha256)(idempotencyKey),
        createdAtMs: NOW - 1000, updatedAtMs: NOW - 1000, leasedAtMs: null, finishedAtMs: null, outputRef: null, outputHash: null,
        ...overrides,
    };
}
function seeded() {
    const repository = new MemoryExecutionRepository();
    repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: task() });
    repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job() });
    return repository;
}
describe('agent-manager bounded execution worker', () => {
    test('moves an eligible job through a lease into a PII-free needs-review result', async () => {
        const repository = seeded();
        const result = await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW);
        expect(result).toEqual({ jobId: JOB_ID, outcome: 'succeeded' });
        const savedTask = repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data;
        const savedJob = repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data;
        expect(savedTask).toMatchObject({ status: 'needs_review', revision: 5, result: { outcome: 'needs_review' } });
        expect(String(savedTask?.result?.summary)).toMatch(/Внешняя отправка не выполнялась/);
        expect(savedJob).toMatchObject({ state: 'succeeded', attempts: 1, leaseUntilMs: null });
        expect(Number(savedJob?.finishedAtMs)).toBeGreaterThan(0);
        expect(savedJob?.outputRef).toMatch(/^execution_output:[a-f0-9]{64}$/);
        expect(savedJob?.outputHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify({ result: savedTask?.result, savedJob })).not.toMatch(/email|@|sourceLinks|support:|secret|token/i);
        expect(repository.documents.get(`agent_manager_task_events/${TASK_ID}__r4`)?.data).toMatchObject({ fromStatus: 'queued', toStatus: 'in_progress', actorRole: 'system' });
        expect(repository.documents.get(`agent_manager_task_events/${TASK_ID}__r5`)?.data).toMatchObject({ fromStatus: 'in_progress', toStatus: 'needs_review', actorRole: 'system' });
    });
    test.each([
        ['stale revision', task({ revision: 4 }), 'cancelled'],
        ['cancelled task', task({ status: 'cancelled' }), 'cancelled'],
        ['non-executable report scope', task({ allowedScope: 'report_triage' }), 'cancelled'],
    ])('refuses %s without creating a task result', async (_label, taskData, expectedState) => {
        const repository = seeded();
        repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: taskData });
        const result = await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW);
        expect(result).toEqual({ jobId: JOB_ID, outcome: expectedState });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toEqual(taskData);
        expect(repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data).toMatchObject({ state: expectedState, finishedAtMs: NOW, outputRef: null, outputHash: null });
    });
    test('does not duplicate a succeeded result and honours a live lease', async () => {
        const repository = seeded();
        await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW);
        const replay = await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW + 1);
        expect(replay).toEqual({ jobId: JOB_ID, outcome: 'skipped' });
        expect(repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data.attempts).toBe(1);
        const leased = seeded();
        leased.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ state: 'leased', attempts: 1, leasedAtMs: NOW - 10, leaseUntilMs: NOW + 10, updatedAtMs: NOW - 10 }) });
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(leased, JOB_ID, NOW)).toEqual({ jobId: JOB_ID, outcome: 'skipped' });
        expect(leased.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data.status).toBe('queued');
    });
    test('does not complete when the claimed lease has expired before the completion transaction', async () => {
        const repository = seeded();
        repository.afterTransaction = (transactionCount) => {
            if (transactionCount !== 1)
                return;
            const existing = repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`);
            repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, {
                ...existing,
                data: { ...existing.data, leasedAtMs: NOW - 2, leaseUntilMs: NOW - 1 },
            });
        };
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW)).toEqual({ jobId: JOB_ID, outcome: 'cancelled' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toMatchObject({ status: 'queued', revision: 3, result: null });
        expect(repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data).not.toMatchObject({ state: 'succeeded' });
    });
    test('does not complete when current job identity differs from the original claim', async () => {
        const repository = seeded();
        repository.afterTransaction = (transactionCount) => {
            if (transactionCount !== 1)
                return;
            const existing = repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`);
            repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, {
                ...existing,
                data: { ...existing.data, scope: 'analysis_only', handlerVersion: 'analysis-only-v1' },
            });
        };
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW)).toEqual({ jobId: JOB_ID, outcome: 'cancelled' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toMatchObject({ status: 'queued', revision: 3, result: null });
        expect(repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data).not.toMatchObject({ state: 'succeeded' });
    });
    test('uses a separate aggregate-only review result for analysis jobs', async () => {
        const repository = seeded();
        repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: task({ allowedScope: 'analysis_only', assignedAgentId: 'analytics' }) });
        repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ scope: 'analysis_only', handlerVersion: 'analysis-only-v1' }) });
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW)).toEqual({ jobId: JOB_ID, outcome: 'succeeded' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data.result?.summary).toMatch(/агрегированная аналитическая заготовка/);
    });
    test('persists a handler-provided analytics brief through the same leased review boundary', async () => {
        const repository = seeded();
        repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: task({ allowedScope: 'analysis_only', assignedAgentId: 'analytics' }) });
        repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ scope: 'analysis_only', handlerVersion: 'analysis-only-v1' }) });
        const result = await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW, async (claim) => claim.job.scope === 'analysis_only'
            ? { result: { summary: 'Aggregate metrics require manual review. No action was taken.', outcome: 'needs_review' } }
            : null);
        expect(result).toEqual({ jobId: JOB_ID, outcome: 'succeeded' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toMatchObject({
            status: 'needs_review', result: { summary: 'Aggregate metrics require manual review. No action was taken.', outcome: 'needs_review' },
        });
    });
    test('rejects an invalid handler result at the execution boundary', async () => {
        const repository = seeded();
        repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: task({ allowedScope: 'analysis_only', assignedAgentId: 'analytics' }) });
        repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ scope: 'analysis_only', handlerVersion: 'analysis-only-v1' }) });
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW, async () => ({ result: { summary: 'contact person@example.com', outcome: 'needs_review' } }))).toEqual({ jobId: JOB_ID, outcome: 'failed' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toMatchObject({ status: 'queued', revision: 3, result: null });
    });
    test('does not accept a handler result after the real-time lease has expired', async () => {
        const repository = seeded();
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW + 4 * 60 * 1000 + 1);
        try {
            expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW, async () => ({ result: { summary: 'Aggregate metrics require manual review.', outcome: 'needs_review' } }))).toEqual({ jobId: JOB_ID, outcome: 'cancelled' });
        }
        finally {
            nowSpy.mockRestore();
        }
    });
    test('routes a queued report triage job to the Reports specialist without delivery side effects', async () => {
        const repository = seeded();
        repository.documents.set(`agent_manager_tasks/${TASK_ID}`, { id: TASK_ID, data: task({ allowedScope: 'report_triage', assignedAgentId: 'reports' }) });
        repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ scope: 'report_triage', handlerVersion: 'report-triage-v1' }) });
        expect(await (0, execution_worker_1.executeOneAgentManagerJob)(repository, JOB_ID, NOW)).toEqual({ jobId: JOB_ID, outcome: 'succeeded' });
        expect(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data).toMatchObject({ status: 'needs_review', assignedAgentId: 'reports' });
        expect(JSON.stringify(repository.documents.get(`agent_manager_tasks/${TASK_ID}`)?.data)).not.toMatch(/send|dispatch|recipient|bodyText/i);
    });
    test('reclaims an expired lease and processes only bounded candidate jobs', async () => {
        const repository = seeded();
        repository.documents.set(`agent_manager_execution_jobs/${JOB_ID}`, { id: JOB_ID, data: job({ state: 'leased', attempts: 1, leasedAtMs: NOW - 20, leaseUntilMs: NOW - 1, updatedAtMs: NOW - 20 }) });
        repository.documents.set('agent_manager_execution_jobs/not-a-job', { id: 'not-a-job', data: { nope: true } });
        const result = await (0, execution_worker_1.executeEligibleAgentManagerJobs)(repository, NOW, 10);
        expect(result).toEqual({ attempted: 2, succeeded: 1, cancelled: 0, failed: 0 });
        expect(repository.documents.get(`agent_manager_execution_jobs/${JOB_ID}`)?.data).toMatchObject({ state: 'succeeded', attempts: 2 });
    });
    test('does not let an analytics worker claim a support job', async () => {
        const repository = seeded();
        repository.documents.set('agent_manager_execution_jobs/support__r3', { id: 'support__r3', data: job({ taskId: 'support', scope: 'support_draft', handlerVersion: 'support-draft-v1' }) });
        const result = await (0, execution_worker_1.executeEligibleAgentManagerJobs)(repository, NOW, 10, undefined, ['analysis_only']);
        expect(result).toEqual({ attempted: 0, succeeded: 0, cancelled: 0, failed: 0 });
        expect(repository.documents.get('agent_manager_execution_jobs/support__r3')?.data).toMatchObject({ state: 'queued', attempts: 0 });
    });
    test('uses a scope-bound server query before applying the batch limit', () => {
        const source = require('node:fs').readFileSync(__dirname + '/execution_worker.ts', 'utf8');
        expect(source).toContain("where('scope', '==', scope).where('state', 'in', ['queued', 'leased'])");
        expect(source).toContain('repository.listEligibleJobs(allowedScopes)');
    });
    test('worker source has no callable, mail, report, network, process, or deployment path', () => {
        const source = require('node:fs').readFileSync(__dirname + '/execution_worker.ts', 'utf8');
        expect(source).toContain('onSchedule');
        expect(source).not.toMatch(/onCall|onRequest|adminSupportGenerateReply|dispatchSupportReply|sendMail|report_repl|fetch\(|child_process|exec\(|spawn\(|deploy/i);
    });
    test('scheduled worker limits provider-backed processing to one bounded claim', () => {
        const source = require('node:fs').readFileSync(__dirname + '/execution_worker.ts', 'utf8');
        expect(source).toContain('secrets: [SUPPORT_OPENAI_API_KEY]');
        expect(source).toContain("['support_draft']");
    });
    test('scheduled worker routes aggregate analytics through the specialist handler before support drafts', () => {
        const source = require('node:fs').readFileSync(__dirname + '/execution_worker.ts', 'utf8');
        expect(source).toContain("import { createAnalyticsExecutionHandler } from './analytics_execution'");
        expect(source).toContain('agentManagerRunAnalyticsWorker');
        expect(source).toContain("createAnalyticsExecutionHandler(db), ['analysis_only']");
        expect(source).toContain('agentManagerRunReportTriageWorker');
    });
});
//# sourceMappingURL=execution_worker.test.js.map