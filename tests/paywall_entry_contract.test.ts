import {
  PAYWALL_CREATIVE_REVISION,
  createPaywallEntry,
  paywallEntryAnalyticsParams,
  resolvePremiumModalEntry,
} from '../app/paywall_entry_contract';

describe('typed paywall entry contract', () => {
  test('creates a complete bounded acquisition entry', () => {
    expect(createPaywallEntry({
      context: 'no_energy',
      source: 'direct',
      entitlementState: 'free',
      impressionId: 'pw-123',
    })).toEqual({
      context: 'no_energy',
      source: 'direct',
      creativeRevision: PAYWALL_CREATIVE_REVISION,
      impressionId: 'pw-123',
      entitlementState: 'free',
    });
  });

  test.each([
    [{ context: 'not-a-context', source: 'direct' }, 'unknown_paywall_context:not-a-context'],
    [{ context: 'generic', source: 'not-a-source' }, 'unknown_paywall_source:not-a-source'],
  ])('rejects unknown acquisition dimensions in tests: %j', (params, message) => {
    expect(() => resolvePremiumModalEntry({
      params,
      accessResolved: true,
      hasPremiumAccess: false,
      impressionId: 'pw-123',
    })).toThrow(message);
  });

  test('quarantines only named legacy aliases and fills explicit legacy defaults', () => {
    expect(resolvePremiumModalEntry({
      params: { context: 'ai_dialog' },
      accessResolved: true,
      hasPremiumAccess: false,
      impressionId: 'pw-legacy',
    })).toEqual({
      decision: 'show',
      entry: {
        context: 'dialog_limit',
        source: 'direct',
        creativeRevision: PAYWALL_CREATIVE_REVISION,
        impressionId: 'pw-legacy',
        entitlementState: 'free',
      },
    });
  });

  test('keeps settings campaign attribution separate from bounded monetization dimensions', () => {
    const resolution = resolvePremiumModalEntry({
      params: {
        context: 'generic',
        source: 'settings_premium',
        attribution_campaign: ' settings:renewal/offer '.repeat(3),
        attribution_variant: ' hero B/25% ',
      },
      accessResolved: true,
      hasPremiumAccess: false,
      impressionId: 'pw-settings',
    });

    expect(resolution).toEqual({
      decision: 'show',
      entry: {
        context: 'generic',
        source: 'settings_premium',
        creativeRevision: PAYWALL_CREATIVE_REVISION,
        impressionId: 'pw-settings',
        entitlementState: 'free',
        attribution: {
          campaign: 'settings_renewal_offer_settings_',
          variant: 'hero_B_25_',
        },
      },
    });
    if (resolution.decision !== 'show') throw new Error('expected_show');
    expect(paywallEntryAnalyticsParams(resolution.entry)).toEqual({
      creative_revision: PAYWALL_CREATIVE_REVISION,
      entitlement_state: 'free',
      attribution_campaign: 'settings_renewal_offer_settings_',
      attribution_variant: 'hero_B_25_',
    });
  });

  test.each([
    [false, false, 'wait'],
    [false, true, 'wait'],
    [true, true, 'dismiss'],
  ] as const)('resolved=%s premium=%s -> %s', (accessResolved, hasPremiumAccess, decision) => {
    expect(resolvePremiumModalEntry({
      params: { context: 'generic', source: 'direct' },
      accessResolved,
      hasPremiumAccess,
      impressionId: 'pw-123',
    })).toEqual({ decision });
  });
  // §141 (04.10): окно не ждёт на пустом экране, если последний известный доступ — точно «бесплатно».
  test('shows immediately from a cached free entitlement while live access is unresolved', () => {
    const resolution = resolvePremiumModalEntry({
      params: { context: 'generic', source: 'direct' },
      accessResolved: false,
      hasPremiumAccess: false,
      impressionId: 'pw-cache',
      cachedEntitlement: 'free',
    });
    expect(resolution.decision).toBe('show');
  });

  test.each(['premium', 'unknown', undefined] as const)('waits while unresolved when cached entitlement is %s (no paywall flash for Plus)', (cachedEntitlement) => {
    expect(resolvePremiumModalEntry({
      params: { context: 'generic', source: 'direct' },
      accessResolved: false,
      hasPremiumAccess: false,
      impressionId: 'pw-cache',
      cachedEntitlement,
    })).toEqual({ decision: 'wait' });
  });

  test('live Plus dismisses even if the cache said free', () => {
    expect(resolvePremiumModalEntry({
      params: { context: 'generic', source: 'direct' },
      accessResolved: true,
      hasPremiumAccess: true,
      impressionId: 'pw-cache',
      cachedEntitlement: 'free',
    })).toEqual({ decision: 'dismiss' });
  });
});
