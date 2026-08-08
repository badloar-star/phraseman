import type { GenerationStageKind } from './stage_contracts';

export const CONTENT_STAGE_POLICY_VERSION = 'content-stage-policy-r9a-v1';

const JSON_SCHEMA_MODELS = /^(gpt-4o(?:-|$)|gpt-4\.1(?:-|$)|gpt-5(?:-|$))/;

export function resolveStageGenerationPolicy(kind: GenerationStageKind, model: string) {
  const limits: Partial<Record<GenerationStageKind, number>> = {
    lesson_theory: 12000,
    lesson_phrases: 16000,
    lesson_outline: 6000,
    challenge_topic: 3000,
    flashcard_pack_idea: 3000,
  };
  const maxTokens = limits[kind] ?? 8000;
  const temperature = kind === 'lesson_theory' || kind === 'lesson_phrases' ? 0.1 : 0.2;
  return Object.freeze({ policyVersion: CONTENT_STAGE_POLICY_VERSION, provider: 'openai_chat_completions' as const, model, maxTokens, temperature, responseCapability: JSON_SCHEMA_MODELS.test(model) ? 'json_schema' as const : 'json_object' as const });
}
