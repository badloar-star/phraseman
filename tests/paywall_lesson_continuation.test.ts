import {
  lessonPurchaseContinuationParams,
  parseResumeLessonId,
  resumeLessonAfterPremium,
} from '../app/paywall_lesson_continuation';

describe('paywall lesson continuation', () => {
  it('allows only scalar legacy lesson ids from 1 through 32', () => {
    expect(parseResumeLessonId('1')).toBe(1);
    expect(parseResumeLessonId('17')).toBe(17);
    expect(parseResumeLessonId('32')).toBe(32);
    expect(parseResumeLessonId(['17'])).toBeNull();
    expect(parseResumeLessonId('0')).toBeNull();
    expect(parseResumeLessonId('33')).toBeNull();
    expect(parseResumeLessonId('1.5')).toBeNull();
    expect(parseResumeLessonId('/lesson_menu?id=17')).toBeNull();
  });

  it('builds an allowlisted continuation intent without an arbitrary return URL', () => {
    expect(lessonPurchaseContinuationParams(17)).toEqual({
      resume_kind: 'course_lesson',
      resume_lesson_id: '17',
    });
  });

  it('replaces the paywall with the exact blocked lesson menu after activation', () => {
    const router = { replace: jest.fn() };
    expect(resumeLessonAfterPremium(router, 17)).toBe(true);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/lesson_menu',
      params: { id: '17' },
    });
    expect(resumeLessonAfterPremium(router, null)).toBe(false);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
