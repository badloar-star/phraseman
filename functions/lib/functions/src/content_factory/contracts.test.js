"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("./contracts");
describe('language factory contracts', () => {
    const manifest = {
        packId: 'fr-ru-core-v1', studyTarget: 'fr', sourceLocale: 'ru', surface: 'lessons',
        schemaVersion: 1, contentVersion: 1, sourceBlueprintVersion: 'en-core-32-v1',
        contentHash: 'sha256:abc', createdAt: '2026-07-10T12:00:00.000Z',
        createdBy: 'admin-1', reviewStatus: 'approved', activationStatus: 'draft',
    };
    it('accepts a complete target-language manifest', () => {
        expect((0, contracts_1.validatePackManifest)(manifest)).toEqual({ ok: true, errors: [] });
    });
    it('rejects missing identity and publish metadata', () => {
        const result = (0, contracts_1.validatePackManifest)({ ...manifest, studyTarget: '', contentHash: '', reviewStatus: 'needs_review', activationStatus: 'published' });
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining(['studyTarget_required', 'contentHash_required', 'review_required']));
    });
    it('creates one idempotent job model for a single lesson or a batch', () => {
        const job = (0, contracts_1.createGenerationJob)({
            projectId: 'project-1', studyTarget: 'fr', sourceLocale: 'ru',
            lessonIds: [1, 2, 3], surfaces: ['lessons', 'vocabulary'],
            idempotencyKey: 'job-1', requestedBy: 'admin-1', blueprintVersion: 'en-core-32-v1',
        });
        expect(job).toMatchObject({
            projectId: 'project-1', lessonIds: [1, 2, 3], state: 'queued', progress: { total: 3, completed: 0, failed: 0 },
        });
        expect(job.idempotencyKey).toBe('job-1');
    });
});
//# sourceMappingURL=contracts.test.js.map