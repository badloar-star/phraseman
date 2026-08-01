import fs from 'node:fs';
import path from 'node:path';

import { SAGE_PORCELAIN } from '../constants/theme';
import { tournamentV2FromTheme } from '../components/tournament/tournament_theme';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const channels = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Sage Porcelain real-device visibility regressions', () => {
  it('uses the Sage accent navigation capsule with readable light icons', () => {
    const source = read('app/(tabs)/_layout.tsx');

    expect(source).toContain("const isSagePorcelainTabChrome = themeMode === 'sagePorcelain';");
    expect(source).toContain('const tabPillBackground = isSagePorcelainTabChrome ? t.accent : TAB_UNDERLAY_DIM_BG;');
    expect(source).toContain('const tabIconActive = isSagePorcelainTabChrome ? t.correctText : t.accent;');
    expect(source).toContain('const tabIconMuted = isSagePorcelainTabChrome');
    expect(source).toContain('withAlpha(t.correctText, 0.72)');
    expect(source).toContain('const color = visuallyFocused ? tabIconActive : tabIconMuted;');
    expect(source).toContain('borderColor: isSagePorcelainTabChrome ? t.btnShadow : \'transparent\'');
    expect(contrast(SAGE_PORCELAIN.correctText, SAGE_PORCELAIN.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives Sage home tiles semantic light surfaces and bundles their nested icons', () => {
    const source = read('app/(tabs)/home.tsx');
    const appJson = JSON.parse(read('app.json')) as {
      expo: { updates: { assetPatternsToBeBundled: string[] } };
    };

    expect(source).toContain("const isSketchLightTheme = themeMode === 'sagePorcelain';");
    expect(source).toContain("const isPaperHomeTheme = themeMode === 'sagePorcelain';");
    expect(source).toContain("const sketchHomePanelGradient = [t.bgCard, t.bgSurface]");
    expect(source).toContain('borderColor: isPaperHomeTheme ? homeThemePanelBorder : \'transparent\'');
    expect(source).toContain('const homeThemeTrackBg = isPaperHomeTheme ? t.bgSurface2');
    expect(source).toContain('colors={isPaperHomeTheme ? [t.accent, t.accent]');
    expect(appJson.expo.updates.assetPatternsToBeBundled).toContain('assets/images/home_menu/**/*');
    expect(contrast(SAGE_PORCELAIN.accent, SAGE_PORCELAIN.bgSurface2)).toBeGreaterThanOrEqual(3);
  });

  it('uses dark semantic ink on Sage lesson cards and removes the white glow', () => {
    const source = read('app/(tabs)/lessons.tsx');

    expect(source).toContain("const isSagePorcelainTheme = themeMode === 'sagePorcelain';");
    expect(source).toContain('isSagePorcelainTheme\n    ? t.textPrimary');
    expect(source).toMatch(/isSagePorcelainCard\s*\? \[bg, lightenHex\(bg, 1\.08\), lightenHex\(bg, 1\.14\)\]/);
    expect(source).toMatch(/isSagePorcelainCard\s*\? \[lightenHex\(bg, 1\.04\), bg, lightenHex\(bg, 1\.1\)\]/);
    expect(source).toContain('...(isSagePorcelainCard ? {} : LESSON_CARD_WHITE_TEXT_SHADOW)');
    expect(source).toContain("const lockedCardHasLightFill = _themeMode === 'sagePorcelain';");
  });

  it('keeps both Sage tournament hero gradient stops readable on the light hero surface', () => {
    const palette = tournamentV2FromTheme(SAGE_PORCELAIN, 'sagePorcelain');

    expect(palette.heroGradA).toBe(SAGE_PORCELAIN.textPrimary);
    expect(palette.heroGradB).toBe(SAGE_PORCELAIN.accent);
    expect(contrast(palette.heroGradA, SAGE_PORCELAIN.bgSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.heroGradB, SAGE_PORCELAIN.bgSurface)).toBeGreaterThanOrEqual(4.5);
  });

  it('renders a stable semantic fallback beneath the referral artwork', () => {
    const source = read('components/ReferralInviteBannerArt.tsx');

    expect(source).toContain('styles.fallback');
    expect(source).toContain('name="gift-outline"');
    expect(source).toContain('backgroundColor: theme.bgSurface2');
    expect(source).toContain('color={theme.accent}');
  });
});
