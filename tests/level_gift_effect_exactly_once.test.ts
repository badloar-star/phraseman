import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALL_LEVEL_GIFT_DEFS,
  applyGift,
  GIFT_POOL,
  isRandomAvatarAuraGiftCandidate,
  readBonusEnergy,
  type GiftDef,
  type GiftCosmeticUnlock,
} from '../app/level_gift_system';
import { callLevelGiftReservationAction } from '../app/community_packs/functionsClient';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { AVATAR_AURAS, getAvatarAuraById } from '../constants/avatar_auras';
import { CUSTOM_AVATARS, CUSTOM_AVATAR_GRADIENTS } from '../constants/custom_avatars';
import {
  localLevelSpinReceiptToInventory,
  parseLocalPendingReveal,
  type LocalLevelSpinReceipt,
} from '../app/level_spin_local_contract';
import {
  claimLocalLevelSpin,
  LOCAL_LEVEL_SPIN_STATE_KEY,
  recoverLocalLevelSpin,
} from '../app/local_level_spins';
import { LEVEL_SPIN_GIFT_JOURNAL_KEY, LEVEL_SPIN_PENDING_REVEAL_KEY } from '../app/level_up_storage_keys';
import { readAttemptRestoreGiftCount } from '../app/session_attempts/session_attempt_restore_inventory';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
  randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
}));
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn().mockResolvedValue(false),
}));
jest.mock('../app/community_packs/functionsClient', () => ({
  callLevelGiftReservationAction: jest.fn(),
  callLevelSpinDeliveryAction: jest.fn(),
  callLevelSpinActivatePackGift: jest.fn(),
  callLevelGiftReserve: jest.fn(),
  callLevelGiftActivatePackGift: jest.fn(),
  callFlashcardPackGiftRedeem: jest.fn(),
}));
jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn().mockResolvedValue({ finalDelta: 0 }),
  withXpAccountOperationQueue: jest.fn(async (_token, work) => work({})),
}));
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
const xpManager = jest.requireMock('../app/xp_manager') as { registerXP: jest.Mock };

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
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
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

function localReceipt(creditId: string, requestId: string): LocalLevelSpinReceipt {
  const createdAtMs = 1_800_000_000_000;
  return {
    ok: true,
    stableUid: 'account-a',
    requestId,
    creditId,
    level: 2,
    kind: 'standard',
    baseGiftId: 'xp_250',
    premiumGiftId: null,
    createdAtMs,
    expiresAtMs: createdAtMs + 259_200_000,
    balanceAfter: 0,
    status: 'awaiting_ack',
    revealState: 'pending',
    deliveries: { base: { state: 'unclaimed' } },
    catalogVersion: 3,
    schemaVersion: 2,
    localOnly: true,
  };
}

test.each([
  ['local_spin_session_en-s1', 'request_session_0001'],
  ['local_spin_arena_ranked_match-42', 'request_arena_000001'],
])('converts and recovers %s receipts after restart', (creditId, requestId) => {
  const receipt = localReceipt(creditId, requestId);
  expect(localLevelSpinReceiptToInventory(receipt)).toMatchObject({
    kind: 'single',
    level: 2,
    gift: { id: 'xp_250' },
  });
  expect(parseLocalPendingReveal(JSON.stringify({ owner: 'account-a', receipt }), 'account-a'))
    .toEqual(receipt);
});

function activeSpinState(receipt: LocalLevelSpinReceipt, credits: { id: string; level: number }[] = []) {
  const issuedCreditId = receipt.creditId.replace(/^level_spin_v1_/, 'local_spin_v1_');
  return {
    owner: 'account-a',
    credits,
    issuedLevels: [...new Set([
      ...credits.filter((credit) => credit.id.startsWith('local_spin_v1_')).map((credit) => credit.level),
      ...(receipt.creditId.startsWith('level_spin_v1_') ? [receipt.level] : []),
    ])],
    issuedCreditIds: [...new Set([...credits.map((credit) => credit.id), issuedCreditId])],
    activeReceipt: receipt,
    closedRequestIds: [],
  };
}

