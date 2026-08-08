import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const THEMES = ['light', 'dark'] as const;
const AURAS = ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'secret'] as const;
const LAYERS = ['base', 'flow', 'particles'] as const;

describe('season aura asset safe area', () => {
  it('keeps every animated layer inside a rotation-safe transparent margin', async () => {
    for (const theme of THEMES) {
      for (const aura of AURAS) {
        for (const layer of LAYERS) {
          const file = path.join(
            ROOT,
            'assets/images/season/auras',
            theme,
            `${aura}-${layer}.webp`,
          );

          expect(fs.existsSync(file)).toBe(true);
          const image = sharp(file);
          const metadata = await image.metadata();
          expect(metadata.width).toBe(320);
          expect(metadata.height).toBe(320);
          expect(metadata.hasAlpha).toBe(true);

          const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          let furthestOpaqueRadius = 0;
          const center = (info.width - 1) / 2;

          for (let y = 0; y < info.height; y += 1) {
            for (let x = 0; x < info.width; x += 1) {
              const alpha = data[(y * info.width + x) * info.channels + 3];
              if (alpha <= 8) continue;
              furthestOpaqueRadius = Math.max(furthestOpaqueRadius, Math.hypot(x - center, y - center));
            }
          }

          // 146px leaves enough room for the layer's 1.04x animated pulse.
          expect(furthestOpaqueRadius).toBeLessThanOrEqual(146);
        }
      }
    }
  });
});
