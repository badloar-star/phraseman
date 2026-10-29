import { spireRankArtName } from '../modules/spire/tier_badge';

describe('spire tier badge mapping', () => {
  it('maps every pair of the twelve named tiers to one of six approved badges', () => {
    expect(Array.from({ length: 12 }, (_, tier) => spireRankArtName(tier))).toEqual([
      'spire_rank_1', 'spire_rank_1',
      'spire_rank_2', 'spire_rank_2',
      'spire_rank_3', 'spire_rank_3',
      'spire_rank_4', 'spire_rank_4',
      'spire_rank_5', 'spire_rank_5',
      'spire_rank_6', 'spire_rank_6',
    ]);
  });

  it('clamps invalid tiers to the first or last badge', () => {
    expect(spireRankArtName(-1)).toBe('spire_rank_1');
    expect(spireRankArtName(99)).toBe('spire_rank_6');
    expect(spireRankArtName(Number.NaN)).toBe('spire_rank_1');
  });
});
