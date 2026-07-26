"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_policy_1 = require("./generation_policy");
describe('stage generation policy', () => {
    test('uses versioned stage-specific limits instead of one global 8000-token setting', () => {
        expect((0, generation_policy_1.resolveStageGenerationPolicy)('lesson_theory', 'gpt-4.1-mini')).toMatchObject({ policyVersion: 'content-stage-policy-r9a-v1', maxTokens: 12000, temperature: 0.1, responseCapability: 'json_schema' });
        expect((0, generation_policy_1.resolveStageGenerationPolicy)('lesson_phrases', 'gpt-4.1-mini')).toMatchObject({ maxTokens: 16000 });
        expect((0, generation_policy_1.resolveStageGenerationPolicy)('challenge_topic', 'gpt-4.1-mini')).toMatchObject({ maxTokens: 3000 });
    });
    test('falls back to json_object for unknown provider model capability', () => {
        expect((0, generation_policy_1.resolveStageGenerationPolicy)('challenge_questions', 'custom-provider-model')).toMatchObject({ responseCapability: 'json_object' });
    });
});
//# sourceMappingURL=generation_policy.test.js.map