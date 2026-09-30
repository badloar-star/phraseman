import fs from 'fs';
import path from 'path';

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    },
  },
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
  });

  test('manage navigation remains outside acquisition and preserves known params', () => {
    const router = { push: jest.fn(), replace: jest.fn() };

    openPremiumPaywall(router, { manage: '1', plan: 'yearly' }, 'replace');

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/manage_subscription',
      params: { plan: 'yearly' },
    });
  });

  test('winback entry emits the truthful winback context through the typed dispatcher', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    expect(source).toContain("params: { context: 'winback', source: 'winback' }");
    expect(source).not.toContain("params: { context: 'streak', source: 'winback' }");
  });

  test('the single Plus paywall consumes the dispatcher entry instead of minting a disconnected identity', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallPlusScreen.tsx'), 'utf8');
    expect(source).toContain("import { paywallEntryAnalyticsParams, type PaywallEntry } from '../../app/paywall_entry_contract';");
    expect(source).toContain('export default function PaywallPlusScreen({ entry }: { readonly entry: PaywallEntry })');
    expect(source).toContain('const ctx = entry.context;');
    expect(source).toContain('const source = entry.source;');
    expect(source).toContain('createPaywallAnalyticsImpression(() => entry.impressionId)');
    expect(source).toContain('...entryAnalytics, ...paywallImpressionParams(impression)');
    expect(source).not.toContain('entry?.context');
    expect(source).not.toContain('entry?.source');
  });
});
