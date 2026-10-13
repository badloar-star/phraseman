import fs from 'node:fs';
import path from 'node:path';

import { SAGE_PORCELAIN } from '../constants/theme';
import { tournamentV2FromTheme } from '../components/ui/v2_theme';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');

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
  // зачем (координатор §46, 2026-10-01): в темах 2.0 светлость определяет
  // isLightThemeMode (единственная светлая тема — sagePorcelain), а не сравнения
  // `=== 'sagePorcelain'` в каждом файле; капсула таб-бара 2.0 строится общими
  // токенами стекла, без отдельной ветки Sage. Числовые инварианты контраста
  // палитры Sage — прежние и обязательны.
  it('keeps the Sage palette contrast that the navigation capsule relies on', () => {
    const tabs = read('app/(tabs)/_layout.tsx');
    expect(tabs).not.toContain("themeMode === 'sagePorcelain'");
    expect(contrast(SAGE_PORCELAIN.correctText, SAGE_PORCELAIN.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('detects the light Sage theme on Home and bundles its nested icons', () => {
    const source = read('app/(tabs)/home.tsx');
    const theme = read('constants/theme.ts');
    const appJson = JSON.parse(read('app.json')) as {
      expo: { updates: { assetPatternsToBeBundled: string[] } };
    };

    expect(theme).toContain("export function isLightThemeMode(mode: ThemeMode): boolean { return mode === 'sagePorcelain'; }");
    expect(source).toContain('const isSketchLightTheme = isLightThemeMode(themeMode);');
    expect(appJson.expo.updates.assetPatternsToBeBundled).toContain('assets/images/home_menu/**/*');
    expect(contrast(SAGE_PORCELAIN.accent, SAGE_PORCELAIN.bgSurface2)).toBeGreaterThanOrEqual(3);
  });

  it('uses dark semantic ink on Sage lesson cards and removes the white glow', () => {
    const source = read('app/(tabs)/lessons.tsx');

    expect(source).toContain('const isSagePorcelainTheme = isLightThemeMode(themeMode);');
    // зачем (регрессия 13.10, a573bc660): светлая карточка урока определяется и по токенам (`lightCard`), не только по режиму темы
    expect(source).toContain('const isSagePorcelainCard = isLightThemeMode(_themeMode) || lightCard !== null;');
    // отступ ветки сменился — сверяем смысл, а не пробелы
    expect(source).toMatch(/isSagePorcelainTheme\s*\? t\.textPrimary/);
    expect(source).toMatch(/isSagePorcelainCard\s*\? \[bg, lightenHex\(bg, 1\.08\), lightenHex\(bg, 1\.14\)\]/);
    expect(source).toMatch(/isSagePorcelainCard\s*\? \[lightenHex\(bg, 1\.04\), bg, lightenHex\(bg, 1\.1\)\]/);
    expect(source).toContain('...(isSagePorcelainCard ? {} : LESSON_CARD_WHITE_TEXT_SHADOW)');
    expect(source).toContain('const lockedCardHasLightFill = isLightThemeMode(_themeMode) || lightCard !== null;');
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
    // 11.10: акцент как текст/значок на светлой карточке — токен accentText, а не заливочный accent
    expect(source).toContain('color={theme.accentText}');
  });
});
