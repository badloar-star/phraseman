// ЗАМОК ВЛАДЕЛЬЦА 25.10: «а вообще убери 2 доп вопроса вообще» — снимает его же замок 21.10 №10 («ошибка → ещё 2 по теме,
// засчитано при 2 из 3»). Правило теста «Не хочу с начала»: ОДИН вопрос на урок по порядку; первая ошибка — тест окончен, этот
// урок — «начнём здесь». Добора и зачёта «2 из 3» нет. Остаётся от 21.10: «входной тест БЕСПЛАТНО», «пропущенные — ПРОСТО
// ОТКРЫТЫ (не засчитаны, без звёзд)». Реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову владельца.
// Этот файл держит правила движка; бесплатность, «только открыто», флаг на итоге и выход посередине — сторожа экрана.
import fs from 'node:fs';
import path from 'node:path';
import {
  answerPlacementTestV1,
  placementCurrentLessonV1,
  placementLessonDecisionV1,
  placementTestResultV1,
  startPlacementTestV1,
} from '../modules/learning-v2/exam/placement_test_v1';

const run = (lessons: number[], answers: boolean[]) => answers.reduce(answerPlacementTestV1, startPlacementTestV1(lessons));

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: тест «Не хочу с начала» — доп. вопросов нет, стоп на первой ошибке', () => {
  it('в движке нет добора и зачёта «2 из 3»', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'modules/learning-v2/exam/placement_test_v1.ts'), 'utf8');
    expect(src).not.toMatch(/PLACEMENT_TEST_EXTRA_QUESTIONS_V1|PLACEMENT_TEST_PASS_OF_THREE_V1|placementExtraQuestionsLeftV1/u);
  });

  it('one question per lesson in order while correct', () => {
    let s = startPlacementTestV1([3, 1, 2, 2]);
    expect(s.lessons).toEqual([1, 2, 3]);
    expect(placementCurrentLessonV1(s)).toBe(1);
    s = answerPlacementTestV1(s, true);
    expect(placementCurrentLessonV1(s)).toBe(2);
  });

  it('the first wrong answer ends the test: that lesson is the start, earlier ones open', () => {
    const s = run([1, 2, 3, 4], [true, true, false]);
    expect(s.finished).toBe(true);
    expect(placementCurrentLessonV1(s)).toBeNull();
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: 3, openedLessonOrdinals: [1, 2] });
  });

  it('a single answer decides the lesson — no extra questions after a miss', () => {
    expect(placementLessonDecisionV1([])).toBeNull();
    expect(placementLessonDecisionV1([true])).toBe('credited');
    expect(placementLessonDecisionV1([false])).toBe('failed');
    expect(placementTestResultV1(run([1, 2], [false]))).toEqual({ startLessonOrdinal: 1, openedLessonOrdinals: [] });
  });

  it('all available lessons answered right → no start lesson, everything opened', () => {
    const s = run([1, 2], [true, true]);
    expect(s.finished).toBe(true);
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: null, openedLessonOrdinals: [1, 2] });
  });

  it('answers after the end change nothing; the input state is not mutated', () => {
    const s = run([1], [false]);
    expect(answerPlacementTestV1(s, true)).toBe(s);
    const fresh = startPlacementTestV1([1, 2]);
    answerPlacementTestV1(fresh, true);
    expect(fresh.index).toBe(0);
    expect(fresh.outcomes).toEqual([]);
  });
});
