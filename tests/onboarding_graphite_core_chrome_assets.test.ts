import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');

const EXPECTED_ASSETS = [
  {
    path: 'assets/images/home_menu/onboarding-graphite/home-onboarding-graphite-daily-phrase.webp',
    width: 384,
    height: 384,
    alpha: true,
  },
  {
    path: 'assets/images/energy/onboarding-graphite/energy-onboarding-graphite.webp',
    width: 512,
    height: 512,
    alpha: true,
  },
  {
    path: 'assets/images/header_glyphs/onboarding-graphite/message-glyph-onboarding-graphite-dalle-v1.webp',
    width: 320,
    height: 224,
    alpha: true,
  },
  {
    path: 'assets/images/header_glyphs/onboarding-graphite/youtube-glyph-onboarding-graphite-dalle-v1.webp',
    width: 320,
    height: 224,
    alpha: true,
  },
  {
    path: 'assets/images/first_lesson_sheet/sheet-bg-onboarding-graphite.webp',
    width: 1080,
    height: 900,
    alpha: false,
  },
] as const;

describe('Onboarding Graphite core chrome assets', () => {
  test('core generated assets exist with stable dimensions', async () => {
    for (const asset of EXPECTED_ASSETS) {
      const absolutePath = path.join(ROOT, asset.path);
      expect(fs.existsSync(absolutePath)).toBe(true);
      const metadata = await sharp(absolutePath).metadata();
      expect(metadata.width).toBe(asset.width);
      expect(metadata.height).toBe(asset.height);
      expect(Boolean(metadata.hasAlpha)).toBe(asset.alpha);
    }
  });

  test('minimalDark core chrome branches use generated onboarding-graphite assets', () => {
    const dailyPhraseSource = fs.readFileSync(path.join(ROOT, 'components/DailyPhraseCard.tsx'), 'utf8');
    const energySource = fs.readFileSync(path.join(ROOT, 'components/EnergyIcon.tsx'), 'utf8');
    const messagesSource = fs.readFileSync(path.join(ROOT, 'components/AppMessagesInbox.tsx'), 'utf8');
    const lingmanSource = fs.readFileSync(path.join(ROOT, 'components/LingmanVideosButton.tsx'), 'utf8');
    const firstLessonSource = fs.readFileSync(path.join(ROOT, 'components/firstLessonSheetAssets.ts'), 'utf8');

    expect(dailyPhraseSource).toContain('assets/images/home_menu/onboarding-graphite/home-onboarding-graphite-daily-phrase.webp');
    expect(dailyPhraseSource).not.toContain('home-minimal-dark-daily-phrase.webp');

    expect(energySource).toContain('assets/images/energy/onboarding-graphite/energy-onboarding-graphite.webp');
    expect(energySource).not.toContain('energy-graphite.webp');

    expect(messagesSource).toContain('assets/images/header_glyphs/onboarding-graphite/message-glyph-onboarding-graphite-dalle-v1.webp');
    expect(messagesSource).toContain("const isGraphiteTheme = themeMode === 'minimalDark'");
    expect(messagesSource).toContain("panelGradient: ['#171410', '#070706'] as const");
    expect(messagesSource).toContain("border: 'rgba(242,184,75,0.18)'");
    expect(messagesSource).toContain('borderRadius: isGraphiteTheme ? 8 : 24');
    expect(messagesSource).toContain("const vipSurveyAccent = isGraphiteTheme ? '#F2B84B' : '#64748B'");
    expect(messagesSource).toContain("const vipSurveyAccentText = isGraphiteTheme ? '#151008' : '#FFFFFF'");
    expect(messagesSource).toContain("isGraphiteTheme ? 'rgba(17,16,12,0.92)' : isDark ? '#182131' : '#F8FAFC'");
    expect(messagesSource).toContain("color={isGraphiteTheme ? '#F2B84B' : isDark ? '#93C5FD' : '#2563EB'}");
    expect(messagesSource).not.toContain('message-glyph-minimal-dark-dalle-v1.png');

    expect(lingmanSource).toContain('assets/images/header_glyphs/onboarding-graphite/youtube-glyph-onboarding-graphite-dalle-v1.webp');
    expect(lingmanSource).not.toContain('youtube-glyph-minimal-dark-dalle-v1.png');

    expect(firstLessonSource).toContain('assets/images/first_lesson_sheet/sheet-bg-onboarding-graphite.webp');
    expect(firstLessonSource).not.toContain('sheet-bg-minimal-dark.webp');
  });

  test('minimalDark screen gradient uses quiet onboarding graphite chrome', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/ScreenGradient.tsx'), 'utf8');
    const opacityBlock = source.slice(
      source.indexOf('const MOTION_OVERLAY_OPACITY'),
      source.indexOf('type OrbSpec'),
    );
    const orbsStart = source.indexOf('  minimalDark: [', source.indexOf('const THEME_ORBS'));
    const orbsEnd = source.indexOf('  ],', orbsStart);
    const orbsBlock = source.slice(orbsStart, orbsEnd);
    const gradientStart = source.indexOf('const THEME_BG_GRADIENTS');
    const gradientEnd = source.indexOf('};', gradientStart);
    const gradientBlock = source.slice(gradientStart, gradientEnd);

    expect(opacityBlock).toContain('minimalDark: 0.48');
    expect(orbsBlock).toContain("color: '#F2B84B'");
    expect(orbsBlock).toContain("color: '#BBA46F'");
    expect(orbsBlock).toContain("color: '#FFF1B8'");
    expect(orbsBlock).not.toContain('#6B7280');
    expect(orbsBlock).not.toContain('#9CA3AF');
    expect(gradientBlock).toContain("minimalDark: ['#020304', '#080807', '#11100C']");
  });

  test('personal plan home route card uses onboarding graphite shell for minimalDark', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/PersonalPlanHomeRouteCard.tsx'), 'utf8');

    expect(source).toContain("const isGraphite = themeMode === 'minimalDark'");
    expect(source).toContain("isGraphite ? '#F2B84B' : t.accent");
    expect(source).toContain("isGraphite ? ['#171410', '#070706'] as const : t.cardGradient");
    expect(source).toContain("isGraphite ? 'rgba(242,184,75,0.20)' : t.border");
    expect(source).toContain('const cardRadius = isGraphite ? 8 : 20');
    expect(source).toContain("const progressBg = isGraphite ? '#10100C' : t.bgSurface2");
  });

  test('home live card chrome has dedicated onboarding graphite tokens', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/(tabs)/home.tsx'), 'utf8');

    expect(source).toContain("const isGraphiteTheme = themeMode === 'minimalDark'");
    expect(source).toContain("const graphitePanel = ['#171410', '#070706'] as const");
    expect(source).toContain("const graphiteHairlineStrong = 'rgba(242,184,75,0.28)'");
    expect(source).toContain("const graphitePanelBg = 'rgba(17,16,12,0.86)'");
    expect(source).toContain("const graphiteHomeRadius = 8");
    expect(source).toContain('isGoldTheme ? goldPremiumPanel : isGraphiteTheme ? graphitePanel : t.cardGradient');
    expect(source).toContain('isGoldTheme ? GOLD_RICH.hairlineStrong : isGraphiteTheme ? graphiteHairlineStrong');
    expect(source).toContain('isGoldTheme ? goldHairline : isGraphiteTheme ? graphiteHairline');
    expect(source).toContain('isGoldTheme ? goldPanelBg : isGraphiteTheme ? graphitePanelBg');
    expect(source).toContain("isGoldTheme ? 'rgba(246,227,161,0.13)' : isGraphiteTheme ? 'rgba(242,184,75,0.12)'");
    expect(source).toContain("backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.10)' : isGraphiteTheme ? 'rgba(255,241,184,0.08)'");
    expect(source).toContain('borderRadius: isGraphiteTheme ? graphiteHomeRadius : 22');
    expect(source).toContain("backgroundColor: isGoldTheme ? goldPanelBg : isGraphiteTheme ? graphitePanelBg : '#1A3A5C'");
    expect(source).toContain('name="snow-outline"');
    expect(source).toContain("isGraphiteTheme ? '#FFF1B8' : '#4FC3F7'");
    expect(source).not.toContain('<Text style={{ fontSize: 28 }}>🧊</Text>');
  });
});
