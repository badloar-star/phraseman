import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/shards_system', () => ({
  addShards: jest.fn(async () => 2),
}));

import {
  awardPlanDayCompletionReward,
  planDayRewardAlreadyGranted,
} from '../app/personal_plan_day_reward';
import { addShards as addShardsMock } from '../app/shards_system';

const addShards = addShardsMock as jest.MockedFunction<typeof addShardsMock>;

describe('plan day completion reward', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    addShards.mockClear();
  });

  it('awards shards once for a plan day', async () => {
    const first = await awardPlanDayCompletionReward('inst_1', 1);
    expect(first.awarded).toBe(true);
    expect(first.shards).toBe(2);
    expect(addShards).toHaveBeenCalledWith('plan_day_complete');
  });

  it('does not award the same plan day twice', async () => {
    await awardPlanDayCompletionReward('inst_1', 1);
    addShards.mockClear();
    const second = await awardPlanDayCompletionReward('inst_1', 1);
    expect(second.awarded).toBe(false);
    expect(second.shards).toBe(0);
    expect(addShards).not.toHaveBeenCalled();
  });

  it('treats different days and instances independently', async () => {
    await awardPlanDayCompletionReward('inst_1', 1);
    expect((await awardPlanDayCompletionReward('inst_1', 2)).awarded).toBe(true);
    expect((await awardPlanDayCompletionReward('inst_2', 1)).awarded).toBe(true);
  });

  it('reports whether a day was already granted', async () => {
    expect(await planDayRewardAlreadyGranted('inst_1', 1)).toBe(false);
    await awardPlanDayCompletionReward('inst_1', 1);
    expect(await planDayRewardAlreadyGranted('inst_1', 1)).toBe(true);
  });

  it('ignores invalid input', async () => {
    expect((await awardPlanDayCompletionReward('', 1)).awarded).toBe(false);
    expect((await awardPlanDayCompletionReward('inst_1', 0)).awarded).toBe(false);
    expect(addShards).not.toHaveBeenCalled();
  });
});
