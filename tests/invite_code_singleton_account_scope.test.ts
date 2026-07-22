const mockGetReferralCode = jest.fn<Promise<string | null>, []>();
const mockGenerateReferralCode = jest.fn<Promise<string>, [string]>();

jest.mock('../app/referral_system', () => ({
  getReferralCode: () => mockGetReferralCode(),
  generateReferralCode: (name: string) => mockGenerateReferralCode(name),
}));

import {
  __resetAccountGenerationForTests,
  captureAccountGeneration,
  ensureAccountGeneration,
} from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import {
  ensureInviteCodeShared,
  invalidateInviteCodeShared,
} from '../app/invite_code_singleton';
import { selectAccountScopedReferralState } from '../app/referral_surface_state';

describe('invite code singleton account scope', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    invalidateInviteCodeShared();
    mockGetReferralCode.mockReset();
    mockGenerateReferralCode.mockReset();
    mockGenerateReferralCode.mockResolvedValue('');
  });

  test('A response cannot be returned or cached for B, and B starts its own fetch', async () => {
    let resolveAlice!: (value: string | null) => void;
    let resolveBob!: (value: string | null) => void;
    mockGetReferralCode
      .mockImplementationOnce(() => new Promise((resolve) => { resolveAlice = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveBob = resolve; }));

    ensureAccountGeneration('alice');
    const aliceKey = accountScopeKey(captureAccountGeneration());
    const aliceRequest = ensureInviteCodeShared('Alice');
    ensureAccountGeneration('bob');
    const bobKey = accountScopeKey(captureAccountGeneration());
    const bobVisibleState = selectAccountScopedReferralState(bobKey, {
      accountKey: aliceKey,
      referralCode: 'ALICE1',
    });
    expect(bobVisibleState.referralCode).toBeNull();
    // Both render and clipboard handlers consume this selected value.
    expect(bobVisibleState.referralCode ?? '').toBe('');
    const bobRequest = ensureInviteCodeShared('Bob');

    expect(mockGetReferralCode).toHaveBeenCalledTimes(2);
    resolveAlice('ALICE1');
    resolveBob('BOB222');

    await expect(aliceRequest).resolves.toBe('');
    await expect(bobRequest).resolves.toBe('BOB222');
    await expect(ensureInviteCodeShared('Bob')).resolves.toBe('BOB222');
    expect(mockGetReferralCode).toHaveBeenCalledTimes(2);
  });
});
