const getAppUserID = jest.fn();
const getCustomerInfo = jest.fn();
const purchasePackage = jest.fn();
const persistStorePremiumLocally = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getAppUserID, getCustomerInfo, purchasePackage },
  PRORATION_MODE: { DEFERRED: 6 },
}));
jest.mock('../app/premium_revenuecat_state', () => ({
  inferPremiumPlanFromCustomerInfo: jest.fn((info: any) => info?.plan ?? null),
  revenueCatPremiumMetadata: jest.fn(() => ({})),
  persistStorePremiumLocally: (...args: unknown[]) => (persistStorePremiumLocally as any)(...args),
}));

const yearlyPackage = {
  product: { identifier: 'phraseman_yearly' },
} as any;

describe('manage subscription purchase account boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    persistStorePremiumLocally.mockImplementation(async (
      _plan: string,
      _metadata: unknown,
      isCurrent: () => boolean,
    ) => isCurrent());
  });

  it('drops a purchase result from A after B activates without persistence', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();
    getAppUserID.mockImplementation(async () => generation.captureAccountGeneration().stableId);
    getCustomerInfo.mockResolvedValue({ plan: 'monthly' });
    let releasePurchase!: (value: unknown) => void;
    let purchaseStarted!: () => void;
    const started = new Promise<void>((resolve) => { purchaseStarted = resolve; });
    purchasePackage.mockImplementationOnce(() => new Promise((resolve) => {
      releasePurchase = resolve;
      purchaseStarted();
    }));
    const { changeManageSubscriptionPlanForGeneration } = await import('../app/manage_subscription_purchase');

    const purchaseA = changeManageSubscriptionPlanForGeneration({
      generation: tokenA,
      yearlyPackage,
      currentProductId: 'phraseman_monthly',
      fallbackPlan: 'monthly',
    });
    await started;
    generation.invalidateAccountGeneration();
    generation.beginAccountGeneration('stable-B');
    releasePurchase({ customerInfo: { plan: 'yearly' } });

    await expect(purchaseA).resolves.toEqual({ status: 'stale' });
    expect(persistStorePremiumLocally).not.toHaveBeenCalled();
  });

  it('rejects CustomerInfo when RevenueCat identity drifts before persistence', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();
    getAppUserID.mockResolvedValueOnce('stable-A').mockResolvedValueOnce('stable-B');
    getCustomerInfo.mockResolvedValue({ plan: 'yearly' });
    const { changeManageSubscriptionPlanForGeneration } = await import('../app/manage_subscription_purchase');

    await expect(changeManageSubscriptionPlanForGeneration({
      generation: tokenA,
      yearlyPackage,
      currentProductId: 'phraseman_monthly',
      fallbackPlan: 'monthly',
    })).resolves.toEqual({ status: 'stale' });
    expect(persistStorePremiumLocally).not.toHaveBeenCalled();
  });

  it('rechecks RevenueCat identity after queued commit lock acquisition', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();
    let releaseLock!: () => void;
    let lockStarted!: () => void;
    const started = new Promise<void>((resolve) => { lockStarted = resolve; });
    const heldLock = generation.withAccountTransitionLock(async () => {
      lockStarted();
      await new Promise<void>((resolve) => { releaseLock = resolve; });
    });
    await started;
    getAppUserID.mockResolvedValue('stable-A');
    getCustomerInfo.mockResolvedValue({ plan: 'yearly' });
    const { changeManageSubscriptionPlanForGeneration } = await import('../app/manage_subscription_purchase');

    const result = changeManageSubscriptionPlanForGeneration({
      generation: tokenA,
      yearlyPackage,
      currentProductId: 'phraseman_monthly',
      fallbackPlan: 'monthly',
    });
    while (getAppUserID.mock.calls.length < 2) await Promise.resolve();
    getAppUserID.mockResolvedValue('stable-B');
    releaseLock();
    await heldLock;

    await expect(result).resolves.toEqual({ status: 'stale' });
    expect(persistStorePremiumLocally).not.toHaveBeenCalled();
  });

  it('persists a verified yearly purchase while A remains current', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();
    getAppUserID.mockResolvedValue('stable-A');
    getCustomerInfo.mockResolvedValue({ plan: 'monthly' });
    purchasePackage.mockResolvedValue({ customerInfo: { plan: 'yearly' } });
    const { changeManageSubscriptionPlanForGeneration } = await import('../app/manage_subscription_purchase');

    await expect(changeManageSubscriptionPlanForGeneration({
      generation: tokenA,
      yearlyPackage,
      currentProductId: 'phraseman_monthly',
      fallbackPlan: 'monthly',
    })).resolves.toMatchObject({ status: 'purchased', plan: 'yearly' });
    expect(persistStorePremiumLocally).toHaveBeenCalledTimes(1);
    const isCurrent = persistStorePremiumLocally.mock.calls[0][2] as () => boolean;
    expect(isCurrent()).toBe(true);
  });

  it('does not let late A finally clear B changing state', async () => {
    const generation = await import('../app/account_generation');
    const purchase = await import('../app/manage_subscription_purchase');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();

    generation.invalidateAccountGeneration();
    generation.beginAccountGeneration('stable-B');
    const tokenB = generation.captureAccountGeneration();
    let bChanging = true;

    if (purchase.isManageSubscriptionOperationCurrent(tokenA)) bChanging = false;
    expect(bChanging).toBe(true);

    if (purchase.isManageSubscriptionOperationCurrent(tokenB)) bChanging = false;
    expect(bChanging).toBe(false);
  });
});
