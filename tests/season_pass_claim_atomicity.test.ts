import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  observeSeasonPassRuneProgressForAccount,
} from '../app/season_pass_model';
import * as seasonModel from '../app/season_pass_model';
import * as seasonGifts from '../app/season_pass_gift_inventory';
import type { SeasonRewardKind } from '../app/season_pass_track_config';

const mockGetVerifiedPremiumAccessStatus = jest.fn<Promise<boolean>, []>();
const mockGetVerifiedPremiumAccessStatusForAccountLease = jest.fn<Promise<boolean>, []>();
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumAccessStatus: () => mockGetVerifiedPremiumAccessStatus(),
  getVerifiedPremiumAccessStatusForAccountLease: () => mockGetVerifiedPremiumAccessStatusForAccountLease(),
}));

const Q3 = new Date('2026-08-28T12:00:00.000Z');
const Q4 = new Date('2026-10-01T00:00:00.000Z');
const storage: Record<string, string> = {};
const seasonScreen = readFileSync(join(process.cwd(), 'app', 'season_pass.tsx'), 'utf8');
type ReviewApis = Readonly<{
  prepareSeasonPassEntitlementLocalWrite?: (
    token: ReturnType<typeof captureAccountGeneration>, now: Date, purchasedAtMs: number,
  ) => readonly [string, string];
  hydrateSeasonPassEntitlementForAccount?: (
    token: ReturnType<typeof captureAccountGeneration>, now: Date,
  ) => Promise<boolean>;
}>;
type ClaimApis = Readonly<{
  seasonPassClaimCompositeStorageKey?: (owner: string) => string;
  commitSeasonPassRewardClaim?: (input: Readonly<{
    token: ReturnType<typeof captureAccountGeneration>;
    seasonId: string;
    level: number;
    side: 'free' | 'pass';
    kind: SeasonRewardKind;
    amount?: number;
    now: Date;
  }>) => Promise<unknown>;
  seasonPassGiftInventoryStorageKey?: (owner: string) => string;
}>; 
const reviewModel = seasonModel as unknown as ReviewApis;
const claimApi = seasonGifts as unknown as ClaimApis;

async function seedOwner(
  owner: string,
  now: Date,
  wallet: Readonly<{ balance: number; earnedTotal: number }>,
  ownsPass: boolean,
) {
  const token = beginAccountGeneration(owner);
  await observeSeasonPassRuneProgressForAccount(token, wallet, now, 'durable');
  if (ownsPass) {
    if (!reviewModel.prepareSeasonPassEntitlementLocalWrite) return token;
    const [key, value] = reviewModel.prepareSeasonPassEntitlementLocalWrite(token, now, 1);
    storage[key] = value;
  }
  return token;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetVerifiedPremiumAccessStatus.mockResolvedValue(false);
  mockGetVerifiedPremiumAccessStatusForAccountLease.mockResolvedValue(false);
  __resetAccountGenerationForTests();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
});

