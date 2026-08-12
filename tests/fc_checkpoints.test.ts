/**
 * cards-2.0 (E6): сундуки-чекпоинты недельного трека (§4 мастер-плана).
 * Покрытие: клейм строго один раз, повторный не платит, недостигнутый отклоняется,
 * «второй девайс» через one-time событие shards_one_time_events, ролл 70/25/5
 * в диапазонах (мок Math.random), новая неделя сбрасывает claimed, но one-time
 * ключи недельные ('{weekKey}:{checkpoint}') — старые выплаты не мешают новым.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import {
  __resetStarsStateForTests,
  checkpointOneTimeEventKey,
  claimCheckpoint,
  FC_STARS_KEY,
  getWeeklyProgress,
  rollCheckpointReward,
} from '../app/flashcards/stars_system';
import {
  CHECKPOINT_JACKPOT_MULT,
  CHECKPOINT_SHARD_REWARDS,
} from '../app/flashcards/stars_config';

jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), log: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => null),
  getAuthUserId: jest.fn(() => null),
}));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(async () => {}),
  bumpLifetimeShardsSpent: jest.fn(async () => {}),
}));

const storageMock = AsyncStorage as unknown as { __reset: () => void };

/** Пн 2026-08-10 12:00 UTC — ISO-неделя 2026-W33. */
const MON_W33 = Date.UTC(2026, 7, 10, 12, 0, 0);
/** Пн 2026-08-17 12:00 UTC — следующая ISO-неделя 2026-W34. */
const MON_W34 = Date.UTC(2026, 7, 17, 12, 0, 0);

let nowMs = MON_W33;
let dateNowSpy: jest.SpyInstance<number, []>;

const seedStars = async (stars: number, opts?: { weekKey?: string; claimed?: number[] }) => {
  await AsyncStorage.setItem(
    FC_STARS_KEY,
    JSON.stringify({
      weekKey: opts?.weekKey ?? '2026-W33',
      stars,
      checkpointsClaimed: opts?.claimed ?? [],
      dailyCaps: { dateKey: '2026-08-10', byMode: {} },
      customTrainedToday: { dateKey: '2026-08-10', cardIds: [] },
      lifetime: { stars, sessions: 1, perfectSessions: 0 },
      xpBoostUntil: 0,
    }),
  );
};

const getBalance = async (): Promise<number> =>
  Number((await AsyncStorage.getItem('shards_balance')) ?? '0');

const getOneTimeEvents = async (): Promise<string[]> =>
  JSON.parse((await AsyncStorage.getItem('shards_one_time_events')) ?? '[]');

const getClaimed = async (): Promise<number[]> =>
  JSON.parse((await AsyncStorage.getItem(FC_STARS_KEY)) ?? '{}').checkpointsClaimed ?? [];

beforeEach(async () => {
  jest.clearAllMocks();
  storageMock.__reset();
  __resetStarsStateForTests();
  nowMs = MON_W33;
  dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  await AsyncStorage.setItem('shards_balance', '100');
});

