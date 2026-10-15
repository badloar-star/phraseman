// зачем (координатор 15.10): счёт итога «по первым попыткам» берёт промахи из списка «Ошибки» ТЕКУЩЕГО прохода.
// Сторож: промахи прошлого (в т.ч. брошенного) прохода не попадают в новый — «проход с промахом → выход → повтор, всё верно → 3/0».
import { lessonFirstTryCountsFromProgress } from '../app/lesson_first_try_counts';
import { beginLessonRunErrors, clearLessonRunErrors, peekLessonRunErrors, rememberLessonRunErrors } from '../app/lesson_run_errors_memory';

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
