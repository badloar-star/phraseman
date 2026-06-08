import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const SHARD_TIERS = ['single', '80', '180', '420'] as const;

async function alphaBounds(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha < 14) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) return null;

  return {
    left: minX,
    top: minY,
    right: info.width - maxX - 1,
    bottom: info.height - maxY - 1,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

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

describe('Compass premium shard assets', () => {
  test('compass shard tiers are transparent 256x256 WebP files with safe visible bounds', async () => {
    for (const tier of SHARD_TIERS) {
      const file = path.join(
        ROOT,
        'assets/images/shards',
        `compass-premium-${tier}-session.webp`,
      );

      expect(fs.existsSync(file)).toBe(true);

      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);

      const bounds = await alphaBounds(file);
      expect(bounds).not.toBeNull();

      const maxVisible = Math.max(bounds!.width, bounds!.height);
      const minMargin = Math.min(bounds!.left, bounds!.top, bounds!.right, bounds!.bottom);
      expect(maxVisible).toBeGreaterThanOrEqual(236);
      expect(maxVisible).toBeLessThanOrEqual(242);
      expect(minMargin).toBeGreaterThanOrEqual(8);
    }
  });

  test('live shard registries point compass to the regenerated premium assets', () => {
    const oskolokSource = fs.readFileSync(path.join(ROOT, 'app/oskolok.ts'), 'utf8');
    const rewardIconSource = fs.readFileSync(
      path.join(ROOT, 'constants/levelGiftRewardIcons.ts'),
      'utf8',
    );

    for (const tier of SHARD_TIERS) {
      expect(oskolokSource).toContain(
        `require('../assets/images/shards/compass-premium-${tier}-session.webp')`,
      );
    }
    expect(rewardIconSource).toContain(
      "require('../assets/images/shards/compass-premium-80-session.webp')",
    );
  });
});
