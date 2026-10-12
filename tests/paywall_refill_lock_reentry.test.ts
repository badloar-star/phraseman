// ════════════════════════════════════════════════════════════════════════════
// paywall_refill_lock_reentry.test.ts — 🔴 взаимная блокировка после оплаты (координатор 12.10, деньги).
//
// commitRevenueCatResultForGeneration держит замок аккаунта и внутри пополняет энергию. Прежний refillToMax брал тот же
// НЕреентерабельный замок заново без lease → ждал хвост очереди = конец внешней работы → вечное ожидание: окно покупки
// крутилось, замок аккаунта занят навсегда. Тест идёт по НАСТОЯЩЕМУ замку account_generation и настоящей записи энергии
// (раньше refillToMax в тестах пейвола всегда был заглушкой — блокировку не видел никто).
// ════════════════════════════════════════════════════════════════════════════
/* eslint-disable import/first */
const mockGetAppUserID = jest.fn(async () => 'stable-refill-1');
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getAppUserID: () => mockGetAppUserID() },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { persistPremiumEnergyRefill, PREMIUM_REFILL_ENERGY_KEY } from '../app/energy_premium_refill';
import { commitRevenueCatResultForGeneration } from '../app/revenuecat_account_identity';

const HANG = Symbol('hang');
function withinMs<T>(work: Promise<T>, ms: number): Promise<T | typeof HANG> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    work,
    new Promise<typeof HANG>((resolve) => { timer = setTimeout(() => resolve(HANG), ms); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

describe('пополнение энергии внутри замка покупки RevenueCat', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('commit отдаёт lease колбэку, и пополнение с этим lease не зависает, а пишет полную энергию', async () => {
    const token = beginAccountGeneration('stable-refill-1');
    const result = await withinMs(commitRevenueCatResultForGeneration(token, async (isCurrent, lease) => {
      const refill = await persistPremiumEnergyRefill({ isCurrent, accountToken: token, readDynMax: async () => 5, lease });
      return refill !== null;
    }), 2_000);
    expect(result).toEqual({ status: 'ok', value: true });
    const stored = JSON.parse((await AsyncStorage.getItem(PREMIUM_REFILL_ENERGY_KEY)) ?? 'null');
    expect(stored).toMatchObject({ schemaVersion: 2, current: 5 });
    // замок аккаунта свободен после покупки: следующий держатель входит сразу
    expect(await withinMs(withAccountTransitionLock(async () => 'free'), 500)).toBe('free');
  });

  it('вне замка (без lease) пополнение берёт замок само — как раньше', async () => {
    const token = beginAccountGeneration('stable-refill-1');
    const refill = await withinMs(persistPremiumEnergyRefill({ isCurrent: () => true, accountToken: token, readDynMax: async () => 7 }), 1_000);
    expect(refill).not.toBe(HANG);
    expect(refill).toMatchObject({ freshDynMax: 7, refilledBonus: 0 });
  });

  it('лог входа/выхода пишет lease=yes|no и исход', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const token = beginAccountGeneration('stable-refill-1');
    await persistPremiumEnergyRefill({ isCurrent: () => true, accountToken: token, readDynMax: async () => 5 });
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.startsWith('[ACCOUNT-LOCK] refillToMax:enter') && line.includes('"lease":"no"'))).toBe(true);
    expect(lines.some((line) => line.startsWith('[ACCOUNT-LOCK] refillToMax:exit') && line.includes('"outcome":"written"'))).toBe(true);
  });

  it('без lease внутри замка — та самая взаимная блокировка (поэтому lease обязателен держателю; ПОСЛЕДНИЙ — оставляет замок занятым)', async () => {
    const token = beginAccountGeneration('stable-refill-1');
    const result = await withinMs(commitRevenueCatResultForGeneration(token, async (isCurrent) => (
      (await persistPremiumEnergyRefill({ isCurrent, accountToken: token, readDynMax: async () => 5 })) !== null
    )), 1_000);
    expect(result).toBe(HANG);
  });
});
