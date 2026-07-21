"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_checkpoint_1 = require("./generation_checkpoint");
describe('generation unit checkpoint', () => {
    it('replays a completed unit and resumes a validated generated payload', () => {
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'succeeded' }, 10000)).toEqual({ action: 'replay' });
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'generated', generatedPayload: { lessonId: 1 }, qaReceipt: { status: 'passed' } }, 10000)).toEqual({ action: 'resume', payload: { lessonId: 1 }, qaReceipt: { status: 'passed' } });
    });
    it('blocks a concurrent live lease but recovers a stale lease', () => {
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'running', leaseExpiresAtMs: 20000 }, 10000)).toEqual({ action: 'busy' });
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'running', leaseExpiresAtMs: 9999 }, 10000)).toEqual({ action: 'generate' });
    });
    it('does not resume malformed or failed QA payloads', () => {
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'generated', generatedPayload: null, qaReceipt: { status: 'passed' } }, 10000)).toEqual({ action: 'generate' });
        expect((0, generation_checkpoint_1.chooseGenerationCheckpointAction)({ state: 'generated', generatedPayload: {}, qaReceipt: { status: 'failed' } }, 10000)).toEqual({ action: 'generate' });
    });
    it('rejects a checkpoint belonging to another target, source or release unit', () => {
        const expected = { unitId: 'job-1:lesson:1', jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1 };
        expect(() => (0, generation_checkpoint_1.assertGenerationCheckpointIdentity)({ ...expected, state: 'generated' }, expected)).not.toThrow();
        expect(() => (0, generation_checkpoint_1.assertGenerationCheckpointIdentity)({ ...expected, studyTarget: 'de' }, expected)).toThrow('generation_checkpoint_identity_mismatch');
    });
});
//# sourceMappingURL=generation_checkpoint.test.js.map