test.each([
  ['schema', { schemaVersion: 99 }],
  ['catalog', { catalogVersion: 99 }],
  ['shape', { deliveries: { base: { state: 'claimed' } } }],
  ['stale', { createdAtMs: 1_700_000_000_000, expiresAtMs: 1_700_259_200_000 }],
])('quarantines an invalid active receipt with bad %s and restores its source credit exactly once', async (_case, patch) => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const receipt = { ...localReceipt('level_spin_v1_003', 'request_invalid_0001'), level: 3, ...patch } as LocalLevelSpinReceipt;
  storage[stateKey] = JSON.stringify(activeSpinState(receipt));

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  let state = JSON.parse(storage[stateKey]);
  expect(state.activeReceipt).toBeNull();
  expect(state.credits).toEqual([{ id: 'local_spin_v1_003', level: 3 }]);

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  state = JSON.parse(storage[stateKey]);
  expect(state.credits).toEqual([{ id: 'local_spin_v1_003', level: 3 }]);
  await expect(claimLocalLevelSpin()).resolves.toMatchObject({ creditId: 'level_spin_v1_003', level: 3 });
});

test('clears an invalid-credit active receipt without consuming or blocking an existing credit', async () => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const receipt = localReceipt('local_spin_hack_x', 'request_invalid_0002');
  storage[stateKey] = JSON.stringify(activeSpinState(receipt, [{ id: 'local_spin_v1_004', level: 4 }]));

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  expect(JSON.parse(storage[stateKey])).toMatchObject({
    activeReceipt: null,
    credits: [{ id: 'local_spin_v1_004', level: 4 }],
  });
  await expect(claimLocalLevelSpin()).resolves.toMatchObject({ creditId: 'level_spin_v1_004', level: 4 });
});

test.each([
  ['local_spin_session_en-s1', 'request_session_active_01'],
  ['local_spin_arena_ranked_match-42', 'request_arena_active_001'],
])('restores a valid active %s receipt and never requeues its consumed credit', async (creditId, requestId) => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const receipt = localReceipt(creditId, requestId);
  storage[stateKey] = JSON.stringify(activeSpinState(receipt));

  await expect(recoverLocalLevelSpin()).resolves.toEqual(receipt);
  expect(JSON.parse(storage[stateKey])).toMatchObject({ activeReceipt: receipt, credits: [] });
  expect(JSON.parse(storage[LEVEL_SPIN_PENDING_REVEAL_KEY])).toEqual({ owner: 'account-a', receipt });
});

test('ignores a valid-looking pending reveal unless every immutable field matches active authority', async () => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const authoritative = localReceipt('local_spin_session_en-s1', 'request_authority_0001');
  const forgedPending = {
    ...authoritative,
    requestId: 'request_pending_forged_0001',
    baseGiftId: 'xp_1000',
  };
  storage[stateKey] = JSON.stringify(activeSpinState(authoritative));
  storage[LEVEL_SPIN_PENDING_REVEAL_KEY] = JSON.stringify({ owner: 'account-a', receipt: forgedPending });

  await expect(recoverLocalLevelSpin()).resolves.toEqual(authoritative);
  expect(JSON.parse(storage[LEVEL_SPIN_PENDING_REVEAL_KEY])).toEqual({
    owner: 'account-a', receipt: authoritative,
  });
});

