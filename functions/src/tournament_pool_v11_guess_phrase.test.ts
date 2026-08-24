import { validateTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  buildGuessPhraseCandidates,
  validateGuessPhraseCandidate,
} from './tournament_pool_v11_guess_phrase';
import type { V11SourceDay, V11SourcePhrase } from './tournament_pool_v11_grammar_twins';

const day: V11SourceDay = { planId: 'strict-v11', dayIndex: 11, level: 'B1' };
const source: V11SourcePhrase = {
  id: 'modal-swim',
  english: 'You should swim.',
  meaning: { ru: 'Ты умеешь плавать.' },
  words: [{ text: 'swim', partOfSpeech: 'verb', distractors: ['dive', 'float', 'sink'] }],
};

describe('buildGuessPhraseCandidates', () => {
  it('uses four complete one-slot twins with exactly one grammatical answer', () => {
    const [envelope] = buildGuessPhraseCandidates(day, source);
    const candidate = envelope?.semanticCandidate;

    expect(candidate).toBeDefined();
    expect(candidate?.mode).toBe('guess_phrase');
    expect(candidate?.difficulty).toBe(3);
    expect(candidate?.prompt).toContain('Ты умеешь плавать.');
    expect(candidate?.context).toEqual(expect.objectContaining({
      promptFamily: expect.stringMatching(/^(situation|intention|dialogue)$/u),
    }));
    expect(candidate?.reviewSubjects.map((item) => item.text)).toEqual([
      'You should swim.',
      'You should swims.',
      'You should swam.',
      'You should swimming.',
    ]);
    expect(candidate?.reviewSubjects.map((item) => item.metadata?.grammaticality))
      .toEqual(['valid', 'invalid', 'invalid', 'invalid']);
    expect(candidate?.reviewSubjects.every((item) => item.metadata?.partOfSpeech === 'verb')).toBe(true);
    expect(candidate?.reviewSubjects.every((item) => item.metadata?.minimalTwin === 'true')).toBe(true);
    expect(validateTournamentSemanticCandidate(candidate!)).toEqual({ ok: true });
    expect(validateGuessPhraseCandidate(day, source, envelope!)).toEqual({ ok: true });
  });

  it('rotates all three deterministic prompt families without changing the grammar matrix', () => {
    const families = new Set(Array.from({ length: 24 }, (_, dayIndex) => (
      buildGuessPhraseCandidates({ ...day, dayIndex }, { ...source, id: `modal-swim-${dayIndex}` })[0]
        ?.semanticCandidate.context.promptFamily
    )));

    expect(families).toEqual(new Set(['situation', 'intention', 'dialogue']));
  });

  it('does not use authored semantic alternatives as options', () => {
    const [envelope] = buildGuessPhraseCandidates(day, source);
    const options = envelope?.semanticCandidate.reviewSubjects.map((item) => item.text) ?? [];

    expect(options.some((item) => /dive|float|sink/u.test(item))).toBe(false);
  });

  it('fails closed when a grammatical lexical alternative replaces a proved error', () => {
    const [envelope] = buildGuessPhraseCandidates(day, source);
    expect(envelope).toBeDefined();
    const original = envelope!.semanticCandidate;
    const spoof = {
      ...envelope!,
      semanticCandidate: {
        ...original,
        reviewSubjects: original.reviewSubjects.map((subject, index) => index === 1
          ? { ...subject, text: 'You can dive.', completedText: 'You can dive.' }
          : subject),
      },
    };

    expect(validateGuessPhraseCandidate(day, source, spoof)).toEqual({
      ok: false,
      reason: 'semantic_candidate_invalid',
    });
  });

  it('rejects a candidateId mutation even though semantic hashes intentionally omit presentation identity', () => {
    const [envelope] = buildGuessPhraseCandidates(day, source);
    expect(envelope).toBeDefined();

    expect(validateGuessPhraseCandidate(day, source, {
      ...envelope!,
      semanticCandidate: {
        ...envelope!.semanticCandidate,
        candidateId: 'attacker-controlled-valid-id',
      },
    })).toEqual({ ok: false, reason: 'projection_mismatch' });
  });

  it('fails closed instead of throwing on malformed serialized envelopes', () => {
    expect(validateGuessPhraseCandidate(day, source, null)).toEqual({
      ok: false,
      reason: 'grammar_proof_invalid',
    });
  });
});
