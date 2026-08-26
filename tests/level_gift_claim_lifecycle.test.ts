import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGift,
  confirmDeferredLocalLevelGiftEffectReceipt,
  GIFT_POOL,
  type GiftDef,
} from '../app/level_gift_system';
import { callLevelGiftReservationAction } from '../app/community_packs/functionsClient';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/community_packs/functionsClient', () => ({
  callLevelGiftReservationAction: jest.fn(),
  callLevelSpinDeliveryAction: jest.fn(),
  callLevelGiftReserve: jest.fn(),
  callLevelGiftActivatePackGift: jest.fn(),
  callFlashcardPackGiftRedeem: jest.fn(),
}));
jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn().mockResolvedValue({ finalDelta: 250 }),
  withXpAccountOperationQueue: jest.fn(async (
    _token: unknown,
    operation: (lease: object) => Promise<unknown>,
  ) => operation({})),
}));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({
  grantClubGiftFreeBoostFromLevel: jest.fn(),
  setClubGiftFreeBoostCountFromAuthority: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(),
  loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({ setRandomPackGiftTrial48h: jest.fn() }));
jest.mock('../app/firebase', () => ({}));
jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  IS_EXPO_GO: true,
  CLOUD_SYNC_ENABLED: false,
  SPANISH_UI_LOCALE_ENABLED: true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn().mockResolvedValue('account-a') }));

const storage: Record<string, string> = {};
const reservedGift = (): GiftDef => ({
  ...GIFT_POOL.find((item) => item.id === 'xp_250')!,
  levelGiftReservation: { reservationId: 'account-a_7_f2p_en', lane: 'f2p' },
});

const reservedGiftById = (id: string): GiftDef => ({
  ...GIFT_POOL.find((item) => item.id === id)!,
  levelGiftReservation: { reservationId: 'account-a_7_f2p_en', lane: 'f2p' },
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  const { callLevelGiftReserve } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
  };
  callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_7_f2p_en',
    giftId: 'xp_250',
  });
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
});

test('does not acquire the server claim when the local prepare journal cannot be verified', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

  await expect(applyGift(reservedGift(), 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:7:f2p', studyTarget: 'en',
  })).resolves.toEqual({ success: false });

  expect(callLevelGiftReservationAction).not.toHaveBeenCalled();
});

test('applies an inventory gift from a local spin without contacting the server', async () => {
  const { callLevelGiftReserve, callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
    callLevelSpinDeliveryAction: jest.Mock;
  };
  const setEnergy = jest.fn().mockResolvedValue(undefined);
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'energy_full')!,
    spinRewardReceipt: { requestId: 'localspinreward0001', lane: 'base', giftId: 'energy_full' },
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, setEnergy, {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level:7:f2p',
    studyTarget: 'en',
    localOnly: true,
  })).resolves.toEqual({ success: true });

  expect(setEnergy).toHaveBeenCalledWith(5);
  expect(JSON.parse(storage.energy_state)).toMatchObject({ current: 5 });
  expect(Object.values(JSON.parse(storage.level_gift_effect_receipts_v1))).toEqual([
    expect.objectContaining({ giftId: 'energy_full', status: 'applied' }),
  ]);
  expect(callLevelGiftReserve).not.toHaveBeenCalled();
  expect(callLevelSpinDeliveryAction).not.toHaveBeenCalled();
  expect(callLevelGiftReservationAction).not.toHaveBeenCalled();
});

test('pins a deferred local-spin effect until its outer journal is durable', async () => {
  const accountToken = captureAccountGeneration();
  const occurrenceId = 'level-spin:deferredlocal0001:base';
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'energy_full')!,
    spinRewardReceipt: { requestId: 'deferredlocal0001', lane: 'base', giftId: 'energy_full' },
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken,
    occurrenceId,
    studyTarget: 'en',
    localOnly: true,
    deferEffectReceiptConfirmation: true,
  })).resolves.toEqual({ success: true });
  expect(Object.values(JSON.parse(storage.level_gift_effect_receipts_v1))).toEqual([
    expect.objectContaining({ giftId: 'energy_full', status: 'applied_unconfirmed' }),
  ]);

  await expect(confirmDeferredLocalLevelGiftEffectReceipt(accountToken, occurrenceId)).resolves.toBe(true);
  expect(Object.values(JSON.parse(storage.level_gift_effect_receipts_v1))).toEqual([
    expect.objectContaining({ giftId: 'energy_full', status: 'applied' }),
  ]);
});