afterEach(() => {
  dateNowSpy.mockRestore();
  jest.restoreAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
describe('rollCheckpointReward — ролл 70/25/5 (инжект rnd)', () => {
  it('low (70%): нижняя половина диапазона; rnd→0 даёт min', () => {
    expect(rollCheckpointReward(7, () => 0)).toEqual({ amount: 20, tier: 'low' });
    expect(rollCheckpointReward(14, () => 0)).toEqual({ amount: 40, tier: 'low' });
    expect(rollCheckpointReward(21, () => 0)).toEqual({ amount: 100, tier: 'low' });
  });

  it('mid (25%): верхняя половина; rnd 0.7 → mid-тир', () => {
    const rndSeq = (values: number[]) => {
      let i = 0;
      return () => values[Math.min(i++, values.length - 1)]!;
    };
    // 0.7*100 = 70 → mid; далее 0.999 → максимум диапазона
    expect(rollCheckpointReward(7, rndSeq([0.7, 0.999]))).toEqual({ amount: 40, tier: 'mid' });
    expect(rollCheckpointReward(21, rndSeq([0.7, 0]))).toEqual({ amount: 150, tier: 'mid' }); // midpoint(100..200)
  });

  it('jackpot (5%): max × 2 без второго ролла', () => {
    expect(rollCheckpointReward(7, () => 0.96)).toEqual({ amount: 80, tier: 'jackpot' });
    expect(rollCheckpointReward(21, () => 0.96)).toEqual({
      amount: CHECKPOINT_SHARD_REWARDS[21]!.max * CHECKPOINT_JACKPOT_MULT,
      tier: 'jackpot',
    });
  });

  it('неизвестный чекпоинт → null; 200 роллов всегда в [min, max×2]', () => {
    expect(rollCheckpointReward(9)).toBeNull();
    for (let i = 0; i < 200; i++) {
      const r = rollCheckpointReward(14)!;
      expect(r.amount).toBeGreaterThanOrEqual(CHECKPOINT_SHARD_REWARDS[14]!.min);
      expect(r.amount).toBeLessThanOrEqual(CHECKPOINT_SHARD_REWARDS[14]!.max * CHECKPOINT_JACKPOT_MULT);
      if (r.tier !== 'jackpot') {
        expect(r.amount).toBeLessThanOrEqual(CHECKPOINT_SHARD_REWARDS[14]!.max);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('claimCheckpoint — клейм строго один раз', () => {
  it('достигнутый чекпоинт платит осколки и регистрирует one-time событие', async () => {
    await seedStars(9);
    jest.spyOn(Math, 'random').mockReturnValue(0); // low-ролл → min = 20

    const outcome = await claimCheckpoint(7);
    expect(outcome).toEqual({ ok: true, checkpoint: 7, amount: 20, tier: 'low', weekKey: '2026-W33' });
    expect(await getBalance()).toBe(120);
    expect(await getOneTimeEvents()).toContain('2026-W33:7');
    expect(await getClaimed()).toEqual([7]);
    expect(emitAppEvent).toHaveBeenCalledWith('fc_checkpoint_claimed', {
      checkpoint: 7,
      amount: 20,
      weekKey: '2026-W33',
      jackpot: false,
    });
  });

  it('повторный клейм не платит', async () => {
    await seedStars(9);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await claimCheckpoint(7);
    (emitAppEvent as jest.Mock).mockClear();

    const second = await claimCheckpoint(7);
    expect(second).toEqual({ ok: false, reason: 'already_claimed' });
    expect(await getBalance()).toBe(120);
    expect(emitAppEvent).not.toHaveBeenCalledWith('fc_checkpoint_claimed', expect.anything());
  });

  it('недостигнутый отклоняется, неизвестный — unknown_checkpoint', async () => {
    await seedStars(9);
    expect(await claimCheckpoint(14)).toEqual({ ok: false, reason: 'not_reached' });
    expect(await claimCheckpoint(9)).toEqual({ ok: false, reason: 'unknown_checkpoint' });
    expect(await getBalance()).toBe(100);
    expect(await getOneTimeEvents()).toEqual([]);
  });

  it('стрик ≥7 дней: последний сундук доступен уже при 18★ (порог идеальной недели)', async () => {
    await seedStars(18);
    await AsyncStorage.setItem('streak_count', '7');
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const outcome = await claimCheckpoint(21);
    expect(outcome).toMatchObject({ ok: true, checkpoint: 21, amount: 100 });
    // канон в claimed — 21, не 18
    expect(await getClaimed()).toEqual([21]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('«второй девайс» — дюп-защита через shards_one_time_events', () => {
  it('событие выплаты уже пришло с другого устройства → клейм фиксируется без денег', async () => {
    await seedStars(15);
    // синк принёс событие выплаты 14-звёздного сундука с другого девайса
    await AsyncStorage.setItem('shards_one_time_events', JSON.stringify(['2026-W33:14']));

    const outcome = await claimCheckpoint(14);
    expect(outcome).toEqual({ ok: false, reason: 'already_claimed' });
    expect(await getBalance()).toBe(100); // денег нет
    // но локальный клейм дописан — сундук в UI гаснет
    expect(await getClaimed()).toEqual([14]);
    expect(emitAppEvent).not.toHaveBeenCalledWith('fc_checkpoint_claimed', expect.anything());
  });

  it('ключ события — {weekKey}:{checkpoint}', () => {
    expect(checkpointOneTimeEventKey('2026-W33', 7)).toBe('2026-W33:7');
    expect(checkpointOneTimeEventKey('2026-W34', 21)).toBe('2026-W34:21');
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('новая неделя', () => {
  it('reset сбрасывает claimed, one-time ключи недельные — новая неделя платит заново', async () => {
    await seedStars(9, { claimed: [7] });
    await AsyncStorage.setItem('shards_one_time_events', JSON.stringify(['2026-W33:7']));

    // Наступила W34: клеймы недели сброшены
    nowMs = MON_W34;
    __resetStarsStateForTests();
    const weekly = await getWeeklyProgress();
    expect(weekly.weekKey).toBe('2026-W34');
    expect(weekly.earned).toBe(0);
    expect(weekly.claimed).toEqual([]);

    // Набрал 9★ в новой неделе → сундук 7 платит снова (ключ 2026-W34:7 свободен)
    await seedStars(9, { weekKey: '2026-W34' });
    __resetStarsStateForTests();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const outcome = await claimCheckpoint(7);
    expect(outcome).toMatchObject({ ok: true, weekKey: '2026-W34', amount: 20 });
    expect(await getBalance()).toBe(120);
    expect(await getOneTimeEvents()).toEqual(expect.arrayContaining(['2026-W33:7', '2026-W34:7']));
  });
});
