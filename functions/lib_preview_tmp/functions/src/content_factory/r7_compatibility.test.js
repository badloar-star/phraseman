"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const legacy = require('./fixtures/r7/legacy_job_release.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const staged = require('./fixtures/r7/v3_staged_release.json');
const contracts_1 = require("./contracts");
const stage_contracts_1 = require("./stage_contracts");
const release_review_1 = require("./release_review");
const release_sealing_1 = require("./release_sealing");
const course_release_contract_1 = require("./course_release_contract");
const language_release_1 = require("../language_release");
const clone = (value) => JSON.parse(JSON.stringify(value));
describe('R7 staged and legacy compatibility', () => {
    it('keeps the committed legacy job, manifest, catalog, drafts and ledger readable', () => {
        expect(legacy.job.state).toBe('published');
        expect((0, contracts_1.validatePackManifest)(legacy.manifest)).toEqual({ ok: true, errors: [] });
        expect((0, language_release_1.courseCatalogId)(legacy.activeCatalog.studyTarget, legacy.activeCatalog.learnerSourceLocale)).toBe('en:ru');
        expect(legacy.drafts['legacy-draft-1'].state).toBe('approved');
        expect(legacy.ledgers.arena.revision).toBe(1);
    });
    it('keeps the committed retired stage readable but rejects it from a new release preview', () => {
        expect(() => (0, stage_contracts_1.createGenerationStageUnit)(staged.stage)).toThrow();
        const review = (0, release_review_1.validateReleaseReviewCandidate)({
            jobId: 'r7-job-1', studyTarget: 'en', learnerSourceLocale: 'ru', releaseId: staged.release.releaseId,
            expectedLessonIds: [1], expectedBlueprintHash: staged.release.blueprintHash, expectedEvidenceIds: ['evidence-1'], units: staged.units,
        });
        expect(review.ok).toBe(false);
        expect(review.errors).toContain('unit_scope_invalid');
    });
    it('approves without publication, seals immutably, activates, and rolls back without changing drafts or ledgers', () => {
        const legacyBefore = clone(legacy);
        const stagedBefore = clone(staged);
        (0, language_release_1.assertReleaseActivationMetadata)(staged.review);
        expect(legacy.activeCatalog.activeRelease.releaseId).toBe('legacy-en-ru-release-1');
        const supportedUnits = staged.units.filter((unit) => unit.surface === 'lesson' || unit.surface === 'flashcard');
        const artifacts = Object.fromEntries(supportedUnits.map((unit) => [unit.surface, {
                releaseId: staged.release.releaseId, studyTarget: 'en', learnerSourceLocale: 'ru', surface: unit.surface,
                contentHash: unit.contentHash, objectGeneration: unit.objectGeneration, byteSize: unit.byteSize,
                entryIndex: `course-releases/${staged.release.releaseId}/${unit.surface}/index.json`,
            }]));
        const sealed = (0, release_sealing_1.buildCourseRelease)({
            ...staged.release, reviewStatus: staged.review.reviewStatus, reviewerId: staged.review.reviewerId,
            unitStates: { lesson: 'succeeded', flashcard: 'succeeded' }, artifacts,
        }, '2026-07-13T00:00:00.000Z');
        expect((0, course_release_contract_1.assertCourseRelease)(sealed)).toBe(sealed);
        expect(Object.isFrozen(sealed)).toBe(true);
        expect(Object.isFrozen(sealed.artifacts.flashcard)).toBe(true);
        const activation = (0, language_release_1.parseActivateCourseReleaseRequest)({ releaseId: sealed.releaseId, expectedRevision: 7, idempotencyKey: 'r7-activate-1', reason: 'approved fixture', requestId: 'r7-request-activate' });
        const activatedCatalog = { ...legacy.activeCatalog, revision: activation.expectedRevision + 1, activeRelease: { releaseId: sealed.releaseId, studyTarget: sealed.studyTarget, learnerSourceLocale: sealed.learnerSourceLocale, blueprintId: sealed.blueprintId, blueprintHash: sealed.blueprintHash } };
        expect(activatedCatalog.activeRelease.releaseId).toBe(staged.release.releaseId);
        expect((0, language_release_1.parseActivateCourseReleaseRequest)({ ...activation, expectedRevision: 7 })).toEqual(activation);
        const rollback = (0, language_release_1.parseRollbackCourseReleaseRequest)({ targetReleaseId: legacy.activeCatalog.activeRelease.releaseId, expectedCurrentReleaseId: activatedCatalog.activeRelease.releaseId, expectedRevision: activatedCatalog.revision, idempotencyKey: 'r7-rollback-1', reason: 'fixture rollback', requestId: 'r7-request-rollback' });
        const rolledBackCatalog = { ...activatedCatalog, revision: rollback.expectedRevision + 1, activeRelease: legacy.activeCatalog.activeRelease };
        expect(rolledBackCatalog.activeRelease).toEqual(legacy.activeCatalog.activeRelease);
        expect(legacy.drafts).toEqual(legacyBefore.drafts);
        expect(legacy.ledgers).toEqual(legacyBefore.ledgers);
        expect(staged.drafts).toEqual(stagedBefore.drafts);
        expect(staged.ledgers).toEqual(stagedBefore.ledgers);
    });
});
//# sourceMappingURL=r7_compatibility.test.js.map