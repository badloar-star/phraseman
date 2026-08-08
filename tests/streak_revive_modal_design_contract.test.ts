import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'StreakReviveModal.tsx'),
  'utf8',
);

function between(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function numericStyleValue(styleName: string, property: string): number {
  const styleStart = source.indexOf(`${styleName}: {`);
  expect(styleStart).toBeGreaterThanOrEqual(0);
  const styleEnd = source.indexOf('\n  },', styleStart);
  expect(styleEnd).toBeGreaterThan(styleStart);
  const styleBlock = source.slice(styleStart, styleEnd);
  const match = styleBlock.match(new RegExp(`${property}:\\s*(\\d+)`));
  expect(match).not.toBeNull();
  return Number(match?.[1]);
}

describe('streak revive modal design contract', () => {
  it('imports the responsive hook it calls at runtime', () => {
    expect(source).toContain('useWindowDimensions');
    expect(source).toMatch(/import \{[^}]*useWindowDimensions[^}]*\} from 'react-native';/s);
  });

  it('uses the standalone asymmetric recovery pass', () => {
    expect(source).not.toContain("from './reward_v2/RewardCardV2'");
    expect(source).toContain('testID="streak-revive-pass"');
    expect(source).toContain('testID="streak-revive-header"');
    expect(source).toContain('testID="streak-revive-backdrop"');
    expect(source).toContain('testID="streak-revive-close"');
    expect(source).toContain('testID="streak-revive-primary"');
    expect(source).toContain('testID="streak-revive-secondary"');
    expect(source.indexOf('testID="streak-revive-backdrop"')).toBeLessThan(
      source.indexOf('testID="streak-revive-pass"'),
    );
  });

  it('keeps each modal control borderless, isolated, and accessible', () => {
    expect(source).not.toMatch(/borderWidth\s*:/);
    expect(source).not.toMatch(/borderColor\s*:/);
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).not.toContain('onStartShouldSetResponder');

    const backdrop = between('testID="streak-revive-backdrop"', 'testID="streak-revive-pass"');
    const close = between('testID="streak-revive-close"', 'testID="streak-revive-primary"');
    const primary = between('testID="streak-revive-primary"', 'testID="streak-revive-secondary"');
    const secondary = between('testID="streak-revive-secondary"', '</ScrollView>');

    for (const control of [backdrop, close, primary, secondary]) {
      expect(control).toContain('accessibilityRole="button"');
      expect(control).toContain('disabled={busy}');
      expect(control).toContain('accessibilityState={{ disabled: busy }}');
    }
    for (const dismissControl of [backdrop, close, secondary]) {
      expect(dismissControl).toContain('onPress={handleDismiss}');
    }
    expect(primary).toContain('void onConfirm()');
  });

  it('preserves restore, dismiss, timer, and shop behavior', () => {
    expect(source).toContain('onRequestClose={handleDismiss}');
    const dismissStart = source.indexOf('const handleDismiss = useCallback');
    const dismissEnd = source.indexOf('}, [busy, onDismiss]);', dismissStart);
    const dismissBody = source.slice(dismissStart, dismissEnd);
    expect(dismissBody).toContain('if (busy) return;');
    expect(dismissBody).toContain('onDismiss();');
    expect(source).toContain('setInterval(tick, 1000)');
    expect(source).toContain("source: 'streak_revive'");
  });

  it('provides compact scrolling, scalable streak text, and a localized busy label', () => {
    expect(source).toContain('fontScale > 1.15');
    expect(source).toContain('styles.headerCompact');
    expect(source).toContain('styles.streakNumberCompact');
    expect(source).toContain('style={styles.bodyScroll}');
    expect(source).not.toContain('adjustsFontSizeToFit');
    expect(source).toContain('{busy ? busyLabel : primaryLabel}');
  });

  it('gives the large streak numeral enough line height to avoid clipping its top edge', () => {
    for (const styleName of ['streakNumber', 'streakNumberCompact']) {
      const fontSize = numericStyleValue(styleName, 'fontSize');
      const lineHeight = numericStyleValue(styleName, 'lineHeight');
      expect(lineHeight).toBeGreaterThanOrEqual(fontSize);
    }
  });
});
