import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buttonForegroundForBackground, colorContrast, readableOn } from '../constants/color_contrast';

const BUSINESS_SHEET_PALETTES = [
  { accent: '#0095F6', bgCard: '#0A0A0A' },
  { accent: '#0095F6', bgCard: '#FFFFFF' },
] as const;

describe('daily boon production sheet', () => {
  const hostPath = join(process.cwd(), 'components', 'BoonActivatedHost.tsx');
  const sheetPath = join(process.cwd(), 'components', 'BoonActivatedSheet.tsx');
  const shellPath = join(process.cwd(), 'components', 'modal_fx', 'HybridSheetShell.tsx');
  const impactHookPath = join(process.cwd(), 'components', 'celebration', 'use_reward_impact_hybrid.ts');
  const host = readFileSync(hostPath, 'utf8');
  const sheet = existsSync(sheetPath) ? readFileSync(sheetPath, 'utf8') : '';
  const shell = readFileSync(shellPath, 'utf8');
  const impactHook = readFileSync(impactHookPath, 'utf8');

  test('routes production display through the new Hybrid bottom sheet', () => {
    expect(existsSync(sheetPath)).toBe(true);
    expect(host).toContain("import BoonActivatedSheet from './BoonActivatedSheet'");
    expect(host).toContain('<BoonActivatedSheet visible={visible} boon={boon} onClose={close} />');
    expect(sheet).toContain('<HybridSheetShell');
    expect(sheet).toContain('useRewardImpactHybrid');
    expect(sheet).toContain('RewardImpactRings');
  });

  test('uses the shared idempotent animated dismiss path for the CTA', () => {
    expect(shell).toContain('requestDismiss: dismissSheet');
    expect(shell).toContain("typeof children === 'function'");
    expect(sheet).toContain('{({ requestDismiss }) => (');
    expect(sheet).toContain('onPress={requestDismiss}');
    expect(sheet).not.toContain('onPress={onClose}');
    expect(sheet).not.toContain('onPress={handleClose}');
  });

  test('uses themed accessible controls and the existing boon art', () => {
    expect(sheet).toContain('weeklyBoonIconSource(boon, themeMode)');
    expect(sheet).toContain('accessible={false}');
    expect(sheet).toContain('accessibilityLabel={ctaLabel}');
    expect(sheet).toContain('accessibilityHint={closeLabel}');
    expect(sheet).toContain('accessibilityRole="header"');
    expect(sheet).toContain('backdropAccessible={false}');
    expect(shell).toContain('accessibilityViewIsModal');
    expect(sheet).toContain('backgroundColor: t.accent');
    expect(sheet).toContain('buttonForegroundForBackground(t.accent)');
    expect(sheet).toContain('readableOn(t.accent, t.bgCard, 4.5)');
  });

  test.each(BUSINESS_SHEET_PALETTES)('derives AA text colors on the actual sheet palette', (theme) => {
    expect(colorContrast(buttonForegroundForBackground(theme.accent), theme.accent)).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(readableOn(theme.accent, theme.bgCard, 4.5), theme.bgCard)).toBeGreaterThanOrEqual(4.5);
  });

  test('keeps the sheet informational with one finite ring, no dust, and no reduced-motion decoration', () => {
    expect(sheet).toContain('show={impact.showRings && !impact.reduceMotion}');
    expect(sheet).toContain('ringCount={1}');
    expect(sheet).toContain('dustCount={0}');
    expect(sheet).not.toContain('registerXP');
    expect(sheet).not.toContain('applyGift');
    expect(sheet).not.toContain('claim');
  });

  test('resolves title and description on distinct shared-token ladder steps', () => {
    expect(sheet).toContain('<Animated.View style={impact.styles.text}>');
    expect(sheet).toContain('<Animated.View style={impact.styles.subtitle}>');
    expect(impactHook).toContain('subtitleOpacity');
    expect(impactHook).toContain('subtitleY');
    expect(impactHook).toContain('subtitleOpacity.value = withDelay(CHK.ladder[2]');
    expect(impactHook).toContain('cancelAnimation(subtitleOpacity)');
    expect(impactHook).toContain('cancelAnimation(subtitleY)');
    expect(impactHook).toContain('subtitle: subtitleStyle');
  });

  test('supports 200% text and scroll/reflow while keeping the CTA outside the scroll area', () => {
    expect(sheet).toContain('<ScrollView');
    expect(sheet).toContain('maxFontSizeMultiplier={2}');
    expect(sheet.indexOf('</ScrollView>')).toBeLessThan(sheet.indexOf('<PressableHybrid'));
  });
});
