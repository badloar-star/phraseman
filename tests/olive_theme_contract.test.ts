import { OLIVE } from '../constants/theme';
import { SELECTABLE_THEME_MODES, themeAccessTier } from '../app/theme_access_policy';
import { BG_GRADIENTS } from '../constants/screenBackground';

function luminance(hex: string): number {
  const rgb = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => Number.parseInt(part, 16) / 255);
  const [r, g, b] = rgb.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe('Olive Noir theme contract', () => {
  it('is a selectable Plus-only dark theme with the agreed quiet-luxury palette', () => {
    expect(SELECTABLE_THEME_MODES).toContain('olive');
    expect(themeAccessTier('olive')).toBe('plus');
    expect(OLIVE.bgPrimary).toBe('#050604');
    expect(OLIVE.accent).toBe('#C9A84C');
    expect(OLIVE.textPrimary).toBe('#F4ECD8');
    expect(OLIVE.cardGradient).toEqual(['#232719', '#090A08']);
    expect(BG_GRADIENTS.olive).toEqual(['#1A1E12', '#0B0D08', '#030303']);
  });

  it('keeps readable text and dark foregrounds on all bright Olive fills', () => {
    expect(contrast(OLIVE.textGhost, OLIVE.bgSurface2)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(OLIVE.correctText, OLIVE.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(OLIVE.correctText, OLIVE.correct)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(OLIVE.textOnGold, OLIVE.gold)).toBeGreaterThanOrEqual(4.5);
  });
});
