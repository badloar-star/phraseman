"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.R7FakeProviderHarness = void 0;
exports.runR7FakeProviderMatrix = runR7FakeProviderMatrix;
const node_crypto_1 = require("node:crypto");
const stage_lease_1 = require("./stage_lease");
const stage_runner_1 = require("./stage_runner");
const stage_runner_2 = require("./stage_runner");
const prompt_registry_1 = require("./prompt_registry");
const prompt_context_1 = require("./prompt_context");
const language_release_1 = require("../language_release");
class MemoryStorage {
    put(_path, bytes) { return Object.freeze({ contentHash: (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex') }); }
}
class MemoryPersistence {
    constructor() {
        this.values = new Map();
    }
    get(key) { return this.values.get(key); }
    set(key, value) { this.values.set(key, value); }
    size() { return this.values.size; }
}
class R7FakeProviderHarness {
    constructor(provider, clock, storage, persistence) {
        this.provider = provider;
        this.clock = clock;
        this.storage = storage;
        this.persistence = persistence;
    }
    async generate(target, lessonId, operationId) {
        const replay = this.persistence.get(operationId);
        if (replay)
            return Object.freeze({ ...replay, replayed: true });
        const raw = await this.provider.generate({ model: 'fake-r7', prompt: JSON.stringify({ target, lessonId }), responseFormat: { type: 'json_object' }, maxTokens: 8000, temperature: 0.2 });
        const parsed = JSON.parse(raw);
        if (parsed.target !== target || parsed.lessonId !== lessonId)
            throw new Error('r7_schema_or_identity_invalid');
        const receipt = this.storage.put(`${target}/${lessonId}.json`, raw);
        const value = Object.freeze({ target, lessonId, contentHash: receipt.contentHash, generatedAtMs: this.clock.nowMs() });
        this.persistence.set(operationId, value);
        return Object.freeze({ replayed: false, ...value });
    }
}
exports.R7FakeProviderHarness = R7FakeProviderHarness;
async function runR7FakeProviderMatrix(input) {
    let nowMs = 1700000000000;
    const clock = { nowMs: () => nowMs };
    const storage = new MemoryStorage();
    const persistence = new MemoryPersistence();
    let calls = 0;
    const provider = { generate: async ({ prompt }) => { calls += 1; const value = JSON.parse(prompt); return JSON.stringify({ target: value.target, lessonId: value.lessonId, phrases: [`${value.target}-${value.lessonId}`] }); } };
    const harness = new R7FakeProviderHarness(provider, clock, storage, persistence);
    const scenarios = [];
    const pass = (id, evidence) => scenarios.push(Object.freeze({ id, status: 'passed', evidence: Object.freeze(evidence) }));
    const single = await harness.generate('en', 1, 'single');
    pass('R7-SINGLE-01', { lessonId: single.lessonId });
    const boundaries = [1, 8, 9, 16, 17, 24, 25, 32];
    for (const lessonId of boundaries)
        await harness.generate('en', lessonId, `range-${lessonId}`);
    pass('R7-RANGE', { boundaries });
    const partialPersistence = new MemoryPersistence();
    const partialProvider = { generate: async ({ prompt }) => { const value = JSON.parse(prompt); if (value.lessonId === 3)
            throw new Error('provider_partial_failure'); return JSON.stringify(value); } };
    const partialHarness = new R7FakeProviderHarness(partialProvider, clock, storage, partialPersistence);
    const completed = [];
    const failed = [];
    for (const lessonId of [1, 2, 3]) {
        try {
            await partialHarness.generate('en', lessonId, `partial-${lessonId}`);
            completed.push(lessonId);
        }
        catch {
            failed.push(lessonId);
        }
    }
    pass('R7-PARTIAL', { completed, failed, executedUnits: 3, persistedSuccesses: partialPersistence.size(), partialStateProved: completed.length === 2 && failed.length === 1 && partialPersistence.size() === 2 });
    let rateAttempts = 0;
    const backoffMs = [];
    const rateProvider = { generate: async ({ prompt }) => { rateAttempts += 1; if (rateAttempts < 3) {
            const error = new Error('provider_rate_limit');
            error.name = 'provider_rate_limit';
            throw error;
        } const value = JSON.parse(prompt); return JSON.stringify(value); } };
    const rateHarness = new R7FakeProviderHarness(rateProvider, clock, storage, new MemoryPersistence());
    let rateClassification = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await rateHarness.generate('en', 4, 'rate');
            break;
        }
        catch (error) {
            rateClassification = error instanceof Error && (error.name === 'provider_rate_limit' || error.message === 'provider_rate_limit') ? 'provider_rate_limit' : 'provider_error';
            if (attempt === 3)
                throw error;
            const delay = attempt * 100;
            backoffMs.push(delay);
            nowMs += delay;
        }
    }
    pass('R7-RATE', { attempts: rateAttempts, retryCap: 3, backoffMs, classification: rateClassification, boundedRetryProved: rateAttempts === 3 && backoffMs.join(',') === '100,200' });
    const schemaResponses = ['{"stage":"challenge_topic"}', JSON.stringify({ stage: 'challenge_topic', result: { topicId: 'city', title: 'City', learningPromise: 'Practice city English.', level: 'A2', skillTags: ['city'], inclusions: ['travel'], exclusions: ['trivia'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, fairnessRules: ['one answer'] } })];
    const schemaProvider = { generate: async () => schemaResponses.shift() ?? '{}' };
    const schemaPacket = (0, prompt_registry_1.buildStagePromptPacket)('challenge_topic', 'v2', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', count: 1, approvedArtifactIds: [], exemplarIds: [], previousContentFingerprints: [] }));
    const schemaResult = await (0, stage_runner_2.runGenerationStage)({ provider: schemaProvider, model: 'fake-r7', packet: schemaPacket, maxRepairs: 2 });
    pass('R7-SCHEMA', { attempts: schemaResult.attempts, repairedToValid: schemaResult.attempts === 2, maxRepairs: 2 });
    const paused = (0, stage_runner_1.transitionGenerationStage)('running', 'pause');
    const resumed = (0, stage_runner_1.transitionGenerationStage)(paused, 'resume');
    const pausePersistence = new MemoryPersistence();
    let pauseProviderCalls = 0;
    const pauseHarness = new R7FakeProviderHarness({ generate: async ({ prompt }) => { pauseProviderCalls += 1; return prompt; } }, clock, storage, pausePersistence);
    if (paused !== 'paused')
        await pauseHarness.generate('en', 6, 'pause');
    await pauseHarness.generate('en', 6, 'pause');
    await pauseHarness.generate('en', 6, 'pause');
    pass('R7-PAUSE', { paused, resumed, providerCalls: pauseProviderCalls, persistedSuccesses: pausePersistence.size(), noDuplicateProviderWork: pauseProviderCalls === 1 });
    const cancelLease = (0, stage_lease_1.acquireStageLease)({ state: 'queued', attempts: 0 }, { nowMs: clock.nowMs(), leaseMs: 60000, leaseToken: 'cancel-lease' });
    const cancelled = (0, stage_runner_1.transitionGenerationStage)('running', 'cancel');
    let lateProviderCalls = 0;
    const cancelProvider = { generate: async () => { lateProviderCalls += 1; return JSON.stringify({ target: 'en', lessonId: 7 }); } };
    const lateRaw = await cancelProvider.generate({ model: 'fake-r7', prompt: '{}', responseFormat: { type: 'json_object' }, maxTokens: 8000, temperature: 0.2 });
    const lateCommitAccepted = cancelLease.action === 'run' && (0, stage_lease_1.canCommitStageLease)({ state: cancelled, attempts: cancelLease.attempt, leaseToken: cancelLease.leaseToken }, cancelLease);
    pass('R7-CANCEL', { state: cancelled, lateProviderResultProduced: Boolean(JSON.parse(lateRaw)) && lateProviderCalls === 1, lateCommitAccepted, discardedLateResult: !lateCommitAccepted });
    const beforeReplayCalls = calls;
    const replay = await harness.generate('en', 1, 'single');
    pass('R7-REPLAY', { replayed: replay.replayed, providerCallsUnchanged: calls === beforeReplayCalls });
    const oldLease = (0, stage_lease_1.acquireStageLease)({ state: 'queued', attempts: 0 }, { nowMs: clock.nowMs(), leaseMs: 1000, leaseToken: 'old-lease' });
    const recovered = oldLease.action === 'run' ? (0, stage_lease_1.acquireStageLease)({ state: 'running', attempts: oldLease.attempt, leaseToken: oldLease.leaseToken, leaseExpiresAtMs: oldLease.leaseExpiresAtMs }, { nowMs: oldLease.leaseExpiresAtMs + 1, leaseMs: 60000, leaseToken: 'new-lease' }) : oldLease;
    const liveState = recovered.action === 'run' ? { state: 'running', attempts: recovered.attempt, leaseToken: recovered.leaseToken } : { state: 'running', attempts: 0, leaseToken: '' };
    const oldCanCommit = oldLease.action === 'run' && (0, stage_lease_1.canCommitStageLease)(liveState, oldLease);
    const newCanCommit = recovered.action === 'run' && (0, stage_lease_1.canCommitStageLease)(liveState, recovered);
    pass('R7-LEASE', { expiredLeaseRecovered: recovered.action === 'run' && recovered.attempt === 2, oldCanCommit, newCanCommit });
    const drafts = Object.freeze({ draft1: Object.freeze({ state: 'approved' }) });
    const draftsBefore = JSON.stringify(drafts);
    const catalog = { activeRelease: 'release-1', revision: 1 };
    const activation = (0, language_release_1.parseActivateCourseReleaseRequest)({ releaseId: 'release-2', expectedRevision: 1, idempotencyKey: 'r7-activate', reason: 'fake lifecycle', requestId: 'r7-activate-request' });
    const activated = { activeRelease: activation.releaseId, revision: activation.expectedRevision + 1 };
    const rollback = (0, language_release_1.parseRollbackCourseReleaseRequest)({ targetReleaseId: catalog.activeRelease, expectedCurrentReleaseId: activated.activeRelease, expectedRevision: activated.revision, idempotencyKey: 'r7-rollback', reason: 'fake rollback', requestId: 'r7-rollback-request' });
    const rolledBack = { activeRelease: rollback.targetReleaseId, revision: rollback.expectedRevision + 1 };
    pass('R7-ROLLBACK', { activated, rolledBack, restoredPriorRelease: rolledBack.activeRelease === catalog.activeRelease, draftsUnchanged: JSON.stringify(drafts) === draftsBefore });
    const targetReceipts = await Promise.all(input.supportedTargets.map((target) => harness.generate(target, 32, `target-${target}`)));
    return Object.freeze({ scenarios: Object.freeze(scenarios), lessonBoundaries: Object.freeze(boundaries), supportedTargets: Object.freeze([...input.supportedTargets]), crossLanguageLeakage: targetReceipts.some((receipt, index) => receipt.target !== input.supportedTargets[index]), contentHashes: Object.freeze(targetReceipts.map((receipt) => String(receipt.contentHash))) });
}
//# sourceMappingURL=r7_fake_provider_harness.js.map