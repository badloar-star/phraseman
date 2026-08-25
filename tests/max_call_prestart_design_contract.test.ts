import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'max_call_prestart.tsx'), 'utf8');
const serverConfigSource = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'max_voice_config.ts'), 'utf8');

function numericConstant(sourceText: string, pattern: RegExp): number {
  const match = sourceText.match(pattern);
  if (!match?.[1]) throw new Error(`Numeric constant not found: ${pattern}`);
  return Number(match[1].replace(/_/g, ''));
}

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

  test('shows the server daily limit while the first mint response is pending', () => {
    // зачем (аудит 2026-08-25): 5fa73d3b9 заменил серверный `dailyVoiceSecMax:
    // 1_200,` на именованную `dailyVoiceSecMax: MAX_VOICE_DAILY_SEC,` — тест не
    // обновили, регекс на голые цифры перестал матчиться, и проверка ни разу
    // не запускалась после того рефакторинга. Резолвим имя константы через её
    // собственное объявление, а не через место использования: это переживёт
    // будущие переименования полей вокруг неё.
    const clientFallbackSec = numericConstant(source, /const DEFAULT_DAY_SEC = ([\d_]+);/);
    const serverFieldMatch = serverConfigSource.match(/dailyVoiceSecMax: (\w+),/);
    if (!serverFieldMatch?.[1]) throw new Error('dailyVoiceSecMax field not found in server config');
    const serverDefaultSec = /^\d[\d_]*$/.test(serverFieldMatch[1])
      ? Number(serverFieldMatch[1].replace(/_/g, ''))
      : numericConstant(serverConfigSource, new RegExp(`export const ${serverFieldMatch[1]} = ([\\d_]+);`));

    expect(clientFallbackSec).toBe(serverDefaultSec);
  });
});
