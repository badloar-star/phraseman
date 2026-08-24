import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildTournamentV11Candidates, type V11CandidateSourceDay } from './tournament_pool_v11_candidates';
import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  selectTournamentV11Candidates,
  TOURNAMENT_V11_CELL_QUOTAS,
} from './tournament_pool_v11_selector';

jest.setTimeout(240_000);

function loadCorpus(): readonly V11CandidateSourceDay[] {
  return JSON.parse(readFileSync(
    join(__dirname, 'generated', 'tournament_content.json'),
    'utf8',
  )) as readonly V11CandidateSourceDay[];
}

describe('selectTournamentV11Candidates', () => {
  const build = buildTournamentV11Candidates({ sourceDays: loadCorpus() });

  it('locks the exact live-compatible 4,000-task mode/difficulty matrix', () => {
    expect(TOURNAMENT_V11_CELL_QUOTAS).toEqual({
      'fill_gap:1': 160,
      'fill_gap:2': 180,
      'fill_gap:3': 160,
      'find_oddity:1': 110,
      'find_oddity:2': 205,
      'find_oddity:3': 0,
      'guess_phrase:1': 470,
      'guess_phrase:2': 554,
      'guess_phrase:3': 469,
      'speed_match:1': 60,
      'speed_match:2': 70,
      'speed_match:3': 62,
      'translate_build:1': 400,
      'translate_build:2': 700,
      'translate_build:3': 400,
    });
    expect(Object.values(TOURNAMENT_V11_CELL_QUOTAS).reduce((sum, count) => sum + count, 0))
      .toBe(4_000);
  });

  it('selects deterministic distinct content and enforces every fill diversity gate', () => {
    const first = selectTournamentV11Candidates({ candidates: build.candidates });

    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.selected).toHaveLength(4_000);
    expect(new Set(first.selected.map((candidate) => candidate.semanticSignature)).size).toBe(4_000);
    expect(first.manifest.modeDifficultyCounts).toEqual(TOURNAMENT_V11_CELL_QUOTAS);
    expect(first.manifest.fill.total).toBe(500);
    expect(first.manifest.fill.contentWordCount).toBeGreaterThanOrEqual(300);
    expect(first.manifest.fill.articleAndToBeCount).toBeLessThanOrEqual(75);
    expect(Math.max(...Object.values(first.manifest.fill.optionSetCounts))).toBeLessThanOrEqual(10);
    expect(Math.max(...Object.values(first.manifest.fill.correctTokenCounts))).toBeLessThanOrEqual(40);
    expect(first.manifest.fill.positionCounts.first).toBeGreaterThanOrEqual(75);
    expect(first.manifest.fill.positionCounts.middle).toBeGreaterThanOrEqual(75);
    expect(first.manifest.fill.positionCounts.middle).toBeLessThanOrEqual(325);
    expect(first.manifest.fill.positionCounts.last).toBeGreaterThanOrEqual(75);
    expect(Object.keys(first.manifest.fill.trapTypeCounts).sort())
      .toEqual(['agreement', 'government', 'morphology']);
    expect(Math.max(...Object.values(first.manifest.primaryProvenanceCounts))).toBeLessThanOrEqual(4);
  });

  it('is independent of input order', () => {
    const quotas = Object.freeze(Object.fromEntries(
      Object.keys(TOURNAMENT_V11_CELL_QUOTAS).map((key) => [key, key === 'speed_match:1' ? 3 : 0]),
    )) as typeof TOURNAMENT_V11_CELL_QUOTAS;
    const pool = build.candidates.filter((candidate) => (
      candidate.mode === 'speed_match' && candidate.difficulty === 1
    ));
    const forward = selectTournamentV11Candidates({ candidates: pool, quotas });
    const reverse = selectTournamentV11Candidates({ candidates: [...pool].reverse(), quotas });

    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    if (!forward.ok || !reverse.ok) return;
    expect(forward.selected.map((candidate) => candidate.candidateId))
      .toEqual(reverse.selected.map((candidate) => candidate.candidateId));
  });

  it('fails closed with an exact typed cell shortage', () => {
    const withoutHardSpeed = build.candidates.filter((candidate) => (
      candidate.mode !== 'speed_match' || candidate.difficulty !== 3
    ));
    const result = selectTournamentV11Candidates({ candidates: withoutHardSpeed });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      shortages: expect.arrayContaining([
        { axis: 'cell', key: 'speed_match:3', required: 62, available: 0 },
      ]),
    }));
  });

  it('requires the canonical fill trap matrix even when a source pool omits one type', () => {
    const withoutMorphology = build.candidates.filter((candidate) => (
      candidate.mode !== 'fill_gap'
      || !candidate.reviewSubjects.some((subject) => subject.trapType === 'morphology')
    ));
    const result = selectTournamentV11Candidates({ candidates: withoutMorphology });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      shortages: expect.arrayContaining([
        { axis: 'fill_trap_type', key: 'morphology', required: 1, available: 0 },
      ]),
    }));
  });

  it('rejects metadata-spoofed grammatical distractors when canonical proof does not match', () => {
    const original = build.candidates.find((candidate) => candidate.mode === 'guess_phrase' && candidate.difficulty === 1);
    expect(original).toBeDefined();
    if (!original) return;
    const spoofed = createTournamentSemanticCandidate({
      candidateId: `${original.candidateId}_spoof`,
      mode: original.mode,
      difficulty: original.difficulty,
      prompt: original.prompt,
      context: original.context,
      reviewSubjects: original.reviewSubjects.map((subject, index) => index === 0 ? subject : ({
        ...subject,
        text: ['She locks the door.', 'She opens the door.', 'She shuts the door.'][index - 1],
        completedText: ['She locks the door.', 'She opens the door.', 'She shuts the door.'][index - 1],
      })),
      provenanceKeys: original.provenanceKeys,
    });
    const quotas = Object.freeze(Object.fromEntries(
      Object.keys(TOURNAMENT_V11_CELL_QUOTAS).map((key) => [key, key === 'guess_phrase:1' ? 1 : 0]),
    )) as typeof TOURNAMENT_V11_CELL_QUOTAS;

    expect(selectTournamentV11Candidates({ candidates: [spoofed], quotas })).toEqual({
      ok: false,
      shortages: [{ axis: 'cell', key: 'guess_phrase:1', required: 1, available: 0 }],
    });
  });
});
