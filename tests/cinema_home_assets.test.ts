import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const CINEMA_THEMES = ['midnight', 'ember', 'aurora', 'volt'] as const;
const HOME_MENU_KEYS = [
  'lessons',
  'quizzes',
  'cards',
  'daily-tasks',
  'league',
  'diagnostic-test',
  'practice',
  'dialogs',
  'exam',
  'shop',
  'arena',
  'hero-map',
] as const;

async function expectWebp(filePath: string, width: number, height: number) {
  expect(fs.existsSync(filePath)).toBe(true);
  const meta = await sharp(filePath).metadata();
  expect(meta.format).toBe('webp');
  expect(meta.width).toBe(width);
  expect(meta.height).toBe(height);
  expect(Boolean(meta.hasAlpha)).toBe(true);
}

describe('cinema home foreground assets', () => {
  it('ships DALL-E home menu icons and league chests for every cinema theme', async () => {
    for (const theme of CINEMA_THEMES) {
      for (const key of HOME_MENU_KEYS) {
        await expectWebp(
          path.join(ROOT, 'assets/images/home_menu', theme, `home-${theme}-${key}.webp`),
          384,
          384,
        );
      }

      await expectWebp(
        path.join(ROOT, 'assets/images/league_bonus', `${theme}-chest.webp`),
        512,
        512,
      );
    }
  });

  it('wires cinema home assets without falling back to older theme branches', () => {
    const homeMenuSource = fs.readFileSync(path.join(ROOT, 'app/home_menu_icons.ts'), 'utf8');
    const leagueBonusSource = fs.readFileSync(path.join(ROOT, 'constants/leagueBonusGiftImages.ts'), 'utf8');

    for (const theme of CINEMA_THEMES) {
      expect(homeMenuSource).toContain(`themeMode === '${theme}'`);
      expect(homeMenuSource).toContain(`assets/images/home_menu/${theme}/home-${theme}-lessons.webp`);
      expect(homeMenuSource).toContain(`assets/images/home_menu/${theme}/home-${theme}-dialogs.webp`);
      expect(leagueBonusSource).toContain(`${theme}: require('../assets/images/league_bonus/${theme}-chest.webp')`);
    }
  });

  it('uses themed artwork for the Theo dialogs card instead of a line icon', () => {
    const homeSource = fs.readFileSync(path.join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');
    expect(homeSource).toContain('source={menuImages.dialogs}');
    expect(homeSource).not.toContain('<Ionicons name="chatbubbles-outline" size={Math.round(homeTodayIconImageSize * 0.6)}');
  });
});
