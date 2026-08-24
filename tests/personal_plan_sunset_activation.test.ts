import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration } from '../app/account_generation';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_PENDING_ACTIVATION_KEY,
  queuePendingPersonalPlanActivation,
} from '../app/personal_plan_activation';
import {
  activatePersonalPlan,
  createDefaultPersonalPlanState,
  invalidatePersonalPlanStateCache,
  readAnyPersonalPlanState,
  savePersonalPlanState,
  withPersonalPlanStateStorageLock,
} from '../app/personal_plan_state';
import { resolvePersonalPlanSunsetAccess } from '../app/personal_plan_sunset';

describe('Personal Plan sunset activation boundary', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));
    await AsyncStorage.clear();
    beginAccountGeneration('personal-plan-sunset-activation-user');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a pending activation never grants grandfather eligibility by itself', async () => {
    await queuePendingPersonalPlanActivation({ planId: 'gavan', minutesPerDay: 5 });

    await expect(activatePendingPersonalPlanAfterPremium()).resolves.toBeNull();
    await expect(AsyncStorage.getItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY)).resolves.toBeNull();
    await expect(readAnyPersonalPlanState()).resolves.toBeNull();
  });

  test.each([undefined, 'bogus'])('storage rejects a missing or invalid status: %s', async (status) => {
    await AsyncStorage.setItem('personal_plan_state_v1', JSON.stringify({
      id: 'invalid-status',
      planInstanceId: 'invalid-status',
      planId: 'gavan',
      ...(status === undefined ? {} : { status }),
      minutesPerDay: 5,
      currentDayIndex: 1,
      createdAt: '2026-08-20T12:00:00.000Z',
    }));
    invalidatePersonalPlanStateCache();

    await expect(readAnyPersonalPlanState()).resolves.toBeNull();
  });

  test('storage normalization does not invent a grandfather timestamp', async () => {
    await AsyncStorage.setItem('personal_plan_state_v1', JSON.stringify({
      id: 'legacy-without-created-at',
      planInstanceId: 'legacy-without-created-at',
      planId: 'gavan',
      status: 'active',
      minutesPerDay: 5,
      currentDayIndex: 1,
    }));
    invalidatePersonalPlanStateCache();

    const savedState = await readAnyPersonalPlanState();

    expect(resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: true,
      savedState,
      nowMs: Date.parse('2026-08-20T12:00:00.000Z'),
    }).status).toBe('not_grandfathered');
  });

  test('direct activation fails closed when the account has no eligible saved plan', async () => {
    await expect(activatePersonalPlan({ planId: 'gavan', minutesPerDay: 5 }))
      .rejects.toThrow('personal_plan_sunset_not_grandfathered');
    await expect(readAnyPersonalPlanState()).resolves.toBeNull();
  });

  test('changing an eligible plan preserves its original grandfather lineage', async () => {
    const original = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 5 });
    await savePersonalPlanState(original);
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));

    const changed = await activatePersonalPlan({ planId: 'voyazh', minutesPerDay: 10 });

    expect(changed.planId).toBe('voyazh');
    expect(changed.createdAt).toBe(original.createdAt);
    expect((await readAnyPersonalPlanState())?.createdAt).toBe(original.createdAt);
  });

  test('re-checks the deadline immediately before replacing an eligible plan', async () => {
    const original = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 5 });
    await savePersonalPlanState(original);
    jest.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));

    await expect(activatePersonalPlan({ planId: 'voyazh', minutesPerDay: 10 }))
      .rejects.toThrow('personal_plan_sunset_expired');
    expect((await readAnyPersonalPlanState())?.planId).toBe('gavan');
  });

  test('cannot cross the deadline while waiting behind the state storage queue', async () => {
    const original = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 5 });
    await savePersonalPlanState(original);
    jest.setSystemTime(new Date('2026-10-19T23:59:59.900Z'));

    let releaseQueue: (() => void) | undefined;
    let markQueueEntered: (() => void) | undefined;
    const queueEntered = new Promise<void>((resolve) => { markQueueEntered = resolve; });
    const blocker = new Promise<void>((resolve) => { releaseQueue = resolve; });
    const held = withPersonalPlanStateStorageLock(async () => {
      markQueueEntered?.();
      await blocker;
    });
    await queueEntered;

    const activation = activatePersonalPlan({ planId: 'voyazh', minutesPerDay: 10 });
    await Promise.resolve();
    await Promise.resolve();
    jest.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));
    releaseQueue?.();
    await held;

    await expect(activation).rejects.toThrow('personal_plan_sunset_expired');
    expect((await readAnyPersonalPlanState())?.planId).toBe('gavan');
  });
});
