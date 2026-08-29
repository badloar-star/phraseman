import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import * as seasonPassModel from '../app/season_pass_model';

jest.mock('@react-native-async-storage/async-storage');

type Wallet = Readonly<{ balance: number; earnedTotal: number }>;
type Progress = Readonly<{
  seasonId: string;
  totalStars: number;
  level: number;
  intoLevelStars: number;
  levelCostStars: number;
  chapter: 1 | 2 | 3;
}>;
type Checkpoint = Readonly<{
  schemaVersion: 'season-pass-rune-checkpoint.v1';
  ownerStableId: string;
  seasonId: string;
  baselineWalletBasis: number;
  highWaterProgress: number;
}>;
type TransitionResult = Readonly<{ checkpoint: Checkpoint; progress: Progress }>;
type CanonicalSeasonModel = Readonly<{
  transitionSeasonPassRuneCheckpoint?: (input: Readonly<{
    ownerStableId: string;
    checkpoint: unknown | null;
    wallet: Wallet;
    now?: Date;
  }>) => TransitionResult;
  observeSeasonPassRuneProgressForAccount?: (
    token: ReturnType<typeof captureAccountGeneration>,
    wallet: Wallet,
    now?: Date,
    quality?: 'durable' | 'fallback',
  ) => Promise<Progress | null>;
  isSeasonPassLevelReached?: (progress: Progress, renderSeasonId: string, level: number) => boolean;
  authorizeSeasonPassClaimForAccount?: (
    token: ReturnType<typeof captureAccountGeneration>,
    requestedSeasonId: string,
    level: number,
    now?: Date,
  ) => Promise<boolean>;
  seasonPassRuneCheckpointKey?: (ownerStableId: string) => string;
}>;

const model = seasonPassModel as CanonicalSeasonModel;
const seasonScreen = readFileSync(join(process.cwd(), 'app', 'season_pass.tsx'), 'utf8');
const storage: Record<string, string> = {};
const Q3 = new Date('2026-08-28T12:00:00.000Z');
const Q4 = new Date('2026-10-01T00:00:00.000Z');

function transition(input: Parameters<NonNullable<CanonicalSeasonModel['transitionSeasonPassRuneCheckpoint']>>[0]) {
  expect(typeof model.transitionSeasonPassRuneCheckpoint).toBe('function');
  return model.transitionSeasonPassRuneCheckpoint?.(input);
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('owner-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
});

