// зачем (координатор 15.10): счёт итога «по первым попыткам» берёт промахи из списка «Ошибки» ТЕКУЩЕГО прохода.
// Сторож: промахи прошлого (в т.ч. брошенного) прохода не попадают в новый — «проход с промахом → выход → повтор, всё верно → 3/0».
import { lessonFirstTryCountsFromProgress } from '../app/lesson_first_try_counts';
import { beginLessonRunErrors, clearLessonRunErrors, peekLessonRunErrors, peekLessonRunMissCount, rememberLessonRunErrors } from '../app/lesson_run_errors_memory';

const miss = { phrase: 'Does she work here?', tokenText: 'Does', picked: 'Do', expected: 'Does' };

describe('список «Ошибки» — только текущий проход', () => {
  beforeEach(() => clearLessonRunErrors());

  it('проход с промахом завершён → новый проход начат → список пуст до конца нового прохода', () => {
    beginLessonRunErrors(1);
    rememberLessonRunErrors(1, [miss]);
    expect(peekLessonRunErrors(1)).toHaveLength(1);
    beginLessonRunErrors(1);
    expect(peekLessonRunErrors(1)).toHaveLength(0);
  });

  it('проход с промахом → выход на середине → повтор, всё верно → 3/0', () => {
    beginLessonRunErrors(1);
    rememberLessonRunErrors(1, [miss]); // прошлый завершённый проход с промахом
    beginLessonRunErrors(1); // проход с промахом, брошен — до rememberLessonRunErrors не дошёл
    beginLessonRunErrors(1); // повтор
    rememberLessonRunErrors(1, []); // повтор завершён без ошибок
    const counts = lessonFirstTryCountsFromProgress(['replay_correct', 'replay_correct', 'replay_correct'], peekLessonRunErrors(1).length);
    expect([counts.correct, counts.wrong]).toEqual([3, 0]);
  });

  it('брошенный повтор не стирает список чужого урока', () => {
    beginLessonRunErrors(1);
    rememberLessonRunErrors(1, [miss]);
    beginLessonRunErrors(2);
    expect(peekLessonRunErrors(1)).toHaveLength(1);
  });
});

describe('счёт ошибок — из полного буфера прохода, список строк — до 5', () => {
  beforeEach(() => clearLessonRunErrors());
  const missOn = (i: number) => ({ phraseId: `p${i}`, phrase: `phrase ${i}`, tokenText: `word${i}`, picked: `bad${i}`, expected: `word${i}` });

  it('7 промахов на 7 разных заданиях → ошибок 7, строк в списке 5', () => {
    beginLessonRunErrors(1);
    rememberLessonRunErrors(1, Array.from({ length: 7 }, (_, i) => missOn(i)));
    expect(peekLessonRunMissCount(1)).toBe(7);
    expect(peekLessonRunErrors(1)).toHaveLength(5);
    const progress = [...Array(3).fill('wrong'), ...Array(47).fill('correct')];
    const counts = lessonFirstTryCountsFromProgress(progress, peekLessonRunMissCount(1));
    expect([counts.correct, counts.wrong]).toEqual([43, 7]);
  });

  it('одно задание промахнулось дважды → одна ошибка', () => {
    beginLessonRunErrors(1);
    rememberLessonRunErrors(1, [missOn(1), { ...missOn(1), picked: 'other' }, missOn(2)]);
    expect(peekLessonRunMissCount(1)).toBe(2);
  });

  it('промахов не больше заданий урока', () => {
    expect(lessonFirstTryCountsFromProgress(['correct', 'correct', 'correct'], 9)).toEqual({ correct: 0, wrong: 3, finalCorrect: 3 });
  });
});
