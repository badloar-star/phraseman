import AsyncStorage from '@react-native-async-storage/async-storage';

import { bumpPlanXpLedger, readPlanXpLedger } from '../app/personal_plan_xp_ledger';

describe('personal plan xp ledger', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns zeros for an unknown plan instance', async () => {
    expect(await readPlanXpLedger('nope')).toEqual({ xp: 0, phrases: 0 });
  });

  it('accumulates xp and phrases across tasks', async () => {
    await bumpPlanXpLedger('inst_1', 6, 3);
    await bumpPlanXpLedger('inst_1', 6, 2);
    expect(await readPlanXpLedger('inst_1')).toEqual({ xp: 12, phrases: 5 });
  });

  it('does not count the same plan task twice when a task id is provided', async () => {
    await expect(bumpPlanXpLedger('inst_1', 6, 3, 'day1-task1')).resolves.toBe(true);
    await expect(bumpPlanXpLedger('inst_1', 6, 3, 'day1-task1')).resolves.toBe(false);

    expect(await readPlanXpLedger('inst_1')).toMatchObject({ xp: 6, phrases: 3 });
  });

  it('keeps instances independent', async () => {
    await bumpPlanXpLedger('inst_1', 6, 1);
    await bumpPlanXpLedger('inst_2', 12, 4);
    expect(await readPlanXpLedger('inst_1')).toEqual({ xp: 6, phrases: 1 });
    expect(await readPlanXpLedger('inst_2')).toEqual({ xp: 12, phrases: 4 });
  });

  it('ignores empty instance id and negative values', async () => {
    await bumpPlanXpLedger('', 6, 1);
    await bumpPlanXpLedger('inst_1', -5, -2);
    expect(await readPlanXpLedger('inst_1')).toEqual({ xp: 0, phrases: 0 });
  });
});