test('applies the exact local-spin energy gift for a Plus user', async () => {
  const { getVerifiedPremiumStatus } = jest.requireMock('../app/premium_guard') as {
    getVerifiedPremiumStatus: jest.Mock;
  };
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  getVerifiedPremiumStatus.mockResolvedValue(true);
  const setEnergy = jest.fn().mockResolvedValue(undefined);
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'energy_full')!,
    spinRewardReceipt: { requestId: 'localspinrewardplus1', lane: 'base', giftId: 'energy_full' },
  };

  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, {
    accountToken: captureAccountGeneration(), occurrenceId: 'level-spin:localspinrewardplus1:base',
    studyTarget: 'en', localOnly: true,
  })).resolves.toEqual({ success: true });

  expect(setEnergy).toHaveBeenCalledWith(5);
  expect(registerXP).not.toHaveBeenCalled();
});

test('rejects a local inventory apply captured for a stale account', async () => {
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  const staleToken = captureAccountGeneration();
  beginAccountGeneration('account-b');
  const gift = GIFT_POOL.find((item) => item.id === 'xp_100')!;

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken: staleToken, occurrenceId: 'level-spin:staleaccount0001:base',
    studyTarget: 'en', localOnly: true,
  })).resolves.toEqual({ success: false });

  expect(registerXP).not.toHaveBeenCalled();
});

test('serializes concurrent local inventory applications', async () => {
  let activeReceiptReads = 0;
  let maxConcurrentReceiptReads = 0;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'level_gift_effect_receipts_v1') {
      activeReceiptReads += 1;
      maxConcurrentReceiptReads = Math.max(maxConcurrentReceiptReads, activeReceiptReads);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeReceiptReads -= 1;
    }
    return storage[key] ?? null;
  });
  const gift = GIFT_POOL.find((item) => item.id === 'hint_1')!;
  const accountToken = captureAccountGeneration();

  await Promise.all([
    applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      accountToken, occurrenceId: 'level-spin:concurrent000001:base', studyTarget: 'en', localOnly: true,
    }),
    applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
      accountToken, occurrenceId: 'level-spin:concurrent000002:base', studyTarget: 'en', localOnly: true,
    }),
  ]);

  expect(maxConcurrentReceiptReads).toBe(1);
});

test('hydrates a club gift only from the terminal server receipt and replays lost responses exactly', async () => {
  const clubBoosts = jest.requireMock('../app/club_boosts') as {
    setClubGiftFreeBoostCountFromAuthority: jest.Mock;
  };
  const { callLevelGiftReserve } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
  };
  callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_7_f2p_en',
    giftId: 'club_boost_free',
  });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('response lost after commit'))
    .mockResolvedValueOnce({ status: 'already_claimed', clubGiftFreeBoostCount: 3 });
  const opts = {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:7:f2p', studyTarget: 'en' as const,
  };

  await expect(applyGift(reservedGiftById('club_boost_free'), 'TestUser', 3, 5, jest.fn(), opts))
    .resolves.toEqual({ success: false });
  expect(clubBoosts.setClubGiftFreeBoostCountFromAuthority).not.toHaveBeenCalled();
  expect((callLevelGiftReservationAction as jest.Mock).mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_claim', 'complete_claim']);

  await expect(applyGift(reservedGiftById('club_boost_free'), 'TestUser', 3, 5, jest.fn(), opts))
    .resolves.toEqual({ success: false, alreadyClaimed: true });
  expect(clubBoosts.setClubGiftFreeBoostCountFromAuthority).toHaveBeenCalledWith(3);
  expect((callLevelGiftReservationAction as jest.Mock).mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_claim', 'complete_claim', 'begin_claim']);
});

test('completes a leased server claim only after applying the reward', async () => {
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });

  await expect(applyGift(reservedGift(), 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:7:f2p', studyTarget: 'en',
  })).resolves.toEqual({ success: true });

  expect(callLevelGiftReservationAction).toHaveBeenCalledTimes(2);
  expect((callLevelGiftReservationAction as jest.Mock).mock.calls[0][0]).toMatchObject({ action: 'begin_claim' });
  expect((callLevelGiftReservationAction as jest.Mock).mock.calls[1][0]).toMatchObject({ action: 'complete_claim' });
});

test('does not apply a reward already claimed on another device', async () => {
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  (callLevelGiftReservationAction as jest.Mock).mockResolvedValueOnce({ status: 'already_claimed' });

  await expect(applyGift(reservedGift(), 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:7:f2p', studyTarget: 'en',
  })).resolves.toEqual({ success: false, alreadyClaimed: true });

  expect(registerXP).not.toHaveBeenCalled();
});

