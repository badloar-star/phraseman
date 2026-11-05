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

  test('renders the frozen C geometry and exactly three flat benefit rows', () => {
    expect(benefits).toContain('PAYWALL_C_BENEFIT_COUNT = 3');
    expect(plus).toContain('fontSize: 32');
    expect(plus).toContain('lineHeight: 38');
    expect(plus).toContain('paddingHorizontal: 24');
    expect(plus).toContain('minHeight: 44');
    expect(plus).toContain('cta: { minHeight: 54, borderRadius: 28');
    expect(plus).toContain('style={[S.cta, { backgroundColor: g.ctaFill }]}');
    expect(plus).not.toContain('ctaFillGradient');
    expect(screen).toContain('style={[S.sheet, { backgroundColor: g.bg, maxHeight:');
    expect(screen).not.toContain('backgroundColor: paywallSheetBg(g)');
    expect(screen).not.toContain('<PaywallPlusTrialTimeline');
    expect(plus).not.toContain('<PaywallPlusComparison');
  });

  test('renders side-by-side store plans while retaining real promo/trial/source fields', () => {
    expect(plans).toContain('flexDirection: \'row\'');
    expect(plans).toContain('const PLAN_ROW_GAP = 10');
    expect(plans).toContain('const PLAN_ROW_RADIUS = 18');
    expect(plans).toContain('yearlyPromo');
    expect(plans).toContain('monthlyPromo');
    expect(plans).toContain("yearlyPriceSource === 'reference'");
    expect(plans).toContain('yearlyTrialDays');
    expect(plans).toContain('monthlyTrialDays');
  });

  test('embedded onboarding adopts the same C markers without replacing its handlers', () => {
    expect(onboarding).toContain('testID="onboarding-paywall-c-benefits"');
    expect(onboarding).toContain('void continueFromOnboardingPaywall()');
    expect(onboarding).toContain('void completeOnboarding()');
    expect(onboarding).toContain('else void handleRestore()');
    expect(onboarding).toContain('onPress={choosePaywallPlan}');
  });
});
