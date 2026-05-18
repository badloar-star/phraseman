import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import {
  getLevelGiftImage,
  LEVEL_GIFT_IMAGE_THEMES,
  LEVEL_GIFT_IMAGE_VARIANTS,
} from '../constants/levelGiftImages';

async function countVisiblePixelsOnLastAlphaRow(assetPath: string): Promise<number> {
  const { data, info } = await sharp(assetPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lastAlphaRow = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 20) {
        lastAlphaRow = y;
        break;
      }
    }
  }

  if (lastAlphaRow < 0) return 0;

  let visiblePixels = 0;
  for (let x = 0; x < info.width; x += 1) {
    if (data[(lastAlphaRow * info.width + x) * 4 + 3] > 20) {
      visiblePixels += 1;
    }
  }

  return visiblePixels;
}

describe('level gift themed images', () => {
  it('has a generated asset for every supported theme and gift variant', async () => {
    for (const theme of LEVEL_GIFT_IMAGE_THEMES) {
      for (const variant of LEVEL_GIFT_IMAGE_VARIANTS) {
        const assetPath = path.join(
          process.cwd(),
          'assets',
          'images',
          'level_gifts',
          `${theme}-${variant}.webp`,
        );

        expect(fs.existsSync(assetPath)).toBe(true);
        const meta = await sharp(assetPath).metadata();
        expect(meta.width).toBe(512);
        expect(meta.height).toBe(512);
        expect(meta.hasAlpha).toBe(true);
        expect(getLevelGiftImage(theme, variant)).toBeTruthy();
      }
    }
  });

  it('does not use hard-cropped chest silhouettes', async () => {
    for (const theme of LEVEL_GIFT_IMAGE_THEMES) {
      for (const variant of LEVEL_GIFT_IMAGE_VARIANTS) {
        const assetPath = path.join(
          process.cwd(),
          'assets',
          'images',
          'level_gifts',
          `${theme}-${variant}.webp`,
        );

        await expect(countVisiblePixelsOnLastAlphaRow(assetPath)).resolves.toBeLessThan(180);
      }
    }
  });

  it('falls back to the default gift image for unknown theme or variant', () => {
    expect(getLevelGiftImage('unknown-theme', 'unknown-variant')).toBe(
      getLevelGiftImage('minimalDark', 'common'),
    );
  });
});
