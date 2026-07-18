"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
function loadRunner() {
    try {
        return require('./observation_runner');
    }
    catch {
        return null;
    }
}
class MemoryRepository {
    constructor() {
        this.documents = new Map();
        this.writes = [];
        this.retryNextTransaction = false;
        this.onRetry = null;
    }
    seed(path, data) {
        this.documents.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
    }
    async get(path) {
        return this.documents.get(path) ?? null;
    }
    async query(_input) {
        throw new Error('observation runner must not query live collections');
    }
    async runTransaction(body) {
        const attempts = this.retryNextTransaction ? 2 : 1;
        this.retryNextTransaction = false;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const staged = new Map(this.documents);
            const pending = [];
            const transaction = {
                get: async (path) => staged.get(path) ?? null,
                create: (path, data) => {
                    if (staged.has(path))
                        throw new https_1.HttpsError('already-exists', 'document exists');
                    staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
                    pending.push({ operation: 'create', path });
                },
                update: () => { throw new Error('observation receipts are create-only'); },
                set: () => { throw new Error('observation receipts are create-only'); },
            };
            const result = await body(transaction);
            if (attempt + 1 < attempts) {
                this.onRetry?.();
                continue;
            }
            this.documents.clear();
            staged.forEach((value, key) => this.documents.set(key, value));
            this.writes.push(...pending);
            return result;
        }
        throw new Error('unreachable');
    }
}
const VALID_CONTROL = Object.freeze({
    schemaVersion: 1,
    controlId: 'global',
    killSwitchEnabled: false,
    revision: 4,
    lastChangedAtMs: 1000,
    lastChangedByUid: 'owner-sensitive-uid',
    lastIdempotencyKeyHash: 'a'.repeat(64),
    lastPayloadHash: 'b'.repeat(64),
});
function sufficientInput() {
    return {
        observedAtMs: 2000,
        sourceHealth: [
            { source: 'analytics', state: 'ready', count: 1, truncated: false, observedAtMs: 1700 },
            { source: 'reports', state: 'ready', count: 3, truncated: false, observedAtMs: 1800 },
            { source: 'audit', state: 'empty', count: 0, truncated: false, observedAtMs: 1900 },
        ],
        rows: [
            { source: 'error_reports', category: 'audio', screen: 'lesson' },
            { source: 'error_reports', category: 'audio', screen: 'lesson' },
            { source: 'error_reports', category: 'audio', screen: 'lesson' },
        ],
    };
}
function requireRunner() {
    const runner = loadRunner();
    expect(runner).not.toBeNull();
    return runner;
}
describe('Agent Office internal observation runner', () => {
    test('sufficient sanitized evidence creates one bounded prepare-only draft receipt and nothing else', async () => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3000);
        expect(repository.writes).toEqual([
            { operation: 'create', path: expect.stringMatching(/^agent_observation_receipts\/observation_[a-f0-9]{64}$/) },
        ]);
        expect(result).toMatchObject({
            idempotent: false,
            receipt: {
                schemaVersion: 1,
                receiptType: 'observation',
                outcome: 'draft_prepared',
                reason: 'sufficient_evidence',
                scope: 'prepare_only',
                piiClass: 'none',
                externalEffect: 'none',
                controlRevision: 4,
                draft: {
                    signal: 'report_incident',
                    actionType: 'analysis_prepare',
                    scope: 'prepare_only',
                },
            },
        });
        const serialized = JSON.stringify(result.receipt);
        expect(serialized.length).toBeLessThan(2000);
        expect(serialized).not.toMatch(/owner-sensitive-uid|sourceRef|actorUid|userId|reportId|idempotency|raw report/i);
    });
    test('persists distinct validated source timestamps exactly in the immutable receipt', async () => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3000);
        expect(result.receipt.sourceHealth).toEqual([
            { source: 'analytics', state: 'ready', observedAtMs: 1700 },
            { source: 'reports', state: 'ready', observedAtMs: 1800 },
            { source: 'audit', state: 'empty', observedAtMs: 1900 },
        ]);
    });
    test.each([
        ['partial', { source: 'analytics', state: 'partial', count: 1, truncated: false }],
        ['truncated', { source: 'reports', state: 'ready', count: 3, truncated: true }],
        ['invalid', { source: 'audit', state: 'ready', count: '1', truncated: false }],
    ])('%s evidence creates only an immutable no-action receipt', async (_name, replacement) => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        const input = sufficientInput();
        input.sourceHealth = input.sourceHealth.map((health) => health.source === replacement.source ? replacement : health);
        const result = await runner.runAgentOfficeObservation(repository, input, () => 3000);
        expect(repository.writes).toHaveLength(1);
        expect(result.receipt).toMatchObject({ outcome: 'no_action', reason: 'insufficient_evidence', draft: null });
    });
    test.each([
        ['missing', null],
        ['malformed', { killSwitchEnabled: false }],
        ['enabled', { ...VALID_CONTROL, killSwitchEnabled: true }],
    ])('kill switch %s state fails closed with a no-action receipt', async (_name, control) => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        if (control)
            repository.seed('agent_office_control/global', control);
        const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3000);
        expect(repository.writes).toHaveLength(1);
        expect(result.receipt).toMatchObject({ outcome: 'no_action', draft: null, externalEffect: 'none' });
        expect(result.receipt.reason).toMatch(/^control_(missing|invalid|enabled)$/);
    });
    test('rechecks control on transaction retry and never creates a draft after the switch becomes enabled', async () => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        repository.retryNextTransaction = true;
        repository.onRetry = () => repository.seed('agent_office_control/global', { ...VALID_CONTROL, killSwitchEnabled: true, revision: 5 });
        const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3000);
        expect(repository.writes).toHaveLength(1);
        expect(result.receipt).toMatchObject({ outcome: 'no_action', reason: 'control_enabled', controlRevision: 5, draft: null });
        expect([...repository.documents.keys()].filter((path) => path.startsWith('agent_cases/') || path.startsWith('agent_recommendations/') || path.startsWith('agent_tasks/'))).toEqual([]);
    });
    test('exact replay returns the immutable receipt without a second write', async () => {
        const runner = requireRunner();
        if (!runner)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        let nowMs = 3000;
        const first = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => nowMs);
        nowMs = 4000;
        const replay = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => nowMs);
        expect(repository.writes).toHaveLength(1);
        expect(replay).toEqual({ receipt: first.receipt, idempotent: true });
    });
});
//# sourceMappingURL=observation_runner.test.js.map