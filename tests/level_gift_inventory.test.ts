import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPendingLevelGiftInventoryCache,
  ensureLevelGiftEntitlement,
  ensureUnclaimedGiftForLevel,
  CLAIMED_GIFTS_KEY,
  loadPendingLevelGiftCount,
  loadPendingLevelGiftInventory,
  markDualGiftClaimed,
  markDualGiftPartClaimed,
  markGiftClaimed,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  readPendingLevelGiftCountCache,
  saveRemainingGiftAfterPartialDualClaim,
  saveUnclaimedDualGift,
  saveUnclaimedGift,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
} from '../app/level_gift_inventory';
import {
  isFlashcardPackLevelGiftId,
  rollF2pLevelGiftForUser,
  rollPremiumLevelGiftForUser,
  type GiftDef,
} from '../app/level_gift_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/level_gift_system', () => {
  const actual = jest.requireActual('../app/level_gift_system');
  return {
    ...actual,
    rollF2pLevelGiftForUser: jest.fn(),
    rollPremiumLevelGiftForUser: jest.fn(),
  };
});

const mockStorage: Record<string, string> = {};

const makeGift = (id: string, rarity: GiftDef['rarity'] = 'common'): GiftDef => ({
  id,
  rarity,
  icon: 'gift',
  titleRU: id,
  titleUK: id,
  titleES: id,
  descRU: id,
  descUK: id,
  descES: id,
  weight: 1,
});

const pendingGiftIds = (items: Awaited<ReturnType<typeof loadPendingLevelGiftInventory>>): string[] =>
  items.flatMap((item) => item.kind === 'single' ? [item.gift.id] : [item.pair.f2p.id, item.pair.prem.id]);

beforeEach(() => {
  __resetAccountGenerationForTests();
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
  // Some code paths read/write via the multi* APIs — wire them to the same store
  // so save→load round-trips hit one source of truth (the firestore mock only
  // backs getItem/setItem otherwise, leaving multi* on a separate object).
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null])),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
    return Promise.resolve();
  });
  (rollF2pLevelGiftForUser as jest.Mock).mockResolvedValue(makeGift('rolled_f2p'));
  (rollPremiumLevelGiftForUser as jest.Mock).mockResolvedValue(makeGift('rolled_premium', 'epic'));
});

