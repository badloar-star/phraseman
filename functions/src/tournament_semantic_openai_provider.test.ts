import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import { createTournamentSemanticOpenAiProvider } from './tournament_semantic_openai_provider';
import { TOURNAMENT_SEMANTIC_PROMPTS, type SemanticProviderRequest } from './tournament_semantic_review';
import type { OpenAiChatParams } from './explain/explain_provider';

const candidate = createTournamentSemanticCandidate({
  candidateId: 'provider-candidate', mode: 'speed_match', difficulty: 1,
  prompt: 'Сопоставьте пары.', context: { topic: 'test' },
  reviewSubjects: Array.from({ length: 6 }, (_, index) => ({
    subjectId: `pair_${index + 1}`, kind: 'speed_pair' as const, declaredRole: 'pair' as const,
    text: `word-${index + 1}`, completedText: `слово-${index + 1}`,
    metadata: { partOfSpeech: 'noun', senseHint: 'none' },
  })),
  provenanceKeys: Array.from({ length: 6 }, (_, index) => `provider:1:vocab-${index + 1}`),
});

describe('createTournamentSemanticOpenAiProvider', () => {
  it('uses one strict pass-specific JSON-schema call and maps exact usage', async () => {
    const calls: OpenAiChatParams[] = [];
    const request: SemanticProviderRequest = {
      candidate, pass: 'adversarial', model: 'review-model-b',
      promptVersion: TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version,
      promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
      reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    };
    const raw = JSON.stringify({ arbitrary: 'parser owns validation' });
    const provider = createTournamentSemanticOpenAiProvider({
      apiKey: 'test-key',
      chat: async (params) => {
        calls.push(params);
        return { text: raw, promptTokens: 17, completionTokens: 9 };
      },
    });

    await expect(provider.review(request)).resolves.toEqual({
      raw, inputTokens: 17, outputTokens: 9,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(expect.objectContaining({
      apiKey: 'test-key', model: 'review-model-b', maxAttempts: 1, temperature: 0,
      responseFormat: expect.objectContaining({
        type: 'json_schema',
        json_schema: expect.objectContaining({ strict: true }),
      }),
    }));
    expect(calls[0].messages[0].content).toBe(TOURNAMENT_SEMANTIC_PROMPTS.adversarial.system);
    expect(calls[0].messages[0].content).toContain('partOfSpeech');
    expect(calls[0].messages[0].content).toContain('self-declared metadata');
    expect(calls[0].messages[1].content).toContain(candidate.contentSha256);
    expect(calls[0].messages[1].content).toContain(request.promptVersion);
    expect(calls[0].messages[1].content).toContain(request.reviewContractVersion);
    const schema = (calls[0].responseFormat as any).json_schema.schema as any;
    expect(schema.properties.subjects.items.required).toEqual(expect.arrayContaining([
      'partOfSpeech', 'grammaticality', 'minimalTwin', 'violationType',
    ]));
  });

  it('does not convert provider errors into synthetic verdicts', async () => {
    const provider = createTournamentSemanticOpenAiProvider({
      apiKey: 'test-key',
      chat: async () => { throw new Error('provider-down'); },
    });
    await expect(provider.review({
      candidate, pass: 'primary', model: 'review-model-a',
      promptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
      promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
      reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    })).rejects.toThrow('provider-down');
  });
});
