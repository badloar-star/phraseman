import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  parseSemanticVerdict,
  reviewTournamentCandidate,
  TOURNAMENT_SEMANTIC_PROMPTS,
  type SemanticProviderRequest,
  type TournamentSemanticReviewProvider,
} from './tournament_semantic_review';

const candidate = createTournamentSemanticCandidate({
  candidateId: 'review-candidate',
  mode: 'guess_phrase',
  difficulty: 2,
  prompt: 'Выберите предложение без ошибки.',
  context: { topic: 'test', authoredSentence: 'She is ready.' },
  reviewSubjects: [
    {
      subjectId: 'correct', kind: 'choice_option', declaredRole: 'correct',
      text: 'She is ready.', completedText: 'She is ready.',
      metadata: { partOfSpeech: 'verb', minimalTwin: 'true', grammaticality: 'valid' },
    },
    ...['She am ready.', 'She are ready.', 'She be ready.'].map((text, index) => ({
      subjectId: `distractor_${index + 1}`,
      kind: 'choice_option' as const,
      declaredRole: 'distractor' as const,
      text,
      completedText: text,
      trapType: 'agreement' as const,
      reason: `${text} нарушает согласование.`,
      metadata: { partOfSpeech: 'verb', minimalTwin: 'true', grammaticality: 'invalid' },
    })),
  ],
  provenanceKeys: ['review:1:phrase'],
});

function rawFor(request: SemanticProviderRequest, verdict: 'PASS' | 'REJECT' = 'PASS') {
  return {
    contentSha256: request.candidate.contentSha256,
    reviewContractVersion: request.reviewContractVersion,
    promptVersion: request.promptVersion,
    promptSetSha256: request.promptSetSha256,
    pass: request.pass,
    model: request.model,
    verdict,
    acceptableAnswerCount: 1,
    errorOptionCount: 3,
    subjects: request.candidate.reviewSubjects.map((subject) => ({
      subjectId: subject.subjectId,
      verdict,
      findingCode: verdict === 'PASS' ? null : 'ambiguous_option',
      explanation: verdict === 'PASS' ? 'Проверено.' : 'Есть неоднозначность.',
      partOfSpeech: 'verb',
      grammaticality: subject.declaredRole === 'correct' ? 'valid' : 'invalid',
      minimalTwin: true,
      violationType: subject.declaredRole === 'correct' ? null : 'agreement',
    })),
    blockingFindings: verdict === 'PASS' ? [] : [{
      code: 'ambiguous_option',
      subjectId: request.candidate.reviewSubjects[0].subjectId,
      message: 'Возможен второй ответ.',
    }],
  };
}

describe('tournament semantic review', () => {
  it('binds both prompt versions to the review contract version', () => {
    expect(TOURNAMENT_SEMANTIC_PROMPTS.contractVersion).toBe('tournament-semantic-review-v2');
    expect(TOURNAMENT_SEMANTIC_PROMPTS.primary.version).toContain('-v3');
    expect(TOURNAMENT_SEMANTIC_PROMPTS.adversarial.version).toContain('-v3');
    expect(TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('strictly parses a complete exact PASS', () => {
    const expected: SemanticProviderRequest = {
      candidate,
      pass: 'primary',
      model: 'model-a',
      promptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
      promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
      reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    };
    expect(parseSemanticVerdict(rawFor(expected), expected)).toEqual(expect.objectContaining({
      verdict: 'PASS',
      contentSha256: candidate.contentSha256,
    }));
  });

  it.each([
    ['semantic_hash_mismatch', (raw: any) => { raw.contentSha256 = '0'.repeat(64); }],
    ['semantic_subject_set_mismatch', (raw: any) => { raw.subjects.pop(); }],
    ['semantic_subject_set_mismatch', (raw: any) => { raw.subjects.push(raw.subjects[0]); }],
    ['semantic_echo_mismatch', (raw: any) => { raw.model = 'other'; }],
    ['semantic_count_mismatch', (raw: any) => { raw.acceptableAnswerCount = 2; }],
    ['semantic_subject_invalid', (raw: any) => { delete raw.subjects[0].grammaticality; }],
    ['semantic_evidence_matrix_invalid', (raw: any) => { raw.subjects[1].partOfSpeech = 'noun'; }],
    ['semantic_evidence_matrix_invalid', (raw: any) => { raw.subjects[1].grammaticality = 'valid'; }],
    ['semantic_evidence_matrix_invalid', (raw: any) => { raw.subjects[1].minimalTwin = false; }],
    ['semantic_evidence_matrix_invalid', (raw: any) => { raw.subjects[1].violationType = null; }],
    ['semantic_pass_inconsistent', (raw: any) => { raw.blockingFindings.push({ code: 'x', subjectId: 'correct', message: 'x' }); }],
  ])('rejects malformed or drifted evidence: %s', (message, mutate) => {
    const expected: SemanticProviderRequest = {
      candidate,
      pass: 'primary',
      model: 'model-a',
      promptVersion: TOURNAMENT_SEMANTIC_PROMPTS.primary.version,
      promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
      reviewContractVersion: TOURNAMENT_SEMANTIC_PROMPTS.contractVersion,
    };
    const raw = rawFor(expected) as any;
    mutate(raw);
    expect(() => parseSemanticVerdict(raw, expected)).toThrow(message);
  });

  it('runs independent primary and adversarial passes with a fake provider', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network_forbidden'));
    const calls: SemanticProviderRequest[] = [];
    const provider: TournamentSemanticReviewProvider = {
      async review(request) {
        calls.push(request);
        return { raw: rawFor(request), inputTokens: 10, outputTokens: 5 };
      },
    };
    const result = await reviewTournamentCandidate(candidate, {
      primaryModel: 'model-a', adversarialModel: 'model-b',
    }, provider);

    expect(calls.map((call) => call.pass)).toEqual(['primary', 'adversarial']);
    expect(calls[1]).not.toHaveProperty('primaryVerdict');
    expect(result).toEqual(expect.objectContaining({
      decision: 'PASS',
      requestAccounting: { attempts: 2, inputTokens: 20, outputTokens: 10 },
    }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('fails before provider access when reviewer identities are equal', async () => {
    const provider = { review: jest.fn() } as unknown as TournamentSemanticReviewProvider;
    await expect(reviewTournamentCandidate(candidate, {
      primaryModel: 'same-model', adversarialModel: 'same-model',
    }, provider)).resolves.toEqual(expect.objectContaining({
      decision: 'ERROR', failureCode: 'reviewer_identity_invalid',
    }));
    expect(provider.review).not.toHaveBeenCalled();
  });

  it('skips the adversarial spend after a primary reject and never turns provider failure into PASS', async () => {
    const calls: SemanticProviderRequest[] = [];
    const rejectProvider: TournamentSemanticReviewProvider = {
      async review(request) {
        calls.push(request);
        return { raw: rawFor(request, 'REJECT'), inputTokens: 1, outputTokens: 1 };
      },
    };
    const rejected = await reviewTournamentCandidate(candidate, {
      primaryModel: 'model-a', adversarialModel: 'model-b',
    }, rejectProvider);
    expect(rejected.decision).toBe('REJECT');
    expect(calls).toHaveLength(1);

    const failed = await reviewTournamentCandidate(candidate, {
      primaryModel: 'model-a', adversarialModel: 'model-b',
    }, { review: async () => { throw new Error('timeout'); } });
    expect(failed).toEqual(expect.objectContaining({ decision: 'ERROR', failureCode: 'provider_error' }));
  });
});
