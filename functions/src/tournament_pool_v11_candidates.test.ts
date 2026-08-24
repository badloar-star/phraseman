import { validateTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  ALL_V11_MODES,
  buildTournamentV11Candidates,
  type V11CandidateSourceDay,
} from './tournament_pool_v11_candidates';

function sourceDay(dayIndex: number): V11CandidateSourceDay {
  return {
    planId: 'all-modes',
    dayIndex,
    level: dayIndex % 3 === 0 ? 'A1' : dayIndex % 3 === 1 ? 'A2' : 'B1',
    topic: { ru: 'Поездка и встреча' },
    phrases: [
      {
        id: `ready-${dayIndex}`,
        english: 'She is ready.',
        meaning: { ru: 'Она готова.' },
        words: [
          { text: 'is', partOfSpeech: 'to-be', distractors: ['looks', 'seems', 'stays'] },
          { text: 'ready', partOfSpeech: 'adjective', distractors: ['late', 'calm', 'busy'] },
        ],
      },
      {
        id: `calm-${dayIndex}`,
        english: 'He is calm.',
        meaning: { ru: 'Он спокоен.' },
        words: [
          { text: 'is', partOfSpeech: 'to-be', distractors: ['looks', 'seems', 'stays'] },
          { text: 'calm', partOfSpeech: 'adjective', distractors: ['ready', 'late', 'busy'] },
        ],
      },
      {
        id: `late-${dayIndex}`,
        english: 'It is late.',
        meaning: { ru: 'Уже поздно.' },
        words: [
          { text: 'is', partOfSpeech: 'to-be', distractors: ['looks', 'seems', 'stays'] },
          { text: 'late', partOfSpeech: 'adjective', distractors: ['ready', 'calm', 'busy'] },
        ],
      },
    ],
    vocabulary: [
      { word: 'ticket', partOfSpeech: 'noun', translation: { ru: 'билет' } },
      { word: 'station', partOfSpeech: 'noun', translation: { ru: 'станция' } },
      { word: 'platform', partOfSpeech: 'noun', translation: { ru: 'платформа' } },
      { word: 'luggage', partOfSpeech: 'noun', translation: { ru: 'багаж' } },
      { word: 'arrival', partOfSpeech: 'noun', translation: { ru: 'прибытие' } },
      { word: 'departure', partOfSpeech: 'noun', translation: { ru: 'отправление' } },
    ],
  };
}

describe('buildTournamentV11Candidates', () => {
  it('assembles deterministic typed candidates for all five Arena modes', () => {
    const result = buildTournamentV11Candidates({
      sourceDays: [sourceDay(0), sourceDay(1), sourceDay(2)],
    });

    expect(new Set(result.candidates.map((candidate) => candidate.mode)))
      .toEqual(new Set(ALL_V11_MODES));
    expect(result.candidates.every((candidate) => validateTournamentSemanticCandidate(candidate).ok))
      .toBe(true);
    expect(new Set(result.candidates.map((candidate) => candidate.candidateId)).size)
      .toBe(result.candidates.length);
    expect(new Set(result.candidates.map((candidate) => candidate.semanticSignature)).size)
      .toBe(result.candidates.length);
    expect(result.candidates.every((candidate) => candidate.context.topic === 'Поездка и встреча'))
      .toBe(true);
    expect(result.candidates
      .filter((candidate) => ['guess_phrase', 'fill_gap', 'find_oddity'].includes(candidate.mode))
      .every((candidate) => candidate.context.deterministicGrammarEvidence !== undefined))
      .toBe(true);
    expect(JSON.stringify(result.candidates)).not.toMatch(
      /It is moment to sleep\.|It is night to sleep\.|I am looking for a blue shoes\.|до полудня \(утро"/u,
    );
  });

  it('creates one exact build decoy and a reconstructible authored token sequence', () => {
    const result = buildTournamentV11Candidates({ sourceDays: [sourceDay(0)] });
    const builds = result.candidates.filter((candidate) => candidate.mode === 'translate_build');

    expect(builds.length).toBeGreaterThan(0);
    expect(builds.length).toBeLessThanOrEqual(sourceDay(0).phrases.length * 6);
    for (const candidate of builds) {
      expect(candidate.reviewSubjects.filter((subject) => subject.declaredRole === 'decoy')).toHaveLength(1);
      const required = candidate.reviewSubjects
        .filter((subject) => subject.declaredRole === 'required')
        .map((subject) => subject.text);
      expect(required).toEqual(candidate.context.requiredSequence);
      expect(required.join(' ')).toBe(candidate.context.authoredTokenText);
    }
  });

  it('creates six exact-distinct speed pairs with POS, sense context, and six provenance keys', () => {
    const result = buildTournamentV11Candidates({ sourceDays: [sourceDay(0)] });
    const speed = result.candidates.find((candidate) => candidate.mode === 'speed_match');

    expect(speed?.reviewSubjects).toHaveLength(6);
    expect(new Set(speed?.reviewSubjects.map((subject) => subject.text)).size).toBe(6);
    expect(new Set(speed?.reviewSubjects.map((subject) => subject.completedText)).size).toBe(6);
    expect(speed?.reviewSubjects.every((subject) => subject.metadata?.partOfSpeech === 'noun')).toBe(true);
    expect(speed?.reviewSubjects.every((subject) => subject.metadata?.senseHint !== undefined)).toBe(true);
    expect(speed?.provenanceKeys).toHaveLength(6);
  });

  it('excludes historical semantic signatures before returning the review queue', () => {
    const initial = buildTournamentV11Candidates({ sourceDays: [sourceDay(0)] });
    const excluded = initial.candidates[0];
    expect(excluded).toBeDefined();

    const next = buildTournamentV11Candidates({
      sourceDays: [sourceDay(0)],
      historicalSemanticSignatures: new Set([excluded.semanticSignature]),
    });

    expect(next.candidates.map((candidate) => candidate.semanticSignature))
      .not.toContain(excluded.semanticSignature);
    expect(next.rejections.byReason.historical_signature).toBe(1);
  });

  it('fails closed on malformed source days and reports the rejection', () => {
    const result = buildTournamentV11Candidates({
      sourceDays: [null as unknown as V11CandidateSourceDay],
    });

    expect(result.candidates).toEqual([]);
    expect(result.rejections.byReason.source_invalid).toBe(1);
  });
});
