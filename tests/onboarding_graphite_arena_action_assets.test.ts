import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const ACTIONS = ['match', 'friend', 'throne'] as const;

describe('Onboarding Graphite arena action assets', () => {
  test('minimalDark arena action icons exist as generated transparent 160x160 WebP files', async () => {
    for (const action of ACTIONS) {
      const file = path.join(
        ROOT,
        'assets/images/arena_actions',
        `arena-action-${action}-onboarding-graphite.webp`,
      );
      expect(fs.existsSync(file)).toBe(true);
      const metadata = await sharp(file).metadata();
      expect(metadata.width).toBe(160);
      expect(metadata.height).toBe(160);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  test('arena action registry points minimalDark to onboarding-graphite assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/arena_action_icons.ts'), 'utf8');

    for (const action of ACTIONS) {
      expect(source).toContain(
        `require('../assets/images/arena_actions/arena-action-${action}-onboarding-graphite.webp')`,
      );
    }
  });
});
