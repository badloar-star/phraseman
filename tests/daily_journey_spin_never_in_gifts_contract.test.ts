import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  commitDailyJourneyGift,
  readDailyJourneyGiftClaimState,
  readDailyJourneyGiftProjection,
  type DailyJourneyGiftInput,
} from '../app/daily_journey_gift_inbox';
import {
  autocreditPendingDailyJourneySpins,
  isDailyJourneySpinReward,
  withDailyJourneySpinAutocredit,
} from '../app/daily_journey_spin_autocredit';
import { DebugLogger } from '../app/debug-logger';

/**
 * Сторож правила владельца (2026-09-20): «СПИН НЕ ДОЛЖЕН ИДТИ В РАЗДЕЛ
 * ПОДАРКИ. СПИН СРАЗУ НАЧИСЛЯЕТСЯ НА СЧЕТ СПИНОВ».
 *
 * PM-047 (владелец, 2026-09-24): спин как механика убран целиком —
 * grantLocalDailyJourneySpins стал always no-op, поэтому «начисление на счёт
 * спинов» из правила выше больше физически не происходит. Что ДОЛЖНО
 * сохраниться: спин по-прежнему не ждёт ручного тапа в «Подарках» — он
 * закрывается МОЛЧА (лог [SPIN-RETIRED], без начисления и без исключения)
 * в момент выдачи дня или миграцией старых плиток, а не всплывает как
 * дело, которое надо сделать вручную. Тест переписан под это поведение,
 * а не удалён — регресс «спин снова ждёт тапа» остаётся ловимым.
 */

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex'),
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({ commitShardCreditOperation: jest.fn() }));
jest.mock('../app/level_spin_star_grants', () => ({ enqueueLevelSpinStarGrant: jest.fn() }));
jest.mock('../app/energy_system', () => ({
  getEnergyState: jest.fn(),
  getEffectiveMaxEnergyValue: jest.fn(),
}));
jest.mock('../app/daily_journey_freeze_ledger', () => ({ commitDailyJourneyFreezeGrant: jest.fn() }));
jest.mock('../app/level_gift_system', () => ({
  GIFT_POOL: [{ id: 'energy_full' }, { id: 'energy_plus2' }, { id: 'energy_plus3' }],
  applyGift: jest.fn(),
  confirmDeferredLocalLevelGiftEffectReceipt: jest.fn(),
}));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const storage: Record<string, string> = {};
const OWNER = 'owner-spin-guard';

const spinInput = (day: number, amount: number): DailyJourneyGiftInput => Object.freeze({
  operationId: `daily_journey_spin_guard_${day}`,
  source: 'daily_journey' as const,
  cycle: 1,
  day,
  reward: Object.freeze({ kind: 'spins' as const, amount }),
});

const pearlsInput = (day: number): DailyJourneyGiftInput => Object.freeze({
  operationId: `daily_journey_pearls_guard_${day}`,
  source: 'daily_journey' as const,
  cycle: 1,
  day,
  reward: Object.freeze({ kind: 'pearls' as const, amount: 10 }),
});

beforeEach(async () => {
  for (const key of Object.keys(storage)) delete storage[key];
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => storage[key] ?? null,
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(
    async (keys: readonly string[]) => keys.map((key) => [key, storage[key] ?? null]),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (DebugLogger.info as jest.Mock).mockClear();
  __resetAccountGenerationForTests();
  await beginAccountGeneration(OWNER);
});

describe('спин никогда не ждёт в «Подарках» (PM-047: закрывается молча, не начисляется)', () => {
  it('распознаёт награду-спин и отличает её от прочих', () => {
    expect(isDailyJourneySpinReward({ kind: 'spins' })).toBe(true);
    expect(isDailyJourneySpinReward({ kind: 'pearls' })).toBe(false);
    expect(isDailyJourneySpinReward({ kind: 'runes' })).toBe(false);
    expect(isDailyJourneySpinReward({ kind: 'freeze' })).toBe(false);
    expect(isDailyJourneySpinReward(null)).toBe(false);
  });

  it('спин закрывается в момент выдачи дня, без тапа по плитке и без ошибки', async () => {
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    const committed = await commit(spinInput(4, 2), token);
    expect(committed.status).toBe('committed');

    // Обещание отменено (PM-047): лог о закрытии есть, начисления нет.
    expect(DebugLogger.info).toHaveBeenCalledWith(
      '[SPIN-RETIRED]',
      expect.stringContaining('source=daily_journey'),
    );

    // И подарок помечен использованным, то есть плиткой уже не всплывёт.
    const claimState = await readDailyJourneyGiftClaimState(
      committed.occurrence.operationId,
      token,
    );
    expect(claimState).toBe('claimed');
  });

  it('НЕ-спиновые награды по-прежнему ждут человека в «Подарках»', async () => {
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    const committed = await commit(pearlsInput(5), token);

    const claimState = await readDailyJourneyGiftClaimState(
      committed.occurrence.operationId,
      token,
    );
    expect(claimState).toBe('pending');

    const projection = await readDailyJourneyGiftProjection(token);
    expect(projection.pending.map((item) => item.reward.kind)).toContain('pearls');
  });

  it('повторная выдача того же дня не пишет лог закрытия дважды', async () => {
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    await commit(spinInput(6, 3), token);
    const callsAfterFirst = (DebugLogger.info as jest.Mock).mock.calls
      .filter(([tag]) => tag === '[SPIN-RETIRED]').length;

    // Повтор после обрыва сети / перезапуска обязан быть экономически инертным.
    await commit(spinInput(6, 3), token);
    const callsAfterSecond = (DebugLogger.info as jest.Mock).mock.calls
      .filter(([tag]) => tag === '[SPIN-RETIRED]').length;

    expect(callsAfterFirst).toBe(1);
    expect(callsAfterSecond).toBe(1);
  });

  it('старые плитки со спином закрываются миграцией и исчезают из витрины без начисления', async () => {
    const token = captureAccountGeneration();

    // Плитка, заработанная ДО отмены механики: коммит без автозакрытия.
    const legacy = await commitDailyJourneyGift(spinInput(7, 5), token);
    expect(
      await readDailyJourneyGiftClaimState(legacy.occurrence.operationId, token),
    ).toBe('pending');

    const first = await autocreditPendingDailyJourneySpins(token);
    expect(first.credited).toBe(1);
    expect(first.failed).toBe(0);
    expect(
      await readDailyJourneyGiftClaimState(legacy.occurrence.operationId, token),
    ).toBe('claimed');

    // Второй запуск ничего не находит — повторно не закрывает и не логирует.
    (DebugLogger.info as jest.Mock).mockClear();
    const second = await autocreditPendingDailyJourneySpins(token);
    expect(second.credited).toBe(0);
    expect(DebugLogger.info).not.toHaveBeenCalledWith('[SPIN-RETIRED]', expect.anything());
  });
});
