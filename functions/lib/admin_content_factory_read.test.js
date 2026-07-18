"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_factory_read_1 = require("./admin_content_factory_read");
describe('Language Factory protected reads', () => {
    it('accepts only bounded job and unit identities', () => {
        expect((0, admin_content_factory_read_1.parseContentFactoryJobDetailRequest)({ jobId: 'job-1' })).toEqual({ jobId: 'job-1' });
        expect((0, admin_content_factory_read_1.parseContentFactoryUnitPreviewRequest)({ unitId: 'job-1__lesson__1' })).toEqual({ unitId: 'job-1__lesson__1' });
        expect(() => (0, admin_content_factory_read_1.parseContentFactoryJobDetailRequest)({ jobId: '../escape' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_factory_read_1.parseContentFactoryUnitPreviewRequest)({ unitId: '' })).toThrow(https_1.HttpsError);
    });
    it('normalizes the workspace filters and caps its read size', () => {
        expect((0, admin_content_factory_read_1.parseContentFactoryWorkspaceRequest)({ studyTarget: 'fr', learnerSourceLocale: 'ru', limit: 999 })).toEqual({ studyTarget: 'fr', learnerSourceLocale: 'ru', limit: 100 });
        expect((0, admin_content_factory_read_1.parseContentFactoryWorkspaceRequest)({})).toEqual({ studyTarget: '', learnerSourceLocale: '', limit: 50 });
        expect(() => (0, admin_content_factory_read_1.parseContentFactoryWorkspaceRequest)({ studyTarget: 'French' })).toThrow(https_1.HttpsError);
    });
    it('keeps rollout metric reads authoritative and bounded in the callable source', () => {
        const source = require('node:fs').readFileSync(__filename.replace(/admin_content_factory_read\.test\.ts$/, 'admin_content_factory_read.ts'), 'utf8');
        expect(source).toContain("collection('content_factory_stages').orderBy('updatedAt', 'desc').limit(101)");
        expect(source).toContain("collection('content_factory_job_units').orderBy('startedAtMs', 'desc').limit(101)");
        expect(source).toContain("collection('content_factory_jobs').orderBy('createdAt', 'desc').limit(101)");
        expect(source).toContain('truncation: { stages: stagesSnap.size > 100');
        expect(source).toContain('requireContentReader(request');
        expect(source).toContain("resolveJobConfig(db, 'content_factory')");
        expect(source).toContain('CONTENT_FACTORY_BUDGET_COLLECTION');
        expect(source).toContain('budgetCapUnits: jobConfig.globalDailyCap');
    });
    it('has no retired shadow-readiness surface queries', () => {
        const source = require('node:fs').readFileSync(__filename.replace(/admin_content_factory_read\.test\.ts$/, 'admin_content_factory_read.ts'), 'utf8');
        expect(source).not.toMatch(/surface_comparisons|engineRequested|comparatorVersion/i);
    });
    it('applies workspace identity filters before the read limit', () => {
        const source = require('node:fs').readFileSync(__filename.replace(/admin_content_factory_read\.test\.ts$/, 'admin_content_factory_read.ts'), 'utf8');
        expect(source).toContain("query.where('studyTarget', '==', input.studyTarget)");
        expect(source).toContain("query.where('learnerSourceLocale', '==', input.learnerSourceLocale)");
        expect(source).toContain("workspaceQuery('content_factory_releases').limit(input.limit).get()");
    });
    it('sorts units by lesson and canonical surface and preserves the review state', () => {
        const detail = (0, admin_content_factory_read_1.buildContentFactoryJobDetail)({
            jobId: 'job-1',
            job: { studyTarget: 'fr', learnerSourceLocale: 'ru', state: 'needs_review' },
            units: [
                { unitId: 'flashcard-2', lessonId: 2, surface: 'flashcard' },
                { unitId: 'flashcard-1', lessonId: 1, surface: 'flashcard' },
                { unitId: 'lesson-1', lessonId: 1, surface: 'lesson' },
            ],
            review: { status: 'approved', reason: 'checked' },
            release: null,
            catalog: { revision: 3 },
        });
        expect(detail.units.map((unit) => unit.unitId)).toEqual(['lesson-1', 'flashcard-1', 'flashcard-2']);
        expect(detail.units.every((unit) => Array.isArray(unit.attemptHistory))).toBe(true);
        expect(detail.review).toEqual({ status: 'approved', reason: 'checked' });
        expect(detail.catalog).toEqual({ revision: 3 });
    });
});
//# sourceMappingURL=admin_content_factory_read.test.js.map