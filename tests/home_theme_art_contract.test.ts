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
    const phrase = readFileSync(join(ROOT, 'components/DailyPhraseCard.tsx'), 'utf8');

    expect(home).toContain('img: menuImages.lesson');
    expect(home).toContain('img: menuImages.cards');
    // зачем (координатор §46, 2026-10-01): плитка Лиги жила в Главной V1 (удалена
    // 01.10); у плиток 2.0 арт задан явно, и каждый файл обязан существовать.
    expect(home).not.toContain('RetiredRasterFallback kind="league"');
    const tileArts = [...home.matchAll(/art: require\('\.\.\/\.\.\/(assets\/images\/[^']+)'\)/g)].map((m) => m[1]!);
    expect(tileArts.length).toBeGreaterThanOrEqual(3);
    for (const art of tileArts) expect(existsSync(join(ROOT, art))).toBe(true);
    expect(home).toContain('const lastLessonImage = getHomeLastLessonImage(themeMode);');
    // Проверка была КРАСНОЙ до 2026-09-21: карточку научили переключаться на
    // «Мои ошибки», и в разметку арт идёт через priorityCardImage. Намерение
    // прежнее — арт последнего урока берётся из подготовленного набора темы.
    expect(home).toContain('? getHomeMistakesImage(themeMode)');
    expect(home).toContain(': lastLessonImage;');
    expect(home).toContain('art={priorityCardImage}');
    expect(phrase).toContain('getHomeSupportingArt(themeMode).phraseOfDay');
  });

  test('renders the scoped Home artwork at owner-readable sizes', () => {
    const home = readFileSync(join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');
    const surveyMotion = readFileSync(join(ROOT, 'constants/motionHybrid.ts'), 'utf8');
    const phrase = readFileSync(join(ROOT, 'components/DailyPhraseCard.tsx'), 'utf8');

    // Размеры плиток «Быстрого старта», «Сегодня», водяного знака Лиги и плашки
    // «Цифра-гигант» относились к Главной V1 (удалена 01.10, 4169840e9) — их
    // проверки сняты. Карточка «Продолжить» 2.0 — HomeV2ContinueCard (свой контракт
    // в home_learning_cta_contract). Размеры фразы дня ниже — в силе.
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
