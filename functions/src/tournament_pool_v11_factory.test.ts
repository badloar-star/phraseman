import { validateTournamentTaskForNewRoom } from './tournament_core';
import {
  finalizeTournamentV11TaskPool,
  TOURNAMENT_POOL_V11_VERSION,
  TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
} from './tournament_pool_v11_factory';
import {
  TOURNAMENT_V11_CELL_QUOTAS,
  type TournamentV11Selection,
  type V11CandidateManifest,
} from './tournament_pool_v11_selector';
import {
  semanticReceiptId,
  type TournamentSemanticReceipt,
} from './tournament_semantic_receipt_store';
import { TOURNAMENT_SEMANTIC_PROMPTS } from './tournament_semantic_review';
import {
  createTournamentSemanticCandidate,
  type ReviewSubject,
  type TournamentModeKind,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';

jest.setTimeout(600_000);

function receiptFor(candidate: TournamentSemanticCandidate): Extract<TournamentSemanticReceipt, { decision: 'PASS' }> {
  const counts = candidate.mode === 'speed_match'
    ? { acceptableAnswerCount: 6, errorOptionCount: 0 }
    : candidate.mode === 'guess_phrase' || candidate.mode === 'fill_gap'
      ? { acceptableAnswerCount: 1, errorOptionCount: 3 }
      : { acceptableAnswerCount: 1, errorOptionCount: 1 };
  const verdict = (pass: 'primary' | 'adversarial', model: 'gpt-4.1-mini' | 'gpt-4.1') => ({
    contentSha256: candidate.contentSha256,
    reviewContractVersion: 'tournament-semantic-review-v2' as const,
    promptVersion: `tournament-semantic-${pass}-v3`, pass, model, verdict: 'PASS' as const,
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256, ...counts,
    subjects: candidate.reviewSubjects.map((subject) => ({
      subjectId: subject.subjectId, verdict: 'PASS' as const, findingCode: null, explanation: 'Exact and unambiguous.',
      partOfSpeech: candidate.mode === 'translate_build' && subject.subjectId === 'required_0' ? 'pronoun' : 'verb',
      grammaticality: candidate.mode === 'translate_build' || candidate.mode === 'speed_match'
        ? 'not_applicable' as const
        : subject.declaredRole === 'correct' || subject.declaredRole === 'safe' ? 'valid' as const : 'invalid' as const,
      minimalTwin: candidate.mode === 'translate_build' || candidate.mode === 'speed_match' ? null : true,
      violationType: subject.declaredRole === 'distractor' || subject.declaredRole === 'odd'
        ? 'agreement'
        : subject.declaredRole === 'decoy' ? 'build_decoy' : null,
    })), blockingFindings: [],
  });
  return {
    decision: 'PASS', contentSha256: candidate.contentSha256,
    canonicalTaskSnapshotHash: candidate.contentSha256, semanticSignature: candidate.semanticSignature,
    candidateId: candidate.candidateId,
    mode: candidate.mode, difficulty: candidate.difficulty, provenanceKeys: candidate.provenanceKeys,
    reviewContractVersion: 'tournament-semantic-review-v2',
    primaryPromptVersion: 'tournament-semantic-primary-v3',
    adversarialPromptVersion: 'tournament-semantic-adversarial-v3',
    promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
    primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    requestAccounting: { attempts: 2, inputTokens: 1, outputTokens: 1 },
    createdAtMs: 1, completedAtMs: 2, generationJobId: 'job-factory',
    primaryVerdict: verdict('primary', 'gpt-4.1-mini'),
    adversarialVerdict: verdict('adversarial', 'gpt-4.1'),
  };
}

function choiceSubjects(mode: 'guess_phrase' | 'fill_gap' | 'find_oddity', index: number): ReviewSubject[] {
  if (mode === 'find_oddity') return Array.from({ length: 4 }, (_, option) => ({
    subjectId: `option_${option}`,
    kind: 'choice_option' as const,
    declaredRole: option === 3 ? 'odd' as const : 'safe' as const,
    text: `oddity-${index}-${option}`,
    ...(option === 3 ? {
      trapType: 'single_oddity_error' as const,
      reason: 'The reviewed odd option contains the single intended error.',
    } : {}),
    metadata: {
      partOfSpeech: 'verb', minimalTwin: 'true',
      grammaticality: option === 3 ? 'invalid' : 'valid',
    },
  }));
  return Array.from({ length: 4 }, (_, option) => ({
    subjectId: `option_${option}`,
    kind: 'choice_option' as const,
    declaredRole: option === 0 ? 'correct' as const : 'distractor' as const,
    text: `choice-${index}-${option}`,
    ...(option === 0 ? {} : {
      trapType: (['government', 'morphology', 'agreement'] as const)[option - 1],
      reason: 'The reviewed distractor does not satisfy the authored prompt.',
    }),
    metadata: {
      partOfSpeech: 'verb', minimalTwin: 'true',
      grammaticality: option === 0 ? 'valid' : 'invalid',
    },
  }));
}

function candidateFor(mode: TournamentModeKind, difficulty: 1 | 2 | 3, index: number) {
  const reviewSubjects: ReviewSubject[] = mode === 'translate_build'
    ? [
      { subjectId: 'required_0', kind: 'build_token', declaredRole: 'required', text: `I-${index}`, metadata: { sequenceIndex: '0' } },
      { subjectId: 'required_1', kind: 'build_token', declaredRole: 'required', text: `work-${index}`, metadata: { sequenceIndex: '1' } },
      {
        subjectId: 'decoy_0', kind: 'build_token', declaredRole: 'decoy', text: `works-${index}`,
        trapType: 'build_decoy', reason: 'The reviewed decoy is not part of the authored phrase.',
      },
    ]
    : mode === 'speed_match'
      ? Array.from({ length: 6 }, (_, pair) => ({
        subjectId: `pair_${pair}`, kind: 'speed_pair' as const, declaredRole: 'pair' as const,
        text: `word-${index}-${pair}`, completedText: `meaning-${index}-${pair}`,
      }))
      : choiceSubjects(mode, index);
  return createTournamentSemanticCandidate({
    candidateId: `factory-${mode}-${difficulty}-${index}`,
    mode,
    difficulty,
    prompt: `Reviewed ${mode} prompt ${index}.`,
    context: { topic: `topic-${index % 40}`, sourceDay: `day-${index % 80}` },
    reviewSubjects,
    provenanceKeys: mode === 'speed_match'
      ? Array.from({ length: 6 }, (_, pair) => `factory:${index}:pair-${pair}`)
      : [`factory:${index}:${mode}`],
  });
}

function exactSelection(): Extract<TournamentV11Selection, { ok: true }> {
  let ordinal = 0;
  const selected = Object.entries(TOURNAMENT_V11_CELL_QUOTAS).flatMap(([cell, count]) => {
    const [mode, rawDifficulty] = cell.split(':') as [TournamentModeKind, `${1 | 2 | 3}`];
    return Array.from({ length: count }, () => candidateFor(mode, Number(rawDifficulty) as 1 | 2 | 3, ordinal++));
  });
  const manifest: V11CandidateManifest = {
    total: 4_000,
    semanticSignatureCount: 4_000,
    modeDifficultyCounts: TOURNAMENT_V11_CELL_QUOTAS,
    primaryProvenanceCounts: {}, sourceDayCounts: {}, topicCounts: {}, grammarRuleCounts: {},
    oddityErrorTypeCounts: {}, translateDecoyTypeCounts: {}, speedPartOfSpeechCounts: {}, speedSenseCounts: {},
    historicalExclusions: 0, deterministicRejections: {},
    fill: {
      total: 500, contentWordCount: 425, articleAndToBeCount: 75,
      optionSetCounts: {}, correctTokenCounts: {}, positionCounts: { first: 160, middle: 180, last: 160 },
      categoryCounts: {}, trapTypeCounts: { agreement: 1, government: 1, morphology: 1 },
      sourceDayCounts: {}, topicCounts: {},
    },
  };
  return { ok: true, selected, manifest };
}

describe('finalizeTournamentV11TaskPool', () => {
  const selection = exactSelection();
  const receipts = new Map(selection.selected.map((candidate) => (
    [candidate.contentSha256, receiptFor(candidate)] as const
  )));

  it('builds the exact reviewed 4,000-task model and immutable hashes', () => {
    const result = finalizeTournamentV11TaskPool({ selection, receipts });
    expect(result.poolVersion).toBe(TOURNAMENT_POOL_V11_VERSION);
    expect(result.tasks).toHaveLength(4_000);
    expect(new Set(result.tasks.map(({ taskId }) => taskId)).size).toBe(4_000);
    expect(new Set(result.tasks.map(({ semanticSignature }) => semanticSignature)).size).toBe(4_000);
    expect(Object.fromEntries(Object.keys(TOURNAMENT_V11_CELL_QUOTAS).map((cell) => [
      cell,
      result.tasks.filter((task) => `${task.mode}:${task.difficulty}` === cell).length,
    ]))).toEqual(TOURNAMENT_V11_CELL_QUOTAS);
    expect(result.tasks.every((task) => validateTournamentTaskForNewRoom(task).ok)).toBe(true);
    expect(result.tasks.every((task) => task.semanticReceiptId === semanticReceiptId(
      task.contentSha256!, task.reviewContractVersion!, task.promptSetSha256!, {
        primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
      },
    ))).toBe(true);
    expect(result.tasks.every((task) => /^[a-f0-9]{64}$/u.test(task.semanticReceiptSha256!))).toBe(true);
    const bucketLoads = new Map<string, number>();
    for (const task of result.tasks) {
      bucketLoads.set(task.exposureBucket, (bucketLoads.get(task.exposureBucket) ?? 0) + 1);
    }
    expect(bucketLoads.size).toBe(Object.values(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS)
      .reduce((sum, count) => sum + count, 0));
    expect(Math.max(...bucketLoads.values())).toBeLessThanOrEqual(40);
    expect([...bucketLoads.values()].reduce((sum, count) => sum + count, 0)).toBe(4_000);
    for (const unsafe of [
      'I am looking for a blue shoes.', 'It is moment to sleep.', 'It is night to sleep.',
    ]) expect(JSON.stringify(result.tasks)).not.toContain(unsafe);
    expect(selection.manifest.fill.contentWordCount).toBeGreaterThanOrEqual(300);
    expect(selection.manifest.fill.articleAndToBeCount).toBeLessThanOrEqual(75);
    expect(result).toEqual(expect.objectContaining({
      taskCount: 4_000,
      manifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      bundleSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      receiptLedgerSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      exposureLayoutHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    }));
  });

  it('rejects a missing or drifted exact receipt', () => {
    const missing = new Map(receipts);
    missing.delete(selection.selected[0].contentSha256);
    expect(() => finalizeTournamentV11TaskPool({ selection, receipts: missing }))
      .toThrow('tournament_v11_receipt_missing');
    const drifted = new Map(receipts);
    const candidate = selection.selected[0];
    drifted.set(candidate.contentSha256, { ...receipts.get(candidate.contentSha256)!, candidateId: 'drift' });
    expect(() => finalizeTournamentV11TaskPool({ selection, receipts: drifted }))
      .toThrow('tournament_v11_receipt_invalid');
  });

  it('rejects a forged final selection manifest that misses a fill diversity gate', () => {
    const forged: Extract<TournamentV11Selection, { ok: true }> = {
      ...selection,
      manifest: {
        ...selection.manifest,
        fill: { ...selection.manifest.fill, contentWordCount: 299 },
      },
    };
    expect(() => finalizeTournamentV11TaskPool({ selection: forged, receipts }))
      .toThrow('tournament_v11_selection_invalid');
  });
});
