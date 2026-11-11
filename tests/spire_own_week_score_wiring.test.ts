import fs from 'node:fs';
import path from 'node:path';

import { beginAccountGeneration, __resetAccountGenerationForTests } from '../app/account_generation';
import {
  __resetOwnAuthoritativeWeekScoreForTests,
  peekOwnAuthoritativeWeekScore,
} from '../app/spire/spire_own_week_score';

const mockCallable = jest.fn();
const mockWalletMerge = jest.fn();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/stable_id', () => ({ peekStableId: () => 'account-a' }));
jest.mock('../app/coin_rank_state_v1', () => ({ peekCoinRank: () => 0 }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => mockCallable,
}));
jest.mock('../app/spire/spire_flush_wallet', () => ({
  mergeSpireFlushWallet: (...args: unknown[]) => mockWalletMerge(...args),
}));
jest.mock('../modules/spire/report_store', () => ({
  spireFlushReports: async (_store: unknown, options: { send: (payload: Record<string, unknown>) => Promise<unknown> }) => {
    await options.send({ reports: [] });
    return { status: 'sent', sent: 0, removed: 0, rejected: 0, local: null, rollback: null };
  },
  spireLoadWeekLocal: jest.fn(async () => null),
  spireRecordStep: jest.fn(),
}));

import { spireFlushNow } from '../app/spire_report_client';

const snapshot = (seq: number, earned: number) => ({
  schemaVersion: 'stars-week-snapshot.v1',
  seq,
  current: { weekKey: '2026-W46', earned },
  previous: null,
});

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

describe('U33/U34 weekly ACK wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-a');
    __resetOwnAuthoritativeWeekScoreForTests();
    mockWalletMerge.mockRejectedValue(new Error('wallet branch failed'));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  test('successful ACK applies the full weekly snapshot even when wallet merge fails', async () => {
    mockCallable.mockResolvedValue({ data: { ok: true, starsWeek: snapshot(12, 130) } });

    await spireFlushNow({ uid: 'uid-a', stableId: 'account-a', lang: 'en', trigger: 'screen_leave' });
    await flushMicrotasks();

    expect(peekOwnAuthoritativeWeekScore()).toMatchObject({
      ownerStableId: 'account-a', sourceSeq: 12, current: { weekKey: '2026-W46', earned: 130 },
    });
    expect(mockWalletMerge).toHaveBeenCalledTimes(1);
  });

  test('generation change while the callable is pending denies the old ACK', async () => {
    let resolve!: (value: unknown) => void;
    let entered!: () => void;
    const callableEntered = new Promise<void>((done) => { entered = done; });
    mockCallable.mockImplementation(() => {
      entered();
      return new Promise((done) => { resolve = done; });
    });
    const pending = spireFlushNow({ uid: 'uid-a', stableId: 'account-a', lang: 'en', trigger: 'screen_leave' });
    await callableEntered;
    beginAccountGeneration('account-b');
    resolve({ data: { ok: true, starsWeek: snapshot(13, 140) } });
    await pending;
    await flushMicrotasks();

    expect(peekOwnAuthoritativeWeekScore()).toBeNull();
  });

  test('old successful response without starsWeek remains a weekly no-op', async () => {
    mockCallable.mockResolvedValue({ data: { ok: true, stars: 99, starsSeq: 3 } });
    await spireFlushNow({ uid: 'uid-a', stableId: 'account-a', lang: 'en', trigger: 'screen_leave' });
    await flushMicrotasks();
    expect(peekOwnAuthoritativeWeekScore()).toBeNull();
  });
});

describe('weekly wiring source boundaries', () => {
  const read = (relative: string): string => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

  test('boot weekly apply is before every wallet validation and storage branch', () => {
    const source = read('app/level_spin_star_grants.ts');
    const start = source.indexOf('export async function adoptServerWalletFromUserDoc');
    const body = source.slice(start, source.indexOf('export type PreparedRuneSpend', start));
    expect(body.indexOf('applyOwnWeekScoreRawStars')).toBeGreaterThan(0);
    expect(body.indexOf('applyOwnWeekScoreRawStars')).toBeLessThan(body.indexOf('if (stars === undefined'));
    expect(body.indexOf('applyOwnWeekScoreRawStars')).toBeLessThan(body.indexOf('AsyncStorage.getItem'));
  });

  test('weekly ACK branch is independently wired before wallet merge', () => {
    const source = read('app/spire_report_client.ts');
    expect(source.indexOf('applyOwnWeekScoreWireSnapshot')).toBeGreaterThan(0);
    expect(source.indexOf('applyOwnWeekScoreWireSnapshot')).toBeLessThan(source.indexOf('mergeSpireFlushWallet'));
  });

  test('screen selects only the active owner and exact room week before building rows', () => {
    const source = read('app/spire/use_spire_game.ts');
    expect(source).toContain('useOwnAuthoritativeWeekCoins(ids?.stableId, room?.weekId)');
    expect(source).toContain('myAuthoritativeWeekCoins,');
    expect(source).not.toMatch(/balance.*myAuthoritativeWeekCoins|earnedTotal.*myAuthoritativeWeekCoins/);
  });
});
