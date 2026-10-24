// Жалобы 24.10 №5/№6 («занятие 3 главы 1 стабильно не готовится, проверь связь»): на медленном телефоне сборка занятия не
// укладывалась в срок подготовки, а её результат выбрасывался — следующий тап начинал сборку заново и снова не успевал.
// Сторож: повторная подготовка того же занятия ждёт уже идущую сборку, а не запускает новую.
const mockPrepare = jest.fn();
jest.mock('../app/learning_v2_course_released_session_client_v3', () => ({
  prepareCurrentLearningV2CourseSessionV3: (input: unknown) => mockPrepare(input),
  stageLearningV2CourseSessionReadyHandoffV3: () => undefined,
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `run-${++mockUuid}` }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn() } }));

import { LEARNING_V2_PREPARE_TIMEOUT_MS, prepareLearningV2SessionRunV1 } from '../app/learning_v2_session_launch_v1';

const locator = {
  environment: 'production' as const, seasonId: 'learning-v2', studyTarget: 'en', learnerSourceLocale: 'ru',
  lessonOrdinal: 1, sessionOrdinal: 3,
};

describe('learning v2 session prepare: slow build is reused, not restarted', () => {
  afterEach(() => { jest.useRealTimers(); mockPrepare.mockReset(); });

  it('a tap after the deadline waits for the same build and gets its result', async () => {
    jest.useFakeTimers();
    let finish!: (handle: unknown) => void;
    mockPrepare.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));

    const first = prepareLearningV2SessionRunV1(locator, { devUnlockedDrafts: false });
    const firstOutcome = first.then(() => 'ready', (error: Error) => error.message);
    await jest.advanceTimersByTimeAsync(LEARNING_V2_PREPARE_TIMEOUT_MS + 10);
    await expect(firstOutcome).resolves.toMatch(/^learning_v2_session_prepare_timeout/);
    expect(mockPrepare).toHaveBeenCalledTimes(1);

    const second = prepareLearningV2SessionRunV1(locator, { devUnlockedDrafts: false });
    await jest.advanceTimersByTimeAsync(1);
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    finish({ courseSessionId: 'lesson-01:session:03', sessionRunId: 'run-1' });
    await expect(second).resolves.toEqual(expect.objectContaining({ sessionRunId: 'run-1' }));

    // законченная сборка не держится: следующий запуск — новая подготовка (свой sessionRunId)
    mockPrepare.mockImplementation(() => Promise.resolve({ courseSessionId: 'lesson-01:session:03', sessionRunId: 'x' }));
    const third = prepareLearningV2SessionRunV1(locator, { devUnlockedDrafts: false });
    await jest.advanceTimersByTimeAsync(1);
    await expect(third).resolves.toEqual(expect.objectContaining({ sessionRunId: 'run-2' }));
    expect(mockPrepare).toHaveBeenCalledTimes(2);
  });
});
