import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration } from '../app/account_generation';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_PENDING_ACTIVATION_KEY,
  queuePendingPersonalPlanActivation,
} from '../app/personal_plan_activation';
import {
  clearPersonalPlanState,
  createDefaultPersonalPlanState,
  PERSONAL_PLAN_STATE_KEY,
  readPersonalPlanState,
  savePersonalPlanState,
} from '../app/personal_plan_state';

describe('pending personal plan activation', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));
    await AsyncStorage.clear();
    await clearPersonalPlanState();
    beginAccountGeneration('activation-test-user');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function seedGrandfatheredPlan(planInstanceId: string = 'legacy-plan'): Promise<void> {
    await savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan',
      minutesPerDay: 5,
      planInstanceId,
    }));
  }

  it('replays the same stable activation when pending cleanup fails after the state write', async () => {
    await seedGrandfatheredPlan();
    const pending = await queuePendingPersonalPlanActivation({
      planId: 'gavan', minutesPerDay: 10, source: 'onboarding',
    });
    expect(pending.activationId).toMatch(/^personal_plan_activation:/);

    const removeItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
    removeItem.mockRejectedValueOnce(new Error('cleanup_failed'));

    const first = await activatePendingPersonalPlanAfterPremium();
    expect(first?.planInstanceId).toBe(pending.activationId);
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).not.toBeNull();

    const replay = await activatePendingPersonalPlanAfterPremium();
    expect(replay?.planInstanceId).toBe(first?.planInstanceId);
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).toBeNull();
  });

  it('does not clear pending or publish a phantom cache when plan persistence fails', async () => {
    await seedGrandfatheredPlan();
    const pending = await queuePendingPersonalPlanActivation({ planId: 'gavan', minutesPerDay: 5 });
    const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
    setItem.mockRejectedValueOnce(new Error('disk_full'));

    await expect(activatePendingPersonalPlanAfterPremium()).rejects.toThrow('disk_full');
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).not.toBeNull();
    expect(JSON.parse(String(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY))).planInstanceId)
      .toBe('legacy-plan');

    const retry = await activatePendingPersonalPlanAfterPremium();
    expect(retry?.planInstanceId).toBe(pending.activationId);
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY)).not.toBeNull();
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).toBeNull();
  });

  it('does not write plan state or clear pending after the account generation changes', async () => {
    await queuePendingPersonalPlanActivation({ planId: 'gavan', minutesPerDay: 5 });
    const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    const original = getItem.getMockImplementation();
    getItem.mockImplementation(async (key) => {
      if (key === PERSONAL_PLAN_STATE_KEY) beginAccountGeneration('different-user');
      return original ? original(key) : null;
    });

    await expect(activatePendingPersonalPlanAfterPremium()).resolves.toBeNull();
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).not.toBeNull();
    getItem.mockImplementation(original ?? (async () => null));
  });

  it('never returns the previous account plan from the in-memory state cache', async () => {
    beginAccountGeneration('account-a');
    await seedGrandfatheredPlan('account-a-plan');
    expect((await readPersonalPlanState())?.planInstanceId).toBe('account-a-plan');

    beginAccountGeneration('account-b');
    await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY);

    await expect(readPersonalPlanState()).resolves.toBeNull();
  });
});
