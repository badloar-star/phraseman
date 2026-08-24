import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LIVE_THEMES = [
  'dark',
  'gold',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'indigo',
  'sagePorcelain',
] as const;

describe('Home per-theme artwork contract', () => {
  test('defines survey and phrase art for exactly the nine live themes', () => {
    const mapPath = join(ROOT, 'app/home_supporting_art.ts');
    expect(existsSync(mapPath)).toBe(true);

    const source = readFileSync(mapPath, 'utf8');
    for (const theme of LIVE_THEMES) {
      expect(source).toContain(`${theme}: {`);
      expect(source).toContain(`home-${theme}-survey.webp`);
      expect(source).toContain(`home-${theme}-phrase-of-day.webp`);
    }
    expect(source.match(/require\(/g)).toHaveLength(LIVE_THEMES.length * 2);
    expect(source).not.toMatch(/minimalDark|candyBlue|businessLight|business|max|practice|diagnostic|gift|dailyChallenge/i);
  });

  test('Home consumers use the connected theme artwork instead of fallback icons', () => {
    const home = readFileSync(join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');
    const survey = readFileSync(join(ROOT, 'components/SurveyTaskCard.tsx'), 'utf8');
    const phrase = readFileSync(join(ROOT, 'components/DailyPhraseCard.tsx'), 'utf8');

    expect(home).toContain('img: menuImages.lesson');
    expect(home).toContain('img: menuImages.cards');
    expect(home).toContain('source={menuImages.league}');
    expect(home).not.toContain('RetiredRasterFallback kind="league"');
    expect(home).toContain('const lastLessonImage = getHomeLastLessonImage(themeMode);');
    expect(home).toContain('source={lastLessonImage}');
    expect(survey).toContain('getHomeSupportingArt(themeMode).survey');
    expect(phrase).toContain('getHomeSupportingArt(themeMode).phraseOfDay');
  });

  test('renders the scoped Home artwork at owner-readable sizes', () => {
    const home = readFileSync(join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');
    const surveyMotion = readFileSync(join(ROOT, 'constants/motionHybrid.ts'), 'utf8');
    const phrase = readFileSync(join(ROOT, 'components/DailyPhraseCard.tsx'), 'utf8');

    expect(home).toContain('const homeQuickIconImageSize = Math.max(96, homeQuickIconPlateSize + 18);');
    expect(home).toContain('const homeQuickThemeArtSize = Math.max(112, homeQuickIconPlateSize + 36);');
    expect(home).toContain('size={homeQuickIconImageSize}');
    expect(home).toContain('width={homeQuickThemeArtSize} height={homeQuickThemeArtSize}');
    expect(home).toContain('const homeLastLessonArtSize = 124;');
    expect(home).toContain('const homeLastLessonArtSlotWidth = 92;');
    expect(home).toContain('const homeLastLessonArtSlotHeight = 72;');
    expect(home).toContain('const homeTodayIconSize = 112;');
    expect(home).toContain('const homeLeagueWatermarkSize = 164;');
    expect(home).toContain('width: homeLastLessonArtSlotWidth, height: homeLastLessonArtSlotHeight');
    expect(home).toContain('width={homeLastLessonArtSize} height={homeLastLessonArtSize}');
    expect(home).toContain("gap: 12, paddingVertical: 8, minHeight: 72");
    expect(surveyMotion).toContain('taskIconSize: 64');
    expect(phrase).toContain('const HOME_ADDITIONAL_ART_SIZE = 144;');
    expect(phrase).toContain('const HOME_ADDITIONAL_ART_SLOT_WIDTH = 112;');
    expect(phrase).toContain('const HOME_ADDITIONAL_ART_SLOT_HEIGHT = 72;');
    expect(phrase).toContain('<View style={styles.homeAdditionalArtSlot}>');
    expect(phrase).toContain('width: HOME_ADDITIONAL_ART_SIZE');
    expect(phrase).toContain('height: HOME_ADDITIONAL_ART_SIZE');
    expect(phrase).toContain('width: HOME_ADDITIONAL_ART_SLOT_WIDTH');
    expect(phrase).toContain('height: HOME_ADDITIONAL_ART_SLOT_HEIGHT');
    expect(phrase).toMatch(/homeAdditionalEditorial:\s*\{[\s\S]*?paddingVertical:\s*8/);
    expect(phrase).toMatch(/homeAdditionalEditorial:\s*\{[\s\S]*?overflow:\s*'hidden'/);
    expect(home).not.toContain('testID="home-continue-lesson-art-stack"');
    expect(home).not.toContain('testID="home-league-art-stack"');
    expect(phrase).toMatch(/homeAdditionalContent:\s*\{[\s\S]*?flexDirection:\s*'row'/);
  });
});
