// Сторож движка входного теста (владелец 21.10, №10): 1 вопрос на тему по порядку; ошибка → ещё 2; засчитано при 2 из 3;
// стоп на первой незасчитанной; итог — урок N, уроки до него просто открыты.
import {
  answerPlacementTestV1,
  placementCurrentLessonV1,
  placementExtraQuestionsLeftV1,
  placementLessonDecisionV1,
  placementTestResultV1,
  startPlacementTestV1,
} from '../modules/learning-v2/exam/placement_test_v1';

const run = (lessons: number[], answers: boolean[]) => answers.reduce(answerPlacementTestV1, startPlacementTestV1(lessons));

describe('placement test engine', () => {
  it('one question per lesson in order while correct', () => {
    let s = startPlacementTestV1([3, 1, 2, 2]);
    expect(s.lessons).toEqual([1, 2, 3]);
    expect(placementCurrentLessonV1(s)).toBe(1);
    s = answerPlacementTestV1(s, true);
    expect(placementCurrentLessonV1(s)).toBe(2);
  });

  it('a wrong answer asks 2 more on the same topic; 2 of 3 credits the topic', () => {
    let s = run([1, 2], [false]);
    expect(placementCurrentLessonV1(s)).toBe(1);
    expect(placementExtraQuestionsLeftV1(s)).toBe(2);
    s = answerPlacementTestV1(s, true);
    expect(placementExtraQuestionsLeftV1(s)).toBe(1);
    s = answerPlacementTestV1(s, true);
    expect(placementCurrentLessonV1(s)).toBe(2);
    expect(s.outcomes[0]).toMatchObject({ lessonOrdinal: 1, outcome: 'credited', attempts: [false, true, true] });
  });

  it('stops on the first topic that is not credited; earlier topics open, that lesson is the start', () => {
    const s = run([1, 2, 3, 4], [true, true, false, true, false]);
    expect(s.finished).toBe(true);
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: 3, openedLessonOrdinals: [1, 2] });
  });

  it('two wrong answers in a row end the topic early (2 of 3 is out of reach)', () => {
    expect(placementLessonDecisionV1([false, false])).toBe('failed');
    expect(placementLessonDecisionV1([false, true])).toBeNull();
    expect(placementLessonDecisionV1([false, true, false])).toBe('failed');
    expect(placementTestResultV1(run([1, 2], [false, false]))).toEqual({ startLessonOrdinal: 1, openedLessonOrdinals: [] });
  });

  it('all available lessons credited → no start lesson, everything opened', () => {
    const s = run([1, 2], [true, true]);
    expect(s.finished).toBe(true);
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: null, openedLessonOrdinals: [1, 2] });
  });

  it('answers after the end change nothing; the input state is not mutated', () => {
    const s = run([1], [false, false]);
    expect(answerPlacementTestV1(s, true)).toBe(s);
    const fresh = startPlacementTestV1([1, 2]);
    answerPlacementTestV1(fresh, true);
    expect(fresh.index).toBe(0);
    expect(fresh.outcomes).toEqual([]);
  });
});
