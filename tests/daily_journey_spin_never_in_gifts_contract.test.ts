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
import { grantLocalDailyJourneySpins } from '../app/local_level_spins';

/**
 * Сторож правила владельца (2026-09-20): «СПИН НЕ ДОЛЖЕН ИДТИ В РАЗДЕЛ
 * ПОДАРКИ. СПИН СРАЗУ НАЧИСЛЯЕТСЯ НА СЧЕТ СПИНОВ».
 *
 * зачем именно сторож: до правки спин был ЕДИНСТВЕННОЙ наградой, которая ждала
 * ручного тапа в «Подарках» (все прочие источники — лига, арена, квесты,
 * level-up, урок, бонус — начисляли мгновенно). Существующие тесты проверяли
 * лишь то, что начисление корректно, и молчали о том, КОГДА оно происходит,
 * поэтому возврат ручного шага прошёл бы незамеченным.
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
jest.mock('../app/local_level_spins', () => ({ grantLocalDailyJourneySpins: jest.fn() }));
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
  (grantLocalDailyJourneySpins as jest.Mock).mockReset();
  (grantLocalDailyJourneySpins as jest.Mock).mockResolvedValue(true);
  __resetAccountGenerationForTests();
  await beginAccountGeneration(OWNER);
});

describe('спин никогда не ждёт в «Подарках»', () => {
  it('распознаёт награду-спин и отличает её от прочих', () => {
    expect(isDailyJourneySpinReward({ kind: 'spins' })).toBe(true);
    expect(isDailyJourneySpinReward({ kind: 'pearls' })).toBe(false);
    expect(isDailyJourneySpinReward({ kind: 'runes' })).toBe(false);
    expect(isDailyJourneySpinReward({ kind: 'freeze' })).toBe(false);
    expect(isDailyJourneySpinReward(null)).toBe(false);
  });

  it('спин начисляется в момент выдачи дня, без тапа по плитке', async () => {
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    const committed = await commit(spinInput(4, 2), token);
    expect(committed.status).toBe('committed');

    // Начисление на счёт спинов уже произошло — человек в «Подарки» не заходил.
    expect(grantLocalDailyJourneySpins).toHaveBeenCalledTimes(1);
    expect(grantLocalDailyJourneySpins).toHaveBeenCalledWith(
      expect.stringContaining('daily-journey-gift-claim:'),
      2,
      expect.anything(),
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

    // Жемчужины не трогаем — правило владельца касается только спина.
    expect(grantLocalDailyJourneySpins).not.toHaveBeenCalled();
    const claimState = await readDailyJourneyGiftClaimState(
      committed.occurrence.operationId,
      token,
    );
    expect(claimState).toBe('pending');

    const projection = await readDailyJourneyGiftProjection(token);
    expect(projection.pending.map((item) => item.reward.kind)).toContain('pearls');
  });

  it('повторная выдача того же дня не удваивает баланс', async () => {
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    await commit(spinInput(6, 3), token);
    const callsAfterFirst = (grantLocalDailyJourneySpins as jest.Mock).mock.calls.length;

    // Повтор после обрыва сети / перезапуска обязан быть экономически инертным.
    await commit(spinInput(6, 3), token);
    const granted = (grantLocalDailyJourneySpins as jest.Mock).mock.calls.length;

    expect(callsAfterFirst).toBe(1);
    expect(granted).toBe(1);
  });

  it('старые плитки со спином начисляются миграцией и исчезают из витрины', async () => {
    const token = captureAccountGeneration();

    // Плитка, заработанная ДО обновления: коммит без автоклейма.
    const legacy = await commitDailyJourneyGift(spinInput(7, 5), token);
    expect(
      await readDailyJourneyGiftClaimState(legacy.occurrence.operationId, token),
    ).toBe('pending');

    const first = await autocreditPendingDailyJourneySpins(token);
    expect(first.credited).toBe(1);
    expect(grantLocalDailyJourneySpins).toHaveBeenCalledWith(
      expect.stringContaining('daily-journey-gift-claim:'),
      5,
      expect.anything(),
    );
    expect(
      await readDailyJourneyGiftClaimState(legacy.occurrence.operationId, token),
    ).toBe('claimed');

    // Второй запуск ничего не находит — повторно спин не выдаётся.
    (grantLocalDailyJourneySpins as jest.Mock).mockClear();
    const second = await autocreditPendingDailyJourneySpins(token);
    expect(second.credited).toBe(0);
    expect(grantLocalDailyJourneySpins).not.toHaveBeenCalled();
  });

  it('сбой начисления не роняет выдачу дня и оставляет награду в журнале', async () => {
    (grantLocalDailyJourneySpins as jest.Mock).mockResolvedValue(false);
    const token = captureAccountGeneration();
    const commit = withDailyJourneySpinAutocredit(commitDailyJourneyGift);

    // Выдача дня обязана пройти: награда не теряется, её подберёт миграция.
    const committed = await commit(spinInput(8, 1), token);
    expect(committed.status).toBe('committed');
    expect(
      await readDailyJourneyGiftClaimState(committed.occurrence.operationId, token),
    ).toBe('pending');
  });
});
