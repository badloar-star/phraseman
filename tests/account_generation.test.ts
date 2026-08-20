import {
  beginInitialAccountGeneration,
  beginAccountGeneration,
  __resetAccountGenerationForTests,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  ensureAccountGeneration,
  subscribeAccountGeneration,
  waitForRestoreApplicationIdleWithDeadline,
  withRestoreApplicationLock,
  withAccountTransitionLock,
} from '../app/account_generation';
import { isCurrentLevelGiftOpening } from '../app/level_gift_opening_guard';
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_DNA_DRAFT_PREFIX,
  AVATAR_DNA_INVITATION_PREFIX,
  AVATAR_DNA_STATE_PREFIX,
  AVATAR_DNA_STYLE_OPERATION_PREFIX,
} from '../constants/customization_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'owner-a'),
}));

describe('account generation', () => {
  it('rejects callbacks from opening N after opening N+1 in the same account generation', () => {
    beginAccountGeneration('stable-a');
    const openingN = captureAccountGeneration();
    const openingNPlusOne = captureAccountGeneration();

    expect(isCurrentLevelGiftOpening(openingN, openingN)).toBe(true);
    expect(isCurrentLevelGiftOpening(openingNPlusOne, openingN)).toBe(false);
    expect(isCurrentLevelGiftOpening(openingNPlusOne, openingNPlusOne)).toBe(true);
  });

  beforeEach(() => __resetAccountGenerationForTests());

  it('adopts the initial anonymous boot generation exactly once', () => {
    const token = beginInitialAccountGeneration('resolved-anon-uid');
    expect(token).not.toBeNull();
    expect(isCurrentAccountGeneration(token!, 'resolved-anon-uid')).toBe(true);
  });

  it('invalidates work from the previous account', () => {
    const first = beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    expect(isCurrentAccountGeneration(token)).toBe(true);

    beginAccountGeneration('stable-b');
    expect(isCurrentAccountGeneration(token)).toBe(false);
    expect(first.generation).toBeLessThan(captureAccountGeneration().generation);
  });

  it('invalidates in-flight work on sign-out/delete even without a replacement account', () => {
    beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    invalidateAccountGeneration();
    expect(isCurrentAccountGeneration(token)).toBe(false);
    expect(captureAccountGeneration().stableId).toBeNull();
  });

  it('rejects a token when the expected stable id does not match', () => {
    beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    expect(isCurrentAccountGeneration(token, 'stable-b')).toBe(false);
    expect(isCurrentAccountGeneration(token, 'stable-a')).toBe(true);
  });

  it('bounds transition waiting when a local mutation lock never settles', async () => {
    jest.useFakeTimers();
    let release!: () => void;
    void withRestoreApplicationLock(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();

    const waiting = waitForRestoreApplicationIdleWithDeadline(250);
    await jest.advanceTimersByTimeAsync(250);
    await expect(waiting).resolves.toBe(false);

    release();
    await Promise.resolve();
    jest.useRealTimers();
  });

  it('keeps repeated reads of the same stable id in one generation', () => {
    const first = ensureAccountGeneration('stable-a');
    expect(ensureAccountGeneration(' stable-a ')).toEqual(first);
  });

  it('reactivates the same id after an explicit invalidation', () => {
    const first = ensureAccountGeneration('stable-a');
    const invalid = invalidateAccountGeneration();
    const next = ensureAccountGeneration('stable-a');
    expect(next.generation).toBe(invalid.generation + 1);
    expect(isCurrentAccountGeneration(first)).toBe(false);
  });

  it('normalizes blank ids to the active anonymous identity', () => {
    expect(ensureAccountGeneration('   ')).toMatchObject({ stableId: null, phase: 'active' });
  });

  it('notifies account-scoped UI synchronously and stops after unsubscribe', () => {
    const seen: { stableId: string | null; phase: string }[] = [];
    const sub = subscribeAccountGeneration((token) => {
      seen.push({ stableId: token.stableId, phase: token.phase });
    });

    beginAccountGeneration('stable-a');
    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    sub.remove();
    beginAccountGeneration('stable-c');

    expect(seen).toEqual([
      { stableId: 'stable-a', phase: 'active' },
      { stableId: null, phase: 'transitioning' },
      { stableId: 'stable-b', phase: 'active' },
    ]);
  });

  it('makes A stale immediately while its queued work still waits on the transition lock', async () => {
    beginAccountGeneration('stable-a');
    const tokenA = captureAccountGeneration();
    let release!: () => void;
    let queuedWorkStarted = false;
    const blocker = withAccountTransitionLock(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();

    invalidateAccountGeneration();
    const queued = withAccountTransitionLock(async () => { queuedWorkStarted = true; });
    await Promise.resolve();

    expect(isCurrentAccountGeneration(tokenA)).toBe(false);
    expect(queuedWorkStarted).toBe(false);

    release();
    await blocker;
    await queued;
  });

  it('registers all Avatar DNA account-local prefixes in scoped account cleanup', () => {
    expect([
      AVATAR_DNA_STATE_PREFIX,
      AVATAR_DNA_DRAFT_PREFIX,
      AVATAR_DNA_INVITATION_PREFIX,
      AVATAR_DNA_STYLE_OPERATION_PREFIX,
    ]).toEqual([
      'avatar_dna_state_v1:',
      'avatar_dna_draft_v1:',
      'avatar_dna_invitation_v1:',
      'avatar_dna_style_operation_v1:',
    ]);

    const cloudSyncSource = fs.readFileSync(path.join(__dirname, '../app/cloud_sync.ts'), 'utf8');
    expect(cloudSyncSource).toContain('...CUSTOMIZATION_ACCOUNT_LOCAL_PREFIXES');
  });

  it('behaviorally wipes all four Avatar DNA prefix families and preserves unrelated device data', async () => {
    await AsyncStorage.clear();
    beginAccountGeneration('owner-a');
    const ownerScope = encodeURIComponent('owner-a');
    const dnaKeys = [
      `${AVATAR_DNA_STATE_PREFIX}${ownerScope}`,
      `${AVATAR_DNA_DRAFT_PREFIX}${ownerScope}`,
      `${AVATAR_DNA_INVITATION_PREFIX}${ownerScope}`,
      `${AVATAR_DNA_STYLE_OPERATION_PREFIX}${ownerScope}:operation-1`,
    ];
    await AsyncStorage.multiSet([
      ...dnaKeys.map((key) => [key, 'sentinel'] as [string, string]),
      ['unrelated_device_avatar_test_v1', 'keep-me'],
    ]);
    const { wipeLocalAccountData } = await import('../app/cloud_sync');

    await wipeLocalAccountData();

    await expect(AsyncStorage.multiGet(dnaKeys)).resolves.toEqual(
      dnaKeys.map((key) => [key, null]),
    );
    await expect(AsyncStorage.getItem('unrelated_device_avatar_test_v1')).resolves.toBe('keep-me');
  });

});
