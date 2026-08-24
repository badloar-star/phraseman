import fs from 'fs';
import path from 'path';
import { inferPremiumPlanFromProductId, revenueCatMaxMetadata } from '../app/premium_revenuecat_state';
import {
  revenueCatCustomerInfoHasMaxAccess,
  revenueCatCustomerInfoHasPremiumAccess,
} from '../app/revenuecat_premium_access';
import { resolveMaxPackage } from '../app/revenuecat_init';
import { purchaseMaxSubscription, restoreMaxSubscription } from '../modules/max_subscription/purchase';

const APP_STORE_MAX_PRODUCT = 'phraseman_max_monthly_v1';
const PLAY_MAX_PRODUCT = 'phraseman_max_monthly_v1:monthly-base';

function packageFor(productIdentifier: string, packageIdentifier = 'max_monthly') {
  return {
    identifier: packageIdentifier,
    packageType: 'CUSTOM',
    product: { identifier: productIdentifier },
  };
}

describe('MAX RevenueCat purchase contract', () => {
  it('maps the exact App Store and Google Play products to max_monthly', () => {
    expect(inferPremiumPlanFromProductId(APP_STORE_MAX_PRODUCT)).toBe('max_monthly');
    expect(inferPremiumPlanFromProductId(PLAY_MAX_PRODUCT)).toBe('max_monthly');
    expect(inferPremiumPlanFromProductId('phraseman_premium_monthly_399')).toBe('monthly');
  });

  it('grants MAX only from the active max entitlement while keeping MAX as Premium', () => {
    const maxOnly = {
      entitlements: { active: { max: { productIdentifier: APP_STORE_MAX_PRODUCT } } },
      activeSubscriptions: [APP_STORE_MAX_PRODUCT],
    };
    const plusOnly = {
      entitlements: { active: { premium: { productIdentifier: 'phraseman_premium_monthly_399' } } },
      activeSubscriptions: ['phraseman_premium_monthly_399'],
    };

    expect(revenueCatCustomerInfoHasMaxAccess(maxOnly as any)).toBe(true);
    expect(revenueCatCustomerInfoHasPremiumAccess(maxOnly as any)).toBe(true);
    expect(revenueCatCustomerInfoHasMaxAccess(plusOnly as any)).toBe(false);
  });

  it('persists metadata from MAX when premium and max entitlements are simultaneously active', () => {
    const info = {
      entitlements: { active: {
        premium: {
          productIdentifier: 'phraseman_premium_monthly_399',
          store: 'APP_STORE',
          expirationDateMillis: 1_000,
        },
        max: {
          productIdentifier: PLAY_MAX_PRODUCT,
          store: 'PLAY_STORE',
          expirationDateMillis: 9_000,
          latestPurchaseDateMillis: 2_000,
        },
      } },
      activeSubscriptions: ['phraseman_premium_monthly_399', PLAY_MAX_PRODUCT],
    };

    expect(revenueCatMaxMetadata(info as any)).toEqual(expect.objectContaining({
      productId: PLAY_MAX_PRODUCT,
      store: 'PLAY_STORE',
      expiryMs: 9_000,
      purchasedMs: 2_000,
    }));
  });

  it('selects only the custom max_monthly package from the max offering', () => {
    const appStore = packageFor(APP_STORE_MAX_PRODUCT);
    const googlePlay = packageFor(PLAY_MAX_PRODUCT);
    const offerings = {
      current: { identifier: 'premium', availablePackages: [packageFor('phraseman_premium_monthly_399', '$rc_monthly')] },
      all: {
        max: { identifier: 'max', availablePackages: [appStore, googlePlay] },
      },
    };

    expect(resolveMaxPackage(offerings as any, APP_STORE_MAX_PRODUCT)).toBe(appStore);
    expect(resolveMaxPackage(offerings as any, PLAY_MAX_PRODUCT)).toBe(googlePlay);
    expect(resolveMaxPackage(offerings as any, 'phraseman_premium_monthly_399')).toBeUndefined();
  });

  it('routes voice_max_required to the dedicated MAX purchase surface', () => {
    const root = process.cwd();
    const prestart = fs.readFileSync(path.join(root, 'app', 'max_call_prestart.tsx'), 'utf8');
    const paywallPath = path.join(root, 'app', 'max_paywall.tsx');

    expect(prestart).toContain('shouldOfferMaxUpgradeForVoiceReason(preflightReason)');
    expect(prestart).toContain("pathname: '/max_paywall'");
    expect(fs.existsSync(paywallPath)).toBe(true);
    const paywall = fs.readFileSync(paywallPath, 'utf8');
    expect(paywall).toContain('purchaseMaxSubscription');
    expect(paywall).toContain('120');
    expect(paywall).toContain('20');
    expect(typeof purchaseMaxSubscription).toBe('function');
    expect(typeof restoreMaxSubscription).toBe('function');
  });

  it('renders the MAX upgrade CTA in both prestart branches when lifetime access is exhausted', () => {
    const prestart = fs.readFileSync(
      path.join(process.cwd(), 'app', 'max_call_prestart.tsx'),
      'utf8',
    );

    expect(prestart).toContain('shouldOfferMaxUpgradeForVoiceReason(preflightReason)');
    expect(prestart.match(/testID="max-subscribe-button"/g)).toHaveLength(2);
  });

  it('keeps an already-paid MAX purchase in activation state until server projection confirms it', () => {
    const paywall = fs.readFileSync(path.join(process.cwd(), 'app', 'max_paywall.tsx'), 'utf8');

    expect(paywall).toContain('confirmMaxSubscriptionActivation');
    expect(paywall).toContain("'activation'");
    expect(paywall).toContain('storeConfirmed');
    expect(paywall).not.toMatch(/status === 'purchased'[^\n]+finish\(\)/);
  });
});
