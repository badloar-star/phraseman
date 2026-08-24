import {
  buildOddityCandidates,
  isEligibleSafeSentence,
  validateOddityCandidate,
  type V11OdditySourceDay,
} from './tournament_pool_v11_oddity';

const day: V11OdditySourceDay = {
  planId: 'oddity-fixture',
  dayIndex: 12,
  level: 'B1',
  topic: { ru: 'Состояния людей' },
  phrases: [
    {
      id: 'she-ready',
      english: 'She is ready.',
      meaning: { ru: 'Она готова.' },
      words: [{ text: 'is', partOfSpeech: 'to-be' }],
    },
    {
      id: 'he-calm',
      english: 'He is calm.',
      meaning: { ru: 'Он спокоен.' },
      words: [{ text: 'is', partOfSpeech: 'to-be' }],
    },
    {
      id: 'it-late',
      english: 'It is late.',
      meaning: { ru: 'Уже поздно.' },
      words: [{ text: 'is', partOfSpeech: 'to-be' }],
    },
  ],
};

describe('buildOddityCandidates', () => {
  it('builds three grammatical minimal twins and exactly one mechanically broken twin', () => {
    const candidates = buildOddityCandidates(day, 'she-ready');
    const candidate = candidates.find((item) => (
      item.semanticCandidate.reviewSubjects.some((subject) => subject.text === 'He are ready.')
    ));

    expect(candidate).toBeDefined();
    expect(candidate?.semanticCandidate.mode).toBe('find_oddity');
    expect(candidate?.semanticCandidate.reviewSubjects.filter((subject) => subject.declaredRole === 'safe'))
      .toHaveLength(3);
    expect(candidate?.semanticCandidate.reviewSubjects.filter((subject) => subject.declaredRole === 'odd'))
      .toHaveLength(1);
    expect(candidate?.semanticCandidate.reviewSubjects
      .filter((subject) => subject.declaredRole === 'safe')
      .map((subject) => subject.text))
      .toEqual(['He is ready.', 'She is ready.', 'You are ready.']);
    expect(candidate?.semanticCandidate.reviewSubjects.find((subject) => subject.declaredRole === 'odd'))
      .toEqual(expect.objectContaining({
        text: 'He are ready.',
        completedText: 'He are ready.',
        trapType: 'single_oddity_error',
        metadata: expect.objectContaining({
          partOfSpeech: 'verb',
          grammaticality: 'invalid',
          minimalTwin: 'true',
          correctedText: 'He is ready.',
        }),
      }));
    expect(candidate?.semanticCandidate.provenanceKeys).toEqual(['oddity-fixture:12:she-ready']);
    expect(candidate && validateOddityCandidate(day, candidate)).toEqual({ ok: true });
  });

  it('deduplicates the same odd surface produced by overlapping proof triples', () => {
    const candidates = buildOddityCandidates(day, 'she-ready');
    const oddTexts = candidates.map((candidate) => candidate.semanticCandidate.reviewSubjects
      .find((subject) => subject.declaredRole === 'odd')?.text);

    expect(new Set(oddTexts).size).toBe(oddTexts.length);
    expect(new Set(candidates.map((candidate) => candidate.semanticCandidate.candidateId)).size)
      .toBe(candidates.length);
  });

  it('does not borrow unrelated authored sentences as fake twins', () => {
    const [candidate] = buildOddityCandidates({ ...day, phrases: day.phrases.slice(0, 1) });
    expect(candidate).toBeDefined();
    expect(candidate.semanticCandidate.reviewSubjects.map((subject) => subject.text))
      .not.toEqual(expect.arrayContaining(['He is calm.', 'It is late.']));
  });

  it.each([
    'I am looking for a blue shoes.',
    'It is moment to sleep.',
    'It is night to sleep.',
    'Safe sentence.\u202E',
  ])('rejects a known unsafe authored safe sentence: %s', (sentence) => {
    expect(isEligibleSafeSentence(sentence)).toBe(false);
  });

  it('rejects any mutation of semantic content or inverse grammar evidence', () => {
    const [candidate] = buildOddityCandidates(day, 'she-ready');
    expect(candidate).toBeDefined();

    expect(validateOddityCandidate(day, {
      ...candidate,
      semanticCandidate: {
        ...candidate.semanticCandidate,
        candidateId: `${candidate.semanticCandidate.candidateId}_spoof`,
      },
    })).toEqual({ ok: false, reason: 'projection_mismatch' });
    expect(validateOddityCandidate(day, {
      ...candidate,
      oddVariantIndex: 99,
    })).toEqual({ ok: false, reason: 'projection_mismatch' });
  });

  it('fails closed instead of throwing on malformed input', () => {
    expect(validateOddityCandidate(day, null)).toEqual({
      ok: false,
      reason: 'grammar_proof_invalid',
    });
  });
});
