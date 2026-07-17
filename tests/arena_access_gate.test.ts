import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  consumeArenaGameEntry,
  canStartArenaMatch,
  chargeArenaEntry,
  reserveArenaGameEntry,
} from '../app/arena_access_gate';
import {
  ARENA_DAILY_MAX,
  getDailyArenaCount,
  getDailyArenaMaxToday,
  getDailyArenaPlaysLeft,
  refundDailyArenaPlays,
} from '../app/arena_daily_limit';
import { logEvent } from '../app/firebase';
import { applyRemoteConfigSnapshot, __resetRemoteFlagsForTest } from '../app/remote_flags';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/firebase', () => ({ logEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetRemoteFlagsForTest();
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
});

describe('arena_access_gate', () => {
  it('gives a free user one ranked ticket per day by default', async () => {
    expect(ARENA_DAILY_MAX).toBe(1);
    await expect(getDailyArenaMaxToday()).resolves.toBe(1);
  });

  it('blocks non-premium ranked entry when daily plays are exhausted', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockStorage.arena_daily_limit_v1 = JSON.stringify({ date: today, count: ARENA_DAILY_MAX });

    await expect(canStartArenaMatch({
      isUnlimited: false,
      availableEnergy: 3,
      countDaily: true,
    })).resolves.toEqual({ ok: false, reason: 'daily_limit' });
  });

  it('grants every purchased refill slot even when the base daily limit is lower', async () => {
    const today = new Date().toISOString().slice(0, 10);
    applyRemoteConfigSnapshot({ numbers: { arena_daily_max: 3 } });
    mockStorage.arena_daily_limit_v1 = JSON.stringify({ date: today, count: 3 });

    await refundDailyArenaPlays(5);

    await expect(getDailyArenaPlaysLeft()).resolves.toBe(5);
  });

  it('blocks non-premium entry without energy', async () => {
    await expect(canStartArenaMatch({
      isUnlimited: false,
      availableEnergy: 0,
      countDaily: true,
    })).resolves.toEqual({ ok: false, reason: 'no_energy' });
  });

  it('allows premium entry even without energy or daily plays', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockStorage.arena_daily_limit_v1 = JSON.stringify({ date: today, count: ARENA_DAILY_MAX });

    await expect(canStartArenaMatch({
      isUnlimited: true,
      availableEnergy: 0,
      countDaily: true,
    })).resolves.toEqual({ ok: true });
  });

  it('charges non-premium ranked entry and increments daily count', async () => {
    const spendOne = jest.fn(async () => true);

    await expect(chargeArenaEntry({
      isUnlimited: false,
      spendOne,
      countDaily: true,
      mode: 'ranked',
    })).resolves.toEqual({ ok: true, charged: true, dailyCount: 1 });

    expect(spendOne).toHaveBeenCalledTimes(1);
    await expect(getDailyArenaCount()).resolves.toBe(1);
    expect(logEvent).toHaveBeenCalledWith('arena_match_charged', {
      mode: 'ranked',
      daily_count: 1,
    });
  });

  it('does not charge premium entry', async () => {
    const spendOne = jest.fn(async () => true);

    await expect(chargeArenaEntry({
      isUnlimited: true,
      spendOne,
      countDaily: true,
      mode: 'ranked',
    })).resolves.toEqual({ ok: true, charged: false });

    expect(spendOne).not.toHaveBeenCalled();
    await expect(getDailyArenaCount()).resolves.toBe(0);
  });

  it('reserves and consumes arena game entry once', async () => {
    await reserveArenaGameEntry('session_1', 'ranked');

    await expect(consumeArenaGameEntry('session_1')).resolves.toBe(true);
    await expect(consumeArenaGameEntry('session_1')).resolves.toBe(false);
  });

  it('rejects arena game entry for a different session', async () => {
    await reserveArenaGameEntry('session_1', 'ranked');

    await expect(consumeArenaGameEntry('session_2')).resolves.toBe(false);
  });
});
