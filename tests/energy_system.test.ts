import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addEnergy,
  checkAndRecover,
  formatTimeUntilRecovery,
  getEffectiveMaxEnergyValue,
  getEnergyState,
  getRecoveryIntervalMs,
  planActiveEnergyRecovery,
  resetEnergyToMax,
  secondsUntilEnergyFull,
  type EnergyState,
} from '../app/energy_system';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');

const stateAt = (current: number, at: number): EnergyState => ({
  schemaVersion: 2,
  current,
  lastSettledAt: at,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
});

describe('numeric energy system', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('energy-system-user');
  });

  // PM-081 (BIBLE «Энергия: 5, −1 за начавшееся занятие, +1 за 10 минут»;
  // D06/D07): запас ровно 5, прежние 100 и прибавки лиги/карточки отменены.
  it('starts full at 5 with the v2 schema', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await expect(getEnergyState()).resolves.toMatchObject({ schemaVersion: 2, current: 5 });
  });

  it('keeps a legacy 3/5 balance as 3/5 (the scales now match)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      current: 3,
      lastRecoveryTime: Date.now(),
    }));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await expect(getEnergyState()).resolves.toMatchObject({ schemaVersion: 2, current: 3 });
  });

  it('uses the same capacity of 5 regardless of profile card or league', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('999999999');
    await expect(getEffectiveMaxEnergyValue()).resolves.toBe(5);
  });

  it('calculates time to a full numeric reserve', () => {
    const interval = 6 * 60 * 1000;
    const now = 1_700_000_000_000;
    expect(secondsUntilEnergyFull(100, 100, interval, now, now)).toBe(0);
    expect(secondsUntilEnergyFull(99, 100, interval, now, now)).toBe(6 * 60);
    expect(secondsUntilEnergyFull(86, 100, interval, now, now)).toBe(84 * 60);
    expect(secondsUntilEnergyFull(86, 100, 0, now, now)).toBe(0);
  });

  it('adds numeric units and clamps the base pool at 5', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stateAt(3, Date.now())));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await expect(addEnergy(10)).resolves.toMatchObject({ current: 5 });
  });

  it('resets to a clean full v2 state', async () => {
    // Чистое хранилище: иначе мок getItem из прошлого теста отдаёт энергию
    // вместо бонусного пула и чтение бонуса честно падает как «битое».
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.multiSet as jest.Mock | undefined)?.mockResolvedValue?.(undefined);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await expect(resetEnergyToMax()).resolves.toMatchObject({
      schemaVersion: 2,
      current: 5,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    });
  });

  it('recovers one unit after one recovery interval', async () => {
    const now = Date.now();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(stateAt(2, now - getRecoveryIntervalMs())),
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await expect(checkAndRecover()).resolves.toMatchObject({ current: 3 });
  });

  it('fills permanent units before active gift capacity', () => {
    const projected = planActiveEnergyRecovery({
      baseEnergy: 98,
      maxEnergy: 100,
      bonusEnergy: 10,
      bonusCapacity: 40,
      bonusExpiresAt: 100_000,
      lastRecoveryTime: 10_000,
      recoveryIntervalMs: 1_000,
      now: 15_000,
    });
    expect(projected).toMatchObject({ baseEnergy: 100, bonusEnergy: 13, bonusCapacity: 40 });
  });

  it('drops expired temporary capacity from the recovery projection', () => {
    expect(planActiveEnergyRecovery({
      baseEnergy: 83,
      maxEnergy: 100,
      bonusEnergy: 40,
      bonusCapacity: 40,
      bonusExpiresAt: 9_999,
      lastRecoveryTime: 9_000,
      recoveryIntervalMs: 1_000,
      now: 10_000,
    })).toMatchObject({ baseEnergy: 84, bonusEnergy: 0, bonusCapacity: 0, bonusExpiresAt: 0 });
  });

  it('formats recovery time for the compact popover', () => {
    expect(formatTimeUntilRecovery(90 * 60 * 1000)).toBe('1ч 30м 0с');
    expect(formatTimeUntilRecovery(45 * 1000)).toBe('45с');
    expect(formatTimeUntilRecovery(90 * 1000)).toBe('1м 30с');
  });
});
