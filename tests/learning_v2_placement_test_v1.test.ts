// ЗАМОК ВЛАДЕЛЬЦА 21.10 (№10, docs/work/OWNER_DECISIONS_2026-10-21.md стр. 85–91): «1 вопрос на тему по порядку уроков;
// ошибка → ещё 2 по теме, засчитано при 2 из 3; стоп на первой незасчитанной теме»; «входной тест БЕСПЛАТНО»; «пропущенные —
// ПРОСТО ОТКРЫТЫ (не засчитаны пройденными, без звёзд)». Реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову
// владельца. Этот файл держит правила движка; бесплатность, «только открыто», флаг на итоге и выход посередине — сторожа экрана.
import { PLACEMENT_TEST_EXTRA_QUESTIONS_V1, PLACEMENT_TEST_PASS_OF_THREE_V1 } from '../modules/learning-v2/exam/placement_test_v1';
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
  it('ЗАМОК ВЛАДЕЛЬЦА: после промаха ровно +2 вопроса, зачёт при 2 из 3', () => {
    expect(PLACEMENT_TEST_EXTRA_QUESTIONS_V1).toBe(2);
    expect(PLACEMENT_TEST_PASS_OF_THREE_V1).toBe(2);
  });

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
