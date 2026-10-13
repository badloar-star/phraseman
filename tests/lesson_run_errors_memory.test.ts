// зачем (владелец 13.10): список «Ошибки» на итоге урока строится из промахов прохода — слово, что выбрал, что верно;
// «Добить: Ещё учу (N)» берёт id записанных ошибок прохода; счёт приходит и из навигации урока.
import {
  beginLessonRunErrors,
  clearLessonRunErrors,
  collectLessonRunMistakeId,
  lessonRunErrorRows,
  LESSON_RUN_ERRORS_LIMIT,
  parseDevLessonResult,
  parseRouteLessonResult,
  peekLessonRunErrors,
  peekLessonRunMistakeIds,
  rememberLessonRunErrors,
} from '../app/lesson_run_errors_memory';

describe('lesson_run_errors_memory', () => {
  afterEach(() => clearLessonRunErrors());

  it('берёт слово, выбранное и верное; без повторов и без строк без выбранного ответа', () => {
    const rows = lessonRunErrorRows([
      'просто строка',
      { phrase: 'does she work', tokenText: 'Does', picked: 'Do', expected: 'Does' },
      { phrase: 'does she work', tokenText: 'does', picked: 'did', expected: 'does' },
      { phrase: 'a', tokenText: 'work', expected: 'work' },
      { phrase: 'b', tokenText: 'same', picked: 'Same', expected: 'same' },
    ]);
    expect(rows).toEqual([{ label: 'Does', was: 'Do', ok: 'Does' }]);
  });

  it('не больше пяти строк', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ phrase: `p${i}`, tokenText: `w${i}`, picked: `x${i}`, expected: `y${i}` }));
    expect(lessonRunErrorRows(many)).toHaveLength(LESSON_RUN_ERRORS_LIMIT);
  });

  it('помнит только последний проход и только для своего урока', () => {
    rememberLessonRunErrors(3, [{ phrase: 'p', tokenText: 'Do', picked: 'Does', expected: 'Do' }]);
    expect(peekLessonRunErrors(3)).toHaveLength(1);
    expect(peekLessonRunErrors(4)).toEqual([]);
    clearLessonRunErrors();
    expect(peekLessonRunErrors(3)).toEqual([]);
  });

  it('id ошибок прохода: без повторов, обнуляются после запоминания, чужой урок не примешивается', () => {
    collectLessonRunMistakeId(3, 'm1');
    collectLessonRunMistakeId(3, 'm2');
    collectLessonRunMistakeId(3, 'm1');
    rememberLessonRunErrors(3, []);
    expect(peekLessonRunMistakeIds(3)).toEqual(['m1', 'm2']);
    expect(peekLessonRunMistakeIds(4)).toEqual([]);
    // следующий проход начинается с нуля
    rememberLessonRunErrors(3, []);
    expect(peekLessonRunMistakeIds(3)).toEqual([]);
    // id чужого урока не попадает в проход этого (новый проход — beginLessonRunErrors)
    beginLessonRunErrors(3);
    collectLessonRunMistakeId(5, 'x');
    collectLessonRunMistakeId(3, 'y');
    rememberLessonRunErrors(3, []);
    expect(peekLessonRunMistakeIds(3)).toEqual(['y']);
  });

  it('запоздавший id после закрытия прохода отбрасывается, новый проход начинается с нуля (ревью Авторизации 13.10)', () => {
    collectLessonRunMistakeId(3, 'a');
    rememberLessonRunErrors(3, []);
    collectLessonRunMistakeId(3, 'late'); // запись ошибки завершилась уже после перехода
    expect(peekLessonRunMistakeIds(3)).toEqual(['a']);
    beginLessonRunErrors(3);
    collectLessonRunMistakeId(3, 'b');
    rememberLessonRunErrors(3, []);
    expect(peekLessonRunMistakeIds(3)).toEqual(['b']);
  });

  it('dev-ссылка devResult=верно:ошибок считает счёт как настоящий проход', () => {
    expect(parseDevLessonResult('15:5')).toEqual({ correct: 15, wrong: 5, score: 3.8 });
    expect(parseDevLessonResult(['20:0'])).toEqual({ correct: 20, wrong: 0, score: 5 });
    expect(parseDevLessonResult('0:0')).toBeNull();
    expect(parseDevLessonResult('abc')).toBeNull();
    expect(parseDevLessonResult(undefined)).toBeNull();
  });

  it('счёт из навигации урока: верно и всего → верно/ошибок/оценка; мусор отбрасывается', () => {
    expect(parseRouteLessonResult('45', '50')).toEqual({ correct: 45, wrong: 5, score: 4.5 });
    expect(parseRouteLessonResult(['10'], ['10'])).toEqual({ correct: 10, wrong: 0, score: 5 });
    expect(parseRouteLessonResult('11', '10')).toBeNull();
    expect(parseRouteLessonResult('5', '0')).toBeNull();
    expect(parseRouteLessonResult('x', '10')).toBeNull();
    expect(parseRouteLessonResult(undefined, '10')).toBeNull();
  });
});