describe('level gift inventory', () => {
  it('does not let a delayed modal save from account A overwrite account B inventory', async () => {
    beginAccountGeneration('account-a');
    const accountAToken = captureAccountGeneration();
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
    (AsyncStorage.multiGet as jest.Mock).mockImplementationOnce(async (keys: string[]) => {
      await readGate;
      return keys.map((key) => [key, mockStorage[key] ?? null]);
    });

    const delayedSave = saveUnclaimedGift(7, makeGift('account-a-gift'), accountAToken);
    beginAccountGeneration('account-b');
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 7: makeGift('account-b-gift') });
    releaseRead();
    await delayedSave;

    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[7].id).toBe('account-b-gift');
  });

  it('ignores stale modal claim cleanup after the account generation changes', async () => {
    beginAccountGeneration('account-a');
    const accountAToken = captureAccountGeneration();
    beginAccountGeneration('account-b');
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 9: makeGift('account-b-gift') });

    await markGiftClaimed(9, accountAToken);

    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[9].id).toBe('account-b-gift');
  });

  it('does not deadlock entitlement persistence when the caller already owns the account transition lock', async () => {
    beginAccountGeneration('account-a');
    const accountToken = captureAccountGeneration();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      withAccountTransitionLock(() => ensureLevelGiftEntitlement(11, { accountToken })),
      new Promise<'timeout'>((resolve) => { timeout = setTimeout(() => resolve('timeout'), 1000); }),
    ]).finally(() => {
      if (timeout) clearTimeout(timeout);
    });

    expect(result).toMatchObject({ status: 'persisted', level: 11 });
  });

  it('lets opening N persist single, partial-dual, and failed-dual outcomes after N+1 opens on the same account', async () => {
    beginAccountGeneration('account-a');
    const openingN = captureAccountGeneration();
    const openingNPlusOne = captureAccountGeneration();
    expect(openingNPlusOne).not.toBe(openingN);

    await saveUnclaimedGift(31, makeGift('single-from-opening-n'), openingN);
    await saveUnclaimedDualGift(32, {
      f2p: makeGift('claimed-half'),
      prem: makeGift('remaining-half'),
    }, openingN);
    await saveRemainingGiftAfterPartialDualClaim(32, makeGift('remaining-half'), openingN);
    await saveUnclaimedDualGift(33, {
      f2p: makeGift('failed-f2p'),
      prem: makeGift('failed-premium'),
    }, openingN);

    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[31].id).toBe('single-from-opening-n');
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[32].id).toBe('remaining-half');
    expect(JSON.parse(mockStorage[UNCLAIMED_DUAL_GIFTS_KEY])[33]).toMatchObject({
      f2p: { id: 'failed-f2p' },
      prem: { id: 'failed-premium' },
    });
  });

  it.each([Number.NaN, 0, -1, 1.5])('rejects invalid entitlement level %p', async (level) => {
    await expect(ensureLevelGiftEntitlement(level)).resolves.toEqual({ status: 'failed', level });
    expect(rollF2pLevelGiftForUser).not.toHaveBeenCalled();
    expect(rollPremiumLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('returns an existing exact dual entitlement without rerolling', async () => {
    const pair = { f2p: makeGift('existing_f2p'), prem: makeGift('existing_premium', 'epic') };
    await saveUnclaimedDualGift(12, pair);

    await expect(ensureLevelGiftEntitlement(12, { premium: true })).resolves.toEqual({
      status: 'already_pending',
      level: 12,
      kind: 'dual',
      pair,
    });
    expect(rollF2pLevelGiftForUser).not.toHaveBeenCalled();
    expect(rollPremiumLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('fails an initially conflicting single and dual entitlement instead of choosing either', async () => {
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 12: makeGift('conflicting_single') });
    mockStorage[UNCLAIMED_DUAL_GIFTS_KEY] = JSON.stringify({
      12: { f2p: makeGift('dual_f2p'), prem: makeGift('dual_premium', 'epic') },
    });

    await expect(ensureLevelGiftEntitlement(12, { premium: true })).resolves.toEqual({
      status: 'failed',
      level: 12,
    });
    expect(rollF2pLevelGiftForUser).not.toHaveBeenCalled();
    expect(rollPremiumLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('persists and reads back an exact fresh premium pair when no gift is pending', async () => {
    await expect(ensureLevelGiftEntitlement(12, { premium: true, studyTarget: 'fr' })).resolves.toEqual({
      status: 'persisted',
      level: 12,
      kind: 'dual',
      pair: {
        f2p: makeGift('rolled_f2p'),
        prem: makeGift('rolled_premium', 'epic'),
      },
    });
    expect(rollF2pLevelGiftForUser).toHaveBeenCalledWith(12, {
      premiumSafe: true,
      studyTarget: 'fr',
    });
    expect(rollPremiumLevelGiftForUser).toHaveBeenCalledWith(12, { studyTarget: 'fr' });
    expect(JSON.parse(mockStorage[UNCLAIMED_DUAL_GIFTS_KEY])).toMatchObject({
      12: { f2p: { id: 'rolled_f2p' }, prem: { id: 'rolled_premium' } },
    });
  });

  it('persists a new entitlement durably and then returns the exact pending gift', async () => {
    await expect(ensureLevelGiftEntitlement(12)).resolves.toEqual({
      status: 'persisted',
      level: 12,
      kind: 'single',
      gift: makeGift('rolled_f2p'),
    });
    await expect(ensureLevelGiftEntitlement(12)).resolves.toEqual({
      status: 'already_pending',
      level: 12,
      kind: 'single',
      gift: makeGift('rolled_f2p'),
    });
    expect(rollF2pLevelGiftForUser).toHaveBeenCalledTimes(1);
  });

  it('does not recreate a level gift after it was claimed', async () => {
    mockStorage[CLAIMED_GIFTS_KEY] = JSON.stringify({ 12: 'rare' });

    await expect(ensureLevelGiftEntitlement(12)).resolves.toEqual({ status: 'already_claimed', level: 12 });
    expect(rollF2pLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('returns failed when a swallowed write is not durable', async () => {
    (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);

    await expect(ensureLevelGiftEntitlement(12)).resolves.toEqual({ status: 'failed', level: 12 });
  });

  it('returns failed when a single read-back also contains a conflicting dual gift', async () => {
    const conflict = { f2p: makeGift('conflict_f2p'), prem: makeGift('conflict_premium', 'epic') };
    (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        mockStorage[key] = value;
      });
      mockStorage[UNCLAIMED_DUAL_GIFTS_KEY] = JSON.stringify({ 12: conflict });
      return Promise.resolve();
    });

    await expect(ensureLevelGiftEntitlement(12)).resolves.toEqual({ status: 'failed', level: 12 });
  });

  it('upgrades an untouched single entitlement to an exact premium pair', async () => {
    const existing = makeGift('existing_f2p');
    await saveUnclaimedGift(12, existing);

    await expect(ensureLevelGiftEntitlement(12, { premium: true, studyTarget: 'fr' })).resolves.toEqual({
      status: 'persisted',
      level: 12,
      kind: 'dual',
      pair: { f2p: existing, prem: makeGift('rolled_premium', 'epic') },
    });
    expect(rollPremiumLevelGiftForUser).toHaveBeenCalledWith(12, { studyTarget: 'fr' });
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY] ?? '{}')[12]).toBeUndefined();
  });

  it('does not resurrect the claimed half of a partially claimed dual entitlement', async () => {
    const remaining = makeGift('remaining_premium', 'epic');
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 12: remaining });
    mockStorage[CLAIMED_GIFTS_KEY] = JSON.stringify({ 12: 'common' });

    await expect(ensureLevelGiftEntitlement(12, { premium: true })).resolves.toEqual({
      status: 'already_pending',
      level: 12,
      kind: 'single',
      gift: remaining,
    });
    expect(rollPremiumLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('durably marks a claimed dual part and blocks premium resurrection without cosmetic history', async () => {
    const pair = {
      f2p: makeGift('claimed_f2p'),
      prem: makeGift('remaining_premium', 'epic'),
    };
    await saveUnclaimedDualGift(22, pair);

    await markDualGiftPartClaimed(22, 'f2p');

    expect(AsyncStorage.multiSet).toHaveBeenLastCalledWith(expect.arrayContaining([
      [UNCLAIMED_DUAL_GIFTS_KEY, expect.any(String)],
      [UNCLAIMED_GIFTS_KEY, expect.any(String)],
      [PARTIAL_DUAL_CLAIMED_LEVELS_KEY, expect.any(String)],
    ]));
    expect(JSON.parse(mockStorage[PARTIAL_DUAL_CLAIMED_LEVELS_KEY])).toContain(22);
    expect(JSON.parse(mockStorage[UNCLAIMED_DUAL_GIFTS_KEY] ?? '{}')[22]).toBeUndefined();
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[22]).toEqual(pair.prem);
    await expect(ensureLevelGiftEntitlement(22, { premium: true })).resolves.toEqual({
      status: 'already_pending',
      level: 22,
      kind: 'single',
      gift: pair.prem,
    });
    expect(rollPremiumLevelGiftForUser).not.toHaveBeenCalled();
  });

  it('atomically saves the exact remaining gift, deletes its dual pair, and records the partial marker', async () => {
    const remaining = makeGift('remaining_exact', 'epic');
    await saveUnclaimedDualGift(24, {
      f2p: makeGift('claimed_half'),
      prem: remaining,
    });

    await saveRemainingGiftAfterPartialDualClaim(24, remaining);

    expect(AsyncStorage.multiSet).toHaveBeenLastCalledWith(expect.arrayContaining([
      [UNCLAIMED_DUAL_GIFTS_KEY, expect.any(String)],
      [UNCLAIMED_GIFTS_KEY, expect.any(String)],
      [PARTIAL_DUAL_CLAIMED_LEVELS_KEY, expect.any(String)],
    ]));
    expect(JSON.parse(mockStorage[UNCLAIMED_DUAL_GIFTS_KEY] ?? '{}')[24]).toBeUndefined();
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])[24]).toEqual(remaining);
    expect(JSON.parse(mockStorage[PARTIAL_DUAL_CLAIMED_LEVELS_KEY])).toContain(24);
  });

  it('returns failed unless premium persistence reads back the exact pair without a single conflict', async () => {
    const wrongPair = {
      f2p: makeGift('wrong_f2p'),
      prem: makeGift('wrong_premium', 'epic'),
    };
    (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        mockStorage[key] = key === UNCLAIMED_DUAL_GIFTS_KEY
          ? JSON.stringify({ 12: wrongPair })
          : value;
      });
      return Promise.resolve();
    });

    await expect(ensureLevelGiftEntitlement(12, { premium: true })).resolves.toEqual({ status: 'failed', level: 12 });
  });

  it('returns failed when a dual read-back also contains a conflicting single gift', async () => {
    const conflict = makeGift('conflicting_single');
    (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        mockStorage[key] = value;
      });
      mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 12: conflict });
      return Promise.resolve();
    });

    await expect(ensureLevelGiftEntitlement(12, { premium: true })).resolves.toEqual({ status: 'failed', level: 12 });
  });

  it('keeps the legacy wrapper compatible for existing, persisted, claimed, and failed gifts', async () => {
    const existing = makeGift('existing_f2p');
    await saveUnclaimedGift(10, existing);

    await expect(ensureUnclaimedGiftForLevel(10)).resolves.toEqual(existing);
    await expect(ensureUnclaimedGiftForLevel(11)).resolves.toEqual(makeGift('rolled_f2p'));

    mockStorage[CLAIMED_GIFTS_KEY] = JSON.stringify({ 12: 'rare' });
    await expect(ensureUnclaimedGiftForLevel(12)).resolves.toBeNull();

    (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
    await expect(ensureUnclaimedGiftForLevel(13)).resolves.toBeNull();
  });

  it('lists pending single gifts and counts them as one gift each', async () => {
    await saveUnclaimedGift(5, makeGift('xp_bank_150'));
    await saveUnclaimedGift(10, makeGift('shards_6', 'rare'));

    await expect(loadPendingLevelGiftCount()).resolves.toBe(2);
    await expect(readPendingLevelGiftCountCache()).resolves.toBe(2);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      { kind: 'single', level: 10, giftCount: 1, gift: { id: 'shards_6' } },
      { kind: 'single', level: 5, giftCount: 1, gift: { id: 'xp_bank_150' } },
    ]);
  });

  it('lists dual gifts as individually claimable gifts and counts both chests', async () => {
    await saveUnclaimedGift(20, makeGift('xp_bank_300'));
    await saveUnclaimedDualGift(20, {
      f2p: makeGift('shards_10', 'rare'),
      prem: makeGift('premium_xp_bank_1000', 'epic'),
    });

    await expect(loadPendingLevelGiftCount()).resolves.toBe(2);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        dualPart: 'f2p',
        gift: { id: 'shards_10' },
      },
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        dualPart: 'prem',
        gift: { id: 'premium_xp_bank_1000' },
      },
    ]);
  });

  it('keeps the second gift pending when one dual gift part is claimed', async () => {
    await saveUnclaimedDualGift(20, {
      f2p: makeGift('shards_10', 'rare'),
      prem: makeGift('premium_xp_bank_1000', 'epic'),
    });

    await markDualGiftPartClaimed(20, 'f2p');

    await expect(loadPendingLevelGiftCount()).resolves.toBe(1);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        gift: { id: 'premium_xp_bank_1000' },
      },
    ]);
  });

  it('removes pending gifts after claim', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));
    await saveUnclaimedDualGift(30, {
      f2p: makeGift('xp_bank_600'),
      prem: makeGift('prem_shards_20'),
    });

    await markGiftClaimed(5);
    await markDualGiftClaimed(30);

    await expect(loadPendingLevelGiftCount()).resolves.toBe(0);
    expect(mockStorage[PENDING_LEVEL_GIFT_COUNT_CACHE_KEY]).toBe('0');
    await expect(loadPendingLevelGiftInventory()).resolves.toEqual([]);
  });

  it('normalizes older array-shaped gift records instead of undercounting them', async () => {
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify([
      { level: 7, gift: makeGift('xp_100') },
      { level: 8, gift: makeGift('hint_3') },
      { level: 9, gift: makeGift('shards_10') },
    ]);

    await expect(loadPendingLevelGiftCount()).resolves.toBe(3);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      { level: 9, gift: { id: 'shards_10' } },
      { level: 8, gift: { id: 'hint_3' } },
      { level: 7, gift: { id: 'xp_100' } },
    ]);
  });

  it('keeps global trial vouchers in French pending previews while sanitizing permanent English packs', async () => {
    await saveUnclaimedGift(25, makeGift('pack_voucher_48h', 'epic'));
    await saveUnclaimedDualGift(30, {
      f2p: makeGift('pack_voucher_48h', 'epic'),
      prem: makeGift('prem_level_unlock_negotiator', 'epic'),
    });

    const englishItems = await loadPendingLevelGiftInventory('en');
    expect(pendingGiftIds(englishItems)).toEqual([
      'pack_voucher_48h',
      'prem_level_unlock_negotiator',
      'pack_voucher_48h',
    ]);
    expect(getPendingLevelGiftInventoryCache('fr')).toEqual([]);

    const frenchItems = await loadPendingLevelGiftInventory('fr');
    expect(pendingGiftIds(frenchItems)).toEqual([
      'pack_voucher_48h',
      'prem_shards_20',
      'pack_voucher_48h',
    ]);
    expect(pendingGiftIds(frenchItems)).not.toContain('prem_level_unlock_negotiator');
    expect(pendingGiftIds(frenchItems).filter((id) => isFlashcardPackLevelGiftId(id))).toEqual([
      'pack_voucher_48h',
      'pack_voucher_48h',
    ]);
    expect(pendingGiftIds(getPendingLevelGiftInventoryCache('fr'))).toEqual([
      'pack_voucher_48h',
      'prem_shards_20',
      'pack_voucher_48h',
    ]);
  });
});