test('does not restore a consumed credit when an expired active receipt is already outer-claimed', async () => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const receipt = {
    ...localReceipt('level_spin_v1_003', 'request_expired_claimed_0001'),
    level: 3,
    createdAtMs: 1_700_000_000_000,
    expiresAtMs: 1_700_259_200_000,
  } as LocalLevelSpinReceipt;
  storage[stateKey] = JSON.stringify(activeSpinState(receipt));
  storage[LEVEL_SPIN_GIFT_JOURNAL_KEY] = JSON.stringify([{
    owner: 'account-a', requestId: receipt.requestId, creditId: receipt.creditId, level: receipt.level,
    receivedAtMs: receipt.createdAtMs, expiresAtMs: receipt.expiresAtMs, localOnly: true,
    occurrences: [{ occurrenceId: `level-spin:${receipt.requestId}:base`, lane: 'base', giftId: receipt.baseGiftId, claimed: true }],
  }]);

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  expect(JSON.parse(storage[stateKey])).toMatchObject({ activeReceipt: null, credits: [] });
});

test.each([
  ['local_spin_session_en-s1', 'request_foreign_session_01'],
  ['local_spin_arena_ranked_match-42', 'request_foreign_arena_001'],
])('never credits owner A from owner B active receipt %s and preserves B pending envelope', async (creditId, requestId) => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const foreignReceipt = { ...localReceipt(creditId, requestId), stableUid: 'account-b' };
  const pendingEnvelope = { owner: 'account-b', receipt: foreignReceipt };
  storage[stateKey] = JSON.stringify(activeSpinState(foreignReceipt));
  storage[LEVEL_SPIN_PENDING_REVEAL_KEY] = JSON.stringify(pendingEnvelope);

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  expect(JSON.parse(storage[stateKey])).toMatchObject({ activeReceipt: null, credits: [] });
  expect(JSON.parse(storage[LEVEL_SPIN_PENDING_REVEAL_KEY])).toEqual(pendingEnvelope);
});

test('preserves a different-request global pending envelope while clearing invalid active state', async () => {
  const stateKey = `${LOCAL_LEVEL_SPIN_STATE_KEY}:account-a`;
  const invalidActive = {
    ...localReceipt('level_spin_v1_003', 'request_invalid_active_03'),
    level: 3,
    schemaVersion: 99,
  } as unknown as LocalLevelSpinReceipt;
  const unrelatedPending = {
    owner: 'account-a',
    receipt: { ...localReceipt('local_spin_session_en-s2', 'request_unrelated_0002'), stableUid: 'account-b' },
  };
  storage[stateKey] = JSON.stringify(activeSpinState(invalidActive));
  storage[LEVEL_SPIN_PENDING_REVEAL_KEY] = JSON.stringify(unrelatedPending);

  await expect(recoverLocalLevelSpin()).resolves.toBeNull();
  expect(JSON.parse(storage[stateKey])).toMatchObject({
    activeReceipt: null,
    credits: [{ id: 'local_spin_v1_003', level: 3 }],
  });
  expect(JSON.parse(storage[LEVEL_SPIN_PENDING_REVEAL_KEY])).toEqual(unrelatedPending);
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
  expect(JSON.parse(scopedValue('energy_gift_bonus', 'account-a')!)).toMatchObject({ amount: 2, capacity: 2 });
  await expect(applyOccurrence('energy_plus2', 13)).resolves.toEqual(expect.objectContaining({ success: true }));
  expect(JSON.parse(scopedValue('energy_gift_bonus', 'account-a')!)).toMatchObject({ amount: 4, capacity: 4 });
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

test('spin avatar gift can select the full custom-gen pool and a retry does not unlock a second avatar', async () => {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'cosmetic_avatar_common')!;
  const opts = {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level-spin:avatar-request-0001:base',
    localOnly: true as const,
  };
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.999999);

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toMatchObject({
    success: true,
    cosmeticUnlocked: { kind: 'avatar', id: 'custom-gen-125' },
  });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toMatchObject({
    success: true,
    cosmeticUnlocked: { kind: 'avatar', id: 'custom-gen-125' },
  });
  expect(Object.keys(JSON.parse(storage.custom_avatar_owned_v1))).toEqual(['custom-gen-125']);
  expect(random).toHaveBeenCalledTimes(3);
});

