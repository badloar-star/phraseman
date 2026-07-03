import fs from 'fs';
import path from 'path';

const root = process.cwd();
const variants = ['a', 'b', 'c'] as const;

function readPaywall(variant: (typeof variants)[number]) {
  return fs.readFileSync(path.join(root, 'app', `paywall_${variant}.tsx`), 'utf8');
}

describe('onboarding A/B/C paywall chrome contract', () => {
  it.each(variants)('hides the close button only in onboarding variant %s', (variant) => {
    const source = readPaywall(variant);
    expect(source).toContain("const isOnboarding = source === 'onboarding_plan';");
    expect(source).toContain('{!isOnboarding ? (');
    expect(source).toContain('<PaywallCloseButton');
    expect(source).toContain("closeWithDim('close')");
  });

  it.each(variants)('keeps an onboarding-only sticky CTA for variant %s', (variant) => {
    const source = readPaywall(variant);
    expect(source).toContain('useStickyCta');
    expect(source).toContain('stickyStringsFor');
    expect(source).toContain('scrollOnboardingStickyPad');
    expect(source).toContain('<PaywallStickyBar');
    expect(source).toContain('visible={isOnboarding && sticky.visible && !p.ctaDisabled}');
    expect(source).toContain('onLayout={isOnboarding ? sticky.onViewportLayout : undefined}');
    expect(source).toContain('onLayout={isOnboarding ? sticky.onCtaLayout : undefined}');
  });

  it.each(variants)('uses the midnight onboarding chrome without changing the normal paywall theme for variant %s', (variant) => {
    const source = readPaywall(variant);
    expect(source).toContain("usePaywallChrome(isOnboarding ? 'midnight' : undefined)");
    expect(source).toContain('isOnboarding={isOnboarding}');
  });
});
