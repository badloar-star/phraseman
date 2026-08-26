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
  'energy_full', 'energy_plus2', 'hint_1', 'hint_3', 'chain_shield_1',
  'xp_bank_150', 'xp_bank_300', 'xp_2x_24h',
] as const;

const RARE = [
  'xp_10000', 'xp_25000', 'pearls_50', 'pearls_100', 'stars_100', 'stars_250',
  'energy_plus3', 'xp_bank_600', 'xp_2x_48h',
] as const;

const ULTRA = ['xp_50000', 'pearls_250', 'pearls_500', 'stars_500', 'stars_1000'] as const;

describe('level Spin reward catalog v4', () => {
  // зачем (владелец 2026-08-26): у энергии персональный вес — она самая нужная
  // награда, её шанс поднят с ~10.2% до ~15%. Полка при этом прежняя.
  const ENERGY_WEIGHTS: Readonly<Record<string, number>> = {
    energy_full: 15_000, energy_plus2: 15_000, energy_plus3: 3_000,
  };
  const weightFor = (id: string, shelf: number): number => ENERGY_WEIGHTS[id] ?? shelf;

  test('contains exactly the owner-approved rewards and relative weights', () => {
    const typedCatalogIds: readonly LevelSpinRewardId[] = LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id);
    expect(LEVEL_SPIN_REWARD_CATALOG_VERSION).toBe(4);
    expect(LEVEL_SPIN_REWARD_CATALOG).toHaveLength(37);
    expect(LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id)).toEqual([
      ...ORDINARY, ...RARE, ...ULTRA,
      'plus_days_3', 'plus_days_7', 'cosmetic_avatar_aura', 'cosmetic_theme',
    ]);
    expect(typedCatalogIds).toEqual(LEVEL_SPIN_REWARD_IDS);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ordinary'))
      .toEqual(ORDINARY.map((id) => ({ id, tier: 'ordinary', weight: weightFor(id, 10_000) })));
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'rare'))
      .toEqual([
        ...RARE.map((id) => ({ id, tier: 'rare', weight: weightFor(id, 1_000) })),
        { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 6_170 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ultra'))
      .toEqual([
        ...ULTRA.map((id) => ({ id, tier: 'ultra', weight: 100 })),
        { id: 'cosmetic_theme', tier: 'ultra', weight: 2_200 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.slice(-4)).toEqual([
      { id: 'plus_days_3', tier: 'exceptional', weight: 10 },
      { id: 'plus_days_7', tier: 'exceptional', weight: 1 },
      { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 6_170 },
      { id: 'cosmetic_theme', tier: 'ultra', weight: 2_200 },
    ]);
  });

  test('energy is a common prize and the interface theme stays about one percent', () => {
    const byId = new Map(LEVEL_SPIN_REWARD_CATALOG.map((entry) => [entry.id, entry.weight]));
    const energy = byId.get('energy_full')! + byId.get('energy_plus2')! + byId.get('energy_plus3')!;
    // Энергия ~15%: заметно чаще прежних ~10.2%, но не вытесняет остальное.
    expect(energy / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 3);
    // Тема ~1%: редкий приз. Выше нельзя — иначе продажа тем за 200 жемчужин
    // обесценится, ниже смысла нет — приз перестанет существовать на практике.
    expect(byId.get('cosmetic_theme')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.01, 4);
  });

  test('does not contain the removed low-value or cosmetic rewards', () => {
    const ids = new Set<string>(LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id));
    for (const removed of [
      'xp_1', 'xp_10', 'xp_25', 'xp_50', 'xp_100',
      'pearls_1', 'pearls_3', 'stars_1', 'stars_3', 'stars_5',
      'cosmetic_avatar_common',
      'premium_cosmetic_avatar', 'premium_cosmetic_aura',
      // Темы никогда не выдаются поимённо: приз всегда `cosmetic_theme`,
      // а конкретная тема выбирается из НЕОТКРЫТЫХ в момент выдачи.
      'theme_midnight', 'theme_ember', 'theme_aurora', 'theme_volt', 'theme_dark',
    ]) expect(ids.has(removed)).toBe(false);
  });

  test('uses integer intervals rather than percentages or a sum of 100', () => {
    expect(LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBe(219_881);
    expect(LEVEL_SPIN_REWARD_TOTAL_WEIGHT).not.toBe(100);
    expect(pickLevelSpinRewardByTicket(0).id).toBe('xp_250');
    expect(pickLevelSpinRewardByTicket(9_999).id).toBe('xp_250');
    expect(pickLevelSpinRewardByTicket(10_000).id).toBe('xp_500');
    expect(pickLevelSpinRewardByTicket(199_999).id).toBe('xp_2x_24h');
    expect(pickLevelSpinRewardByTicket(200_000).id).toBe('xp_10000');
    expect(pickLevelSpinRewardByTicket(210_999).id).toBe('xp_2x_48h');
    expect(pickLevelSpinRewardByTicket(211_000).id).toBe('xp_50000');
    expect(pickLevelSpinRewardByTicket(211_499).id).toBe('stars_1000');
    expect(pickLevelSpinRewardByTicket(211_500).id).toBe('plus_days_3');
    expect(pickLevelSpinRewardByTicket(211_509).id).toBe('plus_days_3');
    expect(pickLevelSpinRewardByTicket(211_510).id).toBe('plus_days_7');
    expect(pickLevelSpinRewardByTicket(211_511).id).toBe('cosmetic_avatar_aura');
    expect(pickLevelSpinRewardByTicket(217_680).id).toBe('cosmetic_avatar_aura');
    expect(pickLevelSpinRewardByTicket(217_681).id).toBe('cosmetic_theme');
    expect(pickLevelSpinRewardByTicket(219_880).id).toBe('cosmetic_theme');
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
