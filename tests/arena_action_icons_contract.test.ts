import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ASSET_DIR = path.join(process.cwd(), 'assets', 'images', 'arena_actions');

const ACTIONS = ['match', 'friend', 'throne'] as const;
const THEMES = [
  'dark',
  'neon',
  'gold',
  'coral',
  'minimalLight',
  'minimalDark',
  'compass-premium',
] as const;

function alphaAt(data: Buffer, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3] ?? 255;
}

describe('arena action icon assets', () => {
  test('ships transparent logo-only assets for every arena theme and action', async () => {
    for (const action of ACTIONS) {
      for (const theme of THEMES) {
        const filePath = path.join(ASSET_DIR, `arena-action-${action}-${theme}.webp`);
        expect(fs.existsSync(filePath)).toBe(true);

        const meta = await sharp(filePath).metadata();
        const expectedSize = theme === 'compass-premium' ? 256 : 160;
        expect(meta.width).toBe(expectedSize);
        expect(meta.height).toBe(expectedSize);
        expect(meta.hasAlpha).toBe(true);

        const { data, info } = await sharp(filePath)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        expect(alphaAt(data, info.width, 0, 0)).toBe(0);
        expect(alphaAt(data, info.width, info.width - 1, 0)).toBe(0);
        expect(alphaAt(data, info.width, 0, info.height - 1)).toBe(0);
        expect(alphaAt(data, info.width, info.width - 1, info.height - 1)).toBe(0);

        let visiblePixels = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 16) visiblePixels += 1;
        }
        expect(visiblePixels).toBeGreaterThan(1500);
      }
    }
  });
});
