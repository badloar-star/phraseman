import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { LEVEL_SPIN_REWARD_ASSET_MANIFEST } from '../app/level_spin_reward_asset_manifest';
import { LEVEL_SPIN_REWARD_CATALOG } from '../app/level_spin_reward_catalog';
import { ALL_LEVEL_GIFT_DEFS } from '../app/level_gift_system';
import {
  LEVEL_SPIN_REWARD_IMAGE_ALIASES,
  LEVEL_SPIN_REWARD_IMAGE_SOURCES,
  levelSpinRewardImageSource,
  type LevelSpinRewardImageKey,
} from '../app/level_spin_reward_assets';

describe('Level Spin reward asset map', () => {
  const mapPath = path.join(process.cwd(), 'app', 'level_spin_reward_assets.ts');

  test('contains one literal bundled require for every manifest reward', () => {
    const source = fs.readFileSync(mapPath, 'utf8');
    expect(source).not.toMatch(/Record\s*<\s*string\s*,\s*ImageSourcePropType\s*>/);
    const requires = [...source.matchAll(/require\('\.\.\/assets\/images\/level-spin-rewards\/([^']+\.webp)'\)/g)]
      .map((match) => match[1]);

    expect(requires).toHaveLength(LEVEL_SPIN_REWARD_ASSET_MANIFEST.length);
    expect(new Set(requires).size).toBe(requires.length);
    expect(new Set(requires)).toEqual(new Set(
      LEVEL_SPIN_REWARD_ASSET_MANIFEST.map((reward) => `${reward.id}.webp`),
    ));
    const pairs = [...source.matchAll(/\s+(\w+): require\('\.\.\/assets\/images\/level-spin-rewards\/([^']+\.webp)'\)/g)]
      .map((match) => [match[1], match[2]]);
    expect(new Set(pairs.map((pair) => pair.join(':')))).toEqual(new Set(
      LEVEL_SPIN_REWARD_ASSET_MANIFEST.map(({ id }) => `${id}:${id}.webp`),
    ));
  });

  test('ships one universal asset per reward with no theme suffixes', () => {
    const productionDir = path.join(process.cwd(), 'assets', 'images', 'level-spin-rewards');
    expect(fs.readdirSync(productionDir).filter((name) => name.endsWith('.webp'))).toHaveLength(39);
    for (const reward of LEVEL_SPIN_REWARD_ASSET_MANIFEST) {
      const file = path.join(process.cwd(), reward.productionFile);
      expect(fs.existsSync(file)).toBe(true);
      expect(path.basename(file)).not.toMatch(/-(?:dark|light|business|ocean|forest)\.webp$/);
    }
  });

  test('every production file is a readable 512px alpha WebP with bounded visible content', async () => {
    for (const reward of LEVEL_SPIN_REWARD_ASSET_MANIFEST) {
      const file = path.join(process.cwd(), reward.productionFile);
      const image = sharp(file);
      const metadata = await image.metadata();
      expect(metadata).toMatchObject({ format: 'webp', width: 512, height: 512, hasAlpha: true });
      const { info } = await image.clone().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBeGreaterThan(48);
      expect(info.height).toBeGreaterThan(48);
      expect(info.width).toBeLessThan(512);
      expect(info.height).toBeLessThan(512);
    }
  });

  test('every active non-avatar and non-aura historical gift resolves to universal family art', () => {
    for (const gift of ALL_LEVEL_GIFT_DEFS) {
      if (/avatar|aura/.test(gift.id)) continue;
      expect(levelSpinRewardImageSource(gift.id)).not.toBeNull();
    }
  });

  test('every historical alias target is a literal canonical image key', () => {
    const canonicalKeys = new Set<LevelSpinRewardImageKey>(
      Object.keys(LEVEL_SPIN_REWARD_IMAGE_SOURCES) as LevelSpinRewardImageKey[],
    );
    for (const target of Object.values(LEVEL_SPIN_REWARD_IMAGE_ALIASES)) {
      const typedTarget: LevelSpinRewardImageKey = target;
      expect(canonicalKeys.has(typedTarget)).toBe(true);
      expect(levelSpinRewardImageSource(typedTarget)).toBe(LEVEL_SPIN_REWARD_IMAGE_SOURCES[typedTarget]);
    }
  });

  test('covers the complete live Level Spin catalog with no extra reward art', () => {
    expect(new Set(LEVEL_SPIN_REWARD_ASSET_MANIFEST.map((reward) => reward.id))).toEqual(
      new Set(LEVEL_SPIN_REWARD_CATALOG.map((reward) => reward.id)),
    );
  });

  test('resolves the random aura gift to its own literal art instead of an alias', () => {
    expect(LEVEL_SPIN_REWARD_IMAGE_ALIASES).not.toHaveProperty('cosmetic_avatar_aura');
    expect(levelSpinRewardImageSource('cosmetic_avatar_aura'))
      .toBe(LEVEL_SPIN_REWARD_IMAGE_SOURCES.cosmetic_avatar_aura);
  });

  test('resolves the all-avatar prize to its dedicated literal art', () => {
    expect(LEVEL_SPIN_REWARD_IMAGE_ALIASES).not.toHaveProperty('cosmetic_avatar_common');
    expect(levelSpinRewardImageSource('cosmetic_avatar_common'))
      .toBe(LEVEL_SPIN_REWARD_IMAGE_SOURCES.cosmetic_avatar_common);
  });

  test('resolves the attempt restore gift to its dedicated literal art', () => {
    expect(LEVEL_SPIN_REWARD_IMAGE_ALIASES).not.toHaveProperty('attempt_restore_all');
    expect(levelSpinRewardImageSource('attempt_restore_all'))
      .toBe(LEVEL_SPIN_REWARD_IMAGE_SOURCES.attempt_restore_all);
  });
});
