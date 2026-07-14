import AsyncStorage from '@react-native-async-storage/async-storage';
import { spendShards } from '../app/shards_system';
import {
  PROFILE_CARD_LEVEL_KEY,
  devGrantProfileCardLevel,
  devLowerProfileCardLevel,
  devResetProfileCard,
  getProfileCardSnapshot,
} from '../app/profile_card_system';
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(async () => 0),
  spendShards: jest.fn(async () => true),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

const mockSpendShards = spendShards as jest.MockedFunction<typeof spendShards>;

describe('dev free profile-card upgrade (behaviour)', () => {
  // Metro defines __DEV__ as a global at runtime (true in dev, false in store builds);
  // jest does not, so we set it here to exercise the dev path. The release behaviour
  // (no-op when __DEV__ is falsy) is covered by the wiring checks below.
  beforeAll(() => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('bumps the level by one WITHOUT spending any shards', async () => {
    const snap = await devGrantProfileCardLevel();
    expect(snap.level).toBe(1);
    // The whole point of the dev button: never charge real currency.
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('walks all the way to the max level and stays there', async () => {
    let last = 0;
    for (let i = 0; i < 8; i += 1) {
      const snap = await devGrantProfileCardLevel();
      last = snap.level;
    }
    expect(last).toBe(5);
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('lowers the level by one WITHOUT spending and stops at 0', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '2');

    const down = await devLowerProfileCardLevel();
    expect(down.level).toBe(1);
    expect(down.theme).toBe('steel');

    const down2 = await devLowerProfileCardLevel();
    expect(down2.level).toBe(0);
    expect(down2.theme).toBe('classic');

    // Уже на нуле — ниже не уходит.
    const down3 = await devLowerProfileCardLevel();
    expect(down3.level).toBe(0);
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('reset returns the card to level 0 with default theme/motion/focus', async () => {
    await devGrantProfileCardLevel();
    const reset = await devResetProfileCard();
    expect(reset.level).toBe(0);
    expect(reset.theme).toBe('classic');
    expect(reset.motion).toBe('none');
    expect(reset.publicFocus).toBe('balanced');
    const snap = await getProfileCardSnapshot();
    expect(snap.level).toBe(0);
  });
});

describe('dev free profile-card upgrade is a no-op in release builds', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  });

  afterAll(() => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it('never bumps the level and never spends shards when __DEV__ is false', async () => {
    const snap = await devGrantProfileCardLevel();
    expect(snap.level).toBe(0);
    expect(mockSpendShards).not.toHaveBeenCalled();
  });

  it('never lowers the level when __DEV__ is false', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '3');
    const snap = await devLowerProfileCardLevel();
    expect(snap.level).toBe(3);
  });

  it('reset does nothing in release', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '1');
    const snap = await devResetProfileCard();
    expect(snap.level).toBe(1);
  });
});

describe('dev free profile-card upgrade (wiring)', () => {
  const system = fs.readFileSync(
    path.join(process.cwd(), 'app', 'profile_card_system.ts'),
    'utf8',
  );

  it('exposes the dev helpers from the system module, each guarded by __DEV__', () => {
    expect(system).toContain('export async function devGrantProfileCardLevel');
    expect(system).toContain('export async function devLowerProfileCardLevel');
    expect(system).toContain('export async function devResetProfileCard');
    // All helpers must short-circuit in release builds.
    const grantBody = system.slice(system.indexOf('devGrantProfileCardLevel'));
    expect(grantBody).toMatch(/if \(!__DEV__\) return getProfileCardSnapshot\(\);/);
    const lowerBody = system.slice(system.indexOf('devLowerProfileCardLevel'));
    expect(lowerBody).toMatch(/if \(!__DEV__\) return getProfileCardSnapshot\(\);/);
  });
});
