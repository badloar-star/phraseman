import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'max_call_prestart.tsx'), 'utf8');

describe('MAX tutor prestart approved Statistics-style design', () => {
  test('removes the rejected upcoming list and generic education icons', () => {
    expect(source).not.toContain('Ближайшие уроки');
    expect(source).not.toContain('flag-outline');
    expect(source).not.toContain('school-outline');
  });

  test('uses the Statistics surface and existing authored MAX orb asset', () => {
    expect(source).toContain("import StatsCardArtSurface from '../components/StatsCardArtSurface'");
    expect(source).toContain("import MaxHomeOrb from '../components/home/MaxHomeOrb'");
    expect(source).toContain('getMaxHomeOrbLayers(themeMode)');
    expect(source).toContain('testID="max-call-tutor-hero"');
  });

  test('renders from preview cache and never replaces the hero with a loading placeholder', () => {
    expect(source).toContain('peekMaxTutorPreview(');
    expect(source).toContain('prefetchMaxTutorPreview(callParams)');
    expect(source).not.toContain('max-call-tutor-plan-placeholder');
    expect(source).not.toContain('Готовим цель и план урока');
  });

  test('supports small screens and large text with a prominent dark-on-green CTA', () => {
    expect(source).toContain('<ScrollView');
    expect(source).toContain('maxFontSizeMultiplier={2}');
    expect(source).toContain('minHeight: 60');
    expect(source).toContain('color: startReady ? t.correctText : t.textGhost');
    expect(source).toContain("ru: 'Начать урок'");
  });

  test('uses the daily-minute meter instead of the rejected completed-goals metric', () => {
    expect(source).toContain("import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter'");
    expect(source).toContain('<MaxDailyQuotaMeter');
    expect(source).not.toContain('целей закрыто');
    expect(source).not.toContain('goalProgressLabel');
  });
});
