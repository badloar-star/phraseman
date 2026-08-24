import { LEVEL_SPIN_REWARD_CATALOG } from '../app/level_spin_reward_catalog';
import {
  LEVEL_SPIN_REWARD_ASSET_MANIFEST,
  LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID,
  LEVEL_SPIN_REWARD_FAMILY_PALETTES,
  type LevelSpinRewardAssetSpec,
} from '../app/level_spin_reward_asset_manifest';
import type { LevelSpinRewardId } from '../app/level_spin_reward_catalog';

describe('level spin reward asset manifest', () => {
  test('matches the v3 reward catalogue exactly', () => {
    const exhaustive: Readonly<Record<LevelSpinRewardId, LevelSpinRewardAssetSpec>> =
      LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID;
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST.map(({ id }) => id).sort()).toEqual(
      LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).sort(),
    );
    expect(Object.keys(exhaustive).sort()).toEqual(LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).sort());
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST).toHaveLength(36);
  });

  test('preserves each manifest key, embedded id, and production filename as correlated literals', () => {
    const xp250 = LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.xp_250;
    const exactId: 'xp_250' = xp250.id;
    const exactFile: 'assets/images/level-spin-rewards/xp_250.webp' = xp250.productionFile;
    expect(exactId).toBe('xp_250');
    expect(exactFile).toBe('assets/images/level-spin-rewards/xp_250.webp');
  });

  test('uses nine restrained families and contains no baked-label field', () => {
    expect(Object.keys(LEVEL_SPIN_REWARD_FAMILY_PALETTES).sort()).toEqual([
      'aura',
      'energy',
      'hints',
      'pearls',
      'plus',
      'protection',
      'stars',
      'time',
      'xp',
    ]);

    for (const entry of LEVEL_SPIN_REWARD_ASSET_MANIFEST) {
      expect(entry).not.toHaveProperty('bakedLabel');
      expect(entry.productionFile).toBe(`assets/images/level-spin-rewards/${entry.id}.webp`);
      expect(entry.productionFile).not.toMatch(
        /dark|ember|gold|indigo|olive|sage|theme|volt/i,
      );
      expect(entry.accent).toBe(LEVEL_SPIN_REWARD_FAMILY_PALETTES[entry.family]);
    }
  });

  test('gives the random aura reward a dedicated label-free reliquary brief', () => {
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_avatar_aura).toMatchObject({
      id: 'cosmetic_avatar_aura',
      family: 'aura',
      productionFile: 'assets/images/level-spin-rewards/cosmetic_avatar_aura.webp',
    });
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_avatar_aura.subject)
      .toMatch(/aura reliquary.*hexagonal center/i);
  });
});
