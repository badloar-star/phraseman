"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_shadow_convergence_1 = require("./arena_shadow_convergence");
const node_crypto_1 = require("node:crypto");
const generation_provider_1 = require("./generation_provider");
const artifact = { lessonId: 9, surface: 'arena', items: [{ id: 'a1', prompt: 'Выберите перевод.', answer: 'I am ready.', options: ['I am ready.', 'I ready.', 'Me ready.', 'I am read.'] }] };
describe('Arena shadow convergence', () => {
    it('projects the accepted legacy artifact without another provider result and builds an idempotent bounded receipt', () => {
        const receipt = (0, arena_shadow_convergence_1.buildArenaShadowComparison)({ unitId: 'job:arena:9', jobId: 'job', studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9, attempt: 1, legacyArtifact: artifact, legacyArtifactHash: 'a'.repeat(64), qaOutcome: 'pass', evidenceIds: ['blueprint:e1'], configRevision: 4 });
        expect(receipt).toMatchObject({ surface: 'arena', studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9, level: 'A2', authoritativeEngine: 'legacy', shadowEngine: 'stage_projection', eligible: true, configRevision: 4, comparatorVersion: 'arena-parity-v1', providerRequestsAdded: 0, complete: true, agreements: { identity: true, itemCount: true, correctness: true, qa: true, evidence: true } });
        expect(receipt.documentId).toBe((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('job:arena:9', 'a'.repeat(64), 'arena-parity-v1', 4, 1));
        expect(receipt).not.toHaveProperty('legacyArtifact');
        expect(receipt).not.toHaveProperty('stageArtifact');
    });
    it('fails shadow eligibility without mutating authoritative outcome when evidence is missing', () => {
        const receipt = (0, arena_shadow_convergence_1.buildArenaShadowComparison)({ unitId: 'u', jobId: 'j', studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9, attempt: 1, legacyArtifact: artifact, legacyArtifactHash: 'a'.repeat(64), qaOutcome: 'pass', evidenceIds: [], configRevision: 4 });
        expect(receipt.eligible).toBe(false);
        expect(receipt.mismatches).toContain('source_evidence_missing');
        expect(receipt.authoritativeOutcome).toBe('pass');
    });
    it('aggregates only bounded complete receipts and exposes GO blockers', () => {
        const receipts = Array.from({ length: 3 }, (_, index) => ({ unitId: `unit-${index}`, attempt: 1, comparatorVersion: 'arena-parity-v1', configRevision: 4, complete: index !== 2, eligible: index === 0, severity: index === 1 ? 'critical' : 'none', mismatches: index === 1 ? ['correct_answer_mismatch'] : [], jobId: `job-${index}`, fallbackReason: index === 2 ? 'receipt_partial' : null }));
        const metrics = (0, arena_shadow_convergence_1.summarizeArenaConvergenceReceipts)(receipts, { limit: 100, expectedComparatorVersion: 'arena-parity-v1', expectedConfigRevision: 4, expectedShadowUnitCount: 5, isPartial: true });
        expect(metrics).toMatchObject({ sampleCount: 3, completeCount: 2, distinctJobs: 3, criticalMismatchCount: 1, eligibleCount: 1, fallbackCount: 3, missingReceiptCount: 2, goEligible: false });
        expect(metrics.goBlockers).toEqual(expect.arrayContaining(['evidence_incomplete', 'critical_mismatch', 'minimum_comparisons_not_met', 'minimum_jobs_not_met', 'missing_shadow_receipts', 'bounded_sample_partial']));
        expect(() => (0, arena_shadow_convergence_1.summarizeArenaConvergenceReceipts)(receipts, { limit: 501, expectedComparatorVersion: 'arena-parity-v1', expectedConfigRevision: 4 })).toThrow('surface_convergence_metrics_limit_invalid');
    });
    it('counts the latest receipt for each Arena unit instead of inflating evidence with retries', () => {
        const receipts = [
            { unitId: 'same-unit', attempt: 1, comparatorVersion: 'arena-parity-v1', configRevision: 4, complete: true, eligible: false, severity: 'critical', jobId: 'job-1', fallbackReason: 'failed_attempt' },
            { unitId: 'same-unit', attempt: 2, comparatorVersion: 'arena-parity-v1', configRevision: 4, complete: true, eligible: true, severity: 'none', jobId: 'job-1', fallbackReason: null },
        ];
        const metrics = (0, arena_shadow_convergence_1.summarizeArenaConvergenceReceipts)(receipts, { limit: 100, expectedComparatorVersion: 'arena-parity-v1', expectedConfigRevision: 4, expectedShadowUnitCount: 1 });
        expect(metrics).toMatchObject({ receiptCount: 2, sampleCount: 1, completeCount: 1, criticalMismatchCount: 0, eligibleCount: 1, missingReceiptCount: 0 });
    });
    it('does not treat failed generations as successful semantic evidence', () => {
        const failures = Array.from({ length: 200 }, (_, index) => (0, arena_shadow_convergence_1.buildArenaShadowFailureComparison)({ unitId: `failed-${index}`, jobId: `job-${index % 20}`, studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: (index % 32) + 1, attempt: 1, configRevision: 4, error: { category: 'provider_timeout', retryable: true } }));
        const metrics = (0, arena_shadow_convergence_1.summarizeArenaConvergenceReceipts)(failures, { limit: 500, expectedComparatorVersion: 'arena-parity-v1', expectedConfigRevision: 4, expectedShadowUnitCount: 200, expectedLocalePairs: ['en:ru'] });
        expect(metrics).toMatchObject({ sampleCount: 200, successfulArtifactCount: 0, successfulQaArtifactCount: 0, goEligible: false });
        expect(metrics.goBlockers).toContain('minimum_successful_artifacts_not_met');
    });
    it('separates receipt identity across revisions and attempts while keeping one run idempotent', () => {
        const hash = 'b'.repeat(64);
        expect((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 4, 1)).toBe((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 4, 1));
        expect((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 4, 1)).not.toBe((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 4, 2));
        expect((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 4, 1)).not.toBe((0, arena_shadow_convergence_1.convergenceReceiptDocumentId)('unit', hash, 'arena-parity-v1', 5, 1));
    });
    it('keeps bounded evidence history grouped by comparator and configuration revision', () => {
        const groups = (0, arena_shadow_convergence_1.groupArenaConvergenceReceipts)([
            { unitId: 'u1', attempt: 1, comparatorVersion: 'arena-parity-v1', configRevision: 4, complete: true },
            { unitId: 'u2', attempt: 1, comparatorVersion: 'arena-parity-v1', configRevision: 5, complete: true },
            { unitId: 'u3', attempt: 1, comparatorVersion: 'arena-parity-v2', configRevision: 5, complete: true },
        ], 100);
        expect(groups.map((group) => ({ comparatorVersion: group.comparatorVersion, configRevision: group.configRevision, receiptCount: group.receipts.length }))).toEqual([
            { comparatorVersion: 'arena-parity-v1', configRevision: 4, receiptCount: 1 },
            { comparatorVersion: 'arena-parity-v1', configRevision: 5, receiptCount: 1 },
            { comparatorVersion: 'arena-parity-v2', configRevision: 5, receiptCount: 1 },
        ]);
    });
    it('uses exactly one fake-provider request for generation plus shadow comparison', async () => {
        let calls = 0;
        const provider = { generate: async () => { calls += 1; return JSON.stringify(artifact); }, getProviderRequestCount: () => calls };
        const generated = await (0, generation_provider_1.generateSurfaceUnit)({ provider, model: 'fake', surface: 'arena', studyTarget: 'en', sourceLocale: 'ru', lessonId: 9, topic: 'requests', sourcePhrases: ['I am ready'] });
        const hash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(generated.artifact)).digest('hex');
        const receipt = (0, arena_shadow_convergence_1.buildArenaShadowComparison)({ unitId: 'u1', jobId: 'j1', studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9, attempt: 1, legacyArtifact: generated.artifact, legacyArtifactHash: hash, qaOutcome: generated.qa.status, evidenceIds: ['e1'], configRevision: 4 });
        expect(calls).toBe(1);
        expect(receipt.providerRequestsAdded).toBe(0);
    });
    it('records equivalent terminal failure semantics without requiring an artifact', () => {
        const receipt = (0, arena_shadow_convergence_1.buildArenaShadowFailureComparison)({ unitId: 'u-failed', jobId: 'j-failed', studyTarget: 'en', learnerSourceLocale: 'ru', lessonId: 9, attempt: 2, configRevision: 4, error: { category: 'provider_timeout', retryable: true } });
        expect(receipt).toMatchObject({ complete: true, eligible: false, artifactComparison: false, authoritativeOutcome: 'failed', shadowOutcome: 'failed', errorCategoryAgreement: true, retryabilityAgreement: true, providerRequestsAdded: 0 });
        expect(receipt.documentId).toMatch(/^[a-f0-9]{64}$/);
    });
});
//# sourceMappingURL=arena_shadow_convergence.test.js.map