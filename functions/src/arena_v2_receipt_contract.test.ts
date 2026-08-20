import { arenaV2ReceiptReward } from './arena_v2_receipt_contract';

const validReward = () => ({
  starsEarned: 0,
  xpEarned: 22,
  xpBreakdown: {
    schemaVersion: 'arena-xp-breakdown.v1' as const,
    baseXp: 10,
    correctBonusXp: 12,
    outcomeBonusXp: 0,
    totalXp: 22,
  },
  totalXpAfter: 322,
  seasonStarsAfter: 18,
  ratingDelta: 0,
  ratingAfter: 1000,
  rankAfter: 3,
  spinAwarded: false,
  walletBalanceAfter: 7,
  masteryStarsEarned: 0,
});

describe('Arena V2 persisted private receipt reward contract', () => {
  it('persists the authoritative XP breakdown only when it exactly sums to xpEarned', () => {
    const reward = arenaV2ReceiptReward(validReward());

    expect(reward).toEqual(validReward());
    expect(Object.keys(reward).sort()).toEqual([
      'masteryStarsEarned',
      'ratingAfter',
      'ratingDelta',
      'rankAfter',
      'seasonStarsAfter',
      'spinAwarded',
      'starsEarned',
      'totalXpAfter',
      'walletBalanceAfter',
      'xpBreakdown',
      'xpEarned',
    ].sort());
  });

  it.each([
    { ...validReward(), xpBreakdown: { ...validReward().xpBreakdown, schemaVersion: 'wrong' } },
    { ...validReward(), xpBreakdown: { ...validReward().xpBreakdown, baseXp: -1 } },
    { ...validReward(), xpBreakdown: { ...validReward().xpBreakdown, correctBonusXp: 1.5 } },
    { ...validReward(), xpBreakdown: { ...validReward().xpBreakdown, totalXp: 21 } },
    { ...validReward(), xpBreakdown: { ...validReward().xpBreakdown, totalXp: 22, extra: true } },
    { ...validReward(), extra: 'must-not-persist' },
  ])('rejects malformed or expanded persisted reward input %#', (input) => {
    expect(() => arenaV2ReceiptReward(input as never)).toThrow('arena_v2_receipt_reward_invalid');
  });

  it('allows an authoritative capped reward to omit the breakdown honestly', () => {
    const { xpBreakdown: _omitted, ...capped } = validReward();
    expect(arenaV2ReceiptReward({ ...capped, xpEarned: 0 })).toEqual({ ...capped, xpEarned: 0 });
  });
});
