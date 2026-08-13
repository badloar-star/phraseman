/**
 * cards-2.0 (E1): детект слабого устройства (app/flashcards/low_power.ts).
 * Порог: totalMemory СТРОГО < 3GB → lowPower. Эталон Helio G35 / ровно 3GB
 * под порог НЕ попадает (на нём — полный 3D-флип). Web всегда false.
 */

const GB = 1024 * 1024 * 1024;

// expo-device мокаем целиком: в jest нет нативного модуля
let mockTotalMemory: number | null = 4 * GB;
jest.mock('expo-device', () => ({
  __esModule: true,
  get totalMemory() {
    return mockTotalMemory;
  },
}));

import {
  LOW_POWER_MEMORY_THRESHOLD_BYTES,
  __resetLowPowerCacheForTests,
  computeLowPower,
  getLowPowerOverride,
  isLowPowerDeviceAuto,
  isLowPowerEffective,
  setLowPowerOverride,
} from '../app/flashcards/low_power';

const { Platform } = require('react-native');

describe('computeLowPower (чистая функция порога)', () => {
  it('строго < 3GB → lowPower', () => {
    expect(computeLowPower(2 * GB, 'android')).toBe(true);
    expect(computeLowPower(3 * GB - 1, 'android')).toBe(true);
  });

  it('ровно 3GB (эталон Helio G35) и больше → НЕ lowPower', () => {
    expect(computeLowPower(3 * GB, 'android')).toBe(false);
    expect(computeLowPower(4 * GB, 'ios')).toBe(false);
    expect(LOW_POWER_MEMORY_THRESHOLD_BYTES).toBe(3 * GB);
  });

  it('web всегда false, даже при «малой» памяти', () => {
    expect(computeLowPower(1 * GB, 'web')).toBe(false);
  });

  it('неизвестная память (null/undefined/NaN/0) → false: не деградируем на всякий случай', () => {
    expect(computeLowPower(null, 'android')).toBe(false);
    expect(computeLowPower(undefined, 'android')).toBe(false);
    expect(computeLowPower(Number.NaN, 'android')).toBe(false);
    expect(computeLowPower(0, 'android')).toBe(false);
  });
});

describe('isLowPowerDeviceAuto (expo-device + кэш)', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    __resetLowPowerCacheForTests();
    Platform.OS = originalOS; // мок react-native: 'ios'
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  it('память 2GB → true; значение кэшируется', () => {
    mockTotalMemory = 2 * GB;
    expect(isLowPowerDeviceAuto()).toBe(true);
    // после кэширования смена памяти не влияет (память девайса не меняется в рантайме)
    mockTotalMemory = 8 * GB;
    expect(isLowPowerDeviceAuto()).toBe(true);
  });

  it('память 4GB → false', () => {
    mockTotalMemory = 4 * GB;
    expect(isLowPowerDeviceAuto()).toBe(false);
  });

  it('Platform web → false без чтения expo-device', () => {
    Platform.OS = 'web';
    mockTotalMemory = 1 * GB;
    expect(isLowPowerDeviceAuto()).toBe(false);
  });
});

describe('isLowPowerEffective — тумблер «Упрощённые эффекты» перекрывает авто', () => {
  beforeEach(() => {
    __resetLowPowerCacheForTests();
  });

  it('override=on → true даже на мощном устройстве', async () => {
    mockTotalMemory = 8 * GB;
    await setLowPowerOverride(true);
    expect(getLowPowerOverride()).toBe(true);
    expect(isLowPowerEffective()).toBe(true);
  });

  it('override=off → false даже на слабом устройстве', async () => {
    mockTotalMemory = 1 * GB;
    await setLowPowerOverride(false);
    expect(isLowPowerEffective()).toBe(false);
  });

  it('override=null → авто-детект', async () => {
    mockTotalMemory = 1 * GB;
    await setLowPowerOverride(null);
    expect(getLowPowerOverride()).toBeNull();
    expect(isLowPowerEffective()).toBe(true);
  });
});
