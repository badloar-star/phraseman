import fs from 'fs';
import path from 'path';

const mockResolveVariant = jest.fn(() => ({ variant: 'G' as const }));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    },
  },
}));
jest.mock('../app/paywall_variant', () => ({
  refreshPaywallAbConfigInBackground: jest.fn(),
  resolvePaywallAbVariantSync: () => mockResolveVariant(),
}));

import { openPremiumPaywall } from '../app/paywall_navigation';

describe('typed paywall entry pipeline', () => {
  beforeEach(() => jest.clearAllMocks());

  test('canonical acquisition navigation always enters the entitlement-safe premium modal', () => {
    const router = { push: jest.fn(), replace: jest.fn() };

    openPremiumPaywall(router, {
      context: 'flashcard_training',
      source: 'flashcards_training_direct',
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: {
        context: 'flashcard_training',
        source: 'flashcards_training_direct',
      },
    });
    expect(mockResolveVariant).not.toHaveBeenCalled();
  });

  test('manage navigation remains outside acquisition and preserves known params', () => {
    const router = { push: jest.fn(), replace: jest.fn() };

    openPremiumPaywall(router, { manage: '1', plan: 'yearly' }, 'replace');

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/manage_subscription',
      params: { plan: 'yearly' },
    });
    expect(mockResolveVariant).not.toHaveBeenCalled();
  });

  test('winback entry emits the truthful winback context through the typed dispatcher', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    expect(source).toContain("params: { context: 'winback', source: 'winback' }");
    expect(source).not.toContain("params: { context: 'streak', source: 'winback' }");
  });

  test.each(['a', 'b', 'c', 'd', 'e', 'f', 'g'])('paywall %s consumes the dispatcher entry instead of minting a disconnected identity', (variant) => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', `paywall_${variant}.tsx`), 'utf8');
    const component = variant.toUpperCase();

    expect(source).toContain("import type { PaywallEntry } from './paywall_entry_contract';");
    expect(source).toContain("import DirectPaywallRoute from './direct_paywall_route';");
    expect(source).toContain(`export function Paywall${component}View({ entry }: { readonly entry: PaywallEntry })`);
    expect(source).toContain('const ctx = entry.context;');
    expect(source).toContain('const source = entry.source;');
    expect(source).toContain('createPaywallAnalyticsImpression(() => entry.impressionId)');
    expect(source).toContain('const entryAnalytics = useMemo(() => paywallEntryAnalyticsParams({');
    expect(source).toContain('...entryAnalytics, ...paywallImpressionParams(analyticsImpression)');
    expect(source).toContain(`return <DirectPaywallRoute render={(entry) => <Paywall${component}View entry={entry} />} />;`);
    expect(source).not.toContain('entry?.context');
    expect(source).not.toContain('entry?.source');
  });
});
