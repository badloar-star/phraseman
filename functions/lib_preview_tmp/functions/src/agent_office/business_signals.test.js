"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
function loadBusinessSignals() {
    try {
        return require('./business_signals');
    }
    catch {
        return null;
    }
}
class MemoryRepository {
    constructor() {
        this.documents = new Map();
        this.writes = [];
    }
    seed(path, data) {
        this.documents.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
    }
    async get(path) {
        return this.documents.get(path) ?? null;
    }
    async query(_input) {
        throw new Error('business signals do not query collections');
    }
    async runTransaction(body) {
        const staged = new Map(this.documents);
        const writes = [];
        const transaction = {
            get: async (path) => staged.get(path) ?? null,
            create: (path, data) => {
                if (staged.has(path))
                    throw new https_1.HttpsError('already-exists', 'document exists');
                staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
                writes.push(path);
            },
            update: () => { throw new Error('business signal writer is create-only'); },
            set: () => { throw new Error('business signal writer is create-only'); },
        };
        const result = await body(transaction);
        this.documents.clear();
        staged.forEach((value, key) => this.documents.set(key, value));
        this.writes.push(...writes);
        return result;
    }
}
const NOW = 1000000;
const ref = (source, value) => `${source}:sha256:${value.repeat(64).slice(0, 64)}`;
function completeInput(overrides = {}) {
    return {
        evaluatedAtMs: NOW,
        sourceHealth: [
            { source: 'firebase', state: 'ready', observedAtMs: NOW - 1000, sourceRef: ref('firebase', 'a') },
            { source: 'revenuecat', state: 'ready', observedAtMs: NOW - 2000, sourceRef: ref('revenuecat', 'b') },
            { source: 'store_console', state: 'ready', observedAtMs: NOW - 3000, sourceRef: ref('store_console', 'c') },
        ],
        firebase: { currentTrials: 100, currentPaid: 40, previousTrials: 100, previousPaid: 70 },
        revenuecat: { currentActiveSubscribers: 95, previousActiveSubscribers: 100 },
        storeConsole: { currentPurchases: 100, currentRefunds: 3, previousPurchases: 100, previousRefunds: 2 },
        ...overrides,
    };
}
const VALID_CONTROL = Object.freeze({
    schemaVersion: 1,
    controlId: 'global',
    killSwitchEnabled: false,
    revision: 4,
    lastChangedAtMs: NOW - 10000,
    lastChangedByUid: 'owner',
    lastIdempotencyKeyHash: 'd'.repeat(64),
    lastPayloadHash: 'e'.repeat(64),
});
function requireBusinessSignals() {
    const module = loadBusinessSignals();
    expect(module).not.toBeNull();
    return module;
}
describe('Agent Office business signal evaluator', () => {
    test('calculates a bounded conversion-drop candidate from complete fresh provenance', () => {
        const module = requireBusinessSignals();
        if (!module)
            return;
        const result = module.evaluateBusinessSignals(completeInput());
        expect(result).toMatchObject({
            outcome: 'candidates_ready',
            candidates: [expect.objectContaining({
                    signal: 'paid_conversion_drop',
                    confidence: 0.9,
                    impact: { previousRate: 0.7, currentRate: 0.4, absoluteChange: -0.3 },
                    safeActionCategory: 'analysis_prepare',
                })],
        });
        expect(JSON.stringify(result)).toContain('firebase:sha256:');
    });
    test.each([
        ['missing source', completeInput({ sourceHealth: [] })],
        ['stale source', completeInput({ sourceHealth: [
                    { source: 'firebase', state: 'ready', observedAtMs: NOW - 901000, sourceRef: ref('firebase', 'a') },
                    { source: 'revenuecat', state: 'ready', observedAtMs: NOW - 2000, sourceRef: ref('revenuecat', 'b') },
                    { source: 'store_console', state: 'ready', observedAtMs: NOW - 3000, sourceRef: ref('store_console', 'c') },
                ] })],
        ['conflicting counts', completeInput({ firebase: { currentTrials: 10, currentPaid: 11, previousTrials: 100, previousPaid: 70 } })],
    ])('fails closed with no candidate for %s', (_label, input) => {
        const module = requireBusinessSignals();
        if (!module)
            return;
        expect(module.evaluateBusinessSignals(input)).toMatchObject({ outcome: 'insufficient_evidence', candidates: [] });
    });
    test('does not create a candidate below the explicit conversion threshold', () => {
        const module = requireBusinessSignals();
        if (!module)
            return;
        const result = module.evaluateBusinessSignals(completeInput({ firebase: { currentTrials: 100, currentPaid: 57, previousTrials: 100, previousPaid: 70 } }));
        expect(result).toMatchObject({ outcome: 'no_anomaly', candidates: [] });
    });
    test('persists the same complete evidence once as an auditable prepare-only case and recommendation', async () => {
        const module = requireBusinessSignals();
        if (!module)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', VALID_CONTROL);
        const first = await module.persistBusinessSignalEvaluation(repository, completeInput(), () => NOW);
        const replay = await module.persistBusinessSignalEvaluation(repository, completeInput(), () => NOW + 1);
        expect(first).toMatchObject({ outcome: 'candidates_persisted', idempotent: false, externalEffect: 'none' });
        expect(replay).toMatchObject({ outcome: 'candidates_persisted', idempotent: true, externalEffect: 'none' });
        expect(repository.writes.filter((path) => path.startsWith('agent_cases/'))).toHaveLength(1);
        expect(repository.writes.filter((path) => path.startsWith('agent_recommendations/'))).toHaveLength(1);
        const persisted = JSON.stringify([...repository.documents.values()].map((item) => item.data));
        expect(persisted).toContain('firebase:sha256:');
        expect(persisted).toContain('prepare_only');
        expect(persisted).not.toMatch(/@example\.com|raw-report|private-uid/i);
    });
    test('does not write cases or recommendations while the kill switch is enabled', async () => {
        const module = requireBusinessSignals();
        if (!module)
            return;
        const repository = new MemoryRepository();
        repository.seed('agent_office_control/global', { ...VALID_CONTROL, killSwitchEnabled: true });
        const result = await module.persistBusinessSignalEvaluation(repository, completeInput(), () => NOW);
        expect(result).toMatchObject({ outcome: 'no_action', reason: 'control_enabled', externalEffect: 'none' });
        expect(repository.writes).toEqual([]);
    });
});
//# sourceMappingURL=business_signals.test.js.map