// Модель вида теста «Не хочу с начала» (макет chapter-exam-season.html, раздел 6): подпись «урок n из N», строки итога.
// ЗАМОК ВЛАДЕЛЬЦА 25.10 «убери 2 доп вопроса вообще»: один вопрос на урок — точек попыток и плашки «ещё 2» в модели нет.
import {
  answerPlacementTestV1,
  startPlacementTestV1,
} from '../modules/learning-v2/exam/placement_test_v1';
import { placementQuestionView, placementResultView } from '../components/learning-v2/placement/placement_view_model';
import { placementCopy } from '../components/learning-v2/placement/placement_copy';

const run = (lessons: readonly number[], answers: readonly boolean[]) => answers.reduce((state, correct) => answerPlacementTestV1(state, correct), startPlacementTestV1(lessons));

describe('Тест «Не хочу с начала»: модель вида', () => {
  it('ЗАМОК ВЛАДЕЛЬЦА 25.10: в виде вопроса нет точек попыток и плашки «ещё вопросы»', () => {
    const view = placementQuestionView(run([1, 2, 3], [true]));
    expect(view).not.toBeNull();
    expect(Object.keys(view ?? {}).sort()).toEqual(['lessonOrdinal', 'position', 'progress', 'total']);
  });

  it('вопрос: «урок n из N» и доля прогресса идут по месту темы в тесте', () => {
    const lessons = Array.from({ length: 32 }, (_, i) => i + 1);
    const view = placementQuestionView(run(lessons, [true]));
    expect(view).toMatchObject({ lessonOrdinal: 2, position: 2, total: 32 });
    expect(view?.progress).toBeCloseTo(2 / 32, 5);
  });

  it('первая ошибка заканчивает тест — следующего вопроса нет', () => {
    expect(placementQuestionView(run([1, 2, 3, 4], [true, true, true, false]))).toBeNull();
  });

  it('тест окончен — вида вопроса нет', () => {
    expect(placementQuestionView(run([1, 2], [true, true]))).toBeNull();
  });

  // ЗАМОК ВЛАДЕЛЬЦА 25.10: «стоп на первой ошибке»; итог «Открыто до урока N» — макет: уроки 1–3 «открыт», урок 4 «начнём здесь»
  it('итог: открытые по порядку, затем «начнём здесь»', () => {
    const result = placementResultView(run([1, 2, 3, 4, 5], [true, true, true, false]));
    expect(result.startLessonOrdinal).toBe(4);
    expect(result.openedLessonOrdinals).toEqual([1, 2, 3]);
    expect(result.openedRange).toBe('1–3');
    expect(result.rows).toEqual([
      { lessonOrdinal: 1, kind: 'opened' }, { lessonOrdinal: 2, kind: 'opened' }, { lessonOrdinal: 3, kind: 'opened' }, { lessonOrdinal: 4, kind: 'here' },
    ]);
  });

  it('итог: один открытый урок — диапазон без тире; провал на первой теме — открытых нет', () => {
    expect(placementResultView(run([1, 2, 3], [true, false])).openedRange).toBe('1');
    const none = placementResultView(run([1, 2], [false]));
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
      for (const key of ['introTitle', 'introBody', 'start', 'startOver', 'opened', 'here'] as const) {
        expect(placementCopy(lang, key).length).toBeGreaterThan(3);
      }
    }
    // ЗАМОК ВЛАДЕЛЬЦА 25.10 (открыт только первый эпизод): итог — «Начнём с урока N», строки уроков — «знаешь»
    expect(placementCopy('ru', 'resultTitle', { n: 4 })).toBe('Начнём с урока 4');
    expect(placementCopy('ru', 'opened')).toBe('знаешь');
    expect(placementCopy('ru', 'resultBody', { range: '1–3' })).toBe('Темы уроков 1–3 ты уже знаешь.');
  });
});
