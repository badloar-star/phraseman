import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_LEVEL_GIFT_DEFS, applyGift, GIFT_POOL, readBonusEnergy, type GiftDef } from '../app/level_gift_system';
import { callLevelGiftReservationAction } from '../app/community_packs/functionsClient';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/community_packs/functionsClient', () => ({
  callLevelGiftReservationAction: jest.fn(),
  callLevelSpinDeliveryAction: jest.fn(),
  callLevelSpinActivatePackGift: jest.fn(),
  callLevelGiftReserve: jest.fn(),
  callLevelGiftActivatePackGift: jest.fn(),
  callFlashcardPackGiftRedeem: jest.fn(),
}));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }) }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn().mockResolvedValue(false) }));
jest.mock('../app/club_boosts', () => ({ grantClubGiftFreeBoostFromLevel: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../app/flashcards/marketplace', () => ({
  primeMarketplaceBuiltCardsCacheFromAccessibleStorage: jest.fn(),
  loadOwnedPackIds: jest.fn().mockResolvedValue([]),
  addOwnedPackId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/flashcards/pack_trial_gift', () => ({
  setRandomPackGiftTrial48h: jest.fn().mockResolvedValue({ localVoucherId: 'server-voucher' }),
}));
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
const functionsClient = jest.requireMock('../app/community_packs/functionsClient') as {
  callLevelGiftReserve: jest.Mock;
  callLevelGiftActivatePackGift: jest.Mock;
  callLevelSpinDeliveryAction: jest.Mock;
  callLevelSpinActivatePackGift: jest.Mock;
  callFlashcardPackGiftRedeem: jest.Mock;
};
const clubBoosts = jest.requireMock('../app/club_boosts') as {
  grantClubGiftFreeBoostFromLevel: jest.Mock;
};

function reservedGift(id: string, level: number): GiftDef {
  const gift = GIFT_POOL.find((item) => item.id === id);
  if (!gift) throw new Error(`missing fixture gift ${id}`);
  return {
    ...gift,
    levelGiftReservation: { reservationId: `account-a_${level}_f2p_en`, lane: 'f2p' },
  };
}

function installCrashBeforeOuterEffectStatus(): void {
  let rejectEffectAppliedJournalOnce = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === 'level_gift_apply_journal_v1'
      && value.includes('"status":"effect_applied"')
      && rejectEffectAppliedJournalOnce) {
      rejectEffectAppliedJournalOnce = false;
      throw new Error('crash before outer effect status');
    }
    storage[key] = value;
  });
}

function scopedValue(base: string, stableUid: string): string | undefined {
  const key = Object.keys(storage).find((candidate) => candidate.startsWith(`${base}::uid:${stableUid}`));
  return key ? storage[key] : undefined;
}

async function applyOccurrence(id: string, level: number) {
  functionsClient.callLevelGiftReserve.mockResolvedValue({
    reservationId: `account-a_${level}_f2p_en`,
    giftId: id,
  });
  return applyGift(reservedGift(id, level), 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    occurrenceId: `level:${level}:f2p`,
    studyTarget: 'en',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  clubBoosts.grantClubGiftFreeBoostFromLevel.mockImplementation(async (minimumCount?: number) => {
    const current = Math.max(0, Number.parseInt(storage.club_gift_free_boost_v1 ?? '0', 10) || 0);
    storage.club_gift_free_boost_v1 = String(minimumCount === undefined
      ? current + 1
      : Math.max(current, minimumCount));
  });
});

test('hint grant survives the outer-journal crash without duplication and a distinct occurrence still applies', async () => {
  installCrashBeforeOuterEffectStatus();
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('lost complete response'))
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' })
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });

  await expect(applyOccurrence('hint_3', 8)).resolves.toEqual({ success: false });
  await expect(applyOccurrence('hint_3', 8)).resolves.toEqual({ success: true });
  expect(storage[Object.keys(storage).find((key) => key.includes('bonus_hints'))!]).toBe('3');

  await expect(applyOccurrence('hint_3', 9)).resolves.toEqual({ success: true });
  const hintKey = Object.keys(storage).find((key) => key.includes('bonus_hints'))!;
  expect(storage[hintKey]).toBe('6');
});

