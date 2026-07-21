"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_release_1 = require("./admin_content_release");
describe('course release sealing request', () => {
    it('requires a job and idempotency key', () => {
        expect((0, admin_content_release_1.parseSealCourseReleaseRequest)({ jobId: 'job-1', idempotencyKey: 'seal-1', requestId: 'request-1' })).toEqual({ jobId: 'job-1', idempotencyKey: 'seal-1', requestId: 'request-1' });
        expect(() => (0, admin_content_release_1.parseSealCourseReleaseRequest)({ jobId: '../escape', idempotencyKey: 'seal-1' })).toThrow(https_1.HttpsError);
    });
    it('accepts only explicit human review decisions', () => {
        expect((0, admin_content_release_1.parseCourseGenerationReviewRequest)({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA', requestId: 'review-1' })).toEqual({ jobId: 'job-1', status: 'approved', reason: 'checked source and QA', requestId: 'review-1' });
        expect(() => (0, admin_content_release_1.parseCourseGenerationReviewRequest)({ jobId: 'job-1', status: 'pending', reason: 'x' })).toThrow(https_1.HttpsError);
    });
    it('replays a seal only when the operation belongs to the same job', () => {
        expect((0, admin_content_release_1.assertSealOperationReplay)({ action: 'content_factory.course_release.seal', jobId: 'job-1', releaseId: 'release-1' }, 'job-1')).toBe('release-1');
        expect(() => (0, admin_content_release_1.assertSealOperationReplay)({ action: 'content_factory.course_release.activate', jobId: 'job-1', releaseId: 'release-1' }, 'job-1')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_release_1.assertSealOperationReplay)({ action: 'content_factory.course_release.seal', jobId: 'job-2', releaseId: 'release-1' }, 'job-1')).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_content_release.test.js.map