import { resolveStageGenerationPolicy } from './generation_policy';

describe('stage generation policy', () => {
  test('uses versioned stage-specific limits instead of one global 8000-token setting', () => {
    expect(resolveStageGenerationPolicy('lesson_theory', 'gpt-4.1-mini')).toMatchObject({ policyVersion: 'content-stage-policy-r9a-v1', maxTokens: 12000, temperature: 0.1, responseCapability: 'json_schema' });
    expect(resolveStageGenerationPolicy('lesson_phrases', 'gpt-4.1-mini')).toMatchObject({ maxTokens: 16000 });
    expect(resolveStageGenerationPolicy('quiz_topic', 'gpt-4.1-mini')).toMatchObject({ maxTokens: 3000 });
  });

  test('falls back to json_object for unknown provider model capability', () => {
    expect(resolveStageGenerationPolicy('quiz_questions', 'custom-provider-model')).toMatchObject({ responseCapability: 'json_object' });
  });
});