test('spin second-chance gift stays permanently in inventory and a retry cannot credit it twice', async () => {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'attempt_restore_all')!;
  const accountToken = captureAccountGeneration();
  const firstOccurrence = {
    accountToken,
    occurrenceId: 'level-spin:attempt-restore-request-0001:base',
    localOnly: true as const,
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), firstOccurrence))
    .resolves.toEqual({ success: true });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), firstOccurrence))
    .resolves.toEqual({ success: true });
  await expect(readAttemptRestoreGiftCount(accountToken)).resolves.toBe(1);

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    ...firstOccurrence,
    occurrenceId: 'level-spin:attempt-restore-request-0002:base',
  })).resolves.toEqual({ success: true });
  await expect(readAttemptRestoreGiftCount(accountToken)).resolves.toBe(2);
  expect(Object.values(storage).join('\n')).not.toContain('expiresAtMs');
});

test('random aura eligibility excludes access, reward, retired, level-gated and already-owned auras', () => {
  const ordinary = getAvatarAuraById('aura-still-halo')!;
  expect(isRandomAvatarAuraGiftCandidate(ordinary, {})).toBe(true);
  expect(isRandomAvatarAuraGiftCandidate(getAvatarAuraById('aura-plus')!, {})).toBe(false);
  expect(isRandomAvatarAuraGiftCandidate(getAvatarAuraById('aura-pro')!, {})).toBe(false);
  expect(isRandomAvatarAuraGiftCandidate(getAvatarAuraById('aura-nimbus')!, {})).toBe(false);
  expect(isRandomAvatarAuraGiftCandidate({ ...ordinary, id: 'retired', retiredFromShop: true }, {})).toBe(false);
  expect(isRandomAvatarAuraGiftCandidate({ ...ordinary, id: 'level-gated', unlockLevel: 50 }, {})).toBe(false);
  expect(isRandomAvatarAuraGiftCandidate(ordinary, { [ordinary.id]: true })).toBe(false);
});

test('aura selection is durably fixed before ownership and replay grants only that exact aura once', async () => {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'cosmetic_avatar_aura')!;
  const accountToken = captureAccountGeneration();
  let failOwnershipOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (failOwnershipOnce && pairs.some(([key]) => key === 'avatar_aura_owned_v1')) {
      failOwnershipOnce = false;
      throw new Error('crash before aura ownership');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.999);
  const opts = { accountToken, occurrenceId: 'level-spin:aura-request-0001:base', localOnly: true as const };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toEqual({ success: false });
  const receipt = JSON.parse(storage.level_gift_effect_receipts_v1);
  const selectedId = Object.values(receipt)[0] as { aura: { id: string } };
  expect(selectedId.aura.id).toBeTruthy();
  expect(storage.avatar_aura_owned_v1).toBeUndefined();

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toMatchObject({
    success: true,
    cosmeticUnlocked: { kind: 'aura', id: selectedId.aura.id },
  });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toMatchObject({
    success: true,
    cosmeticUnlocked: { kind: 'aura', id: selectedId.aura.id },
  });
  expect(Object.keys(JSON.parse(storage.avatar_aura_owned_v1))).toEqual([selectedId.aura.id]);
  expect(random).toHaveBeenCalledTimes(1);
});

