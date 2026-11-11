import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('owner-selected native paywall C contract', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const plus = read('components/paywall/PaywallPlus.tsx');
  const benefits = read('components/paywall/PaywallCBenefits.tsx');
  const plans = read('components/paywall/PaywallPlanRows.tsx');
  const onboarding = read('components/CleanOnboarding.tsx');

  test('every shared-route context uses C without the remote M visual bypass', () => {
    expect(screen).toContain('<PaywallSwipeSheet');
    expect(screen).not.toContain('<PaywallMSheet');
    expect(benefits).toContain('testID="paywall-c-benefits"');
    expect(screen).toContain('resilientCheckout: true');
  });

  test('keeps close, restore, promo, resilient purchase and server-refused controls wired', () => {
    expect(screen).toContain('closeVisible={controlVisibility.closeVisible}');
    expect(screen).toContain('restoreVisible={controlVisibility.restoreVisible}');
    expect(screen).toContain('promoVisible={controlVisibility.promoVisible}');
    expect(screen).toContain('serverRefused={serverRefused}');
    expect(screen).toContain('disabled={ctaBusy}');
    expect(screen).toContain('closeDisabled={checkoutInFlight}');
    expect(screen).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(screen).toContain('onSwipeClose={onSwipeClose}');
    expect(screen).toContain("p.handleClose('close', 'swipe');");
    expect(screen).toContain('void p.handlePurchase();');
    expect(screen).toContain('void p.handleRestore();');
    expect(screen).toContain('parseResumeLessonId(params.resume_lesson_id)');
    expect(screen).toContain('paywallImpressionParams(impression)');
  });

  test('shows the prices and purchase action before benefits in a single scroll', () => {
    const scroll = screen.slice(screen.indexOf('<PaywallPlusScroll '), screen.indexOf('</PaywallPlusScroll>'));
    const plansStart = scroll.indexOf('<PaywallPlusPlans ');
    expect(plansStart).toBeGreaterThan(scroll.indexOf('planSection={'));
    expect(scroll.indexOf('<PlusTabBenefits')).toBeGreaterThan(plansStart);
    const firstScreen = plus.indexOf('testID="paywall-first-screen"');
    expect(firstScreen).toBeGreaterThan(-1);
    const dock = plus.slice(firstScreen, plus.indexOf('{children}', firstScreen));
    expect(dock).toContain('minHeight: viewportHeight');
    expect(dock).toContain('{planSection}');
    expect(dock).toContain("'paywall-cta'");
    expect(plus).toContain("firstScreen: { justifyContent: 'center'");
    expect(plus).toContain('style={[S.cta, { backgroundColor: g.ctaFill }]}');
    expect(screen).toContain('style={[S.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}');
    expect(screen).not.toContain('backgroundColor: paywallSheetBg(g)');
    expect(screen).not.toContain('<PaywallPlusTrialTimeline');
    expect(plus).not.toContain('<PaywallPlusComparison');
  });

  test('renders metallic store plans while retaining real promo, trial, and reference-price disclosure', () => {
    expect(plans).toContain('flexDirection: \'row\'');
    expect(plans).toContain('const PLAN_ROW_GAP = 10');
    expect(plans).toContain('const PLAN_ROW_RADIUS = 16'); // макет: радиус плитки 16
    expect(plans).toContain('yearlyPromo');
    expect(plans).toContain('monthlyPromo');
    expect(plans).toContain('<LinearGradient');
    expect(plans).toContain('pinColorsForTier(tier, g.isLight)');
    expect(screen).toContain('p.pricesApproximate');
    expect(plans).toContain('yearlyTrialDays');
    expect(plans).toContain('monthlyTrialDays');
  });

  test('embedded onboarding adopts the same C markers without replacing its handlers', () => {
    const plans = onboarding.indexOf('testID="onboarding-paywall-plan-yearly"');
    const benefits = onboarding.indexOf('testID="onboarding-paywall-c-benefits"');
    expect(plans).toBeGreaterThan(-1);
    expect(benefits).toBeGreaterThan(plans);
    expect(onboarding).toContain('void continueFromOnboardingPaywall()');
    expect(onboarding).toContain('void completeOnboarding()');
    expect(onboarding).toContain('onPress={() => { void handleRestore(); }}');
    expect(onboarding).not.toContain('MoreOffersSheet');
    expect(onboarding).toContain('onPress={choosePaywallPlan}');
  });
});
