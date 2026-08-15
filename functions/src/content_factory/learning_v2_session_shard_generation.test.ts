import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import type { StageGenerationProvider } from './stage_runner';

const mockValidateShard = jest.fn((value: unknown, _expected?: unknown) => Object.freeze(value as Record<string, unknown>));
jest.mock('../../../modules/learning-v2/content/generator_session_shard', () => ({
  LEARNING_V2_SESSION_CARD_PURPOSES: Object.freeze([
    'intro_check', 'intro_check', 'intro_check', 'supported_practice', 'supported_practice',
    'guided_practice', 'guided_practice', 'retrieval_practice', 'near_transfer',
    'independent_check', 'delayed_review', 'independent_check',
  ]),
  validateLearningV2GeneratedSessionShardV1: (value: unknown, expected: unknown) => mockValidateShard(value, expected),
  learningV2GeneratedMeaningSourceHash: (input: unknown) => require('../../../modules/learning-v2/policies/decision_registry').hashCanonicalBody({
    schemaVersion: 'learning-v2-generated-meaning-source.v1',
    ...(input as Record<string, unknown>),
  }),
  learningV2GeneratedSessionShardFingerprint: (value: unknown) => require('../../../modules/learning-v2/policies/decision_registry').hashCanonicalBody(value),
}));

import {
  buildLearningV2SessionShardGenerationPacket,
  generateLearningV2SessionShard,
  materializeLearningV2SessionMeaningHashes,
} from './learning_v2_session_shard_generation';

const plan = buildLearningV2LocalizedContentBatchPlan({
  packageId: 'learning-v2-en-v1',
  approvedOutlineFingerprint: 'a'.repeat(64),
  promptVersion: 'learning-v2-session-v1',
});

function providerWith(responses: readonly string[]): StageGenerationProvider {
  let index = 0;
  return {
    getProviderRequestCount: () => index,
    generate: jest.fn(async () => responses[index++] ?? responses[responses.length - 1]),
  };
}

describe('Learning V2 one-session generation runner', () => {
  beforeEach(() => mockValidateShard.mockImplementation((value: unknown) => Object.freeze(value as Record<string, unknown>)));

  test('binds one all-locale task to its exact approved outline segment deterministically', () => {
    const packet = buildLearningV2SessionShardGenerationPacket({
      plan,
      task: plan.tasks[0],
      targetLanguage: 'en',
      approvedOutlineSegment: { episodeId: 'episode-01', sessionId: 'session-01', objectiveId: 'objective-e01' },
    });
    expect(packet.expected).toEqual({
      packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1,
      requiredSessionOrdinal: 1, generationInputFingerprint: plan.tasks[0].generationInputFingerprint,
    });
    expect(packet.task.locale).toBeNull();
    expect(packet.promptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(packet.groundingHash).toMatch(/^[a-f0-9]{64}$/);
    expect(buildLearningV2SessionShardGenerationPacket({
      plan, task: plan.tasks[0], targetLanguage: 'en',
      approvedOutlineSegment: { episodeId: 'episode-01', sessionId: 'session-01', objectiveId: 'objective-e01' },
    })).toEqual(packet);
  });

  test('rejects a self-consistent task that is not the exact task from the approved plan', () => {
    expect(() => buildLearningV2SessionShardGenerationPacket({
      plan,
      task: { ...plan.tasks[0], generationInputFingerprint: 'b'.repeat(64) },
      targetLanguage: 'en',
      approvedOutlineSegment: { episodeId: 'episode-01' },
    })).toThrow('learning_v2_session_generation_task_not_from_plan');
  });

  test('derives localized meaning hashes on the server instead of trusting the model', () => {
    const expected = {
      packageId: plan.packageId,
      targetLanguage: 'en',
      episodeOrdinal: 1,
      requiredSessionOrdinal: 1,
      generationInputFingerprint: plan.tasks[0].generationInputFingerprint,
    };
    const candidate = {
      cards: [{ contentItem: {
        contentItemId: 'content-episode-01-s01-01',
        target: { text: 'Hello' },
        learnerMeanings: [{ locale: 'ru', value: 'Привет', sourceHash: 'model-must-not-decide-this' }],
      } }],
    };
    const materialized = materializeLearningV2SessionMeaningHashes(candidate, expected) as typeof candidate;
    expect(materialized.cards[0].contentItem.learnerMeanings[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(materialized.cards[0].contentItem.learnerMeanings[0].sourceHash).not.toBe('model-must-not-decide-this');
    expect(candidate.cards[0].contentItem.learnerMeanings[0].sourceHash).toBe('model-must-not-decide-this');
  });

  test('returns one server-validated shard and an exact generation receipt', async () => {
    const packet = buildLearningV2SessionShardGenerationPacket({
      plan, task: plan.tasks[0], targetLanguage: 'en',
      approvedOutlineSegment: { episodeId: 'episode-01', sessionId: 'session-01' },
    });
    const artifact = { schemaVersion: 'learning-v2-generated-session-shard.v1', marker: 'valid' };
    const provider = providerWith([JSON.stringify(artifact)]);
    const result = await generateLearningV2SessionShard({ provider, model: 'gpt-5.4', packet });
    expect(result.shard).toEqual(artifact);
    expect(result.receipt).toMatchObject({ taskId: 'localized:01:01', taskOrdinal: 1, attempts: 1, providerRequests: 1 });
    expect(result.receipt.contentFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 48_000, temperature: 0.2 }));
  });

  test('repairs at most twice and never weakens the immutable packet', async () => {
    const packet = buildLearningV2SessionShardGenerationPacket({
      plan, task: plan.tasks[0], targetLanguage: 'en',
      approvedOutlineSegment: { episodeId: 'episode-01', sessionId: 'session-01' },
    });
    mockValidateShard
      .mockImplementationOnce(() => { throw new Error('cards_must_be_12'); })
      .mockImplementationOnce((value: unknown) => Object.freeze(value as Record<string, unknown>));
    const provider = providerWith([JSON.stringify({ marker: 'nine-cards' }), JSON.stringify({ marker: 'twelve-cards' })]);
    const result = await generateLearningV2SessionShard({ provider, model: 'gpt-5.4', packet });
    expect(result.receipt.attempts).toBe(2);
    expect(provider.generate).toHaveBeenCalledTimes(2);
    const repairCall = (provider.generate as jest.Mock).mock.calls[1][0];
    expect(repairCall.prompt).toContain('cards_must_be_12');
    expect(repairCall.prompt).toContain(packet.promptHash);
    expect(repairCall.prompt).toContain(packet.groundingHash);
  });

  test('fails closed after the third invalid provider response', async () => {
    const packet = buildLearningV2SessionShardGenerationPacket({
      plan, task: plan.tasks[0], targetLanguage: 'en', approvedOutlineSegment: { episodeId: 'episode-01' },
    });
    mockValidateShard.mockImplementation(() => { throw new Error('invalid-session'); });
    const provider = providerWith(['{}', '{}', '{}']);
    await expect(generateLearningV2SessionShard({ provider, model: 'gpt-5.4', packet }))
      .rejects.toThrow('learning_v2_session_generation_failed:invalid-session');
    expect(provider.generate).toHaveBeenCalledTimes(3);
  });
});
