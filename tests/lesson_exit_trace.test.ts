// зачем (§126): запись [LESSON-EXIT] обязана показывать причину и значения, а сбой отправки не должен ронять выход с урока.
const mockTrackActivity = jest.fn();
jest.mock('../app/app_activity', () => ({ trackActivity: (...args: unknown[]) => mockTrackActivity(...args) }));

import { formatLessonExitTrace, traceLessonExit } from '../app/lesson_exit_trace';

describe('lesson exit trace', () => {
  beforeEach(() => {
    mockTrackActivity.mockReset();
    mockTrackActivity.mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('formats reason and every value that decided the branch', () => {
    expect(formatLessonExitTrace('navigateUp:enter', { lessonId: 9, from: 'lesson_menu', canGoBack: false }))
      .toBe('[LESSON-EXIT] navigateUp:enter lessonId=9 from=lesson_menu canGoBack=false');
  });

  it('writes to console and to activity with the reason in tags', () => {
    traceLessonExit('unmount', { lessonId: 9, cellIndex: 4, exitInFlight: false });
    expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] unmount lessonId=9 cellIndex=4 exitInFlight=false');
    expect(mockTrackActivity).toHaveBeenCalledWith('lesson:exit_trace', expect.objectContaining({
      screen: 'lesson1',
      writeToFirestore: true,
      tags: { reason: 'unmount', lessonId: 9, cellIndex: 4, exitInFlight: false },
    }));
  });

  it('a failing activity write is logged and never throws', async () => {
    mockTrackActivity.mockRejectedValueOnce(new Error('offline'));
    expect(() => traceLessonExit('headerBack:exit', { lessonId: 1 })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] trackActivity:catch', 'offline');
  });
});
