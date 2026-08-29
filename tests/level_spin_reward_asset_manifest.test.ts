import { LEVEL_SPIN_REWARD_CATALOG } from '../app/level_spin_reward_catalog';
import {
  LEVEL_SPIN_REWARD_ASSET_MANIFEST,
  LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID,
  LEVEL_SPIN_REWARD_FAMILY_PALETTES,
  type LevelSpinRewardAssetSpec,
} from '../app/level_spin_reward_asset_manifest';
import type { LevelSpinRewardId } from '../app/level_spin_reward_catalog';

describe('level spin reward asset manifest', () => {
  test('matches the v7 reward catalogue exactly', () => {
    const exhaustive: Readonly<Record<LevelSpinRewardId, LevelSpinRewardAssetSpec>> =
      LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID;
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST.map(({ id }) => id).sort()).toEqual(
      LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).sort(),
    );
    expect(Object.keys(exhaustive).sort()).toEqual(LEVEL_SPIN_REWARD_CATALOG.map(({ id }) => id).sort());
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST).toHaveLength(45);
  });

  test('preserves each manifest key, embedded id, and production filename as correlated literals', () => {
    const xp250 = LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.xp_250;
    const exactId: 'xp_250' = xp250.id;
    const exactFile: 'assets/images/level-spin-rewards/xp_250.webp' = xp250.productionFile;
    expect(exactId).toBe('xp_250');
    expect(exactFile).toBe('assets/images/level-spin-rewards/xp_250.webp');
  });

  test('uses eleven restrained families and contains no baked-label field', () => {
    expect(Object.keys(LEVEL_SPIN_REWARD_FAMILY_PALETTES).sort()).toEqual([
      'aura',
      'avatar',
      'energy',
      'hints',
      'pearls',
      'plus',
      'protection',
      'stars',
      'theme',
      'time',
      'xp',
    ]);

    for (const entry of LEVEL_SPIN_REWARD_ASSET_MANIFEST) {
      expect(entry).not.toHaveProperty('bakedLabel');
      expect(entry.productionFile).toBe(`assets/images/level-spin-rewards/${entry.id}.webp`);
      // зачем (владелец 2026-08-26): сторож охраняет правило «арт награды НЕ
      // варьируется по теме интерфейса» — запрещены имена КОНКРЕТНЫХ тем.
      // Само слово «theme» из запрета снято: с этой даты в спине есть законная
      // награда `cosmetic_theme` (случайная платная тема), и её файл обязан
      // называться по награде. Правило при этом не ослабло: ни одна тема по
      // имени в арт по-прежнему не попадает.
      expect(entry.productionFile).not.toMatch(
        /dark|ember|gold|indigo|olive|sage|volt|aurora|midnight/i,
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

  test('gives the interface theme reward its own palette-tablet brief', () => {
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_theme).toMatchObject({
      id: 'cosmetic_theme',
      family: 'theme',
      productionFile: 'assets/images/level-spin-rewards/cosmetic_theme.webp',
    });
    // Бриф намеренно про ПАЛИТРУ вообще, а не про конкретную тему: одна
    // картинка обслуживает выдачу любой из пяти платных тем.
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_theme.subject)
      .toMatch(/palette tablets/i);
  });

  test('gives the all-avatar prize a dedicated anonymous-avatar brief', () => {
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_avatar_common).toMatchObject({
      id: 'cosmetic_avatar_common',
      family: 'avatar',
      productionFile: 'assets/images/level-spin-rewards/cosmetic_avatar_common.webp',
    });
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.cosmetic_avatar_common.subject)
      .toMatch(/anonymous avatar bust/i);
  });

  test('gives the attempt restore gift a dedicated protection reliquary brief', () => {
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.attempt_restore_all).toMatchObject({
      id: 'attempt_restore_all',
      family: 'protection',
      productionFile: 'assets/images/level-spin-rewards/attempt_restore_all.webp',
    });
    expect(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID.attempt_restore_all.subject)
      .toMatch(/three.*heart.*reliquary/i);
  });
});
