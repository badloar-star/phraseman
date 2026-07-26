describe('RevenueCat identity bootstrap', () => {
  const loadSubject = async (stableId = 'stable-123') => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_RC_IOS = 'appl_test_key';
    process.env.EXPO_PUBLIC_RC_ANDROID = 'goog_test_key';
    jest.doMock('../app/user_id_policy', () => ({
      getCanonicalUserId: jest.fn(async () => stableId),
    }));
    jest.doMock('../app/shards_shop_cache', () => ({
      prefetchShardsShopOfferings: jest.fn(async () => undefined),
    }));
    jest.doMock('../app/account_generation', () => ({
      captureAccountGeneration: jest.fn(() => ({ generation: 1, stableId, phase: 'active' })),
      isCurrentAccountGeneration: jest.fn(() => true),
      withAccountTransitionLock: jest.fn(async (work: () => Promise<unknown>) => work()),
      withAccountTransitionLockWithDeadline: jest.fn(async (work: () => Promise<unknown>) => ({
        completed: true,
        value: await work(),
      })),
    }));
    jest.doMock('../app/premium_revenuecat_state', () => ({
      inferPremiumPlanFromProductId: jest.fn(() => 'yearly'),
      persistStorePremiumLocally: jest.fn(async () => true),
      revenueCatCustomerInfoHasPremiumAccess: jest.fn((info: any) => !!info?.entitlements?.active?.premium),
      revenueCatPremiumMetadata: jest.fn(() => ({})),
    }));
    return {
      revenueCat: await import('../app/revenuecat_init'),
      purchases: (await import('react-native-purchases')).default as any,
      premiumState: await import('../app/premium_revenuecat_state'),
    };
  };

  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.clearAllMocks();
  });

  it('configures without appUserID first, then logs anonymous RC users into stable_id', async () => {
    const { revenueCat, purchases } = await loadSubject();
    purchases.isConfigured
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    purchases.getAppUserID
      .mockResolvedValueOnce('$RCAnonymousID:old-user')
      .mockResolvedValue('stable-123');
    purchases.getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });

    await revenueCat.initRevenueCat();

    expect(purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key' });
    expect(purchases.configure).not.toHaveBeenCalledWith(expect.objectContaining({ appUserID: expect.any(String) }));
    expect(purchases.logIn).toHaveBeenCalledWith('stable-123');
    expect(purchases.setAttributes).toHaveBeenCalledWith({
      phraseman_uid: 'stable-123',
      phraseman_previous_rc_app_user_id: '$RCAnonymousID:old-user',
    });
  });

  it('does not relog when RevenueCat is already on the canonical stable_id', async () => {
    const { revenueCat, purchases } = await loadSubject();
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockResolvedValue('stable-123');
    purchases.getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });

    await revenueCat.initRevenueCat();

    expect(purchases.configure).not.toHaveBeenCalled();
    expect(purchases.logIn).not.toHaveBeenCalled();
    expect(purchases.setAttributes).toHaveBeenCalledWith({ phraseman_uid: 'stable-123' });
  });

  it('reports identity as not ready when RevenueCat stays on an anonymous id after logIn', async () => {
    const { revenueCat, purchases } = await loadSubject();
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockResolvedValue('$RCAnonymousID:stuck-user');

    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(false);

    expect(purchases.logIn).toHaveBeenCalledWith('stable-123');
  });

  it('does not apply startup CustomerInfo when RevenueCat identity is not ready', async () => {
    const { revenueCat, purchases } = await loadSubject();
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockResolvedValue('$RCAnonymousID:stuck-user');
    purchases.logIn.mockResolvedValue({
      customerInfo: { entitlements: { active: {} }, activeSubscriptions: [] },
      created: false,
    });

    await revenueCat.initRevenueCat();

    expect(purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('does not log into a stale account when generation changes during identity lookup', async () => {
    const { revenueCat, purchases } = await loadSubject();
    let current = true;
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockImplementationOnce(async () => {
      current = false;
      return '$RCAnonymousID:old-user';
    });

    await expect(revenueCat.syncRevenueCatIdentity(() => current)).resolves.toBe(false);

    expect(purchases.logIn).not.toHaveBeenCalled();
    expect(purchases.setAttributes).not.toHaveBeenCalled();
  });

  it('switches A to B with direct logIn and verifies B before attributes or CustomerInfo persistence', async () => {
    const { revenueCat, purchases, premiumState } = await loadSubject('stable-B');
    const premiumInfo = {
      entitlements: { active: { premium: { productIdentifier: 'premium_yearly' } } },
      activeSubscriptions: ['premium_yearly'],
    };
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID
      .mockResolvedValueOnce('stable-A')
      .mockResolvedValueOnce('stable-B');
    purchases.logIn.mockResolvedValue({ customerInfo: premiumInfo, created: false });

    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(true);

    expect(purchases.logIn).toHaveBeenCalledWith('stable-B');
    expect((purchases as { logOut?: unknown }).logOut).toBeUndefined();
    expect(purchases.getAppUserID).toHaveBeenCalledTimes(2);
    expect(purchases.getAppUserID.mock.invocationCallOrder[1]).toBeLessThan(
      purchases.setAttributes.mock.invocationCallOrder[0],
    );
    expect(purchases.getAppUserID.mock.invocationCallOrder[1]).toBeLessThan(
      (premiumState.persistStorePremiumLocally as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('keeps identity unresolved and retryable when logIn does not actually move RevenueCat to B', async () => {
    const { revenueCat, purchases, premiumState } = await loadSubject('stable-B');
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID
      .mockResolvedValueOnce('stable-A')
      .mockResolvedValueOnce('stable-A');
    purchases.logIn.mockResolvedValue({
      customerInfo: {
        entitlements: { active: { premium: { productIdentifier: 'premium_yearly' } } },
        activeSubscriptions: ['premium_yearly'],
      },
      created: false,
    });

    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(false);

    expect(purchases.setAttributes).not.toHaveBeenCalled();
    expect(premiumState.persistStorePremiumLocally).not.toHaveBeenCalled();

    purchases.getAppUserID
      .mockResolvedValueOnce('stable-A')
      .mockResolvedValueOnce('stable-B');
    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(true);
    expect(purchases.logIn).toHaveBeenCalledTimes(2);
  });

  it('drops stale A login CustomerInfo without attributes or persistence when generation changes', async () => {
    const { revenueCat, purchases, premiumState } = await loadSubject('stable-B');
    let current = true;
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockResolvedValueOnce('stable-A');
    purchases.logIn.mockImplementationOnce(async () => {
      current = false;
      return {
        customerInfo: {
          entitlements: { active: { premium: { productIdentifier: 'premium_yearly' } } },
          activeSubscriptions: ['premium_yearly'],
        },
        created: false,
      };
    });

    await expect(revenueCat.syncRevenueCatIdentity(() => current)).resolves.toBe(false);

    expect(purchases.setAttributes).not.toHaveBeenCalled();
    expect(premiumState.persistStorePremiumLocally).not.toHaveBeenCalled();
  });
});
