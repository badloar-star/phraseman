import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markPersonalPlanTaskCompleted,
  planTaskCompletionKey,
  readCompletedPlanTasks,
} from '../app/personal_plan_progress';

jest.mock('../app/stats_daily_breakdown', () => ({
  bumpStatsDaily: jest.fn(async () => {}),
}));

describe('personal plan completed-task storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('preserves both completions when two task writes overlap', async () => {
    const planInstanceId = 'impuls_instance_1';
    const repeatTaskId = 'impuls_d035_pronunciation_repeat';
    const missingWordTaskId = 'impuls_d035_missing_word';

    await Promise.all([
      markPersonalPlanTaskCompleted({
        taskId: repeatTaskId,
        planId: 'impuls',
        planInstanceId,
        dayIndex: 35,
      }),
      markPersonalPlanTaskCompleted({
        taskId: missingWordTaskId,
        planId: 'impuls',
        planInstanceId,
        dayIndex: 35,
      }),
    ]);

    const completed = await readCompletedPlanTasks();
    expect(completed).toHaveProperty(planTaskCompletionKey(planInstanceId, repeatTaskId));
    expect(completed).toHaveProperty(planTaskCompletionKey(planInstanceId, missingWordTaskId));
  });
});
