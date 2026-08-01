import { isLightThemeMode, SAGE_PORCELAIN, type Theme, type ThemeMode } from '../constants/theme';

function relativeLuminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Expected a six-digit hex color, received ${hex}`);

  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Sage Porcelain theme contract', () => {
  it('uses the approved primary palette tokens', () => {
    expect(SAGE_PORCELAIN).toMatchObject({
      bgPrimary: '#F0F1EC',
      bgCard: '#FCFDF9',
      textPrimary: '#17201D',
      textOnCard: '#17201D',
      textSecond: '#3C5A50',
      textMuted: '#52605A',
      textGhost: '#61706A',
      accent: '#315F50',
      correct: '#2F6F4F',
      wrong: '#A8464D',
      gold: '#8B6320',
    });
  });

  it.each([
    ['textPrimary on bgPrimary', SAGE_PORCELAIN.textPrimary, SAGE_PORCELAIN.bgPrimary],
    ['textPrimary on bgCard', SAGE_PORCELAIN.textPrimary, SAGE_PORCELAIN.bgCard],
    ['textSecond on bgPrimary', SAGE_PORCELAIN.textSecond, SAGE_PORCELAIN.bgPrimary],
    ['textMuted on bgPrimary', SAGE_PORCELAIN.textMuted, SAGE_PORCELAIN.bgPrimary],
    ['textGhost on bgPrimary', SAGE_PORCELAIN.textGhost, SAGE_PORCELAIN.bgPrimary],
    ['white on accent', '#FFFFFF', SAGE_PORCELAIN.accent],
    ['white on correct', '#FFFFFF', SAGE_PORCELAIN.correct],
    ['white on wrong', '#FFFFFF', SAGE_PORCELAIN.wrong],
    ['white on gold', '#FFFFFF', SAGE_PORCELAIN.gold],
  ])('meets WCAG AA contrast for %s', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('is a light theme mode with the Theme shape', () => {
    const mode: ThemeMode = 'sagePorcelain';
    const theme: Theme = SAGE_PORCELAIN;

    expect(mode).toBe('sagePorcelain');
    expect(theme).toBe(SAGE_PORCELAIN);
    expect(isLightThemeMode('sagePorcelain')).toBe(true);
    expect(isLightThemeMode('indigo')).toBe(false);
  });
});
