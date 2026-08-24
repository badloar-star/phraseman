import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration } from '../app/account_generation';
import {
  PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY,
  readPersonalPlanSunsetEffectiveNow,
} from '../app/personal_plan_sunset_clock';
import { PERSONAL_PLAN_SUNSET_AT_MS } from '../app/personal_plan_sunset';

describe('Personal Plan monotonic sunset clock', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('persists and returns the greatest observed local time', async () => {
    const before = PERSONAL_PLAN_SUNSET_AT_MS - 1_000;
    const after = PERSONAL_PLAN_SUNSET_AT_MS + 1_000;

    await expect(readPersonalPlanSunsetEffectiveNow(before)).resolves.toBe(before);
    await expect(readPersonalPlanSunsetEffectiveNow(after)).resolves.toBe(after);
    await expect(readPersonalPlanSunsetEffectiveNow(before)).resolves.toBe(after);
    await expect(AsyncStorage.getItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY))
      .resolves.toBe(String(after));
  });

  test('serializes concurrent observations so an older write cannot lower the high-water', async () => {
    const base = PERSONAL_PLAN_SUNSET_AT_MS + 10_000;
    await expect(Promise.all([
      readPersonalPlanSunsetEffectiveNow(base),
      readPersonalPlanSunsetEffectiveNow(base + 5_000),
      readPersonalPlanSunsetEffectiveNow(base + 1_000),
    ])).resolves.toEqual([base, base + 5_000, base + 5_000]);
    await expect(AsyncStorage.getItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY))
      .resolves.toBe(String(base + 5_000));
  });

  test('is account-independent and cannot reopen after observing the deadline', async () => {
    const observedAfterDeadline = PERSONAL_PLAN_SUNSET_AT_MS + 20_000;
    beginAccountGeneration('sunset-clock-a');
    await readPersonalPlanSunsetEffectiveNow(observedAfterDeadline);
    beginAccountGeneration('sunset-clock-b');

    await expect(readPersonalPlanSunsetEffectiveNow(PERSONAL_PLAN_SUNSET_AT_MS - 86_400_000))
      .resolves.toBe(observedAfterDeadline);
  });

  test('does not move backwards in-process if unrelated storage cleanup removes the key', async () => {
    const observedHighWater = PERSONAL_PLAN_SUNSET_AT_MS + 30_000;
    await readPersonalPlanSunsetEffectiveNow(observedHighWater);
    await AsyncStorage.removeItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY);

    await expect(readPersonalPlanSunsetEffectiveNow(PERSONAL_PLAN_SUNSET_AT_MS - 5_000))
      .resolves.toBe(observedHighWater);
    await expect(AsyncStorage.getItem(PERSONAL_PLAN_SUNSET_HIGH_WATER_KEY))
      .resolves.toBe(String(observedHighWater));
  });
});
