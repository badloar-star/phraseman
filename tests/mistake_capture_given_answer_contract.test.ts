import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

/** Тело первого вызова записи ошибки в файле: от `capture…ObjectiveAttempt({` до закрывающей пары `})`. */
function captureCallBody(source: string): string {
  const start = source.search(/capture(?:CurrentAccount)?ObjectiveAttempt\(\{/);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return '';
}

// зачем (владелец 11.11, «Мои ошибки 3.0», этап 1): раздел обязан показывать «Твой ответ» и место промаха
// для ошибки из ЛЮБОГО раздела. До этой правки ответ ученика передавали только диалоги и Шпиль — у уроков,
// слов, глаголов, блица и экзаменов строка «Твой ответ» не рисовалась вовсе (поле facet.given было пустым).
describe('mistake capture carries the learner answer from every objective source', () => {
  test.each([
    ['app/lesson1.tsx', 'given: answer'],
    ['app/lesson_words.tsx', 'given: picked'],
    ['app/lesson_irregular_verbs.tsx', 'given: word'],
    ['app/flashcards_blitz_session.tsx', 'given: question.options[optIdx]'],
    ['app/exam.tsx', 'given: question.opts[pickedIndex]'],
    ['app/level_exam.tsx', 'given: q.opts[ci]'],
  ])('%s writes facet.given', (relative, needle) => {
    expect(captureCallBody(read(relative))).toContain(needle);
  });

  // зачем: без текста вопроса ошибку экзамена нельзя ни показать, ни объяснить — в записи оставалась
  // только пересобранная фраза, а сам вопрос (для вопросов без пропуска) терялся.
  test.each([
    ['app/exam.tsx', 'sourcePrompt: question.q'],
    ['app/level_exam.tsx', 'sourcePrompt: q.q'],
  ])('%s keeps the question text', (relative, needle) => {
    expect(captureCallBody(read(relative))).toContain(needle);
  });
});
