// Модель вида теста «Не хочу с начала» (макет chapter-exam-season.html, раздел 6): точки попыток, подпись «урок n из N», плашка «ещё 2», строки итога.
import {
  answerPlacementTestV1,
  startPlacementTestV1,
} from '../modules/learning-v2/exam/placement_test_v1';
import { placementQuestionView, placementResultView, placementTryDots } from '../components/learning-v2/placement/placement_view_model';
import { placementCopy } from '../components/learning-v2/placement/placement_copy';

const run = (lessons: readonly number[], answers: readonly boolean[]) => answers.reduce((state, correct) => answerPlacementTestV1(state, correct), startPlacementTestV1(lessons));

describe('Тест «Не хочу с начала»: модель вида', () => {
  // ЗАМОК ВЛАДЕЛЬЦА 21.10: «1 вопрос на тему по порядку уроков; ошибка → ещё 2 по теме» — до ошибки одна точка, после — три
  it('точки попыток: первый вопрос — одна текущая; после ошибки — «мимо», текущая, пустая', () => {
    expect(placementTryDots([], false)).toEqual(['cur']);
    expect(placementTryDots([false], false)).toEqual(['no', 'cur', 'empty']);
    expect(placementTryDots([false, true], false)).toEqual(['no', 'ok', 'cur']);
  });

  it('вопрос: «урок n из N» и доля прогресса идут по месту темы в тесте', () => {
    const lessons = Array.from({ length: 32 }, (_, i) => i + 1);
    const view = placementQuestionView(run(lessons, [true]));
    expect(view).toMatchObject({ lessonOrdinal: 2, position: 2, total: 32, extraBanner: false, dots: ['cur'] });
    expect(view?.progress).toBeCloseTo(2 / 32, 5);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 21.10: «ошибка → ещё 2 по теме» — плашка «Ещё 2 вопроса по этой теме» только после ошибки по теме
  it('плашка «ещё 2» появляется после ошибки и уходит со сменой темы', () => {
    const afterMiss = placementQuestionView(run([1, 2, 3, 4], [true, true, true, false]));
    expect(afterMiss).toMatchObject({ lessonOrdinal: 4, extraBanner: true, dots: ['no', 'cur', 'empty'] });
    const afterSecond = placementQuestionView(run([1, 2, 3, 4, 5], [true, true, true, false, true]));
    expect(afterSecond).toMatchObject({ lessonOrdinal: 4, extraBanner: true, dots: ['no', 'ok', 'cur'] });
    const nextTopic = placementQuestionView(run([1, 2, 3, 4, 5], [true, true, true, false, true, true]));
    expect(nextTopic).toMatchObject({ lessonOrdinal: 5, extraBanner: false, dots: ['cur'] });
  });

  it('тест окончен — вида вопроса нет', () => {
    expect(placementQuestionView(run([1, 2], [true, true]))).toBeNull();
  });

  // ЗАМОК ВЛАДЕЛЬЦА 21.10: «стоп на первой незасчитанной теме»; итог «Открыто до урока N» — макет: уроки 1–3 «открыт», урок 4 «начнём здесь»
  it('итог: открытые по порядку, затем «начнём здесь»', () => {
    const result = placementResultView(run([1, 2, 3, 4, 5], [true, true, true, false, false]));
    expect(result.startLessonOrdinal).toBe(4);
    expect(result.openedLessonOrdinals).toEqual([1, 2, 3]);
    expect(result.openedRange).toBe('1–3');
    expect(result.rows).toEqual([
      { lessonOrdinal: 1, kind: 'opened' }, { lessonOrdinal: 2, kind: 'opened' }, { lessonOrdinal: 3, kind: 'opened' }, { lessonOrdinal: 4, kind: 'here' },
    ]);
  });

  it('итог: один открытый урок — диапазон без тире; провал на первой теме — открытых нет', () => {
    expect(placementResultView(run([1, 2, 3], [true, false, false])).openedRange).toBe('1');
    const none = placementResultView(run([1, 2], [false, false]));
    expect(none.openedLessonOrdinals).toEqual([]);
    expect(none.rows).toEqual([{ lessonOrdinal: 1, kind: 'here' }]);
  });

  it('итог: тест остановлен на теме без вопроса — она «начнём здесь», пройденное открыто', () => {
    const state = run([1, 2, 3], [true]);
    const result = placementResultView(state, 2);
    expect(result.startLessonOrdinal).toBe(2);
    expect(result.rows).toEqual([{ lessonOrdinal: 1, kind: 'opened' }, { lessonOrdinal: 2, kind: 'here' }]);
  });

  it('тексты: девять языков, числа подставляются, пустых нет', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(placementCopy(lang, 'progress', { n: 2, of: 32 })).toMatch(/2/);
      expect(placementCopy(lang, 'progress', { n: 2, of: 32 })).toMatch(/32/);
      expect(placementCopy(lang, 'resultBody', { range: '1–3', n: 4, title: 'T' })).toMatch(/1–3/);
      for (const key of ['introTitle', 'introBody', 'start', 'startOver', 'extra', 'opened', 'here'] as const) {
        expect(placementCopy(lang, key).length).toBeGreaterThan(3);
      }
    }
    expect(placementCopy('ru', 'extra')).toBe('Ещё 2 вопроса по этой теме');
    expect(placementCopy('ru', 'resultTitle', { n: 4 })).toBe('Открыто до урока 4');
  });
});
