import {
  LEVEL_SPIN_REWARD_CATALOG,
  LEVEL_SPIN_REWARD_CATALOG_VERSION,
  LEVEL_SPIN_REWARD_IDS,
  LEVEL_SPIN_REWARD_TOTAL_WEIGHT,
  pickLevelSpinReward,
  pickLevelSpinRewardByTicket,
  type LevelSpinRewardId,
} from '../app/level_spin_reward_catalog';

const ORDINARY = [
  'xp_250', 'xp_500', 'xp_1000', 'xp_3000', 'xp_5000',
  'pearls_5', 'pearls_10', 'pearls_20',
  'stars_10', 'stars_20', 'stars_50',
  'energy_full', 'energy_plus2', 'hint_1', 'hint_3', 'chain_shield_1', 'attempt_restore_all',
  'xp_bank_150', 'xp_bank_300', 'xp_2x_24h',
] as const;

const RARE = [
  'xp_10000', 'xp_25000', 'pearls_50', 'pearls_100', 'stars_100', 'stars_250',
  'energy_plus3', 'xp_bank_600', 'xp_2x_48h',
] as const;

const ULTRA = ['xp_50000', 'pearls_250', 'pearls_500', 'stars_500', 'stars_1000'] as const;

describe('level Spin reward catalog v6', () => {
  // зачем (владелец 2026-08-26): у энергии персональный вес — она самая нужная
  // награда, её шанс поднят с ~10.2% до ~15%. Полка при этом прежняя.
  const ENERGY_WEIGHTS: Readonly<Record<string, number>> = {
    energy_full: 18_812, energy_plus2: 18_812, energy_plus3: 3_762,
    attempt_restore_all: 41_386,
  };
  const weightFor = (id: string, shelf: number): number => ENERGY_WEIGHTS[id] ?? shelf;

  test('contains exactly the owner-approved rewards and relative weights', () => {
    const typedCatalogIds: readonly LevelSpinRewardId[] = LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id);
    expect(LEVEL_SPIN_REWARD_CATALOG_VERSION).toBe(6);
    expect(LEVEL_SPIN_REWARD_CATALOG).toHaveLength(39);
    expect(LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id)).toEqual([
      ...ORDINARY, ...RARE, ...ULTRA,
      'plus_days_3', 'plus_days_7', 'cosmetic_avatar_aura', 'cosmetic_theme',
      'cosmetic_avatar_common',
    ]);
    expect(typedCatalogIds).toEqual(LEVEL_SPIN_REWARD_IDS);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ordinary'))
      .toEqual(ORDINARY.map((id) => ({ id, tier: 'ordinary', weight: weightFor(id, 10_000) })));
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'rare'))
      .toEqual([
        ...RARE.map((id) => ({ id, tier: 'rare', weight: weightFor(id, 1_000) })),
        { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 7_725 },
        { id: 'cosmetic_avatar_common', tier: 'rare', weight: 4_139 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ultra'))
      .toEqual([
        ...ULTRA.map((id) => ({ id, tier: 'ultra', weight: 100 })),
        { id: 'cosmetic_theme', tier: 'ultra', weight: 2_759 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.slice(-5)).toEqual([
      { id: 'plus_days_3', tier: 'exceptional', weight: 10 },
      { id: 'plus_days_7', tier: 'exceptional', weight: 1 },
      { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 7_725 },
      { id: 'cosmetic_theme', tier: 'ultra', weight: 2_759 },
      { id: 'cosmetic_avatar_common', tier: 'rare', weight: 4_139 },
    ]);
  });

  test('preserves all five owner-approved percentage targets jointly', () => {
    const byId = new Map(LEVEL_SPIN_REWARD_CATALOG.map((entry) => [entry.id, entry.weight]));
    const energy = byId.get('energy_full')! + byId.get('energy_plus2')! + byId.get('energy_plus3')!;
    expect(energy).toBe(41_386);
    expect(byId.get('attempt_restore_all')).toBe(41_386);
    expect(energy / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 5);
    expect(byId.get('attempt_restore_all')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 5);
    expect(byId.get('cosmetic_avatar_aura')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.028, 5);
    expect(byId.get('cosmetic_theme')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.01, 5);
    expect(byId.get('cosmetic_avatar_common')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.015, 5);
  });

  test('does not contain the removed low-value or cosmetic rewards', () => {
    const ids = new Set<string>(LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id));
    for (const removed of [
      'xp_1', 'xp_10', 'xp_25', 'xp_50', 'xp_100',
      'pearls_1', 'pearls_3', 'stars_1', 'stars_3', 'stars_5',
      'premium_cosmetic_avatar', 'premium_cosmetic_aura',
      // Темы никогда не выдаются поимённо: приз всегда `cosmetic_theme`,
      // а конкретная тема выбирается из НЕОТКРЫТЫХ в момент выдачи.
      'theme_midnight', 'theme_ember', 'theme_aurora', 'theme_volt', 'theme_dark',
    ]) expect(ids.has(removed)).toBe(false);
  });

  test('uses integer intervals rather than percentages or a sum of 100', () => {
    expect(LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBe(275_906);
    expect(LEVEL_SPIN_REWARD_TOTAL_WEIGHT).not.toBe(100);
    expect(pickLevelSpinRewardByTicket(0).id).toBe('xp_250');
    expect(pickLevelSpinRewardByTicket(9_999).id).toBe('xp_250');
    expect(pickLevelSpinRewardByTicket(10_000).id).toBe('xp_500');
    let start = 0;
    for (const entry of LEVEL_SPIN_REWARD_CATALOG) {
      expect(pickLevelSpinRewardByTicket(start).id).toBe(entry.id);
      expect(pickLevelSpinRewardByTicket(start + entry.weight - 1).id).toBe(entry.id);
      start += entry.weight;
    }
    expect(start).toBe(LEVEL_SPIN_REWARD_TOTAL_WEIGHT);
  });

  test('maps the same immutable request id to the same reward', () => {
    const first = pickLevelSpinReward('request00000000000000000001');
    expect(pickLevelSpinReward('request00000000000000000001')).toEqual(first);
    expect(LEVEL_SPIN_REWARD_CATALOG).toContainEqual(first);
  });

  test('rejects tickets outside the catalog interval', () => {
    expect(() => pickLevelSpinRewardByTicket(-1)).toThrow('level_spin_reward_ticket_invalid');
    expect(() => pickLevelSpinRewardByTicket(LEVEL_SPIN_REWARD_TOTAL_WEIGHT)).toThrow('level_spin_reward_ticket_invalid');
    expect(() => pickLevelSpinReward('')).toThrow('level_spin_reward_seed_invalid');
  });
});
