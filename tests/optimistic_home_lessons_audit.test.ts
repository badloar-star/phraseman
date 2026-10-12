// зачем (аудит Optimistic UI «Главная и Уроки», координатор 12.10): правки аудита закреплены проверками исходников —
// экраны урока, итога, экзамена и «Мои ошибки» слишком тяжёлы для поведенческих тестов, поэтому сторожим сами места,
// где замок и журнал уже были потеряны один раз.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('урок: ответ не оставляет замок взведённым при раннем выходе', () => {
  const src = read('app/lesson1.tsx');
  it('ранний выход «урок уже завершается» снимает замок ответа и пишет причину', () => {
    const at = src.indexOf('if (isCompletingRef.current) {');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 520);
    expect(block).toContain('answerInFlightRef.current = false;');
    expect(block).toContain('[LESSON-ANSWER] ответ пропущен: урок уже завершается');
  });
});

describe('итог урока: молчаливые catch называют причину', () => {
  const src = read('app/lesson_complete.tsx');
  it('прогресс не прочитан, награда упала, медаль не посчитана, повтор не открылся', () => {
    expect(src).toContain('[LESSON-COMPLETE] прогресс урока не прочитан');
    expect(src).toContain('[LESSON-COMPLETE] выдача награды упала');
    expect(src).toContain('[LESSON-COMPLETE] медаль/разблокировка не посчитаны');
    expect(src).toContain('[LESSON-COMPLETE] повтор урока не открылся');
    expect(src).not.toMatch(/\} catch \{\n/);
  });
});

describe('«Мои ошибки»: сбой журнала не теряет ответ, достижения не падают молча', () => {
  const src = read('app/mistake_practice_session.tsx');
  it('чтение журнала «до» обёрнуто, запись ответа идёт дальше', () => {
    expect(src).toContain('[MISTAKE-SESSION] journal:current_failed');
    expect(src).toContain('let journalBefore: Awaited<ReturnType<typeof answerJournal.current>> | null = null;');
    expect(src.indexOf('journal:current_failed')).toBeLessThan(src.indexOf('answerJournal.record(event)'));
  });
  it('обе проверки достижений имеют catch с причиной', () => {
    expect(src).toContain('[MISTAKES-GATE] achievements:catch (ответ)');
    expect(src).toContain('[MISTAKES-GATE] achievements:catch (итог)');
  });
});

describe('экзамен: замок сдачи и журнал сбоев', () => {
  const src = read('app/exam.tsx');
  it('submitExam не стартует дважды и снимает замок в finally', () => {
    expect(src).toContain('const submitExamInFlightRef = useRef(false);');
    expect(src).toContain('[EXAM] submit: уже в пути — повторный тап пропущен');
    expect(src).toContain('submitExamInFlightRef.current = false;');
  });
  it('сбой загрузки вопросов и сбой сдачи пишут причину', () => {
    expect(src).toContain('[EXAM] вопросы не загрузились');
    expect(src).toContain('[EXAM] submit: сбой подсчёта/записи');
  });
});
