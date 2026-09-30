import {
  ACHIEVEMENT_CATALOG_V2,
  ACTIVE_FOUNDATION_IDS,
  SECRET_FOUNDATION_IDS,
} from '../app/achievement_catalog_v2';

describe('achievement foundation catalog v2', () => {
  const active = ACHIEVEMENT_CATALOG_V2.filter((row) => !row.retired);
  const retired = ACHIEVEMENT_CATALOG_V2.filter((row) => row.retired);

  it('contains the retained 32 active and 9 historical definitions', () => {
    expect(active).toHaveLength(32);
    expect(retired).toHaveLength(9);
    expect(ACTIVE_FOUNDATION_IDS).toHaveLength(32);
    expect(SECRET_FOUNDATION_IDS).toHaveLength(3);
    expect(new Set(ACHIEVEMENT_CATALOG_V2.map((row) => row.id)).size)
      .toBe(ACHIEVEMENT_CATALOG_V2.length);
  });

  it('contains no active Learning V1 surfaces or pearl payouts', () => {
    for (const row of active) {
      expect(row.id).not.toMatch(/lesson|flashcard|mistake|dialog|max_|exam|daily_task/i);
      expect(row).not.toHaveProperty('shards');
      expect(row).not.toHaveProperty('pearls');
      expect(row).not.toHaveProperty('shardReward');
      expect(row).not.toHaveProperty('xp');
      expect(row.nameRu).not.toHaveLength(0);
      expect(row.conditionRu).not.toHaveLength(0);
      expect(row.descRu).not.toHaveLength(0);
    }
  });

  it('keeps only the three available composite legends secret', () => {
    expect(active.filter((row) => row.secret).map((row) => row.id))
      .toEqual(SECRET_FOUNDATION_IDS);
    expect(SECRET_FOUNDATION_IDS.every((id) => id.startsWith('legend_'))).toBe(true);
  });
});