describe('Season Pass account-scoped rune checkpoint', () => {
  test('first current-season migration seeds the existing 300-rune wallet as progress', () => {
    const result = transition({
      ownerStableId: 'owner-a', checkpoint: null,
      wallet: { balance: 300, earnedTotal: 0 }, now: Q3,
    });

    expect(result?.progress.totalStars).toBe(300);
    expect(result?.progress.level).toBe(8);
    expect(result?.checkpoint).toEqual({
      schemaVersion: 'season-pass-rune-checkpoint.v1',
      ownerStableId: 'owner-a', seasonId: '2026-Q3',
      baselineWalletBasis: 0, highWaterProgress: 300,
    });
  });

  test('a new quarter captures its baseline, advances only by new runes and never relocks', () => {
    const q3 = transition({ ownerStableId: 'owner-a', checkpoint: null, wallet: { balance: 300, earnedTotal: 0 }, now: Q3 });
    if (!q3) return;
    const q4 = transition({ ownerStableId: 'owner-a', checkpoint: q3.checkpoint, wallet: { balance: 300, earnedTotal: 0 }, now: Q4 });
    if (!q4) return;
    const gained = transition({ ownerStableId: 'owner-a', checkpoint: q4.checkpoint, wallet: { balance: 350, earnedTotal: 0 }, now: Q4 });
    if (!gained) return;
    const spent = transition({ ownerStableId: 'owner-a', checkpoint: gained.checkpoint, wallet: { balance: 100, earnedTotal: 0 }, now: Q4 });
    const firstSeenInQ4 = transition({ ownerStableId: 'owner-new', checkpoint: null, wallet: { balance: 300, earnedTotal: 0 }, now: Q4 });

    expect(q4.progress.totalStars).toBe(0);
    expect(q4.checkpoint.baselineWalletBasis).toBe(300);
    expect(gained.progress.totalStars).toBe(50);
    expect(spent?.progress.totalStars).toBe(50);
    expect(firstSeenInQ4?.progress.totalStars).toBe(0);
    expect(firstSeenInQ4?.checkpoint.baselineWalletBasis).toBe(300);
  });

  test('checkpoints are owner-scoped and cross-owner or corrupt state fails closed', () => {
    expect(typeof model.seasonPassRuneCheckpointKey).toBe('function');
    const ownerA = transition({ ownerStableId: 'owner-a', checkpoint: null, wallet: { balance: 300, earnedTotal: 0 }, now: Q3 });
    if (!ownerA || !model.transitionSeasonPassRuneCheckpoint) return;

    expect(() => model.transitionSeasonPassRuneCheckpoint?.({
      ownerStableId: 'owner-b', checkpoint: ownerA.checkpoint,
      wallet: { balance: 0, earnedTotal: 0 }, now: Q3,
    })).toThrow('season_pass_rune_checkpoint_owner_mismatch');
    expect(() => model.transitionSeasonPassRuneCheckpoint?.({
      ownerStableId: 'owner-a', checkpoint: { ...ownerA.checkpoint, highWaterProgress: '300' },
      wallet: { balance: 300, earnedTotal: 0 }, now: Q3,
    })).toThrow('season_pass_rune_checkpoint_corrupt');

    const ownerB = transition({ ownerStableId: 'owner-b', checkpoint: null, wallet: { balance: 0, earnedTotal: 0 }, now: Q3 });
    const ownerAReturn = transition({ ownerStableId: 'owner-a', checkpoint: ownerA.checkpoint, wallet: { balance: 300, earnedTotal: 0 }, now: Q3 });
    expect(ownerB?.progress.totalStars).toBe(0);
    expect(ownerAReturn?.progress.totalStars).toBe(300);
    expect(model.seasonPassRuneCheckpointKey?.('owner-a')).not.toBe(model.seasonPassRuneCheckpointKey?.('owner-b'));
  });

  test('a fuller async observation wins over live 50 and a later drop cannot lower it', async () => {
    expect(typeof model.observeSeasonPassRuneProgressForAccount).toBe('function');
    const observe = model.observeSeasonPassRuneProgressForAccount;
    if (!observe) return;
    const token = captureAccountGeneration();

    const [live, hydrated] = await Promise.all([
      observe(token, { balance: 50, earnedTotal: 0 }, Q3),
      observe(token, { balance: 300, earnedTotal: 0 }, Q3),
    ]);
    const afterDrop = await observe(token, { balance: 3, earnedTotal: 0 }, Q3);

    expect(live?.totalStars).toBe(50);
    expect(hydrated?.totalStars).toBe(300);
    expect(afterDrop?.totalStars).toBe(300);
  });

  test('mounted account switches persist and hydrate only the active owner checkpoint', async () => {
    expect(typeof model.observeSeasonPassRuneProgressForAccount).toBe('function');
    expect(typeof model.seasonPassRuneCheckpointKey).toBe('function');
    const observe = model.observeSeasonPassRuneProgressForAccount;
    if (!observe || !model.seasonPassRuneCheckpointKey) return;

    const tokenA = captureAccountGeneration();
    const ownerA = await observe(tokenA, { balance: 300, earnedTotal: 0 }, Q3);
    const tokenB = beginAccountGeneration('owner-b');
    const ownerB = await observe(tokenB, { balance: 0, earnedTotal: 0 }, Q3);
    const tokenAReturn = beginAccountGeneration('owner-a');
    const ownerAReturn = await observe(tokenAReturn, { balance: 300, earnedTotal: 0 }, Q3);

    expect(ownerA?.totalStars).toBe(300);
    expect(ownerB?.totalStars).toBe(0);
    expect(ownerAReturn?.totalStars).toBe(300);
    expect(JSON.parse(storage[model.seasonPassRuneCheckpointKey('owner-a')]!))
      .toMatchObject({ ownerStableId: 'owner-a', highWaterProgress: 300 });
    expect(JSON.parse(storage[model.seasonPassRuneCheckpointKey('owner-b')]!))
      .toMatchObject({ ownerStableId: 'owner-b', highWaterProgress: 0 });
  });

  test('an async result from an old account generation cannot write or apply', async () => {
    expect(typeof model.observeSeasonPassRuneProgressForAccount).toBe('function');
    const observe = model.observeSeasonPassRuneProgressForAccount;
    if (!observe) return;
    const tokenA = captureAccountGeneration();
    let finishRead!: (value: string | null) => void;
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => new Promise<string | null>((resolve) => {
      finishRead = resolve;
    }));

    const stale = observe(tokenA, { balance: 300, earnedTotal: 0 }, Q3);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    beginAccountGeneration('owner-b');
    finishRead(null);

    await expect(stale).resolves.toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('a mounted Q3 progress snapshot cannot unlock or authorize a Q4 reward', async () => {
    expect(typeof model.isSeasonPassLevelReached).toBe('function');
    expect(typeof model.authorizeSeasonPassClaimForAccount).toBe('function');
    const observe = model.observeSeasonPassRuneProgressForAccount;
    if (!observe || !model.isSeasonPassLevelReached || !model.authorizeSeasonPassClaimForAccount) return;
    const token = captureAccountGeneration();
    const q3 = await observe(token, { balance: 300, earnedTotal: 0 }, Q3, 'durable');
    expect(q3).not.toBeNull();
    if (!q3) return;

    expect(model.isSeasonPassLevelReached(q3, '2026-Q4', 1)).toBe(false);
    await expect(model.authorizeSeasonPassClaimForAccount(token, '2026-Q4', 1, Q4))
      .resolves.toBe(false);
  });

  test('a claim intent captured for owner A is rejected after switching to owner B', async () => {
    expect(typeof model.authorizeSeasonPassClaimForAccount).toBe('function');
    const observe = model.observeSeasonPassRuneProgressForAccount;
    if (!observe || !model.authorizeSeasonPassClaimForAccount) return;
    const tokenA = captureAccountGeneration();
    await observe(tokenA, { balance: 300, earnedTotal: 0 }, Q3, 'durable');
    await expect(model.authorizeSeasonPassClaimForAccount(tokenA, '2026-Q3', 1, Q3))
      .resolves.toBe(true);

    beginAccountGeneration('owner-b');
    await expect(model.authorizeSeasonPassClaimForAccount(tokenA, '2026-Q3', 1, Q3))
      .resolves.toBe(false);
  });

  test('a Q4 fallback observation cannot establish its baseline before durable recovery', async () => {
    const observe = model.observeSeasonPassRuneProgressForAccount;
    expect(typeof observe).toBe('function');
    expect(typeof model.seasonPassRuneCheckpointKey).toBe('function');
    if (!observe || !model.seasonPassRuneCheckpointKey) return;
    const token = captureAccountGeneration();
    await observe(token, { balance: 300, earnedTotal: 0 }, Q3, 'durable');
    const key = model.seasonPassRuneCheckpointKey('owner-a');
    const q3Raw = storage[key];

    const fallback = await observe(token, { balance: 50, earnedTotal: 0 }, Q4, 'fallback');
    expect(fallback?.seasonId).toBe('2026-Q4');
    expect(fallback?.totalStars).toBe(0);
    expect(storage[key]).toBe(q3Raw);

    const durable = await observe(token, { balance: 300, earnedTotal: 0 }, Q4, 'durable');
    expect(durable?.totalStars).toBe(0);
    expect(JSON.parse(storage[key]!)).toMatchObject({
      seasonId: '2026-Q4', baselineWalletBasis: 300, highWaterProgress: 0,
    });
  });

  test('mounted screen resets on account transition and never uses an unscoped wallet peek', () => {
    expect(seasonScreen).toContain('subscribeAccountGeneration');
    expect(seasonScreen).toContain('observeSeasonPassRuneProgressForAccount');
    expect(seasonScreen).toContain('computeSeasonPassProgress(getSeasonPassSeasonId(), 0)');
    expect(seasonScreen).not.toContain('peekRunesBalance');
    expect(seasonScreen).not.toContain('runeSnapshotRevision');
    expect(seasonScreen).not.toContain('hydrationRevision');
    expect(seasonScreen).not.toContain('hydrateSeasonPassProgress');
    expect(seasonScreen).not.toContain('peekSeasonPassProgress');
    expect(seasonScreen).toContain('isCurrentAccountGeneration(token, ownerStableId)');
    expect(seasonScreen).toContain('hydrateAccount(captureAccountGeneration(), false)');
    expect(seasonScreen).not.toContain('hydrateAccount(captureAccountGeneration(), true)');
  });

  test('mounted screen rechecks the quarter and binds modal claims to the active account', () => {
    expect(seasonScreen).toContain("AppState.addEventListener('change'");
    expect(seasonScreen).toContain('seasonPassEndsAtMs');
    expect(seasonScreen).toContain('progress.seasonId === seasonId');
    expect(seasonScreen).toContain('commitSeasonPassRewardClaim');
    expect(seasonScreen).toContain('claimToken');
    expect(seasonScreen).toContain('setOpenInfoReward(null)');
    expect(seasonScreen).toContain('setOpenReward(null)');
    expect(seasonScreen).toContain('setPassOwned(false)');
    expect(seasonScreen).toContain('hydrateSeasonPassEntitlementForAccount');
    expect(seasonScreen).toContain('loadSeasonPassClaimedMapForAccount');
  });

  test('screen distinguishes durable wallet hydration from a fallback snapshot', () => {
    expect(seasonScreen).toContain('getRunesBalanceRead');
    expect(seasonScreen).toContain('read.quality');
  });
});
