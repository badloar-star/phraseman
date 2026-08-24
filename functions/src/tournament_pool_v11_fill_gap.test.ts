import { validateTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  buildFillGapCandidates,
  validateFillGapCandidate,
} from './tournament_pool_v11_fill_gap';
import type { V11SourceDay, V11SourcePhrase } from './tournament_pool_v11_grammar_twins';

const day: V11SourceDay = { planId: 'strict-v11', dayIndex: 9, level: 'A2' };

function phrase(id: string, english: string, word: string): V11SourcePhrase {
  return {
    id,
    english,
    meaning: { ru: 'Она готова.' },
    words: [{ text: word, partOfSpeech: 'verb', distractors: ['looks', 'seems', 'stays'] }],
  };
}

describe('buildFillGapCandidates', () => {
  it('projects a proved grammar twin set into the mandatory semantic V2 contract', () => {
    const source = phrase('she-is', 'She is ready.', 'is');
    const [envelope] = buildFillGapCandidates(day, source);
    const candidate = envelope?.semanticCandidate;

    expect(candidate).toBeDefined();
    expect(candidate?.mode).toBe('fill_gap');
    expect(candidate?.difficulty).toBe(2);
    expect(candidate?.prompt).toBe('She ___ ready.');
    expect(candidate?.context).toEqual(expect.objectContaining({
      authoredSentence: 'She is ready.',
      correctValue: 'is',
      grammarRuleId: 'subject_be_agreement',
      slotIndex: 1,
    }));
    expect(candidate?.reviewSubjects).toHaveLength(4);
    expect(candidate?.reviewSubjects.map((item) => item.text)).toEqual(['is', 'am', 'are', 'been']);
    expect(candidate?.reviewSubjects.map((item) => item.metadata?.grammaticality))
      .toEqual(['valid', 'invalid', 'invalid', 'invalid']);
    expect(new Set(candidate?.reviewSubjects.map((item) => item.metadata?.partOfSpeech))).toEqual(new Set(['verb']));
    expect(candidate?.reviewSubjects.every((item) => item.metadata?.minimalTwin === 'true')).toBe(true);
    expect(validateTournamentSemanticCandidate(candidate!)).toEqual({ ok: true });
    expect(validateFillGapCandidate(day, source, envelope!)).toEqual({ ok: true });
  });

  it('uses only grammar trap types and distinct option-specific Russian reasons', () => {
    const [envelope] = buildFillGapCandidates(day, phrase('modal', 'You should swim.', 'swim'));
    const wrong = envelope?.semanticCandidate.reviewSubjects.filter((item) => item.declaredRole === 'distractor') ?? [];

    expect(wrong.map((item) => item.trapType)).toEqual(['morphology', 'morphology', 'morphology']);
    expect(new Set(wrong.map((item) => item.reason)).size).toBe(3);
    for (const item of wrong) {
      expect(item.completedText).toContain(item.text);
      expect(item.reason).toContain(`«${item.text}»`);
      expect(item.reason).toMatch(/[А-Яа-яЁё]/u);
    }
  });

  it('classifies objective pronoun case errors as government, not lexical substitution', () => {
    const source: V11SourcePhrase = {
      id: 'for-me',
      english: 'This is for me.',
      meaning: { ru: 'Это для меня.' },
      words: [{ text: 'me', partOfSpeech: 'pronoun' }],
    };
    const [envelope] = buildFillGapCandidates(day, source);
    const wrong = envelope?.semanticCandidate.reviewSubjects
      .filter((item) => item.declaredRole === 'distractor') ?? [];

    expect(wrong).toHaveLength(3);
    expect(wrong.map((item) => item.trapType)).toEqual(['government', 'government', 'government']);
    expect(new Set(wrong.map((item) => item.metadata?.partOfSpeech))).toEqual(new Set(['pronoun']));
  });

  it('rejects semantic substitutions and never consumes authored distractors as proof', () => {
    expect(buildFillGapCandidates(day, phrase(
      'closes',
      'She closes the door at night.',
      'closes',
    ))).toEqual([]);
  });

  it('fails closed when semantic metadata is rehashed but does not match the grammar proof', () => {
    const source = phrase('canonical', 'She is ready.', 'is');
    const [envelope] = buildFillGapCandidates(day, source);
    expect(envelope).toBeDefined();
    const original = envelope!.semanticCandidate;
    const spoof = {
      ...envelope!,
      semanticCandidate: {
        ...original,
        reviewSubjects: original.reviewSubjects.map((subject, index) => index === 1
          ? { ...subject, completedText: 'She looks ready.', text: 'looks' }
          : subject),
      },
    };

    expect(validateFillGapCandidate(day, source, spoof)).toEqual({
      ok: false,
      reason: 'semantic_candidate_invalid',
    });
  });

  it('rejects a candidateId mutation even though semantic hashes intentionally omit presentation identity', () => {
    const source = phrase('id-binding', 'She is ready.', 'is');
    const [envelope] = buildFillGapCandidates(day, source);
    expect(envelope).toBeDefined();

    expect(validateFillGapCandidate(day, source, {
      ...envelope!,
      semanticCandidate: {
        ...envelope!.semanticCandidate,
        candidateId: 'attacker-controlled-valid-id',
      },
    })).toEqual({ ok: false, reason: 'projection_mismatch' });
  });

  it('deduplicates identical semantics across different source days while content keeps full provenance', () => {
    const source = phrase('same-surface', 'She is ready.', 'is');
    const [first] = buildFillGapCandidates({ ...day, planId: 'plan-a', dayIndex: 1 }, source);
    const [second] = buildFillGapCandidates({ ...day, planId: 'plan-b', dayIndex: 99 }, source);

    expect(first.semanticCandidate.semanticSignature).toBe(second.semanticCandidate.semanticSignature);
    expect(first.semanticCandidate.contentSha256).not.toBe(second.semanticCandidate.contentSha256);
  });

  it.each([
    ['A1', 1],
    ['A2', 2],
    ['B1', 3],
    ['B2', 3],
    [undefined, 2],
  ] as const)('maps authored level %s to difficulty %s', (level, difficulty) => {
    const [envelope] = buildFillGapCandidates({ ...day, level }, phrase(`level-${level}`, 'She is ready.', 'is'));
    expect(envelope?.semanticCandidate.difficulty).toBe(difficulty);
  });

  it('fails closed instead of throwing on malformed serialized envelopes', () => {
    const source = phrase('malformed', 'She is ready.', 'is');
    expect(validateFillGapCandidate(day, source, null)).toEqual({
      ok: false,
      reason: 'grammar_proof_invalid',
    });
  });
});
