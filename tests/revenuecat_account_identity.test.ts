const mockGetAppUserID = jest.fn<Promise<string>, []>();
const mockGetCustomerInfo = jest.fn<Promise<any>, []>();
const mockWithDeadline = jest.fn(async (work: () => Promise<unknown>) => ({
  completed: true,
  value: await work(),
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getAppUserID: mockGetAppUserID,
    getCustomerInfo: mockGetCustomerInfo,
  },
}));

let currentGeneration = 1;
jest.mock('../app/account_generation', () => ({
  isCurrentAccountGeneration: jest.fn((token: { generation: number; stableId: string }, stableId?: string) => (
    token.generation === currentGeneration && token.stableId === stableId
  )),
  withAccountTransitionLockWithDeadline: mockWithDeadline,
}));

import {
  commitRevenueCatResultForGeneration,
  readRevenueCatCustomerInfoForGeneration,
  runRevenueCatOperationForGeneration,
} from '../app/revenuecat_account_identity';

const generation = { generation: 1, stableId: 'stable-A', phase: 'active' as const };

describe('RevenueCat exact account identity boundary', () => {
  beforeEach(() => {
    currentGeneration = 1;
    jest.clearAllMocks();
    mockWithDeadline.mockImplementation(async (work: () => Promise<unknown>) => ({
      completed: true,
      value: await work(),
    }));
  });

  it('does not read CustomerInfo when RevenueCat belongs to another account', async () => {
    mockGetAppUserID.mockResolvedValue('stable-B');

    await expect(readRevenueCatCustomerInfoForGeneration(generation)).resolves.toBeNull();
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
  });

  it('drops CustomerInfo when RevenueCat identity changes while it is loading', async () => {
    const info = { entitlements: { active: {} } };
    mockGetAppUserID.mockResolvedValueOnce('stable-A').mockResolvedValueOnce('stable-B');
    mockGetCustomerInfo.mockResolvedValue(info);

    await expect(readRevenueCatCustomerInfoForGeneration(generation)).resolves.toBeNull();
  });

  it('drops a completed system purchase when RevenueCat identity drifted', async () => {
    const purchase = jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } } }));
    mockGetAppUserID.mockResolvedValueOnce('stable-A').mockResolvedValueOnce('stable-B');

    await expect(runRevenueCatOperationForGeneration(generation, purchase)).resolves.toEqual({ status: 'stale' });
    expect(purchase).toHaveBeenCalledTimes(1);
  });

  it('rechecks exact identity inside the bounded commit before any side effect', async () => {
    const commit = jest.fn(async () => true);
    mockGetAppUserID.mockResolvedValue('stable-B');

    await expect(commitRevenueCatResultForGeneration(generation, commit)).resolves.toEqual({ status: 'stale' });
    expect(mockWithDeadline).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  it('allows a same-account operation and bounded commit', async () => {
    const value = { customerInfo: { entitlements: { active: {} } } };
    const operation = jest.fn(async () => value);
    const commit = jest.fn(async () => true);
    mockGetAppUserID.mockResolvedValue('stable-A');

    await expect(runRevenueCatOperationForGeneration(generation, operation)).resolves.toEqual({ status: 'ok', value });
    await expect(commitRevenueCatResultForGeneration(generation, commit)).resolves.toEqual({ status: 'ok', value: true });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
