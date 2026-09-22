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
    // Проверка была КРАСНОЙ до 2026-09-21: карточку научили переключаться на
    // «Мои ошибки», и в разметку арт идёт через priorityCardImage. Намерение
    // прежнее — арт последнего урока берётся из подготовленного набора темы.
    expect(home).toContain('? getHomeMistakesImage(themeMode)');
    expect(home).toContain(': lastLessonImage;');
    expect(home).toContain('source={priorityCardImage}');
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
    // Владелец 2026-09-21: 124 → 120 (минус 3%). При 124 картинка упиралась в
    // край слота 92×72 вплотную; 120 даёт воздух по краям. Слот НЕ меняли —
    // высота плитки прежняя, соседи не сдвигаются.
    expect(home).toContain('const homeLastLessonArtSize = 120;');
    expect(home).toContain('const homeLastLessonArtSlotWidth = 92;');
    expect(home).toContain('const homeLastLessonArtSlotHeight = 72;');
    expect(home).toContain('const homeTodayIconSize = 112;');
    expect(home).toContain('const homeLeagueWatermarkSize = 164;');
    expect(home).toContain('width: homeLastLessonArtSlotWidth, height: homeLastLessonArtSlotHeight');
    // Проверка была КРАСНОЙ до 2026-09-21: разметку перевели на псевдоним
    // priorityCardArtSize (карточка переключается между уроком и ошибками),
    // а сторожа не обновили. Сверяем обе половины связки, чтобы размер нельзя
    // было увести в обход константы.
    expect(home).toContain('const priorityCardArtSize = homeLastLessonArtSize;');
    expect(home).toContain('width={priorityCardArtSize} height={priorityCardArtSize}');
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
