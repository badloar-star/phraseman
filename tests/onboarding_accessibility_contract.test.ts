import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('clean onboarding accessibility contract', () => {
  it('traps and moves accessibility focus for both custom modals', () => {
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('AccessibilityInfo.setAccessibilityFocus');
    expect(source).toContain('onAccessibilityEscape');
    expect(source).toContain('onShow={focusCodeInput}');
    expect(source).toContain('restorePaywallMenuFocus');
  });

  it('announces dynamic failures and statuses', () => {
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain('AccessibilityInfo.announceForAccessibility');
  });

  it('keeps custom controls at least 48 dp high', () => {
    expect(source).toMatch(/textButton:\s*{[\s\S]{0,160}minHeight: 48/);
    expect(source).toMatch(/moreOffersLink:\s*{[\s\S]{0,160}minHeight: 48/);
    expect(source).toMatch(/offersFreeLink:\s*{[\s\S]{0,160}minHeight: 48/);
    expect(source).toMatch(/offersLinkButton:\s*{[\s\S]{0,160}minHeight: 48/);
    expect(source).toMatch(/paywallMenuButton:\s*{[\s\S]{0,160}width: 48[\s\S]{0,80}height: 48/);
  });

  it('supports large text without fixed-height price and offer rows', () => {
    expect(source).not.toContain('numberOfLines={1}>{price}</Text>');
    expect(source).toMatch(/offerRow:\s*{[\s\S]{0,160}minHeight: 64/);
    expect(source).toContain('<ScrollView');
  });

  it('uses dark foreground on the bright green success surfaces', () => {
    expect(source).toContain('color="#07110A"');
    expect(source).toMatch(/promiseBadgeUpText:\s*{[\s\S]{0,100}color: '#07110A'/);
  });
});
