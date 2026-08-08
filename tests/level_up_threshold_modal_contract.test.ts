import { readFileSync } from 'fs';
import { join } from 'path';
import { THRESHOLD_LEVEL_UP_PALETTES } from '../components/levelUpThresholdTheme';

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Threshold level-up modal contract', () => {
  const layoutSource = readFileSync(join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
  const modalSource = readFileSync(join(process.cwd(), 'components', 'LevelUpThresholdModal.tsx'), 'utf8');
  const paletteSource = readFileSync(join(process.cwd(), 'components', 'levelUpThresholdTheme.ts'), 'utf8');

  test('uses the Threshold surface while preserving the global native Modal lifecycle', () => {
    expect(layoutSource).toContain('<LevelUpThresholdModal');
    expect(modalSource).toContain('<Modal');
    expect(modalSource).toContain('onShow={onShow}');
    expect(modalSource).toContain('testID="level-up-modal"');
  });

  test('renders only rewards confirmed by runtime state', () => {
    expect(layoutSource).toContain('titleReward={isNewTitle ? newTitleDef.titleEN : undefined}');
    expect(layoutSource).toContain('energyReward={currentLevel === 50 ? getMaxEnergyForLevel(currentLevel) : undefined}');
    expect(layoutSource).toContain('spinReward={currentIsSpin}');
    expect(modalSource).toContain('{titleReward && (');
    expect(modalSource).toContain('{energyReward !== undefined && (');
    expect(modalSource).toContain('{spinReward && (');
  });

  test('uses the shared durable-receipt spin plaque while keeping its primary action', () => {
    expect(modalSource).toContain('testID="level-up-dismiss"');
    expect(modalSource).toContain('accessibilityRole="button"');
    expect(modalSource).toContain("import { SpinRewardPlaque } from './SpinRewardPlaque'");
    expect(modalSource).toContain('<SpinRewardPlaque');
    expect(modalSource).toContain('receiptId={spinReceiptId}');
    expect(layoutSource).toContain('spinReceiptId={currentIsSpin ? levelSpinCreditId(currentLevel) : \'\'}');
    expect(modalSource).not.toContain('icon="sync"');
  });

  test('does not render preview-only reward container copy', () => {
    expect(modalSource).not.toContain('rewardsLabel');
    expect(layoutSource).not.toContain('rewardsLabel="ÐŸÑ€ÐµÐ´Ð¿Ñ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€"');
  });

  test.each([
    'dark',
    'gold',
    'minimalDark',
    'midnight',
    'ember',
    'aurora',
    'volt',
    'business',
    'businessLight',
    'candyBlue',
    'indigo',
    'sagePorcelain',
  ])('defines a unique palette for %s', (themeMode) => {
    expect(paletteSource).toContain(`${themeMode}: {`);
  });

  test('does not reuse a palette between interface themes', () => {
    const serializedPalettes = Object.values(THRESHOLD_LEVEL_UP_PALETTES).map((palette) => JSON.stringify(palette));
    expect(new Set(serializedPalettes).size).toBe(12);
  });

  test('keeps Sage Porcelain eucalyptus-only without the retired bronze accent', () => {
    expect(THRESHOLD_LEVEL_UP_PALETTES.sagePorcelain.accentSecondary).toBe('#4F786D');
    expect(paletteSource).not.toContain('#7B5A23');
  });

  test.each(Object.entries(THRESHOLD_LEVEL_UP_PALETTES))(
    'keeps primary, muted, and CTA text WCAG AA readable in %s',
    (_themeMode, palette) => {
      expect(contrastRatio(palette.textPrimary, palette.background[1])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.textMuted, palette.background[1])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.accentSecondary, palette.background[1])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.buttonText, palette.button[1])).toBeGreaterThanOrEqual(4.5);
    },
  );

  test('keeps the choreography finite and limited to transform and opacity', () => {
    expect(modalSource).toContain('Animated.Value');
    expect(modalSource).not.toContain('withRepeat');
    expect(modalSource).not.toContain('animationIterationCount');
    expect(modalSource).toContain('rewardRevealStyle');
    expect(modalSource).toContain('actionRevealStyle');
  });

  test('exposes standard and every-fifth-level presentation variants', () => {
    expect(modalSource).toContain("export type LevelUpPreviewVariant = 'standard' | 'milestone'");
    expect(modalSource).toContain("variant = 'standard'");
    expect(modalSource).toContain("const milestone = variant === 'milestone'");
    expect(modalSource).toContain('testID={`level-up-portal-${variant}`}');
    expect(modalSource).toContain('milestone && styles.portalStageMilestone');
    expect(layoutSource).toContain("variant={currentLevel % 5 === 0 ? 'milestone' : 'standard'}");
  });

  test('keeps both variants accessible when reduced motion is enabled', () => {
    expect(modalSource).toContain('useReducedMotion()');
    expect(modalSource).toContain('if (reduceMotion) return { opacity: 1 }');
    expect(modalSource).toContain('reduceMotion || !milestone');
  });
});
