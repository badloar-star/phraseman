import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ finalDelta: 6, multiplier: 1, isBonus: false })),
}));
jest.mock('../app/stats_daily_breakdown', () => ({
  bumpStatsDaily: jest.fn(async () => {}),
}));

import {
  awardPlanTaskCompletion,
  PLAN_TASK_XP,
  planTaskCompletionEventId,
} from '../app/personal_plan_xp';
import { readPlanXpLedger } from '../app/personal_plan_xp_ledger';
import { registerXP as registerXPMock } from '../app/xp_manager';
import { bumpStatsDaily as bumpStatsDailyMock } from '../app/stats_daily_breakdown';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from '../app/account_generation';

const registerXP = registerXPMock as jest.MockedFunction<typeof registerXPMock>;
const bumpStatsDaily = bumpStatsDailyMock as jest.MockedFunction<typeof bumpStatsDailyMock>;

describe('awardPlanTaskCompletion', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    beginAccountGeneration('plan-xp-account');
    registerXP.mockClear();
    bumpStatsDaily.mockClear();
  });

  it('awards plan XP (streak/leaderboard) and bumps the lifetime phrase chart', async () => {
    await AsyncStorage.setItem('user_name', 'Navigator #1234');

    await awardPlanTaskCompletion({ lang: 'uk', studyTarget: 'en', phrasesPracticed: 3 });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(registerXP).toHaveBeenCalledWith(
      PLAN_TASK_XP,
      'plan_task_complete',
      'Navigator #1234',
      'uk',
      undefined,
      expect.objectContaining({ eventId: expect.stringMatching(/^plan:/) }),
    );

    expect(bumpStatsDaily).toHaveBeenCalledTimes(1);
    expect(bumpStatsDaily).toHaveBeenCalledWith('phrases_learned', 3, 'en');
  });

  it('still awards XP when no user_name is stored', async () => {
    await awardPlanTaskCompletion({ lang: 'ru', phrasesPracticed: 1 });

    expect(registerXP).toHaveBeenCalledWith(
      PLAN_TASK_XP,
      'plan_task_complete',
      '',
      'ru',
      undefined,
      expect.objectContaining({ eventId: expect.stringMatching(/^plan:/) }),
    );
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

  it('does not double-count phrases in the plan ledger for the same completed task', async () => {
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      phrasesPracticed: 3,
      planInstanceId: 'inst_1',
      planTaskId: 'day1-task1',
    });
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      phrasesPracticed: 3,
      planInstanceId: 'inst_1',
      planTaskId: 'day1-task1',
    });

    expect(await readPlanXpLedger('inst_1')).toMatchObject({ xp: PLAN_TASK_XP, phrases: 3 });
    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(bumpStatsDaily).toHaveBeenCalledTimes(1);
  });

  it('does not collide when activation ids differ only after the old truncation boundary', () => {
    const sharedPrefix = 'personal_plan_activation:gavan:2026-08-20T12:34:56.789Z:';
    const first = planTaskCompletionEventId('en', `${sharedPrefix}account-a`, 'day1-task1');
    const second = planTaskCompletionEventId('en', `${sharedPrefix}account-b`, 'day1-task1');

    expect(first).not.toBe(second);
  });

  it('retries a transient XP failure with the same event and commits the ledger exactly once', async () => {
    registerXP
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ finalDelta: PLAN_TASK_XP, multiplier: 1, isBonus: false });
    const input = {
      lang: 'ru' as const,
      studyTarget: 'en' as const,
      phrasesPracticed: 3,
      planInstanceId: 'personal_plan_activation:gavan:stable-account-activation',
      planTaskId: 'day1-task1',
    };

    await expect(awardPlanTaskCompletion(input)).resolves.toBeUndefined();
    expect(await readPlanXpLedger(input.planInstanceId)).toMatchObject({ xp: 0, phrases: 0 });

    await expect(awardPlanTaskCompletion(input)).resolves.toBeUndefined();
    await expect(awardPlanTaskCompletion(input)).resolves.toBeUndefined();

    expect(registerXP).toHaveBeenCalledTimes(2);
    expect(registerXP.mock.calls[0]?.[5]?.eventId).toBe(registerXP.mock.calls[1]?.[5]?.eventId);
    expect(await readPlanXpLedger(input.planInstanceId)).toMatchObject({ xp: PLAN_TASK_XP, phrases: 3 });
  });

  it('does not commit an account A ledger receipt after switching to account B', async () => {
    const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    const originalGetItem = getItem.getMockImplementation();
    let releaseUserName!: () => void;
    let markUserNameRead!: () => void;
    const userNameRead = new Promise<void>((resolve) => { markUserNameRead = resolve; });
    const userNameBlocked = new Promise<void>((resolve) => { releaseUserName = resolve; });
    getItem.mockImplementation(async (key) => {
      if (key === 'user_name') {
        markUserNameRead();
        await userNameBlocked;
      }
      return originalGetItem ? originalGetItem(key) : null;
    });
    const creditedStableIds: string[] = [];
    registerXP.mockImplementationOnce(async (...args) => {
      const token = args[5]?.accountToken ?? captureAccountGeneration();
      if (isCurrentAccountGeneration(token)) creditedStableIds.push(String(token.stableId));
      return {
        finalDelta: isCurrentAccountGeneration(token) ? PLAN_TASK_XP : 0,
        multiplier: 1,
        isBonus: false,
      };
    });

    const awarding = awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      phrasesPracticed: 2,
      planInstanceId: 'account-a-plan',
      planTaskId: 'day1-task1',
    });
    await userNameRead;
    beginAccountGeneration('account-b');
    await AsyncStorage.removeItem('personal_plan_xp_ledger_v1');
    releaseUserName();
    await awarding;
    getItem.mockImplementation(originalGetItem);

    expect(registerXP.mock.calls[0]?.[5]?.accountToken?.stableId).toBe('plan-xp-account');
    expect(creditedStableIds).toEqual([]);
    expect(await AsyncStorage.getItem('personal_plan_xp_ledger_v1')).toBeNull();
    expect(bumpStatsDaily).not.toHaveBeenCalled();
  });

  it('counts the same day phrase only once across different tasks of the day (dedupe by phrase id)', async () => {
    // Задание 1 дня (напр. «вставь слово») по фразам p1,p2,p3.
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p1', 'p2', 'p3'],
      planInstanceId: 'inst_day',
      planTaskId: 'd1-missing-word',
    });
    // Задание 2 ТОГО ЖЕ дня (напр. «выбор фразы») — по ТЕМ ЖЕ фразам p1,p2,p3.
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p1', 'p2', 'p3'],
      planInstanceId: 'inst_day',
      planTaskId: 'd1-choose',
    });

    // Первое задание принесло 3 новые фразы, второе — 0 новых.
    expect(bumpStatsDaily).toHaveBeenCalledTimes(1);
    expect(bumpStatsDaily).toHaveBeenCalledWith('phrases_learned', 3, 'en');
  });

  it('counts only the newly introduced phrases when tasks partially overlap', async () => {
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p1', 'p2'],
      planInstanceId: 'inst_overlap',
      planTaskId: 't1',
    });
    // p2 уже зачтена, p3 — новая → +1.
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p2', 'p3'],
      planInstanceId: 'inst_overlap',
      planTaskId: 't2',
    });

    expect(bumpStatsDaily).toHaveBeenNthCalledWith(1, 'phrases_learned', 2, 'en');
    expect(bumpStatsDaily).toHaveBeenNthCalledWith(2, 'phrases_learned', 1, 'en');
  });

  it('keeps per-plan dedupe isolated between plan instances', async () => {
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p1', 'p2'],
      planInstanceId: 'inst_a',
      planTaskId: 'a1',
    });
    // Та же фраза p1, но ДРУГОЙ план — должна засчитаться заново.
    await awardPlanTaskCompletion({
      lang: 'ru',
      studyTarget: 'en',
      practicedPhraseIds: ['p1'],
      planInstanceId: 'inst_b',
      planTaskId: 'b1',
    });

    expect(bumpStatsDaily).toHaveBeenNthCalledWith(1, 'phrases_learned', 2, 'en');
    expect(bumpStatsDaily).toHaveBeenNthCalledWith(2, 'phrases_learned', 1, 'en');
  });
});
