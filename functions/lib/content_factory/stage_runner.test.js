"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stage_runner_1 = require("./stage_runner");
const prompt_registry_1 = require("./prompt_registry");
const prompt_context_1 = require("./prompt_context");
describe('generation stage runner', () => {
    const packet = (0, prompt_registry_1.buildStagePromptPacket)('quiz_questions', 'v1', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', count: 2, approvedArtifactIds: [], exemplarIds: [], previousContentFingerprints: [] }));
    it('accepts structured output with exact identity and count', async () => {
        const provider = { generate: async () => JSON.stringify({ stage: 'quiz_questions', items: [{ id: 'q1' }, { id: 'q2' }] }) };
        const result = await (0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet });
        expect(result.artifact).toMatchObject({ stage: 'quiz_questions' });
        expect(result.attempts).toBe(1);
        expect(result.receipt).toMatchObject({ status: 'passed', promptHash: packet.promptHash, contextHash: packet.contextHash, schemaHash: packet.schemaHash, validation: { serverValidated: true, errors: [] } });
    });
    it('repairs only the invalid JSON at most twice using validation errors', async () => {
        const prompts = [];
        const responses = ['{"stage":"quiz_questions","items":[]}', '{"stage":"quiz_questions","items":[{"id":"q1"}]}', '{"stage":"quiz_questions","items":[{"id":"q1"},{"id":"q2"}]}'];
        const provider = { generate: async ({ prompt }) => { prompts.push(prompt); return responses.shift() ?? '{}'; } };
        const result = await (0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet });
        expect(result.attempts).toBe(3);
        expect(prompts[1]).toContain('validationErrors');
        expect(prompts[1]).toContain('previousJson');
        expect(prompts[1]).toContain(packet.system);
        expect(prompts[1]).toContain(packet.task);
        expect(prompts[1]).toContain(packet.contextHash);
        expect(prompts[1]).toContain(packet.schemaHash);
        expect(prompts[1]).toContain('untrustedPreviousJson');
    });
    it('negotiates json_schema with fallback and still runs the server validator', async () => {
        const formats = [];
        const provider = { generate: async (input) => { formats.push(input.responseFormat); return JSON.stringify({ stage: 'wrong', items: [{ id: 'q1' }, { id: 'q2' }] }); } };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'gpt-4.1-mini', packet, maxRepairs: 0 })).rejects.toThrow('generation_stage_schema_failed');
        expect(formats[0]).toMatchObject({ type: 'json_schema', json_schema: { strict: false, schema: packet.outputSchema } });
        formats.length = 0;
        await (0, stage_runner_1.runGenerationStage)({ provider: { generate: async (input) => { formats.push(input.responseFormat); return JSON.stringify({ stage: 'quiz_questions', items: [{ id: 'q1' }, { id: 'q2' }] }); } }, model: 'unknown-model', packet, maxRepairs: 0 });
        expect(formats[0]).toEqual({ type: 'json_object' });
    });
    it('accounts every provider request and records policy evidence', async () => {
        const reserved = [];
        const responses = ['{}', JSON.stringify({ stage: 'quiz_questions', items: [{ id: 'q1' }, { id: 'q2' }] })];
        const result = await (0, stage_runner_1.runGenerationStage)({ provider: { generate: async () => responses.shift() }, model: 'fake', packet, maxRepairs: 1, beforeProviderCall: async (callIndex) => { reserved.push(callIndex); } });
        expect(reserved).toEqual([1, 2]);
        expect(result.receipt).toMatchObject({ providerRequests: { requestedUnits: 2, usedUnits: 2, refundedUnits: 0 }, policyVersion: 'content-stage-policy-r9a-v1', operatorCorrection: { status: 'unavailable_not_collected' } });
        expect(result.receipt.repairAttemptHashes).toHaveLength(1);
    });
    it('uses transport request count when one logical generation retries HTTP', async () => {
        let count = 0;
        const provider = {
            getProviderRequestCount: () => count,
            generate: async () => { count += 3; return JSON.stringify({ stage: 'quiz_questions', items: [{ id: 'q1' }, { id: 'q2' }] }); },
        };
        const result = await (0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet, maxRepairs: 0 });
        expect(result.receipt.providerRequests).toMatchObject({ requestedUnits: 3, usedUnits: 3, refundedUnits: 0, unit: 'provider_requests' });
    });
    it('fails closed after the repair budget is exhausted', async () => {
        const provider = { generate: async () => '{}' };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet })).rejects.toThrow('generation_stage_schema_failed');
    });
    it('retains every parseable repair candidate so an earlier valid partial can be checkpointed', async () => {
        const partial = { stage: 'flashcard_items', items: [{ id: 'c1' }] };
        const flashcardPacket = (0, prompt_registry_1.buildStagePromptPacket)('flashcard_items', 'v3', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Home', count: 10, approvedArtifactIds: ['idea-1'], exemplarIds: [], previousContentFingerprints: [] }), { packIdea: { packId: 'home' }, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] });
        const responses = [JSON.stringify(partial), '{}', 'not-json'];
        const provider = { generate: async () => responses.shift() };
        const error = await (0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet: flashcardPacket, maxRepairs: 2 }).catch((value) => value);
        expect(error).toBeInstanceOf(stage_runner_1.GenerationStageSchemaError);
        expect(error.candidateArtifacts).toEqual([partial, {}]);
    });
    it('supports explicit pause, resume and cancel transitions', () => {
        expect((0, stage_runner_1.transitionGenerationStage)('running', 'pause')).toBe('paused');
        expect((0, stage_runner_1.transitionGenerationStage)('paused', 'resume')).toBe('queued');
        expect((0, stage_runner_1.transitionGenerationStage)('queued', 'cancel')).toBe('cancelled');
        expect(() => (0, stage_runner_1.transitionGenerationStage)('approved', 'cancel')).toThrow('generation_stage_transition_invalid');
    });
    it('fails strict v2 lesson phrases that only satisfy the generic item count', async () => {
        const lessonPacket = (0, prompt_registry_1.buildStagePromptPacket)('lesson_phrases', 'v2', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', count: 50, approvedArtifactIds: ['outline-1'], exemplarIds: [], previousContentFingerprints: [] }));
        const provider = { generate: async () => JSON.stringify({ stage: 'lesson_phrases', items: Array.from({ length: 50 }, (_, index) => ({ id: `p${index}` })) }) };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet: lessonPacket, maxRepairs: 0 })).rejects.toThrow('generation_stage_schema_failed');
    });
    it('fails a v2 flashcard batch when a rich card field is missing', async () => {
        const flashcardPacket = (0, prompt_registry_1.buildStagePromptPacket)('flashcard_items', 'v2', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', count: 1, approvedArtifactIds: ['idea-1'], exemplarIds: [], previousContentFingerprints: [] }), { packIdea: { packId: 'city' } });
        const provider = { generate: async () => JSON.stringify({ stage: 'flashcard_items', items: [{ id: 'c1', front: 'Hello', back: 'Привет' }] }) };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet: flashcardPacket, maxRepairs: 0 })).rejects.toThrow('generation_stage_schema_failed');
    });
    it('fails a v2 Arena batch that only satisfies generic item count', async () => {
        const arenaPacket = (0, prompt_registry_1.buildStagePromptPacket)('arena_questions', 'v2', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Fast city', count: 10, approvedArtifactIds: ['topic-1'], exemplarIds: [], previousContentFingerprints: [] }), { topic: { level: 'A2', skillTags: ['city'], allowedTypes: ['translate'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500 } });
        const provider = { generate: async () => JSON.stringify({ stage: 'arena_questions', items: Array.from({ length: 10 }, (_, index) => ({ id: `a${index}` })) }) };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet: arenaPacket, maxRepairs: 0 })).rejects.toThrow('generation_stage_schema_failed');
    });
    it('keeps the non-active Arena v5 candidate behind the production validator', async () => {
        const arenaPacket = (0, prompt_registry_1.buildStagePromptPacket)('arena_questions', 'v5', (0, prompt_context_1.buildPromptContext)({ studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Fast city', count: 10, approvedArtifactIds: ['topic-1'], exemplarIds: [], previousContentFingerprints: [] }), { topic: { level: 'A2', skillTags: ['city'], allowedTypes: ['translate'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500 } });
        const provider = { generate: async () => JSON.stringify({ stage: 'arena_questions', items: Array.from({ length: 10 }, (_, index) => ({ id: `a${index}` })) }) };
        await expect((0, stage_runner_1.runGenerationStage)({ provider, model: 'fake', packet: arenaPacket, maxRepairs: 0 })).rejects.toThrow('generation_stage_schema_failed');
    });
});
//# sourceMappingURL=stage_runner.test.js.map