test.each([
  ['cosmetic_avatar_aura', 'avatar_aura_owned_v1', 'aura'],
  ['cosmetic_avatar_common', 'custom_avatar_owned_v1', 'customAvatar'],
  ['cosmetic_theme', 'owned_theme_modes_v1', 'theme'],
] as const)('%s replays the exact cosmetic after ownership persisted but receipt finalization failed', async (
  giftId, ownershipKey, receiptField,
) => {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!;
  const opts = {
    accountToken: captureAccountGeneration(),
    occurrenceId: `level-spin:post-ownership-${giftId}-0001:base`,
    localOnly: true as const,
  };
  jest.spyOn(Math, 'random').mockReturnValue(0);
  let rejectFinalReceiptOnce = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === 'level_gift_effect_receipts_v1'
      && value.includes('"status":"applied_unconfirmed"')
      && rejectFinalReceiptOnce) {
      rejectFinalReceiptOnce = false;
      throw new Error('crash after cosmetic ownership');
    }
    storage[key] = value;
  });

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toEqual({ success: false });
  const prepared = JSON.parse(storage.level_gift_effect_receipts_v1) as Record<string, Record<string, unknown>>;
  const selected = Object.values(prepared)[0]![receiptField] as GiftCosmeticUnlock;
  expect(selected?.id).toBeTruthy();
  expect(storage[ownershipKey]).toContain(selected.id);

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toMatchObject({
    success: true,
    cosmeticUnlocked: { kind: selected.kind, id: selected.id },
  });
  expect(storage[ownershipKey]).toContain(selected.id);
  expect(xpManager.registerXP).not.toHaveBeenCalled();
});

test.each(['{bad', '[]', '{"entry":{"giftId":"xp_250","status":"bogus"}}'])
('malformed effect receipt authority fails closed without overwrite: %s', async (raw) => {
  storage.level_gift_effect_receipts_v1 = raw;
  const before = storage.level_gift_effect_receipts_v1;
  await expect(applyGift(
    ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'cosmetic_avatar_common')!,
    'TestUser', 3, 5, jest.fn(), {
      accountToken: captureAccountGeneration(),
      occurrenceId: 'level-spin:malformed-effect-receipt-0001:base',
      localOnly: true,
    },
  )).resolves.toEqual({ success: false });
  expect(storage.level_gift_effect_receipts_v1).toBe(before);
  expect(storage.custom_avatar_owned_v1).toBeUndefined();
});

test.each([
  ['unknown avatar', 'cosmetic_avatar_common', 'customAvatar', {
    kind: 'avatar', id: 'not-a-real-avatar', gradientId: CUSTOM_AVATAR_GRADIENTS[0]!.id,
    logoColor: 'black', labelRu: 'x', labelUk: 'x', labelEs: 'x',
  }],
  ['unknown aura', 'cosmetic_avatar_aura', 'aura', {
    kind: 'aura', id: 'not-a-real-aura', labelRu: 'x', labelUk: 'x', labelEs: 'x',
  }],
  ['unknown theme', 'cosmetic_theme', 'theme', {
    kind: 'theme', id: 'not-a-real-theme', labelRu: 'x', labelUk: 'x', labelEs: 'x',
  }],
  ['unknown gradient', 'cosmetic_avatar_common', 'customAvatar', {
    kind: 'avatar', id: CUSTOM_AVATARS[0]!.id, gradientId: 'not-a-real-gradient',
    logoColor: 'black', labelRu: 'x', labelUk: 'x', labelEs: 'x',
  }],
  ['gift/payload mismatch', 'cosmetic_theme', 'aura', {
    kind: 'aura', id: AVATAR_AURAS[0]!.id, labelRu: 'x', labelUk: 'x', labelEs: 'x',
  }],
  ['energy capacity below remaining amount', 'energy_plus3', 'energyBonus', {
    amount: 3, capacity: 2, expiresAt: 1_900_000_000_000,
    energyTarget: 3, energyBoostAlreadyActive: false,
  }],
] as const)('rejects adversarial effect receipt semantic: %s', async (_label, giftId, field, payload) => {
  const occurrenceId = `level-spin:semantic-${giftId}-0001:base`;
  const slot = field === 'aura' ? 'aura' : field === 'theme' ? 'theme'
    : field === 'customAvatar' ? 'custom_avatar' : 'primary';
  const occurrenceKey = `account-a:${occurrenceId}:${giftId}:${slot}`;
  const raw = JSON.stringify({
    [occurrenceKey]: { giftId, status: 'prepared', [field]: payload },
  });
  storage.level_gift_effect_receipts_v1 = raw;

  await expect(applyGift(
    ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!,
    'TestUser', 3, 5, jest.fn(), {
      accountToken: captureAccountGeneration(), occurrenceId, localOnly: true,
    },
  )).resolves.toEqual({ success: false });
  expect(storage.level_gift_effect_receipts_v1).toBe(raw);
  expect(storage.custom_avatar_owned_v1).toBeUndefined();
  expect(storage.avatar_aura_owned_v1).toBeUndefined();
  expect(storage.owned_theme_modes_v1).toBeUndefined();
});

