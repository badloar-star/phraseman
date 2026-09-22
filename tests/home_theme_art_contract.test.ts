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
    expect(home).toContain('const homeTodayIconSize = 112;');
    expect(home).toContain('const homeLeagueWatermarkSize = 164;');
    // Владелец 2026-09-22: приоритетная плашка переведена на дизайн
    // «Цифра-гигант» (выбран из 10 макетов). Прежняя связка
    // homeLastLessonArtSize=120 / слот 92×72 / «gap: 12, paddingVertical: 8,
    // minHeight: 72» описывала ОТМЕНЁННУЮ раскладку (арт слева, имя по центру,
    // мелкий счётчик справа) — сторожить её больше нельзя.
    //
    // Намерение проверки прежнее и остаётся в силе: размер арта нельзя увести
    // в обход именованной константы. Плюс закрываем класс бага, из-за которого
    // владелец и забраковал прошлые версии, — арт, упирающийся в края:
    // при высоте 100 и арте 84 остаётся по 8 px воздуха сверху и снизу.
    // Объявления живут на уровне МОДУЛЯ (без отступа), а не внутри
    // renderNewHome. 2026-09-22 объявление внутри функции дало на боевом
    // телефоне `ReferenceError: Property 'HOME_PRIORITY_CARD_HEIGHT'
    // doesn't exist` и Главная не открывалась вообще. Отступ перед const —
    // признак возврата внутрь функции, поэтому проверяем начало строки.
    expect(home).toMatch(/^const HOME_PRIORITY_CARD_HEIGHT = 100;$/m);
    expect(home).toMatch(/^const HOME_PRIORITY_CARD_ART = 84;$/m);
    expect(home).not.toMatch(/^\s+const HOME_PRIORITY_CARD_(HEIGHT|ART)\b/m);
    expect(home).toContain('width={HOME_PRIORITY_CARD_ART} height={HOME_PRIORITY_CARD_ART}');
    expect(home).toContain('minHeight: HOME_PRIORITY_CARD_HEIGHT');

    const priorityCardHeight = Number(
      /const HOME_PRIORITY_CARD_HEIGHT = (\d+);/.exec(home)?.[1] ?? '0',
    );
    const priorityCardArt = Number(
      /const HOME_PRIORITY_CARD_ART = (\d+);/.exec(home)?.[1] ?? '0',
    );
    expect(priorityCardHeight).toBeGreaterThan(0);
    expect(priorityCardArt).toBeGreaterThan(0);
    // Минимум 8 px воздуха с каждой стороны — иначе картинка снова упрётся в край.
    expect(priorityCardHeight - priorityCardArt).toBeGreaterThanOrEqual(16);
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
