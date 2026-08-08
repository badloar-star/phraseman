"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const job_progress_1 = require("./job_progress");
describe('content factory job progress', () => {
    it('counts success once and marks a complete job ready for review', () => {
        expect((0, job_progress_1.applyUnitProgressTransition)({ total: 2, completed: 1, failed: 0 }, { next: 'succeeded', wasSucceeded: false, failureCounted: false })).toEqual({ progress: { total: 2, completed: 2, failed: 0 }, failureCounted: false, jobState: 'needs_review' });
        expect((0, job_progress_1.applyUnitProgressTransition)({ total: 2, completed: 2, failed: 0 }, { next: 'succeeded', wasSucceeded: true, failureCounted: false }).progress.completed).toBe(2);
    });
    it('counts a failure once and removes it when the retry succeeds', () => {
        const failed = (0, job_progress_1.applyUnitProgressTransition)({ total: 2, completed: 0, failed: 0 }, { next: 'failed', wasSucceeded: false, failureCounted: false });
        expect(failed).toMatchObject({ progress: { total: 2, completed: 0, failed: 1 }, failureCounted: true });
        expect((0, job_progress_1.applyUnitProgressTransition)(failed.progress, { next: 'failed', wasSucceeded: false, failureCounted: true }).progress.failed).toBe(1);
        expect((0, job_progress_1.applyUnitProgressTransition)(failed.progress, { next: 'succeeded', wasSucceeded: false, failureCounted: true })).toMatchObject({ progress: { total: 2, completed: 1, failed: 0 }, failureCounted: false });
    });
    it('rejects corrupt counters instead of publishing misleading progress', () => {
        expect(() => (0, job_progress_1.applyUnitProgressTransition)({ total: 1, completed: 2, failed: 0 }, { next: 'failed', wasSucceeded: false, failureCounted: false })).toThrow('content_factory_progress_invalid');
    });
});
//# sourceMappingURL=job_progress.test.js.map