const validEffectSlotFixtures = [
  ['cosmetic_avatar_aura', 'aura', {
    aura: { kind: 'aura', id: AVATAR_AURAS[0]!.id, labelRu: 'x', labelUk: 'x', labelEs: 'x' },
  }],
  ['cosmetic_theme', 'theme', {
    theme: { kind: 'theme', id: 'midnight', labelRu: 'x', labelUk: 'x', labelEs: 'x' },
  }],
  ['cosmetic_avatar_common', 'custom_avatar', {
    customAvatar: {
      kind: 'avatar', id: CUSTOM_AVATARS[0]!.id, gradientId: CUSTOM_AVATAR_GRADIENTS[0]!.id,
      logoColor: 'black', labelRu: 'x', labelUk: 'x', labelEs: 'x',
    },
  }],
  ['energy_plus1', 'primary', {
    energyBonus: { amount: 1, expiresAt: 1_900_000_000_000, energyTarget: 3, energyBoostAlreadyActive: false },
  }],
] as const;

test.each(validEffectSlotFixtures)('accepts valid historical %s receipt in %s slot', async (
  giftId, slot, payload,
) => {
  const occurrenceId = `level-spin:valid-slot-${giftId}-0001:base`;
  storage.level_gift_effect_receipts_v1 = JSON.stringify({
    [`account-a:${occurrenceId}:${giftId}:${slot}`]: { giftId, status: 'applied', ...payload },
  });
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!;
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId, localOnly: true,
  })).resolves.toMatchObject({ success: true });
});

test.each(validEffectSlotFixtures)('rejects valid %s payload from a wrong receipt slot', async (
  giftId, slot, payload,
) => {
  const occurrenceId = `level-spin:wrong-slot-${giftId}-0001:base`;
  const wrongSlot = slot === 'primary' ? 'aura' : 'primary';
  const raw = JSON.stringify({
    [`account-a:${occurrenceId}:${giftId}:${wrongSlot}`]: { giftId, status: 'applied', ...payload },
  });
  storage.level_gift_effect_receipts_v1 = raw;
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!;
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(), occurrenceId, localOnly: true,
  })).resolves.toEqual({ success: false });
  expect(storage.level_gift_effect_receipts_v1).toBe(raw);
});

test('fallback energy grants serialize an expired snapshot and preserve both concurrent amounts', async () => {
  const token = captureAccountGeneration();
  const scopedBonusKey = Object.keys(storage).find((key) => key.includes('energy_gift_bonus'))
    ?? `energy_gift_bonus::uid:${token.stableId}`;
  storage[scopedBonusKey] = JSON.stringify({ amount: 2, expiresAt: Date.now() - 1 });
  const plus1 = GIFT_POOL.find((item) => item.id === 'energy_plus1')!;
  const plus2 = GIFT_POOL.find((item) => item.id === 'energy_plus2')!;

  await Promise.all([
    applyGift(plus1, 'TestUser', 3, 5, jest.fn(), { isPremium: false }),
    applyGift(plus2, 'TestUser', 3, 5, jest.fn(), { isPremium: false }),
  ]);

  await expect(readBonusEnergy(token)).resolves.toMatchObject({ amount: 3, capacity: 3 });
});

