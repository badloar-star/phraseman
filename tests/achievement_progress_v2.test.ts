import {
  createEmptyFoundationProgress,
  mergeFoundationProgress,
  normalizeFoundationProgress,
  reduceFoundationShardBalance,
} from '../app/achievement_progress_v2';

describe('achievement foundation progress v2', () => {
  it('repairs malformed input and keeps shard maximum monotonic', () => {
    expect(normalizeFoundationProgress('broken')).toEqual(createEmptyFoundationProgress());
    const first = reduceFoundationShardBalance(createEmptyFoundationProgress(), 500);
    expect(reduceFoundationShardBalance(first, 20).maxEligibleShardBalance).toBe(500);
  });

  it('drops obsolete league history while merging retained progress', () => {
    const legacy = {
      ...createEmptyFoundationProgress(),
      reachedLeagueIds: [0, 11],
      championWeeks: ['2026-W01'],
      maxEligibleShardBalance: 500,
    };
    const merged = mergeFoundationProgress(legacy, createEmptyFoundationProgress());
    expect(merged).not.toHaveProperty('reachedLeagueIds');
    expect(merged).not.toHaveProperty('championWeeks');
    expect(merged.maxEligibleShardBalance).toBe(500);
  });
});