describe('Season Pass claim composite account boundary', () => {
  test('switching accounts while the claim store is being read grants no gift and writes no marker', async () => {
    expect(typeof reviewModel.prepareSeasonPassEntitlementLocalWrite).toBe('function');
    expect(typeof claimApi.seasonPassClaimCompositeStorageKey).toBe('function');
    expect(typeof claimApi.commitSeasonPassRewardClaim).toBe('function');
    if (!reviewModel.prepareSeasonPassEntitlementLocalWrite
      || !claimApi.seasonPassClaimCompositeStorageKey || !claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    const compositeKey = claimApi.seasonPassClaimCompositeStorageKey('owner-a');
    let resumeRead!: () => void;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key !== compositeKey) return storage[key] ?? null;
      await new Promise<void>((resolve) => { resumeRead = resolve; });
      return storage[key] ?? null;
    });

    const claim = claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    beginAccountGeneration('owner-b');
    resumeRead();

    await expect(claim).rejects.toThrow('season_pass_claim_identity_changed');
    expect(storage[compositeKey]).toBeUndefined();
    expect(storage.season_pass_claimed_v1).toBeUndefined();
    expect(storage.season_pass_gift_inventory_v1).toBeUndefined();
  });

  test('switching accounts during the single composite write rolls it back before releasing the lease', async () => {
    expect(typeof reviewModel.prepareSeasonPassEntitlementLocalWrite).toBe('function');
    expect(typeof claimApi.seasonPassClaimCompositeStorageKey).toBe('function');
    expect(typeof claimApi.commitSeasonPassRewardClaim).toBe('function');
    if (!reviewModel.prepareSeasonPassEntitlementLocalWrite
      || !claimApi.seasonPassClaimCompositeStorageKey || !claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    const compositeKey = claimApi.seasonPassClaimCompositeStorageKey('owner-a');
    let resumeWrite!: () => void;
    let writeStarted!: () => void;
    const started = new Promise<void>((resolve) => { writeStarted = resolve; });
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === compositeKey) {
        writeStarted();
        await new Promise<void>((resolve) => { resumeWrite = resolve; });
      }
      storage[key] = value;
    });

    const claim = claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    });
    await started;
    beginAccountGeneration('owner-b');
    resumeWrite();

    await expect(claim).rejects.toThrow('season_pass_claim_identity_changed');
    expect(storage[compositeKey]).toBeUndefined();
    expect(storage.season_pass_claimed_v1).toBeUndefined();
    expect(storage.season_pass_gift_inventory_v1).toBeUndefined();
  });

  test('pass entitlement is both owner-scoped and quarter-scoped', async () => {
    expect(typeof reviewModel.prepareSeasonPassEntitlementLocalWrite).toBe('function');
    expect(typeof reviewModel.hydrateSeasonPassEntitlementForAccount).toBe('function');
    expect(typeof claimApi.commitSeasonPassRewardClaim).toBe('function');
    if (!reviewModel.prepareSeasonPassEntitlementLocalWrite
      || !reviewModel.hydrateSeasonPassEntitlementForAccount
      || !claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    await expect(reviewModel.hydrateSeasonPassEntitlementForAccount(tokenA, Q3)).resolves.toBe(true);
    await expect(reviewModel.hydrateSeasonPassEntitlementForAccount(tokenA, Q4)).resolves.toBe(false);

    // Establish Q4 progress without buying its pass.
    await observeSeasonPassRuneProgressForAccount(tokenA, { balance: 300, earnedTotal: 0 }, Q4, 'durable');
    await observeSeasonPassRuneProgressForAccount(tokenA, { balance: 350, earnedTotal: 0 }, Q4, 'durable');
    await expect(claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q4', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q4,
    })).rejects.toThrow('season_pass_claim_entitlement_missing');

    const tokenB = await seedOwner('owner-b', Q3, { balance: 300, earnedTotal: 0 }, false);
    await expect(reviewModel.hydrateSeasonPassEntitlementForAccount(tokenB, Q3)).resolves.toBe(false);
    await expect(claimApi.commitSeasonPassRewardClaim({
      token: tokenB, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    })).rejects.toThrow('season_pass_claim_entitlement_missing');
  });

  test('claim grant must exactly match the immutable season catalog', async () => {
    expect(typeof reviewModel.prepareSeasonPassEntitlementLocalWrite).toBe('function');
    expect(typeof claimApi.commitSeasonPassRewardClaim).toBe('function');
    if (!reviewModel.prepareSeasonPassEntitlementLocalWrite || !claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);

    await expect(claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'pearls', amount: 5, now: Q3,
    })).rejects.toThrow('season_pass_claim_catalog_mismatch');
  });

  test('right-lane claim requires canonical Plus access inside the claim boundary', async () => {
    expect(typeof claimApi.commitSeasonPassRewardClaim).toBe('function');
    if (!claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);

    await expect(claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 2, side: 'pass',
      kind: 'frame', now: Q3,
    })).rejects.toThrow('season_pass_claim_plus_required');

    mockGetVerifiedPremiumAccessStatusForAccountLease.mockResolvedValue(true);
    await expect(claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 2, side: 'pass',
      kind: 'frame', now: Q3,
    })).resolves.toMatchObject({ status: 'applied' });
  });

  test('right-lane claim revalidates Plus after waiting to acquire the owner lease', async () => {
    if (!claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    mockGetVerifiedPremiumAccessStatus.mockResolvedValue(true);
    mockGetVerifiedPremiumAccessStatusForAccountLease.mockResolvedValue(false);
    let releaseLease!: () => void;
    let leaseAcquired!: () => void;
    const acquired = new Promise<void>((resolve) => { leaseAcquired = resolve; });
    const blocker = withAccountTransitionLock(async () => {
      leaseAcquired();
      await new Promise<void>((resolve) => { releaseLease = resolve; });
    });
    await acquired;

    const claim = claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 2, side: 'pass',
      kind: 'frame', now: Q3,
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    // The cached/pre-lock opportunity said true; the durable lease-aware read
    // now observes revocation and must win.
    mockGetVerifiedPremiumAccessStatus.mockResolvedValue(false);
    releaseLease();
    await blocker;

    await expect(claim).rejects.toThrow('season_pass_claim_plus_required');
    expect(mockGetVerifiedPremiumAccessStatusForAccountLease).toHaveBeenCalledTimes(1);
  });

  test('legacy global inventory migrates to exactly one active owner', async () => {
    expect(typeof claimApi.seasonPassGiftInventoryStorageKey).toBe('function');
    if (!claimApi.seasonPassGiftInventoryStorageKey) return;
    storage.season_pass_gift_inventory_v1 = JSON.stringify([{
      id: '2026-Q3:1:free', kind: 'xp_bank', amount: 1500, level: 1,
      receivedAtMs: Q3.getTime(), expiresAtMs: Q3.getTime() + 72 * 60 * 60 * 1000,
    }]);
    beginAccountGeneration('owner-a');
    await expect(seasonGifts.loadSeasonPassGiftInventory(Q3.getTime())).resolves.toHaveLength(1);
    expect(storage[claimApi.seasonPassGiftInventoryStorageKey('owner-a')]).toBeDefined();

    beginAccountGeneration('owner-b');
    await expect(seasonGifts.loadSeasonPassGiftInventory(Q3.getTime())).resolves.toEqual([]);
    expect(storage[claimApi.seasonPassGiftInventoryStorageKey('owner-b')]).toBeUndefined();
  });

  test('owner A use marker cannot filter owner B independent same-id gift', async () => {
    if (!claimApi.commitSeasonPassRewardClaim) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    const first = await claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    }) as { gift: { id: string } };
    const markerA = seasonGifts.seasonPassGiftUseMarkerStorageKey(first.gift.id);
    await seasonGifts.markSeasonPassGiftUsed(first.gift.id, Q3.getTime());

    const tokenB = await seedOwner('owner-b', Q3, { balance: 300, earnedTotal: 0 }, true);
    await claimApi.commitSeasonPassRewardClaim({
      token: tokenB, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    });
    const markerB = seasonGifts.seasonPassGiftUseMarkerStorageKey(first.gift.id);

    expect(markerB).not.toBe(markerA);
    await expect(seasonGifts.loadSeasonPassGiftInventory(Q3.getTime())).resolves.toEqual([
      expect.objectContaining({ id: first.gift.id }),
    ]);
  });

  test('rollback restores an existing non-null composite byte-for-byte', async () => {
    if (!claimApi.commitSeasonPassRewardClaim || !claimApi.seasonPassClaimCompositeStorageKey) return;
    const tokenA = await seedOwner('owner-a', Q3, { balance: 300, earnedTotal: 0 }, true);
    await claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 1, side: 'free',
      kind: 'xp_bank', amount: 1500, now: Q3,
    });
    const key = claimApi.seasonPassClaimCompositeStorageKey('owner-a');
    const exactBefore = storage[key]!;
    let resumeWrite!: () => void;
    let writeStarted!: () => void;
    const started = new Promise<void>((resolve) => { writeStarted = resolve; });
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (writeKey: string, value: string) => {
      if (writeKey === key && value !== exactBefore) {
        writeStarted();
        await new Promise<void>((resolve) => { resumeWrite = resolve; });
      }
      storage[writeKey] = value;
    });

    const claim = claimApi.commitSeasonPassRewardClaim({
      token: tokenA, seasonId: '2026-Q3', level: 3, side: 'free',
      kind: 'pearls', amount: 2, now: Q3,
    });
    await started;
    beginAccountGeneration('owner-b');
    resumeWrite();
    await expect(claim).rejects.toThrow('season_pass_claim_identity_changed');
    expect(storage[key]).toBe(exactBefore);
  });

  test('account hydration immediately clears and owner-reloads the pending gift badge', () => {
    expect(seasonScreen).toContain('setPendingGiftCount(0)');
    expect(seasonScreen).toMatch(/hydrateAccount[\s\S]{0,1800}loadPendingSeasonPassGiftCount/);
    expect(seasonScreen).toMatch(/loadPendingSeasonPassGiftCount[\s\S]{0,500}activeToken\.generation === token\.generation/);
  });
});
