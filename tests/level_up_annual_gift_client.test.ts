const getStableId = jest.fn();
const initFirebaseAppCheckIfAvailable = jest.fn();
const httpsCallable = jest.fn();

jest.mock('../app/stable_id', () => ({ getStableId: () => getStableId() }));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: () => initFirebaseAppCheckIfAvailable(),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => 'app') }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => 'functions'),
  httpsCallable: (...args: unknown[]) => httpsCallable(...args),
}));

describe('level-up annual gift client', () => {
  const offering = {
    identifier: 'level_up_annual_gift_v1',
    annual: {
      packageType: 'ANNUAL',
      product: { identifier: 'premium_yearly' },
    },
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    getStableId.mockResolvedValue('stable-123');
    initFirebaseAppCheckIfAvailable.mockResolvedValue(true);
  });

  it('gets the server offer using the stable ID and supplied level', async () => {
    const getOffer = jest.fn().mockResolvedValue({
      data: {
        offerId: 'offer-1', level: 42, state: 'available', offeringId: 'level_up_annual_gift_v1',
        createdAtMs: 1, offerExpiresAtMs: 2, grantedAtMs: null, bonusExpiryAtMs: null,
      },
    });
    httpsCallable.mockImplementation((_functions, name) => {
      if (name === 'levelUpAnnualGiftGetOrCreate') return getOffer;
      throw new Error(`unexpected callable: ${name}`);
    });

    const subject = await import('../app/level_up_annual_gift');
    await expect(subject.getLevelUpAnnualGiftOffer(42)).resolves.toMatchObject({
      offerId: 'offer-1', level: 42, state: 'available',
    });
    expect(getOffer).toHaveBeenCalledWith({ stableId: 'stable-123', level: 42 });
  });

  it('binds the annual package, sets its attempt attribute, then purchases that exact package', async () => {
    const bindPurchase = jest.fn().mockResolvedValue({
      data: {
        purchaseAttemptId: 'attempt-1', offerId: 'offer-1', revenueCatAppUserId: 'stable-123',
        offeringId: 'level_up_annual_gift_v1', annualProductId: 'premium_yearly', expiresAtMs: 2,
        subscriberAttribute: { key: 'level_up_annual_gift_attempt_id', value: 'attempt-1' },
      },
    });
    httpsCallable.mockImplementation((_functions, name) => {
      if (name === 'levelUpAnnualGiftBindPurchase') return bindPurchase;
      throw new Error(`unexpected callable: ${name}`);
    });
    const purchases = (await import('react-native-purchases')).default as any;
    purchases.getAppUserID.mockResolvedValue('stable-123');
    purchases.getOfferings.mockResolvedValue({ all: { level_up_annual_gift_v1: offering } });
    purchases.purchasePackage.mockResolvedValue({ customerInfo: { entitlements: { active: {} } } });

    const subject = await import('../app/level_up_annual_gift');
    await subject.purchaseLevelUpAnnualGift({
      offerId: 'offer-1', level: 42, state: 'available', offeringId: 'level_up_annual_gift_v1',
      createdAtMs: 1, offerExpiresAtMs: 2, grantedAtMs: null, bonusExpiryAtMs: null,
    });

    expect(bindPurchase).toHaveBeenCalledWith({
      stableId: 'stable-123', offerId: 'offer-1', revenueCatAppUserId: 'stable-123', annualProductId: 'premium_yearly',
    });
    expect(purchases.setAttributes).toHaveBeenCalledWith({ level_up_annual_gift_attempt_id: 'attempt-1' });
    expect(purchases.purchasePackage).toHaveBeenCalledWith(offering.annual);
    expect(bindPurchase.mock.invocationCallOrder[0]).toBeLessThan(purchases.setAttributes.mock.invocationCallOrder[0]);
    expect(purchases.setAttributes.mock.invocationCallOrder[0]).toBeLessThan(purchases.purchasePackage.mock.invocationCallOrder[0]);
  });

  it('does not bind or purchase when the dedicated offering has no annual package', async () => {
    const bindPurchase = jest.fn();
    httpsCallable.mockImplementation((_functions, name) => {
      if (name === 'levelUpAnnualGiftBindPurchase') return bindPurchase;
      throw new Error(`unexpected callable: ${name}`);
    });
    const purchases = (await import('react-native-purchases')).default as any;
    purchases.getAppUserID.mockResolvedValue('stable-123');
    purchases.getOfferings.mockResolvedValue({ all: { level_up_annual_gift_v1: { ...offering, annual: null } } });

    const subject = await import('../app/level_up_annual_gift');
    await expect(subject.purchaseLevelUpAnnualGift({
      offerId: 'offer-1', level: 42, state: 'available', offeringId: 'level_up_annual_gift_v1',
      createdAtMs: 1, offerExpiresAtMs: 2, grantedAtMs: null, bonusExpiryAtMs: null,
    })).rejects.toThrow('annual_package_unavailable');
    expect(bindPurchase).not.toHaveBeenCalled();
    expect(purchases.purchasePackage).not.toHaveBeenCalled();
  });
});
