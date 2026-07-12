import { beginSurveyDailyTaskRequest, commitSurveyDailyTaskRequest, peekSurveyDailyTask, resetSurveyDailyTaskCacheForTests } from '../app/survey_daily_task_cache';

const scope = { stableId: 'a', dayKey: '2026-07-11', lang: 'ru' } as const;
const active = { surveyId: 's', title: 't', description: 'd', questionCount: 1, rewardShards: 2, phase: 'active', survey: { surveyId: 's' } as any } as const;
const completed = { ...active, phase: 'completed', survey: null } as const;

beforeEach(resetSurveyDailyTaskCacheForTests);

it('offers synchronous peek and expires after 60 seconds', () => {
  const request = beginSurveyDailyTaskRequest(scope, 1000);
  expect(commitSurveyDailyTaskRequest(scope, request, active, 1000)).toBe(true);
  expect(peekSurveyDailyTask(scope, 60_999)).toEqual(active);
  expect(peekSurveyDailyTask(scope, 61_001)).toBeNull();
});

it('scopes entries by language, account, and captured day', () => {
  const request = beginSurveyDailyTaskRequest(scope, 0);
  commitSurveyDailyTaskRequest(scope, request, active, 0);
  expect(peekSurveyDailyTask({ ...scope, lang: 'uk' }, 1)).toBeNull();
  expect(peekSurveyDailyTask({ ...scope, stableId: 'b' }, 1)).toBeNull();
  expect(peekSurveyDailyTask({ ...scope, dayKey: '2026-07-12' }, 1)).toBeNull();
});

it('keeps at most four newest scopes', () => {
  for (let i = 0; i < 5; i += 1) {
    const s = { ...scope, dayKey: `day-${i}` };
    commitSurveyDailyTaskRequest(s, beginSurveyDailyTaskRequest(s, i), active, i);
  }
  expect(peekSurveyDailyTask({ ...scope, dayKey: 'day-0' }, 5)).toBeNull();
  expect(peekSurveyDailyTask({ ...scope, dayKey: 'day-4' }, 5)).toEqual(active);
});

it('rejects stale requests and completed-to-null regression', () => {
  const first = beginSurveyDailyTaskRequest(scope, 0);
  const latest = beginSurveyDailyTaskRequest(scope, 1);
  expect(commitSurveyDailyTaskRequest(scope, first, active, 2)).toBe(false);
  expect(commitSurveyDailyTaskRequest(scope, latest, completed, 2)).toBe(true);
  const next = beginSurveyDailyTaskRequest(scope, 3);
  expect(commitSurveyDailyTaskRequest(scope, next, null, 3)).toBe(false);
  expect(peekSurveyDailyTask(scope, 3)).toEqual(completed);
});

it('retains a warm snapshot during a pending or failed quiet revalidation', () => {
  commitSurveyDailyTaskRequest(scope, beginSurveyDailyTaskRequest(scope, 0), active, 0);
  beginSurveyDailyTaskRequest(scope, 1);
  expect(peekSurveyDailyTask(scope, 59_999)).toEqual(active);
});
