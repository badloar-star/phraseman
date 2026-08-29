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

// v7 (владелец 2026-08-29): редкая полка выросла на два локально применимых
// ценных расходника — щит серии на 3 дня и банк ×2 на 1500 XP.
const RARE = [
  'xp_10000', 'xp_25000', 'pearls_50', 'pearls_100', 'stars_100', 'stars_250',
  'energy_plus3', 'xp_bank_600', 'xp_2x_48h',
  'chain_shield_3', 'xp_bank_1500',
] as const;

// v7: джекпоты валют — вдвое реже прежней ultra-полки (вес 50 против 100).
const ULTRA = [
  'xp_50000', 'pearls_250', 'pearls_500', 'stars_500', 'stars_1000',
  'pearls_1000', 'stars_2000',
] as const;

describe('level Spin reward catalog v7', () => {
  // зачем: у энергии и «второго шанса» персональные веса (цели владельца
  // 2026-08-26 — по ~15%), у джекпотов валют — своя редкость. При добавлении
  // ценных призов v7 все цели перенормированы совместно на сумму 279 814.
  const WEIGHT_OVERRIDES: Readonly<Record<string, number>> = {
    energy_full: 19_078, energy_plus2: 19_078, energy_plus3: 3_816,
    attempt_restore_all: 41_972,
    pearls_1000: 50, stars_2000: 50,
  };
  const weightFor = (id: string, shelf: number): number => WEIGHT_OVERRIDES[id] ?? shelf;

  test('contains exactly the owner-approved rewards and relative weights', () => {
    const typedCatalogIds: readonly LevelSpinRewardId[] = LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id);
    expect(LEVEL_SPIN_REWARD_CATALOG_VERSION).toBe(7);
    expect(LEVEL_SPIN_REWARD_CATALOG).toHaveLength(45);
    expect(LEVEL_SPIN_REWARD_CATALOG.map((entry) => entry.id)).toEqual([
      ...ORDINARY, ...RARE, ...ULTRA,
      'plus_days_3', 'plus_days_7', 'plus_days_14', 'plus_days_30',
      'cosmetic_avatar_aura', 'cosmetic_theme', 'cosmetic_avatar_common',
    ]);
    expect(typedCatalogIds).toEqual(LEVEL_SPIN_REWARD_IDS);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ordinary'))
      .toEqual(ORDINARY.map((id) => ({ id, tier: 'ordinary', weight: weightFor(id, 10_000) })));
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'rare'))
      .toEqual([
        ...RARE.map((id) => ({ id, tier: 'rare', weight: weightFor(id, 1_000) })),
        { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 7_835 },
        { id: 'cosmetic_avatar_common', tier: 'rare', weight: 4_197 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.filter((entry) => entry.tier === 'ultra'))
      .toEqual([
        ...ULTRA.map((id) => ({ id, tier: 'ultra', weight: weightFor(id, 100) })),
        { id: 'cosmetic_theme', tier: 'ultra', weight: 2_798 },
      ]);
    expect(LEVEL_SPIN_REWARD_CATALOG.slice(-7)).toEqual([
      // зачем (владелец 2026-08-29): лестница Plus стала реальной, а не
      // витринной — прежние веса 10 и 1 из 275 906 никто не выигрывал.
      { id: 'plus_days_3', tier: 'exceptional', weight: 300 },
      { id: 'plus_days_7', tier: 'exceptional', weight: 100 },
      { id: 'plus_days_14', tier: 'exceptional', weight: 30 },
      { id: 'plus_days_30', tier: 'exceptional', weight: 10 },
      { id: 'cosmetic_avatar_aura', tier: 'rare', weight: 7_835 },
      { id: 'cosmetic_theme', tier: 'ultra', weight: 2_798 },
      { id: 'cosmetic_avatar_common', tier: 'rare', weight: 4_197 },
    ]);
  });

  test('preserves all five owner-approved percentage targets jointly', () => {
    const byId = new Map(LEVEL_SPIN_REWARD_CATALOG.map((entry) => [entry.id, entry.weight]));
    const energy = byId.get('energy_full')! + byId.get('energy_plus2')! + byId.get('energy_plus3')!;
    expect(energy).toBe(41_972);
    expect(byId.get('attempt_restore_all')).toBe(41_972);
    expect(energy / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 5);
    expect(byId.get('attempt_restore_all')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.15, 5);
    expect(byId.get('cosmetic_avatar_aura')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.028, 5);
    expect(byId.get('cosmetic_theme')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.01, 5);
    expect(byId.get('cosmetic_avatar_common')! / LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBeCloseTo(0.015, 5);
  });

  test('keeps the v7 value ladder honest: jackpots are rarer than the ultra shelf', () => {
    const byId = new Map(LEVEL_SPIN_REWARD_CATALOG.map((entry) => [entry.id, entry.weight]));
    expect(byId.get('pearls_1000')).toBe(50);
    expect(byId.get('stars_2000')).toBe(50);
    expect(byId.get('pearls_1000')!).toBeLessThan(byId.get('pearls_500')!);
    expect(byId.get('stars_2000')!).toBeLessThan(byId.get('stars_1000')!);
    // Лестница Plus строго убывает с ростом номинала.
    expect(byId.get('plus_days_3')).toBe(300);
    expect(byId.get('plus_days_7')).toBe(100);
    expect(byId.get('plus_days_14')).toBe(30);
    expect(byId.get('plus_days_30')).toBe(10);
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
      // pack_voucher_48h сознательно НЕ в каталоге: его активация требует
      // серверную бронь (activateLevelPackGift), которой у локального спина
      // нет — приз показывался бы, но не выдавался.
      'pack_voucher_48h',
    ]) expect(ids.has(removed)).toBe(false);
  });

  test('uses integer intervals rather than percentages or a sum of 100', () => {
    expect(LEVEL_SPIN_REWARD_TOTAL_WEIGHT).toBe(279_814);
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
