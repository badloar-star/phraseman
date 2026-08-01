const mockGetReferralCode = jest.fn<Promise<string | null>, []>();
const mockGenerateReferralCode = jest.fn<Promise<string>, [string]>();

jest.mock('../app/referral_system', () => ({
  getReferralCode: () => mockGetReferralCode(),
  generateReferralCode: (name: string) => mockGenerateReferralCode(name),
}));

import {
  __resetAccountGenerationForTests,
  ensureAccountGeneration,
} from '../app/account_generation';
import {
  acquireInviteCodeShared,
  invalidateInviteCodeShared,
} from '../app/invite_code_singleton';

describe('invite-code retry leases', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetAccountGenerationForTests();
    invalidateInviteCodeShared();
    ensureAccountGeneration('account-a');
    mockGetReferralCode.mockReset();
    mockGenerateReferralCode.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('releasing the last hidden consumer cancels the pending retry', async () => {
    mockGetReferralCode.mockResolvedValue(null);
    mockGenerateReferralCode.mockRejectedValue(new Error('auth link not ready'));

    const lease = acquireInviteCodeShared('Alice');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGenerateReferralCode).toHaveBeenCalledTimes(1);

    lease.release();
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(lease.promise).resolves.toBe('');
    expect(mockGenerateReferralCode).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('one visible consumer retains the shared retry after Friends releases its lease', async () => {
    mockGetReferralCode
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('SHARED7');
    mockGenerateReferralCode
      .mockRejectedValueOnce(new Error('cold auth link'))
      .mockResolvedValueOnce('SHARED7');

    const friendsLease = acquireInviteCodeShared('Alice');
    const referralsLease = acquireInviteCodeShared('Alice');
    expect(referralsLease.promise).toBe(friendsLease.promise);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGenerateReferralCode).toHaveBeenCalledTimes(1);

    friendsLease.release();
    await jest.advanceTimersByTimeAsync(1_500);

    await expect(referralsLease.promise).resolves.toBe('SHARED7');
    referralsLease.release();
    expect(mockGenerateReferralCode).toHaveBeenCalledTimes(2);
  });
});