test('does not materialize a server-owned shield before complete_claim succeeds', async () => {
  const shield = {
    ...GIFT_POOL.find((item) => item.id === 'chain_shield_1')!,
    levelGiftReservation: { reservationId: 'account-a_7_f2p_en', lane: 'f2p' as const },
  };
  const { callLevelGiftReserve } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
  };
  callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_7_f2p_en',
    giftId: 'chain_shield_1',
  });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('timeout after begin'));

  await expect(applyGift(shield, 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:7:f2p', studyTarget: 'en',
  })).resolves.toEqual({ success: false });

  expect(storage.chain_shield).toBeUndefined();
  expect((callLevelGiftReservationAction as jest.Mock).mock.calls[1][0]).toMatchObject({
    action: 'complete_claim',
  });
});

test('hydrates the exact terminal perk receipt when retry observes already_claimed after a lost response', async () => {
  const shield = {
    ...GIFT_POOL.find((item) => item.id === 'chain_shield_1')!,
    levelGiftReservation: { reservationId: 'account-a_7_f2p_en', lane: 'f2p' as const },
  };
  const canonicalShield = JSON.stringify({ daysLeft: 4, grantedAt: '2026-08-08' });
  const { callLevelGiftReserve } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
  };
  callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_7_f2p_en',
    giftId: 'chain_shield_1',
  });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('timeout after committed complete_claim'))
    .mockResolvedValueOnce({ status: 'already_claimed', chainShield: canonicalShield });
  const options = {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level:7:f2p',
    studyTarget: 'en',
  } as const;

  await expect(applyGift(shield, 'TestUser', 3, 5, jest.fn(), options))
    .resolves.toEqual({ success: false });
  expect(storage.chain_shield).toBeUndefined();

  await expect(applyGift(shield, 'TestUser', 3, 5, jest.fn(), options))
    .resolves.toEqual({ success: false, alreadyClaimed: true });
  expect(storage.chain_shield).toBe(canonicalShield);
  expect(JSON.parse(storage.level_gift_apply_journal_v1 ?? '{}')).toEqual({});
});

test('focus gift stays absent before terminal success and hydrates exact replay receipt after a lost response', async () => {
  const focus = {
    ...GIFT_POOL.find((item) => item.id === 'focus_15m_50')!,
    levelGiftReservation: { reservationId: 'account-a_20_f2p_en', lane: 'f2p' as const },
  };
  const canonicalFocus = JSON.stringify({ multiplier: 1.5, expiresAt: 1_900_123_456_789 });
  const { callLevelGiftReserve } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelGiftReserve: jest.Mock;
  };
  callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_20_f2p_en',
    giftId: 'focus_15m_50',
  });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('timeout after committed focus complete_claim'))
    .mockResolvedValueOnce({ status: 'already_claimed', giftXpMultiplier: canonicalFocus });
  const options = {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level:20:f2p',
    studyTarget: 'en',
  } as const;

  await expect(applyGift(focus, 'TestUser', 3, 5, jest.fn(), options))
    .resolves.toEqual({ success: false });
  expect(storage.gift_xp_multiplier).toBeUndefined();

  await expect(applyGift(focus, 'TestUser', 3, 5, jest.fn(), options))
    .resolves.toEqual({ success: false, alreadyClaimed: true });
  expect(storage.gift_xp_multiplier).toBe(canonicalFocus);
});

test('spin completes a stale club receipt as the canonical XP replacement', async () => {
  const { callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinDeliveryAction: jest.Mock;
  };
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  callLevelSpinDeliveryAction
    .mockResolvedValueOnce({ status: 'acquired', giftId: 'xp_250' })
    .mockResolvedValueOnce({ status: 'claimed', giftId: 'xp_250' });
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'club_boost_free')!,
    spinRewardReceipt: { requestId: 'spin-request-club-boost', lane: 'base', giftId: 'club_boost_free' },
  };

  await expect(applyGift(gift, 'TestUser', 2, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    studyTarget: 'en',
  })).resolves.toEqual({ success: true });

  expect(registerXP).toHaveBeenCalledWith(250, 'achievement_reward', 'TestUser', 'ru', undefined, expect.objectContaining({
    payload: expect.objectContaining({ giftId: 'xp_250' }),
  }));
  expect(callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.selectedGiftId))
    .toEqual(['club_boost_free', 'club_boost_free']);
  expect(callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_delivery', 'complete_delivery']);
});

test('spin completes a Plus-unsafe energy receipt as canonical XP without refilling energy', async () => {
  const { callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinDeliveryAction: jest.Mock;
  };
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  callLevelSpinDeliveryAction
    .mockResolvedValueOnce({ status: 'acquired', giftId: 'xp_250' })
    .mockResolvedValueOnce({ status: 'claimed', giftId: 'xp_250' });
  const setEnergy = jest.fn();
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'energy_full')!,
    spinRewardReceipt: { requestId: 'spin-request-plus-energy', lane: 'base', giftId: 'energy_full' },
  };

  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, {
    accountToken: captureAccountGeneration(),
    studyTarget: 'en',
  })).resolves.toEqual({ success: true });

  expect(setEnergy).not.toHaveBeenCalled();
  expect(registerXP).toHaveBeenCalledWith(250, 'achievement_reward', 'TestUser', 'ru', undefined, expect.any(Object));
  expect(callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_delivery', 'complete_delivery']);
});