test('additive energy bonus survives the outer-journal crash without adding slots twice', async () => {
  installCrashBeforeOuterEffectStatus();
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('lost complete response'))
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' })
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });

  await expect(applyOccurrence('energy_plus2', 12)).resolves.toEqual({ success: false });
  await expect(applyOccurrence('energy_plus2', 12)).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(JSON.parse(scopedValue('energy_gift_bonus', 'account-a')!)).toMatchObject({ amount: 2 });
  await expect(applyOccurrence('energy_plus2', 13)).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(JSON.parse(scopedValue('energy_gift_bonus', 'account-a')!)).toMatchObject({ amount: 4 });
});

test('focus is not materialized locally and a lost response hydrates only its terminal canonical receipt', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-08T10:00:00.000Z'));
  const canonicalFocus = JSON.stringify({ multiplier: 1.25, expiresAt: 1_900_000_000_000 });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('lost complete response'))
    .mockResolvedValueOnce({ status: 'already_claimed', giftXpMultiplier: canonicalFocus });

  await expect(applyOccurrence('focus_10m_25', 20)).resolves.toEqual({ success: false });
  expect(storage.gift_xp_multiplier).toBeUndefined();
  jest.setSystemTime(new Date('2026-08-08T10:04:00.000Z'));
  await expect(applyOccurrence('focus_10m_25', 20)).resolves.toEqual({ success: false, alreadyClaimed: true });
  expect(storage.gift_xp_multiplier).toBe(canonicalFocus);
});

test('random cosmetic selection is replayed for the same occurrence instead of unlocking another item', async () => {
  installCrashBeforeOuterEffectStatus();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('lost complete response'))
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' })
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });

  await expect(applyOccurrence('cosmetic_avatar_common', 15)).resolves.toEqual({ success: false });
  await expect(applyOccurrence('cosmetic_avatar_common', 15)).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(Object.keys(JSON.parse(storage.custom_avatar_owned_v1))).toHaveLength(1);
  await expect(applyOccurrence('cosmetic_avatar_common', 16)).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(Object.keys(JSON.parse(storage.custom_avatar_owned_v1))).toHaveLength(2);
});

test('energy bonus is persistent by stable UID without leaking across A to B to A', async () => {
  const gift = GIFT_POOL.find((item) => item.id === 'energy_plus1')!;
  storage.energy_state = JSON.stringify({ current: 3, lastRecoveryTime: 123 });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), { isPremium: false }))
    .resolves.toEqual(expect.objectContaining({ success: true }));
  await expect(readBonusEnergy()).resolves.toMatchObject({ amount: 1 });

  beginAccountGeneration('account-b');
  await expect(readBonusEnergy()).resolves.toBeNull();
  storage.energy_state = JSON.stringify({ current: 1, lastRecoveryTime: 456 });
  await expect(applyGift(gift, 'TestUser', 1, 5, jest.fn(), { isPremium: false }))
    .resolves.toEqual(expect.objectContaining({ success: true }));
  await expect(readBonusEnergy()).resolves.toMatchObject({ amount: 1 });

  beginAccountGeneration('account-a');
  await expect(readBonusEnergy()).resolves.toMatchObject({ amount: 1 });
  const bonusKeys = Object.keys(storage).filter((key) => key.includes('energy_gift_bonus'));
  expect(bonusKeys).toEqual(expect.arrayContaining([
    expect.stringContaining('uid:account-a'),
    expect.stringContaining('uid:account-b'),
  ]));
  expect(bonusKeys.every((key) => !key.includes('generation:'))).toBe(true);
});

