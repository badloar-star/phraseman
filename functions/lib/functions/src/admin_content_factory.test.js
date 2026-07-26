"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_factory_1 = require("./admin_content_factory");
describe('parseContentFactoryJobRequest', () => {
    it('accepts bounded lesson and surface scopes', () => {
        expect((0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1, 2], surfaces: ['lessons', 'quizzes'], idempotencyKey: 'job-1', blueprintVersion: 'english-core-32:v1' })).toMatchObject({ projectId: 'fr-a1', lessonIds: [1, 2] });
    });
    it('rejects unsupported surfaces and oversized scopes', () => {
        expect(() => (0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1], surfaces: ['theory'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: Array.from({ length: 101 }, (_, index) => index + 1), surfaces: ['lessons'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(https_1.HttpsError);
    });
    it('creates one canonical queued unit per lesson/surface and reports the exact total', () => {
        const input = (0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1, 2], surfaces: ['lessons', 'vocabulary', 'drills', 'quizzes', 'cards', 'arena_questions'], idempotencyKey: 'job-1', blueprintVersion: 'english-core-32:v1' });
        const plan = (0, admin_content_factory_1.buildContentFactoryJobPlan)(input, 'admin-1', '2026-07-10T00:00:00.000Z');
        expect(plan.job.progress).toEqual({ total: 8, completed: 0, failed: 0 });
        expect(plan.job.releaseCandidate).toBe(true);
        expect(plan.units).toHaveLength(8);
        expect(new Set(plan.units.map((unit) => unit.unitId)).size).toBe(8);
    });
    it('keeps partial surface jobs out of the publish-review state', () => {
        const input = (0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1], surfaces: ['lessons'], idempotencyKey: 'job-2', blueprintVersion: 'english-core-32:v1' });
        expect((0, admin_content_factory_1.buildContentFactoryJobPlan)(input, 'admin-1').job.releaseCandidate).toBe(false);
    });
    it('rejects a non-versioned blueprint reference before writing a job', () => {
        expect(() => (0, admin_content_factory_1.parseContentFactoryJobRequest)({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1], surfaces: ['lessons'], idempotencyKey: 'job-1', blueprintVersion: 'en-v1' })).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_content_factory.test.js.map