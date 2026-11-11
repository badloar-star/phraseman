const mockEmit = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));

import { LESSON_PREP_STUCK_RESET_MS, beginLessonPrep, endLessonPrep, isLessonPrepActive, markLessonPrepFinishing, peekLessonPrep, resetLessonPrepForTests } from '../app/lesson_prep_store';

beforeEach(() => {
  mockEmit.mockReset();
  resetLessonPrepForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

describe('хранилище подготовки', () => {
  it('второй begin при идущей подготовке отказывает; end снимает; end без begin безвреден', () => {
    expect(beginLessonPrep('home', 1000)).toBe(true);
    expect(isLessonPrepActive()).toBe(true);
    expect(beginLessonPrep('lessons', 1100)).toBe(false);
    expect(peekLessonPrep()).toMatchObject({ source: 'home', startedAt: 1000, finishing: false });
    markLessonPrepFinishing();
    expect(peekLessonPrep()?.finishing).toBe(true);
    expect(endLessonPrep({ ok: true }, 1200)).toBe('instant');
    expect(isLessonPrepActive()).toBe(false);
    expect(endLessonPrep({ ok: true })).toBeNull();
  });
  // Ревизор 25.10: бросок между beginLessonPrep и try больше не оставляет «готовится» навсегда
  it('зависшая подготовка сбрасывается сторожем через 20 с с журналом; законченная — не трогается', () => {
    jest.useFakeTimers();
    try {
      beginLessonPrep('lessons', Date.now(), 'lesson-1:session:9');
      jest.advanceTimersByTime(LESSON_PREP_STUCK_RESET_MS - 1);
      expect(isLessonPrepActive()).toBe(true);
      jest.advanceTimersByTime(2);
      expect(isLessonPrepActive()).toBe(false);
      expect((console.warn as jest.Mock).mock.calls.some((c) => String(c[0]).includes('prep_state_stuck_reset') && String(c[1]).includes('lesson-1:session:9'))).toBe(true);
      beginLessonPrep('home', Date.now());
      endLessonPrep({ ok: true });
      beginLessonPrep('home', Date.now());
      jest.advanceTimersByTime(LESSON_PREP_STUCK_RESET_MS - 100);
      expect(isLessonPrepActive()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
  it('итог по времени и сроку', () => {
    beginLessonPrep('home', 0);
    expect(endLessonPrep({ ok: false, timedOut: true }, 12_000)).toBe('timeout');
    beginLessonPrep('home', 0);
    expect(endLessonPrep({ ok: true }, 8000)).toBe('prepared_after_still');
  });
});