test('an effect receipt stays pinned while its outer claim journal is prepared across more than 128 later gifts', async () => {
  installCrashBeforeOuterEffectStatus();
  let rejectFirstComplete = true;
  (callLevelGiftReservationAction as jest.Mock).mockImplementation(async (payload: { action: string }) => {
    if (payload.action === 'begin_claim') return { status: 'acquired' };
    if (payload.action === 'complete_claim' && rejectFirstComplete) {
      rejectFirstComplete = false;
      throw new Error('lost first completion');
    }
    if (payload.action === 'complete_claim') return { status: 'claimed' };
    return { status: 'released' };
  });

  await expect(applyOccurrence('hint_3', 8)).resolves.toEqual({ success: false });
  for (let level = 101; level < 230; level += 1) {
    await expect(applyOccurrence('hint_1', level)).resolves.toEqual({ success: true });
  }
  const hintKey = Object.keys(storage).find((key) => key.includes('bonus_hints'))!;
  expect(storage[hintKey]).toBe('132');

  await expect(applyOccurrence('hint_3', 8)).resolves.toEqual({ success: true });
  expect(storage[hintKey]).toBe('132');
});

test('energy_full persists energy_state before publishing the UI value', async () => {
  storage.energy_state = JSON.stringify({ current: 2, lastRecoveryTime: 123 });
  const setEnergy = jest.fn((next: number) => {
    expect(next).toBe(5);
    expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 123 });
  });
  const gift = GIFT_POOL.find((item) => item.id === 'energy_full')!;

  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, { isPremium: false }))
    .resolves.toEqual({ success: true });
  expect(setEnergy).toHaveBeenCalledTimes(1);
});

test('energy_full does not refill again after an outer-journal crash when energy was spent before retry', async () => {
  installCrashBeforeOuterEffectStatus();
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockRejectedValueOnce(new Error('lost complete response'))
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });
  functionsClient.callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_14_f2p_en',
    giftId: 'energy_full',
  });
  storage.energy_state = JSON.stringify({ current: 2, lastRecoveryTime: 123 });
  const setEnergy = jest.fn();
  const gift = reservedGift('energy_full', 14);
  const options = {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:14:f2p', studyTarget: 'en',
  } as const;

  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, options)).resolves.toEqual({ success: false });
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 123 });

  storage.energy_state = JSON.stringify({ current: 2, lastRecoveryTime: 456 });
  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, options)).resolves.toEqual({ success: true });
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 2, lastRecoveryTime: 456 });
  expect(setEnergy).toHaveBeenCalledTimes(1);
});

test('energy_plus derives its prepared target from persisted energy_state instead of stale UI energy', async () => {
  storage.energy_state = JSON.stringify({ current: 4, lastRecoveryTime: 321 });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });
  functionsClient.callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_12_f2p_en',
    giftId: 'energy_plus2',
  });
  const gift = reservedGift('energy_plus2', 12);
  const setEnergy = jest.fn((next: number) => {
    expect(JSON.parse(storage.energy_state).current).toBe(next);
  });

  await expect(applyGift(gift, 'TestUser', 1, 5, setEnergy, {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:12:f2p', studyTarget: 'en',
  })).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 6, lastRecoveryTime: 321 });
  expect(setEnergy).toHaveBeenCalledWith(6);
});

test('wager one-use gifts preserve distinct occurrences without duplicating a retry', async () => {
  (callLevelGiftReservationAction as jest.Mock).mockImplementation(async (payload: { action: string }) => (
    payload.action === 'begin_claim' ? { status: 'acquired' } : { status: 'claimed' }
  ));

  await expect(applyOccurrence('wager_discount_25', 32)).resolves.toEqual({ success: true });
  await expect(applyOccurrence('wager_discount_25', 33)).resolves.toEqual({ success: true });
  await expect(applyOccurrence('wager_discount_25', 33)).resolves.toEqual({ success: true });
  expect(storage.wager_discount).toBe('0.25');
  expect(storage.wager_discount_uses_v1).toBe('2');
});

