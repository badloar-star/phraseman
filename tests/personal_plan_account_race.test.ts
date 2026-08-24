import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration } from '../app/account_generation';
import {
  clearPersonalPlanState,
  completePersonalPlan,
  createDefaultPersonalPlanState,
  getCachedPersonalPlanState,
  PERSONAL_PLAN_STATE_KEY,
  savePersonalPlanState,
} from '../app/personal_plan_state';

describe('personal plan disk ownership across account transitions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    beginAccountGeneration('account-a');
  });

  it('cannot let a delayed account A save overwrite account B', async () => {
    const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
    const original = setItem.getMockImplementation();
    let releaseA!: () => void;
    let markAStarted!: () => void;
    const aStarted = new Promise<void>((resolve) => { markAStarted = resolve; });
    const aBlocked = new Promise<void>((resolve) => { releaseA = resolve; });
    setItem.mockImplementation(async (key, value) => {
      if (key === PERSONAL_PLAN_STATE_KEY && String(value).includes('account-a-plan')) {
        markAStarted();
        await aBlocked;
      }
      if (original) await original(key, value);
    });

    const saveA = savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 5, planInstanceId: 'account-a-plan',
    }));
    await aStarted;
    beginAccountGeneration('account-b');
    const saveB = savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 10, planInstanceId: 'account-b-plan',
    }));
    releaseA();
    await Promise.all([saveA, saveB]);

    expect(JSON.parse(String(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY))).planInstanceId)
      .toBe('account-b-plan');
  });

  it('cannot let a delayed account A clear delete account B state', async () => {
    await savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 5, planInstanceId: 'account-a-plan',
    }));
    const removeItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
    const original = removeItem.getMockImplementation();
    let releaseA!: () => void;
    let markAStarted!: () => void;
    const aStarted = new Promise<void>((resolve) => { markAStarted = resolve; });
    const aBlocked = new Promise<void>((resolve) => { releaseA = resolve; });
    removeItem.mockImplementation(async (key) => {
      if (key === PERSONAL_PLAN_STATE_KEY) {
        markAStarted();
        await aBlocked;
      }
      if (original) await original(key);
    });

    const clearA = clearPersonalPlanState();
    await aStarted;
    beginAccountGeneration('account-b');
    const saveB = savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 10, planInstanceId: 'account-b-plan',
    }));
    releaseA();
    await Promise.all([clearA, saveB]);

    expect(JSON.parse(String(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY))).planInstanceId)
      .toBe('account-b-plan');
  });

  it('cannot let delayed account A completion overwrite account B state', async () => {
    await savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 5, planInstanceId: 'account-a-plan',
    }));
    const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
    const original = setItem.getMockImplementation();
    let releaseA!: () => void;
    let markAStarted!: () => void;
    const aStarted = new Promise<void>((resolve) => { markAStarted = resolve; });
    const aBlocked = new Promise<void>((resolve) => { releaseA = resolve; });
    setItem.mockImplementation(async (key, value) => {
      if (key === PERSONAL_PLAN_STATE_KEY && String(value).includes('"status":"completed"')) {
        markAStarted();
        await aBlocked;
      }
      if (original) await original(key, value);
    });

    const completeA = completePersonalPlan();
    await aStarted;
    beginAccountGeneration('account-b');
    const saveB = savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 10, planInstanceId: 'account-b-plan',
    }));
    releaseA();
    await Promise.all([completeA, saveB]);

    expect(JSON.parse(String(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY))).planInstanceId)
      .toBe('account-b-plan');
  });

  it('invalidates the state cache when clear persistence fails', async () => {
    await savePersonalPlanState(createDefaultPersonalPlanState({
      planId: 'gavan', minutesPerDay: 5, planInstanceId: 'account-a-plan',
    }));
    expect(getCachedPersonalPlanState()?.planInstanceId).toBe('account-a-plan');
    const removeItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
    removeItem.mockRejectedValueOnce(new Error('disk_full'));

    await expect(clearPersonalPlanState()).rejects.toThrow('disk_full');

    expect(getCachedPersonalPlanState()).toBeUndefined();
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY)).not.toBeNull();
  });
});
