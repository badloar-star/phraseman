import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const SHARD_TIERS = ['single', '80', '180', '420'] as const;

describe('Onboarding Graphite shard assets', () => {
  test('minimalDark shard tiers exist as generated transparent 256x256 WebP files', async () => {
    for (const tier of SHARD_TIERS) {
      const file = path.join(
        ROOT,
        'assets/images/shards',
        `onboarding-graphite-${tier}.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('live shard registries point minimalDark to onboarding-graphite assets', () => {
    const oskolokSource = fs.readFileSync(path.join(ROOT, 'app/oskolok.ts'), 'utf8');
    const rewardIconSource = fs.readFileSync(
      path.join(ROOT, 'constants/levelGiftRewardIcons.ts'),
      'utf8',
    );

    for (const tier of SHARD_TIERS) {
      expect(oskolokSource).toContain(
        `require('../assets/images/shards/onboarding-graphite-${tier}.webp')`,
      );
    }
    expect(rewardIconSource).toContain(
      "require('../assets/images/shards/onboarding-graphite-80.webp')",
    );
  });
});