test('Spin pack lanes use deterministic Spin-native grants and never legacy reservations', async () => {
  functionsClient.callLevelGiftActivatePackGift.mockRejectedValue(new Error('legacy activation forbidden'));
  functionsClient.callLevelSpinDeliveryAction.mockImplementation(async (payload: { action: string; lane: string }) => (
    payload.action === 'begin_delivery'
      ? { status: 'acquired', giftId: payload.lane === 'base' ? 'pack_voucher_48h' : 'prem_level_unlock_negotiator' }
      : { status: 'claimed' }
  ));
  functionsClient.callLevelSpinActivatePackGift.mockImplementation(async (payload: { lane: string }) => ({
    voucherId: `level_spin_spinpackrequest0003_${payload.lane}`,
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    ...(payload.lane === 'premium' ? { allowedPackId: 'official_negotiator_en' } : {}),
  }));
  functionsClient.callFlashcardPackGiftRedeem.mockResolvedValue({ gifted: true, alreadyOwned: false });
  const accountToken = captureAccountGeneration();
  const base: GiftDef = {
    ...ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === 'pack_voucher_48h')!,
    spinRewardReceipt: { requestId: 'spinpackrequest0003', lane: 'base', giftId: 'pack_voucher_48h' },
  };
  const premium: GiftDef = {
    ...ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === 'prem_level_unlock_negotiator')!,
    spinRewardReceipt: { requestId: 'spinpackrequest0003', lane: 'premium', giftId: 'prem_level_unlock_negotiator' },
  };

  await expect(applyGift(base, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toEqual({ success: true });
  await expect(applyGift(premium, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toEqual({ success: true });

  expect(functionsClient.callLevelGiftActivatePackGift).not.toHaveBeenCalled();
  expect(functionsClient.callLevelSpinActivatePackGift).toHaveBeenCalledTimes(2);
  expect(functionsClient.callLevelSpinActivatePackGift.mock.calls.map(([payload]) => payload.lane))
    .toEqual(['base', 'premium']);
  expect(functionsClient.callFlashcardPackGiftRedeem).toHaveBeenCalledWith(expect.objectContaining({
    packId: 'official_negotiator_en',
    voucherId: 'level_spin_spinpackrequest0003_premium',
  }));
});

test('Spin pack crash before durable local effect status reuses its delivery token and does not complete early', async () => {
  installCrashBeforeOuterEffectStatus();
  functionsClient.callLevelSpinDeliveryAction.mockImplementation(async (payload: { action: string }) => (
    payload.action === 'begin_delivery'
      ? { status: 'acquired', giftId: 'pack_voucher_48h' }
      : { status: 'claimed' }
  ));
  functionsClient.callLevelSpinActivatePackGift.mockImplementation(async (payload: { lane: string }) => ({
    voucherId: `level_spin_spinpackrequest0004_${payload.lane}`,
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
  }));
  const accountToken = captureAccountGeneration();
  const gift: GiftDef = {
    ...ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'pack_voucher_48h')!,
    spinRewardReceipt: { requestId: 'spinpackrequest0004', lane: 'base', giftId: 'pack_voucher_48h' },
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toEqual({ success: false });
  expect(functionsClient.callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_delivery']);

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toMatchObject({ success: true });
  expect(functionsClient.callLevelSpinDeliveryAction.mock.calls.map(([payload]) => payload.action))
    .toEqual(['begin_delivery', 'begin_delivery', 'complete_delivery']);
  const activationTokens = functionsClient.callLevelSpinActivatePackGift.mock.calls
    .map(([payload]) => payload.deliveryToken);
  expect(activationTokens).toHaveLength(2);
  expect(new Set(activationTokens).size).toBe(1);
});

test.each([
  ['chain_shield_1', 'chain_shield', { daysLeft: 1 }],
  ['xp_2x_24h', 'gift_xp_multiplier', { multiplier: 2 }],
] as const)('spin %s crash/replay does not duplicate its local effect', async (giftId, storageKey, expected) => {
  installCrashBeforeOuterEffectStatus();
  functionsClient.callLevelSpinDeliveryAction.mockImplementation(async (payload: { action: string }) => (
    payload.action === 'begin_delivery'
      ? { status: 'acquired', giftId }
      : { status: 'claimed' }
  ));
  const accountToken = captureAccountGeneration();
  const gift: GiftDef = {
    ...ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!,
    spinRewardReceipt: { requestId: `spin${giftId}request0005`, lane: 'base', giftId },
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toEqual({ success: false });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), { accountToken, studyTarget: 'en' }))
    .resolves.toMatchObject({ success: true });

  const state = JSON.parse(storage[storageKey]);
  expect(state).toMatchObject(expected);
});