test('all-owned ordinary aura pool keeps the deterministic 350 XP fallback', async () => {
  storage.avatar_aura_owned_v1 = JSON.stringify(Object.fromEntries(
    AVATAR_AURAS.filter((aura) => isRandomAvatarAuraGiftCandidate(aura, {})).map((aura) => [aura.id, true]),
  ));
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'cosmetic_avatar_aura')!;
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level-spin:aura-request-0002:base',
    localOnly: true,
  })).resolves.toEqual({ success: true });
  expect(xpManager.registerXP).toHaveBeenCalledWith(
    350,
    'achievement_reward',
    'TestUser',
    'ru',
    undefined,
    expect.any(Object),
  );
});

test.each([
  ['cosmetic_avatar_aura', 'avatar_aura_owned_v1', 'aura'],
  ['cosmetic_avatar_common', 'custom_avatar_owned_v1', 'customAvatar'],
  ['cosmetic_theme', 'owned_theme_modes_v1', 'theme'],
] as const)('stale %s receipt turns malformed ownership into a durable null fallback without overwriting it', async (
  giftId, ownershipKey, receiptField,
) => {
  storage[ownershipKey] = '{bad';
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId)!;
  const opts = {
    accountToken: captureAccountGeneration(),
    occurrenceId: `level-spin:malformed-${giftId}-0001:base`,
    localOnly: true as const,
  };

  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), opts)).resolves.toEqual({ success: true });
  expect(storage[ownershipKey]).toBe('{bad');
  const receipts = JSON.parse(storage.level_gift_effect_receipts_v1) as Record<string, Record<string, unknown>>;
  expect(Object.values(receipts)[0]?.[receiptField]).toBeNull();
  expect(xpManager.registerXP).toHaveBeenCalledWith(
    350, 'achievement_reward', 'TestUser', 'ru', undefined, expect.any(Object),
  );
});

test('transient cosmetic ownership read failure leaves the occurrence pending for retry', async () => {
  const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === 'cosmetic_avatar_aura')!;
  const normalGet = AsyncStorage.getItem as jest.Mock;
  normalGet.mockImplementation(async (key: string) => {
    if (key === 'avatar_aura_owned_v1') throw new Error('temporary storage failure');
    return storage[key] ?? null;
  });
  await expect(applyGift(gift, 'TestUser', 3, 5, jest.fn(), {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level-spin:aura-read-failed-0001:base',
    localOnly: true,
  })).resolves.toEqual({ success: false });
  expect(storage.level_gift_effect_receipts_v1).toBeUndefined();
  expect(xpManager.registerXP).not.toHaveBeenCalled();
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

test('energy_full fills the current active temporary capacity without increasing it', async () => {
  const expiresAt = Date.now() + 60_000;
  storage.energy_state = JSON.stringify({ current: 5, lastRecoveryTime: 123 });
  storage['energy_gift_bonus::uid:account-a'] = JSON.stringify({ amount: 0, capacity: 3, expiresAt });
  (callLevelGiftReservationAction as jest.Mock)
    .mockResolvedValueOnce({ status: 'acquired' })
    .mockResolvedValueOnce({ status: 'claimed' });
  functionsClient.callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_15_f2p_en',
    giftId: 'energy_full',
  });
  const setEnergy = jest.fn();
  const gift = reservedGift('energy_full', 15);

  await expect(applyGift(gift, 'TestUser', 5, 5, setEnergy, {
    accountToken: captureAccountGeneration(),
    occurrenceId: 'level:15:f2p',
    studyTarget: 'en',
  }))
    .resolves.toEqual({ success: true });

  expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 123 });
  expect(JSON.parse(storage['energy_gift_bonus::uid:account-a'])).toEqual({
    amount: 3,
    capacity: 3,
    expiresAt,
  });
  expect(setEnergy).toHaveBeenCalledWith(5);
});

