// ЗАМОК ВЛАДЕЛЬЦА 25.10: «а вообще убери 2 доп вопроса вообще» — снимает его же замок 21.10 №10 («ошибка → ещё 2 по теме,
// засчитано при 2 из 3»): добора ПОСЛЕ ОШИБКИ и зачёта «2 из 3» нет, первая ошибка — тест окончен, этот урок — «начнём здесь».
// ЗАМОК ВЛАДЕЛЬЦА 28.10 (кнопки через координатора): «вопросов может быть больше, может быть и 20 и т.д., но максимум открывать можно
// до 10 урока. Все предыдущие уроки не считаются пройденными, но при этом их можно открыть и пройти». По смыслу (координатор 28.10):
// по ДВА вопроса на урок 1–9 (до 18), урок освоен только при обоих верных; старт — не дальше урока 10.
// Остаётся от 21.10: «входной тест БЕСПЛАТНО», «пропущенные — ПРОСТО ОТКРЫТЫ (не засчитаны, без звёзд)». Реестр docs/work/OWNER_LOCKS.md.
// Ослабить — только по новому слову владельца. Этот файл держит правила движка; бесплатность, «только открыто», флаг на итоге и выход
// посередине — сторожа экрана.
import fs from 'node:fs';
import path from 'node:path';
import {
  PLACEMENT_QUESTIONS_PER_LESSON_V1,
  PLACEMENT_START_CAP_LESSON_V1,
  answerPlacementTestV1,
  placementCurrentLessonV1,
  placementLessonDecisionV1,
  placementTestResultV1,
  startPlacementTestV1,
} from '../modules/learning-v2/exam/placement_test_v1';

const run = (lessons: number[], answers: boolean[]) => answers.reduce(answerPlacementTestV1, startPlacementTestV1(lessons));
const right = (n: number) => Array.from({ length: n }, () => true);

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: добора после ошибки нет, стоп на первой ошибке', () => {
  it('в движке нет добора и зачёта «2 из 3»', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'modules/learning-v2/exam/placement_test_v1.ts'), 'utf8');
    expect(src).not.toMatch(/PLACEMENT_TEST_EXTRA_QUESTIONS_V1|PLACEMENT_TEST_PASS_OF_THREE_V1|placementExtraQuestionsLeftV1/u);
  });

  it('the first wrong answer ends the test at once: that lesson is the start, earlier ones open', () => {
    const s = run([1, 2, 3, 4], [...right(4), false]);
    expect(s.finished).toBe(true);
    expect(placementCurrentLessonV1(s)).toBeNull();
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: 3, openedLessonOrdinals: [1, 2] });
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

describe('ЗАМОК ВЛАДЕЛЬЦА 28.10: два вопроса на урок, урок освоен только при обоих верных', () => {
  it('два вопроса на урок', () => {
    expect(PLACEMENT_QUESTIONS_PER_LESSON_V1).toBe(2);
  });

  it('одна верная — урок ещё не решён, следующий вопрос того же урока', () => {
    let s = startPlacementTestV1([3, 1, 2, 2]);
    expect(s.lessons).toEqual([1, 2, 3]);
    s = answerPlacementTestV1(s, true);
    expect(placementCurrentLessonV1(s)).toBe(1);
    expect(s.attempts).toEqual([true]);
    s = answerPlacementTestV1(s, true);
    expect(placementCurrentLessonV1(s)).toBe(2);
    expect(s.attempts).toEqual([]);
  });

  it('решение по уроку: ошибка сразу — не освоен; два верных — освоен; одна верная — ждём', () => {
    expect(placementLessonDecisionV1([])).toBeNull();
    expect(placementLessonDecisionV1([true])).toBeNull();
    expect(placementLessonDecisionV1([false])).toBe('failed');
    expect(placementLessonDecisionV1([true, false])).toBe('failed');
    expect(placementLessonDecisionV1([true, true])).toBe('credited');
  });

  it('ошибка на втором вопросе урока — урок не освоен, он и есть старт', () => {
    expect(placementTestResultV1(run([1, 2, 3], [true, true, true, false]))).toEqual({ startLessonOrdinal: 2, openedLessonOrdinals: [1] });
    expect(placementTestResultV1(run([1, 2], [false]))).toEqual({ startLessonOrdinal: 1, openedLessonOrdinals: [] });
  });

  it('все доступные уроки освоены → стартового урока в итоге нет, всё открыто', () => {
    const s = run([1, 2], right(4));
    expect(s.finished).toBe(true);
    expect(placementTestResultV1(s)).toEqual({ startLessonOrdinal: null, openedLessonOrdinals: [1, 2] });
  });
});

describe('ЗАМОК ВЛАДЕЛЬЦА 28.10: тест «Не хочу с начала» — старт не дальше урока 10', () => {
  const lessons1to22 = Array.from({ length: 22 }, (_x, i) => i + 1);

  it('потолок — урок 10', () => {
    expect(PLACEMENT_START_CAP_LESSON_V1).toBe(10);
  });

  it('вопросы только по урокам 1–9: дальше ответ уже ничего не меняет', () => {
    expect(startPlacementTestV1(lessons1to22).lessons).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('все верно → 18 вопросов, открыты уроки 1–9 (не засчитаны), старт — урок 10, а не 23', () => {
    const s = run(lessons1to22, right(18));
    expect(s.finished).toBe(true);
    expect(s.outcomes.every((o) => o.attempts.length === 2)).toBe(true);
    const result = placementTestResultV1(s);
    expect(result.openedLessonOrdinals).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Math.max(...result.openedLessonOrdinals) + 1).toBe(10); // apply ставит старт на следующий урок
  });

  it('ошибка до потолка — старт на уроке ошибки', () => {
    expect(placementTestResultV1(run(lessons1to22, [...right(6), true, false]))).toEqual({ startLessonOrdinal: 4, openedLessonOrdinals: [1, 2, 3] });
  });
});
