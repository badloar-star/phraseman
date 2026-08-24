import {
  createEmptyFoundationProgress,
  mergeFoundationProgress,
  normalizeFoundationProgress,
  reduceFoundationLeagueResult,
  reduceFoundationShardBalance,
  type FoundationLeagueEvidence,
} from '../app/achievement_progress_v2';

const result = (patch: Partial<FoundationLeagueEvidence> = {}): FoundationLeagueEvidence => ({
  weekId: '2026-W01',
  points: 10,
  prevLeagueId: 0,
  newLeagueId: 1,
  myRank: 2,
  totalInGroup: 20,
  confirmed: true,
  ...patch,
});

describe('achievement foundation progress v2', () => {
  it('repairs malformed input and keeps shard maximum monotonic', () => {
    expect(normalizeFoundationProgress('broken')).toEqual(createEmptyFoundationProgress());
    const first = reduceFoundationShardBalance(createEmptyFoundationProgress(), 500);
    expect(reduceFoundationShardBalance(first, 20).maxEligibleShardBalance).toBe(500);
  });

  it('deduplicates league results by confirmed week', () => {
    const once = reduceFoundationLeagueResult(createEmptyFoundationProgress(), result({ myRank: 1 }));
    const twice = reduceFoundationLeagueResult(once, result({ myRank: 1 }));
    expect(twice.championWeeks).toEqual(['2026-W01']);
    expect(twice.processedLeagueWeeks).toEqual(['2026-W01']);
  });

  it('requires points for Copper and ignores unconfirmed UI results', () => {
    const empty = createEmptyFoundationProgress();
    expect(reduceFoundationLeagueResult(empty, result({ points: 0, newLeagueId: 0 })).reachedLeagueIds)
      .toEqual([]);
    expect(reduceFoundationLeagueResult(empty, result({ confirmed: false })).processedLeagueWeeks)
      .toEqual([]);
  });

  it('reconstructs Diamond+ continuity across device merges', () => {
    const left = ['2026-W01', '2026-W02'].reduce(
      (state, weekId) => reduceFoundationLeagueResult(state, result({ weekId, prevLeagueId: 8, newLeagueId: 8 })),
      createEmptyFoundationProgress(),
    );
    const right = ['2026-W03', '2026-W04'].reduce(
      (state, weekId) => reduceFoundationLeagueResult(state, result({ weekId, prevLeagueId: 8, newLeagueId: 8 })),
      createEmptyFoundationProgress(),
    );
    expect(mergeFoundationProgress(left, right).diamondPlusConsecutiveWeeks).toBe(4);
  });
});
