/**
 * Сторож U10, пункт 5 (владелец 11.11.2026: «Заменить на настоящие слова»).
 *
 * зачем: в зачёте урока (app/exam.tsx) и входном тесте (app/diagnostic_test.tsx) неверные варианты были выдуманными
 * словоформами («wills», «haves», «cans», «goed», «hisself») и невозможными связками («should to», «am will», «is can»).
 * Ученик отсеивал их не знанием правила, а тем, что такого слова нет. Теперь неверный вариант — настоящее слово, которое
 * в этом месте неверно по правилу («She [is] come tomorrow», «I [are] a car»).
 * Список ниже — формы, найденные при вычитке обоих банков; новую выдуманную форму вне списка сторож сам не распознает.
 * Сработал — заменить вариант настоящим словом, а не сокращать список.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const BANKS = ['app/exam.tsx', 'app/diagnostic_test.tsx'];
const INVENTED_WORDS = [
  'wills', 'haves', 'cans', 'mays', 'shoulds', 'woulds', 'coulds', 'musts',
  'goed', 'readed', 'sended', 'spended', 'plaied', 'stoped', 'buyed', 'taked', 'gaved',
  'hisself', 'himselves', 'theirselves', 'afters',
];
const INVENTED_WORD = new RegExp(`\\b(?:${INVENTED_WORDS.join('|')})\\b`, 'iu');
// модальный глагол с «to» и связка «be + модальный» — таких сочетаний в языке нет
const IMPOSSIBLE_PAIR = /\b(?:can|could|should|must|would|will|may|might) to\b|\b(?:am|is|are) (?:will|can|could|should|must|would|may)\b/iu;

type Task = { file: string; line: number; question: string; options: string[] };

function readTasks(file: string): Task[] {
  const tasks: Task[] = [];
  readFileSync(join(__dirname, '..', file), 'utf8').split('\n').forEach((text, index) => {
    const opts = /\bopts:\s*\[([^\]]*)\]/u.exec(text);
    if (!opts) return;
    const options = [...opts[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/gu)].map((m) => m[1] ?? m[2]);
    if (options.length === 0) return; // строка описания типа, а не задание
    const question = /\b(?:q|phrase):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/u.exec(text);
    tasks.push({ file, line: index + 1, question: question ? (question[1] ?? question[2]) : '', options });
  });
  return tasks;
}

const tasks = BANKS.flatMap(readTasks);
const where = (t: Task, extra: string): string => `${t.file}:${t.line} «${t.question}» — ${extra}`;

describe('U10: в банках зачёта и входного теста нет выдуманных слов', () => {
  it('оба банка прочитаны', () => {
    expect(tasks.filter((t) => t.file === BANKS[0]).length).toBeGreaterThanOrEqual(190);
    expect(tasks.filter((t) => t.file === BANKS[1]).length).toBeGreaterThanOrEqual(210);
  });

  it('ни вариант ответа, ни вопрос не содержат несуществующую словоформу', () => {
    const bad: string[] = [];
    for (const t of tasks) for (const text of [t.question, ...t.options]) if (INVENTED_WORD.test(text)) bad.push(where(t, text));
    expect(bad).toEqual([]);
  });

  it('ни вариант ответа, ни вопрос не содержат невозможную связку («should to», «am will»)', () => {
    const bad: string[] = [];
    for (const t of tasks) for (const text of [t.question, ...t.options]) if (IMPOSSIBLE_PAIR.test(text)) bad.push(where(t, text));
    expect(bad).toEqual([]);
  });

  it('варианты одного задания не повторяются', () => {
    const bad = tasks.filter((t) => new Set(t.options.map((o) => o.trim().toLowerCase())).size !== t.options.length).map((t) => where(t, t.options.join(' | ')));
    expect(bad).toEqual([]);
  });
});
