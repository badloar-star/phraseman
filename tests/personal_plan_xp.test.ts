import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 6, multiplier: 1, isBonus: false })),
}));
jest.mock('../app/stats_daily_breakdown', () => ({
  bumpStatsDaily: jest.fn(async () => {}),
}));

import { awardPlanTaskCompletion, PLAN_TASK_XP } from '../app/personal_plan_xp';
import { registerXP as registerXPMock } from '../app/xp_manager';
import { bumpStatsDaily as bumpStatsDailyMock } from '../app/stats_daily_breakdown';

const registerXP = registerXPMock as jest.MockedFunction<typeof registerXPMock>;
const bumpStatsDaily = bumpStatsDailyMock as jest.MockedFunction<typeof bumpStatsDailyMock>;

describe('awardPlanTaskCompletion', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    registerXP.mockClear();
    bumpStatsDaily.mockClear();
  });

  it('awards plan XP (streak/leaderboard) and bumps the lifetime phrase chart', async () => {
    await AsyncStorage.setItem('user_name', 'Navigator #1234');

    await awardPlanTaskCompletion({ lang: 'uk', studyTarget: 'en', phrasesPracticed: 3 });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(registerXP).toHaveBeenCalledWith(PLAN_TASK_XP, 'plan_task_complete', 'Navigator #1234', 'uk');

    expect(bumpStatsDaily).toHaveBeenCalledTimes(1);
    expect(bumpStatsDaily).toHaveBeenCalledWith('phrases_learned', 3, 'en');
  });

  it('still awards XP when no user_name is stored', async () => {
    await awardPlanTaskCompletion({ lang: 'ru', phrasesPracticed: 1 });

    expect(registerXP).toHaveBeenCalledWith(PLAN_TASK_XP, 'plan_task_complete', '', 'ru');
    expect(bumpStatsDaily).toHaveBeenCalledWith('phrases_learned', 1, undefined);
  });

  it('does not bump the phrase chart when nothing was practiced', async () => {
    await awardPlanTaskCompletion({ lang: 'ru', phrasesPracticed: 0 });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(bumpStatsDaily).not.toHaveBeenCalled();
  });

  it('never throws even if XP registration fails', async () => {
    registerXP.mockRejectedValueOnce(new Error('network'));

    await expect(
      awardPlanTaskCompletion({ lang: 'ru', studyTarget: 'en', phrasesPracticed: 2 }),
    ).resolves.toBeUndefined();

    // lifetime chart still gets bumped even though XP failed
    expect(bumpStatsDaily).toHaveBeenCalledWith('phrases_learned', 2, 'en');
  });
});
