import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGuessPhraseCandidates } from './tournament_pool_v11_guess_phrase';
import type { V11SourceDay, V11SourcePhrase } from './tournament_pool_v11_grammar_twins';

type CorpusDay = V11SourceDay & Readonly<{ phrases: readonly V11SourcePhrase[] }>;

function loadCorpus(): readonly CorpusDay[] {
  return JSON.parse(readFileSync(
    join(__dirname, 'generated', 'tournament_content.json'),
    'utf8',
  )) as readonly CorpusDay[];
}

describe('strict V11 grammar candidate capacity', () => {
  it('provides raw headroom in every difficulty without mistaking option triples for source diversity', () => {
    const counts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    const sourcePhrases: Record<1 | 2 | 3, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set() };
    const grammarSlots: Record<1 | 2 | 3, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set() };
    const ids = new Set<string>();
    for (const day of loadCorpus()) {
      for (const phrase of day.phrases ?? []) {
        for (const envelope of buildGuessPhraseCandidates(day, phrase)) {
          counts[envelope.semanticCandidate.difficulty] += 1;
          ids.add(envelope.semanticCandidate.candidateId);
          sourcePhrases[envelope.semanticCandidate.difficulty].add(envelope.grammarProof.provenanceKey);
          grammarSlots[envelope.semanticCandidate.difficulty].add([
            envelope.grammarProof.provenanceKey,
            envelope.grammarProof.slotIndex,
            envelope.grammarProof.ruleId,
          ].join(':'));
        }
      }
    }

    expect(ids.size).toBe(counts[1] + counts[2] + counts[3]);
    const required: Record<1 | 2 | 3, number> = { 1: 471, 2: 555, 3: 470 };
    const shortages = ([1, 2, 3] as const)
      .filter((difficulty) => counts[difficulty] < required[difficulty])
      .map((difficulty) => ({ difficulty, missing: required[difficulty] - counts[difficulty] }));
    expect(shortages).toEqual([]);

    // Raw option triples are not independent content. The selector still has to
    // enforce per-source and per-slot caps instead of consuming every combination.
    for (const difficulty of [1, 2, 3] as const) {
      expect(grammarSlots[difficulty].size).toBeLessThan(counts[difficulty]);
      expect(sourcePhrases[difficulty].size * 4).toBeGreaterThanOrEqual(required[difficulty]);
      expect(grammarSlots[difficulty].size).toBeGreaterThan(0);
    }
  });
});
