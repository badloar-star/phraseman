import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const sharp = require('sharp');
const THEMES = ['dark', 'gold', 'coral', 'minimalDark', 'business', 'businessLight', 'midnight', 'ember', 'aurora', 'volt', 'candyBlue', 'indigo'] as const;

describe('themed daily and weekly bonus art', () => {
  it('ships a distinct transparent version of both bonus assets for every interface theme', async () => {
    const dailyHashes = new Set<string>();
    const weeklyHashes = new Set<string>();

    for (const theme of THEMES) {
      const daily = path.join(process.cwd(), 'assets/images/weekly_boon_icons/png', theme, 'streak_saver.webp');
      const weekly = path.join(process.cwd(), 'assets/images/weekly_compass_icons', `${theme}.webp`);
      expect(existsSync(daily)).toBe(true);
      expect(existsSync(weekly)).toBe(true);

      const [dailyMeta, weeklyMeta] = await Promise.all([sharp(daily).metadata(), sharp(weekly).metadata()]);
      expect(dailyMeta).toMatchObject({ format: 'webp', width: 256, height: 256, hasAlpha: true });
      expect(weeklyMeta).toMatchObject({ format: 'webp', width: 512, height: 512, hasAlpha: true });

      dailyHashes.add(createHash('sha256').update(readFileSync(daily)).digest('hex'));
      weeklyHashes.add(createHash('sha256').update(readFileSync(weekly)).digest('hex'));
    }

    expect(dailyHashes.size).toBe(THEMES.length);
    expect(weeklyHashes.size).toBe(THEMES.length);
  });
});