test('energy_full does not create temporary capacity when the prior boost expired', async () => {
  const expiredAt = Date.now() - 1;
  storage.energy_state = JSON.stringify({ current: 1, lastRecoveryTime: 456 });
  storage['energy_gift_bonus::uid:account-a'] = JSON.stringify({ amount: 0, capacity: 3, expiresAt: expiredAt });
  const gift = GIFT_POOL.find((item) => item.id === 'energy_full')!;

  await expect(applyGift(gift, 'TestUser', 1, 5, jest.fn(), { isPremium: false }))
    .resolves.toEqual({ success: true });

  expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 456 });
  expect(JSON.parse(storage['energy_gift_bonus::uid:account-a'])).toEqual({
    amount: 0,
    capacity: 3,
    expiresAt: expiredAt,
  });
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

test('energy_full retry cannot refill after the projection write returned ambiguously and energy was spent', async () => {
  const expiresAt = Date.now() + 60_000;
  storage.energy_state = JSON.stringify({ current: 2, lastRecoveryTime: 123 });
  storage['energy_gift_bonus::uid:account-a'] = JSON.stringify({ amount: 0, capacity: 3, expiresAt });
  let crashAfterProjection = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
    if (crashAfterProjection
      && pairs.some(([key]) => key === 'energy_state')
      && pairs.some(([key]) => key === 'energy_gift_bonus::uid:account-a')) {
      crashAfterProjection = false;
      throw new Error('ambiguous_energy_full_projection_write');
    }
  });
  (callLevelGiftReservationAction as jest.Mock).mockImplementation(async (payload: { action: string }) => (
    payload.action === 'begin_claim' ? { status: 'acquired' }
      : payload.action === 'complete_claim' ? { status: 'claimed' }
        : { status: 'released' }
  ));
  functionsClient.callLevelGiftReserve.mockResolvedValue({
    reservationId: 'account-a_16_f2p_en',
    giftId: 'energy_full',
  });
  const gift = reservedGift('energy_full', 16);
  const setEnergy = jest.fn();
  const options = {
    accountToken: captureAccountGeneration(), occurrenceId: 'level:16:f2p', studyTarget: 'en',
  } as const;

  await expect(applyGift(gift, 'TestUser', 2, 5, setEnergy, options)).resolves.toEqual({ success: false });
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 123 });
  expect(JSON.parse(storage['energy_gift_bonus::uid:account-a'])).toEqual({ amount: 3, capacity: 3, expiresAt });

  storage.energy_state = JSON.stringify({ current: 4, lastRecoveryTime: 456 });
  storage['energy_gift_bonus::uid:account-a'] = JSON.stringify({ amount: 1, capacity: 3, expiresAt });
  await expect(applyGift(gift, 'TestUser', 4, 5, setEnergy, options)).resolves.toEqual({ success: true });
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 4, lastRecoveryTime: 456 });
  expect(JSON.parse(storage['energy_gift_bonus::uid:account-a'])).toEqual({ amount: 1, capacity: 3, expiresAt });
  expect(setEnergy).not.toHaveBeenCalled();
});

test('energy_full self-heals malformed base energy while filling the active bonus', async () => {
  const expiresAt = Date.now() + 60_000;
  storage.energy_state = '{bad';
  storage['energy_gift_bonus::uid:account-a'] = JSON.stringify({ amount: 1, capacity: 3, expiresAt });
  const gift = GIFT_POOL.find((item) => item.id === 'energy_full')!;

  await expect(applyGift(gift, 'TestUser', 1, 5, jest.fn(), { isPremium: false }))
    .resolves.toEqual({ success: true });
  expect(JSON.parse(storage.energy_state)).toMatchObject({ current: 5 });
  expect(JSON.parse(storage['energy_gift_bonus::uid:account-a'])).toEqual({ amount: 3, capacity: 3, expiresAt });
});

test('energy_plus fills only the temporary pool without inflating persisted base energy', async () => {
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
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 4, lastRecoveryTime: 321 });
  expect(JSON.parse(scopedValue('energy_gift_bonus', 'account-a')!)).toMatchObject({ amount: 2, capacity: 2 });
  expect(setEnergy).toHaveBeenCalledWith(4);
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
