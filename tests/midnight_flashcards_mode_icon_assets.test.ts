import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ICON_NAMES = ['saved', 'custom', 'training', 'audio', 'arena', 'collection'] as const;
const ICON_DIR = path.join(process.cwd(), 'assets', 'images', 'flashcards', 'mode_icons', 'midnight');

describe('midnight flashcards mode icon assets', () => {
  // Owner direction, 2026-08-03: Midnight flashcard actions are educational
  // objects in one cool navy/silver system — never mixed fantasy relics.
  it('keeps the six icons compact, transparent, and free of warm fantasy colors', async () => {
    const issues: string[] = [];
    let totalBytes = 0;

    for (const name of ICON_NAMES) {
      const filePath = path.join(ICON_DIR, `${name}.webp`);
      if (!fs.existsSync(filePath)) {
        issues.push(`${name}: missing`);
        continue;
      }

      const stat = fs.statSync(filePath);
      const metadata = await sharp(filePath).metadata();
      const { data } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let opaquePixels = 0;
      let warmPixels = 0;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        if (alpha < 40) continue;
        opaquePixels += 1;
        if (red > 110 && red > green * 1.16 && red > blue * 1.18) warmPixels += 1;
      }

      const warmRatio = opaquePixels > 0 ? warmPixels / opaquePixels : 1;
      if (metadata.width !== 256 || metadata.height !== 256) {
        issues.push(`${name}: expected 256x256, got ${metadata.width}x${metadata.height}`);
      }
      if (!metadata.hasAlpha) issues.push(`${name}: missing alpha`);
      if (warmRatio > 0.015) issues.push(`${name}: warm pixels ${(warmRatio * 100).toFixed(2)}%`);
      totalBytes += stat.size;
    }

    if (totalBytes > 90_000) issues.push(`total: ${totalBytes} bytes`);
    expect(issues).toEqual([]);
  });
});
