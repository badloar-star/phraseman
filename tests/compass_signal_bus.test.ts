import { applyRemoteConfigSnapshot, __resetRemoteFlagsForTest } from '../app/remote_flags';

jest.mock('../app/mistake_log', () => ({
  getTopMistakePhraseDetails: jest.fn(async () => [{ phrase: 'x' }]),
  getMistakeCountByLesson: jest.fn(async () => ({ 3: 5 })),
}));
jest.mock('../app/trainer_store', () => ({
  getTrainerDashboard: jest.fn(async () => ({ totalDue: 4 })),
}));
jest.mock('../app/pos_workout_engine', () => ({
  getPosMasterySnapshot: jest.fn(async () => [{ category: 'verb', level: 2 }]),
}));
jest.mock('../app/personal_plan_state', () => ({
  readPersonalPlanSnapshot: jest.fn(async () => ({ dayIndex: 12 })),
}));
jest.mock('../app/plan_day_lesson_recommendation', () => ({
  readPassedLessonIds: jest.fn(async () => [1, 2, 3]),
}));

import { collectCompassSnapshot } from '../app/compass/signal_bus';
import { getTopMistakePhraseDetails } from '../app/mistake_log';
import { getTrainerDashboard } from '../app/trainer_store';

describe('compass signal_bus — isolation + aggregation', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
    jest.clearAllMocks();
  });

  it('Компас выключен → null и НИ ОДНОГО чтения источников', async () => {
    const snap = await collectCompassSnapshot('en', 1000);
    expect(snap).toBeNull();
    expect(getTopMistakePhraseDetails).not.toHaveBeenCalled();
    expect(getTrainerDashboard).not.toHaveBeenCalled();
  });

  it('Компас включён → собирает снимок из всех источников', async () => {
    applyRemoteConfigSnapshot({ bools: { compass_enabled: true } });
    const snap = await collectCompassSnapshot('en', 4242);
    expect(snap).not.toBeNull();
    expect(snap!.collectedAtMs).toBe(4242);
    expect(snap!.mistakes).toHaveLength(1);
    expect(snap!.mistakesByLesson).toEqual({ 3: 5 });
    expect(snap!.trainer).toEqual({ totalDue: 4 });
    expect(snap!.posMastery).toHaveLength(1);
    expect(snap!.planDay).toEqual({ dayIndex: 12 });
    expect(snap!.passedLessons).toEqual([1, 2, 3]);
  });

  it('сбой одного источника не валит снимок (safe fallback)', async () => {
    applyRemoteConfigSnapshot({ bools: { compass_enabled: true } });
    (getTrainerDashboard as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const snap = await collectCompassSnapshot('en', 1);
    expect(snap).not.toBeNull();
    expect(snap!.trainer).toBeNull(); // упавший источник → дефолт
    expect(snap!.mistakes).toHaveLength(1); // остальные целы
  });
});