test('spin completes a stale choice receipt immediately as the canonical 600 XP bank', async () => {
  const { callLevelSpinDeliveryAction } = jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinDeliveryAction: jest.Mock;
  };
  callLevelSpinDeliveryAction
    .mockResolvedValueOnce({ status: 'acquired', giftId: 'xp_bank_600' })
    .mockResolvedValueOnce({ status: 'claimed', giftId: 'xp_bank_600' });
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'choice_3_level')!,
    spinRewardReceipt: { requestId: 'spin-request-plus-choice', lane: 'base', giftId: 'choice_3_level' },
  };

  await expect(applyGift(gift, 'TestUser', 2, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    studyTarget: 'en',
  })).resolves.toEqual({ success: true });

  expect(JSON.parse(storage.gift_xp_bank_v1)).toMatchObject({ remaining: 600, grantedTotal: 600 });
  expect(callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.selectedGiftId))
    .toEqual(['choice_3_level', 'choice_3_level']);
  expect(callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_delivery', 'complete_delivery']);
});

test('pack cache warmup stays best-effort when an adapter returns no promise', async () => {
  jest.useFakeTimers();
  try {
    const functionsClient = jest.requireMock('../app/community_packs/functionsClient') as {
      callLevelGiftActivatePackGift: jest.Mock;
    };
    const packTrialGift = jest.requireMock('../app/flashcards/pack_trial_gift') as {
      setRandomPackGiftTrial48h: jest.Mock;
    };
    functionsClient.callLevelGiftActivatePackGift.mockResolvedValue({
      voucherId: 'voucher-25',
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    });
    packTrialGift.setRandomPackGiftTrial48h.mockResolvedValue(true);

    await expect(applyGift(reservedGiftById('pack_voucher_48h'), 'TestUser', 3, 5, jest.fn(), {
      studyTarget: 'en',
    })).resolves.toEqual({ success: true });

    expect(() => jest.advanceTimersByTime(1_400)).not.toThrow();
  } finally {
    jest.useRealTimers();
  }
});

test('an account transition waits until a local XP gift is fully committed', async () => {
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  const { withAccountTransitionLock } = jest.requireActual('../app/account_generation') as typeof import('../app/account_generation');
  let transition: Promise<void> | undefined;
  registerXP.mockImplementationOnce(async (...args: unknown[]) => {
    transition = withAccountTransitionLock(async () => { beginAccountGeneration('account-b'); });
    await Promise.resolve();
    expect(args[5]).toMatchObject({
      accountToken: expect.objectContaining({ stableId: 'account-a' }),
      accountTransitionLockLease: expect.any(Object),
    });
    return { finalDelta: 100 };
  });
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'xp_100')!,
    spinRewardReceipt: { requestId: 'local-spin-xp-switch', lane: 'base', giftId: 'xp_100' },
  };

  await expect(applyGift(gift, 'TestUser', 2, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level-spin:local-spin-xp-switch:base',
    studyTarget: 'en',
    localOnly: true,
  })).resolves.toEqual({ success: true });
  await transition;
  expect(captureAccountGeneration().stableId).toBe('account-b');
});

test('a local XP gift does not deadlock when XP registration shares the caller account lock', async () => {
  const { registerXP } = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };
  const { withAccountTransitionLock } = jest.requireActual('../app/account_generation') as typeof import('../app/account_generation');
  registerXP.mockImplementationOnce((...args: unknown[]) => {
    const options = args[5] as { accountTransitionLockLease?: import('../app/account_generation').AccountTransitionLockLease } | undefined;
    return withAccountTransitionLock(
      async () => ({ finalDelta: 100 }),
      options?.accountTransitionLockLease,
    );
  });
  const gift: GiftDef = {
    ...GIFT_POOL.find((item) => item.id === 'xp_100')!,
    spinRewardReceipt: { requestId: 'local-spin-xp-deadlock', lane: 'base', giftId: 'xp_100' },
  };

  const outcome = await Promise.race([
    applyGift(gift, 'TestUser', 2, 5, jest.fn(), {
      accountToken: captureAccountGeneration(),
      occurrenceId: 'level-spin:local-spin-xp-deadlock:base',
      studyTarget: 'en',
      localOnly: true,
    }),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
  ]);

  expect(outcome).toEqual({ success: true });
});
