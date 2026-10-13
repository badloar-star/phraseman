// зачем (владелец 13.10): список «Ошибки» на итоге урока строится из промахов прохода — слово, что выбрал, что верно.
import { clearLessonRunErrors, lessonRunErrorRows, LESSON_RUN_ERRORS_LIMIT, parseDevLessonResult, peekLessonRunErrors, rememberLessonRunErrors } from '../app/lesson_run_errors_memory';

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

  it('dev-ссылка devResult=верно:ошибок считает счёт и медаль теми же порогами', () => {
    expect(parseDevLessonResult('15:5')).toEqual({ correct: 15, wrong: 5, score: 3.8, tier: 'bronze' });
    expect(parseDevLessonResult(['20:0'])).toEqual({ correct: 20, wrong: 0, score: 5, tier: 'gold' });
    expect(parseDevLessonResult('9:1')?.tier).toBe('silver');
    expect(parseDevLessonResult('1:9')?.tier).toBe('none');
    expect(parseDevLessonResult('0:0')).toBeNull();
    expect(parseDevLessonResult('abc')).toBeNull();
    expect(parseDevLessonResult(undefined)).toBeNull();
  });

  it('помнит только последний проход и только для своего урока', () => {
    rememberLessonRunErrors(3, [{ phrase: 'p', tokenText: 'Do', picked: 'Does', expected: 'Do' }]);
    expect(peekLessonRunErrors(3)).toHaveLength(1);
    expect(peekLessonRunErrors(4)).toEqual([]);
    clearLessonRunErrors();
    expect(peekLessonRunErrors(3)).toEqual([]);
  });
});
