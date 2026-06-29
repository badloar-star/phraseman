import fs from 'fs';
import path from 'path';

import {
  getLevelGiftGradient,
  LEVEL_GIFT_IMAGE_SOURCES,
  LEVEL_GIFT_IMAGE_THEMES,
  LEVEL_GIFT_IMAGE_VARIANTS,
} from '../constants/levelGiftImages';

describe('level gift themed gradients', () => {
  it('has a gradient for every supported theme and gift variant', () => {
    for (const theme of LEVEL_GIFT_IMAGE_THEMES) {
      for (const variant of LEVEL_GIFT_IMAGE_VARIANTS) {
        const gradient = getLevelGiftGradient(theme, variant);

        expect(gradient.colors).toHaveLength(3);
        expect(gradient.accent).toMatch(/^#/);
      }
    }
  });

  it('uses the default gift gradient for unknown theme or variant', () => {
    expect(getLevelGiftGradient('unknown-theme', 'unknown-variant')).toEqual(
      getLevelGiftGradient('minimalDark', 'common'),
    );
  });

  it('keeps level gift helpers out of runtime fallback audit noise', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'constants', 'levelGiftImages.ts'), 'utf8');

    expect(source).not.toMatch(/\bfallback\b|\bFallback\b/);
  });

  it('does not bundle image sources for level gift modal backgrounds', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'constants', 'levelGiftImages.ts'), 'utf8');

    expect(source).not.toContain('require(');
    expect(LEVEL_GIFT_IMAGE_SOURCES).toEqual([]);
  });
});
