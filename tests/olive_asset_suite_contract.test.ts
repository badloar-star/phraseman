import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  'app/settings_themes.tsx', 'app/season_pass_theme_backgrounds.ts', 'app/home_menu_icons.ts',
  'app/home_last_lesson_assets.ts', 'app/coin_icons.ts', 'app/flashcards/FlashcardsCategoryHub.tsx',
  'components/EnergyIcon.tsx', 'components/ReferralInviteBannerArt.tsx',
  'components/tournament/tournament_theme_assets.ts', 'constants/generatedThemeIconAssets.ts',
  'constants/socialIconAssets.ts', 'constants/leagueBonusGiftImages.ts', 'constants/weeklyCompassIcons.ts',
  'constants/trainerThemeIcons.ts', 'constants/boonIconAssets.ts', 'constants/streakIconAssets.ts',
];

describe('Olive premium asset suite', () => {
  it('ships exactly one static, on-disk Olive asset for every wired premium slot', () => {
    const required = new Set<string>();
    for (const relativeSource of SOURCES) {
      const sourcePath = path.join(ROOT, relativeSource);
      const source = fs.readFileSync(sourcePath, 'utf8');
      for (const match of source.matchAll(/require\('([^']*assets\/[^']*olive[^']*)'\)/gi)) {
        required.add(path.resolve(path.dirname(sourcePath), match[1]));
      }
    }

    // Daily Tasks and Personal Plans no longer own live theme slots. Keep this
    // count aligned with the remaining statically wired Olive asset catalog.
    expect(required.size).toBe(48);
    for (const file of required) {
      expect(fs.existsSync(file)).toBe(true);
      expect(path.extname(file)).toMatch(/\.(webp|png)$/);
    }
  });

  it('rejects opaque generator-style near-white frames on Olive image edges', async () => {
    const required = new Set<string>();
    for (const relativeSource of SOURCES) {
      const sourcePath = path.join(ROOT, relativeSource);
      const source = fs.readFileSync(sourcePath, 'utf8');
      for (const match of source.matchAll(/require\('([^']*assets\/[^']*olive[^']*)'\)/gi)) {
        required.add(path.resolve(path.dirname(sourcePath), match[1]));
      }
    }
    const offenders: string[] = [];
    for (const file of required) {
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let edge = 0; edge < 4; edge += 1) {
        const total = edge < 2 ? info.width : info.height;
        let bright = 0;
        for (let i = 0; i < total; i += 1) {
          const x = edge === 0 || edge === 1 ? i : edge === 2 ? 0 : info.width - 1;
          const y = edge === 0 ? 0 : edge === 1 ? info.height - 1 : i;
          const offset = (y * info.width + x) * 4;
          if (data[offset] >= 225 && data[offset + 1] >= 225 && data[offset + 2] >= 225 && data[offset + 3] >= 250) bright += 1;
        }
        if (bright / total >= 0.9) { offenders.push(path.relative(ROOT, file)); break; }
      }
    }
    expect(offenders).toEqual([]);
  });
});
