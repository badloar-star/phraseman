import * as fs from 'fs';
import * as path from 'path';
import { arenaText } from '../modules/arena/copy';
import type { Lang } from '../constants/i18n';
import {
  arenaParseReviewRow,
  arenaReviewRows,
  arenaReviewSummary,
} from '../modules/arena/review_view';
import { ARENA_ANSWER_MS } from '../modules/arena/stars';

/**
 * Разбор матча.
 *
 * Владелец потребовал разбор обязательным. Он отвечает на три вопроса, на
 * которые экран результата не отвечает: что спросили, что я ответил и что было
 * верно, и почему звёзд именно столько.
 *
 * Главные свойства, которые здесь держатся: просрочка отличается от ошибки
 * (игрок не ошибся — он не успел), причина показывается только для ВЫБРАННОГО
 * варианта, а битая строка не показывается вовсе.
 */

const choiceRow = (over: Record<string, unknown> = {}) => ({
  taskIndex: 0,
  taskId: 't0',
  mode: 'guess_phrase',
  publicTask: {
    taskId: 't0',
    mode: 'guess_phrase',
    payload: { phrase: 'give up', options: ['сдаться', 'подняться', 'раздать', 'выдать'] },
  },
  solution: { correctIndex: 0 },
  explanation: {
    ruleNote: 'to stop trying',
    example: 'Do not give up.',
    wrongOptionReasons: ['', 'это give in', 'это give out', 'это give away'],
  },
  answerSnapshot: { selectedIndex: 1 },
  correct: false,
  elapsedMs: 3_000,
  ...over,
});

const buildRow = (over: Record<string, unknown> = {}) => ({
  taskIndex: 1,
  taskId: 't1',
  mode: 'translate_build',
  publicTask: {
    taskId: 't1',
    mode: 'translate_build',
    payload: { phrase: 'Я не сдамся', wordBank: ['i', 'will', 'not', 'give', 'up'] },
  },
  solution: { correctTokens: ['i', 'will', 'not', 'give', 'up'] },
  explanation: null,
  answerSnapshot: { tokens: ['i', 'give', 'up'] },
  correct: false,
  elapsedMs: 5_000,
  ...over,
});

describe('разбор строки', () => {
  it('вопрос, варианты и выбранный ответ читаются', () => {
    const row = arenaParseReviewRow(choiceRow())!;
    expect(row.prompt).toBe('give up');
    expect(row.options.length).toBe(4);
    expect(row.givenText).toBe('подняться');
    expect(row.correctText).toBe('сдаться');
  });

  it('правило и пример попадают в разбор', () => {
    const row = arenaParseReviewRow(choiceRow())!;
    expect(row.ruleNote).toBe('to stop trying');
    expect(row.example).toBe('Do not give up.');
  });

  /**
   * Вывалить причины по всем вариантам — значит превратить разбор в стену
   * текста, из которой непонятно, что относится к тебе.
   */
  it('причина показывается только для ВЫБРАННОГО варианта', () => {
    expect(arenaParseReviewRow(choiceRow())!.trapNote).toBe('это give in');
    expect(arenaParseReviewRow(choiceRow({ answerSnapshot: { selectedIndex: 2 } }))!.trapNote)
      .toBe('это give out');
  });

  it('у верного варианта причины нет', () => {
    const row = arenaParseReviewRow(choiceRow({ answerSnapshot: { selectedIndex: 0 }, correct: true }))!;
    expect(row.trapNote).toBeNull();
    expect(row.verdict).toBe('correct');
  });

  it('сборка перевода показывается словами, а не индексами', () => {
    const row = arenaParseReviewRow(buildRow())!;
    expect(row.givenText).toBe('i give up');
    expect(row.correctText).toBe('i will not give up');
  });

  it('запасной вид правильного ответа тоже читается', () => {
    const row = arenaParseReviewRow(buildRow({ solution: { correctAnswer: 'i will not give up' } }))!;
    expect(row.correctText).toBe('i will not give up');
  });

  /** Игрок не ошибся — он не успел, и для читающего разбор это разные вещи. */
  it('просрочка отличается от ошибки', () => {
    const wrong = arenaParseReviewRow(choiceRow({ elapsedMs: 2_000 }))!;
    expect(wrong.verdict).toBe('wrong');
    const late = arenaParseReviewRow(choiceRow({ elapsedMs: ARENA_ANSWER_MS.guess_phrase }))!;
    expect(late.verdict).toBe('timeout');
  });

  it('без ответа показывается пусто, а не выдуманный вариант', () => {
    const row = arenaParseReviewRow(choiceRow({ answerSnapshot: null }))!;
    expect(row.givenText).toBeNull();
    expect(row.trapNote).toBeNull();
  });

  it('индекс за пределами вариантов не выдаёт чужой текст', () => {
    expect(arenaParseReviewRow(choiceRow({ answerSnapshot: { selectedIndex: 99 } }))!.givenText).toBeNull();
    expect(arenaParseReviewRow(choiceRow({ answerSnapshot: { selectedIndex: -1 } }))!.givenText).toBeNull();
    expect(arenaParseReviewRow(choiceRow({ solution: { correctIndex: 99 } }))!.correctText).toBeNull();
  });

  /**
   * Доска пар почти никогда не бывает полностью неверной: часть пар обычно
   * собрана. Называть это ошибкой несправедливо.
   */
  it('незакрытая доска пар — «частично», а не «неверно»', () => {
    const pairs = arenaParseReviewRow({
      ...choiceRow(),
      mode: 'speed_match',
      publicTask: { taskId: 't4', mode: 'speed_match', payload: { prompt: 'Пары', items: [] } },
      solution: { correctIndexes: [0, 1, 2, 3] },
      correct: false,
      elapsedMs: 5_000,
    })!;
    expect(pairs.verdict).toBe('partial');
    // Одной строкой доску не показать, и врать «ответ такой-то» нельзя.
    expect(pairs.givenText).toBeNull();
    expect(pairs.correctText).toBeNull();
  });

  it('просроченная доска пар остаётся просрочкой', () => {
    const pairs = arenaParseReviewRow({
      ...choiceRow(), mode: 'speed_match',
      publicTask: { taskId: 't4', mode: 'speed_match', payload: { prompt: 'Пары' } },
      correct: false, elapsedMs: ARENA_ANSWER_MS.speed_match,
    })!;
    expect(pairs.verdict).toBe('timeout');
  });

  it('битые строки не показываются', () => {
    for (const value of [null, undefined, 'строка', [], 42, {}]) {
      expect(arenaParseReviewRow(value)).toBeNull();
    }
    expect(arenaParseReviewRow(choiceRow({ mode: 'quiz' }))).toBeNull();
    expect(arenaParseReviewRow(choiceRow({ taskIndex: -1 }))).toBeNull();
    expect(arenaParseReviewRow(choiceRow({ taskIndex: 'первое' }))).toBeNull();
  });

  it('отсутствие объяснения строку не убивает — задание всё равно было', () => {
    const row = arenaParseReviewRow(choiceRow({ explanation: null }))!;
    expect(row).not.toBeNull();
    expect(row.ruleNote).toBeNull();
    expect(row.trapNote).toBeNull();
    expect(row.prompt).toBe('give up');
  });
});

describe('список и сводка', () => {
  const rows = arenaReviewRows([
    buildRow({ taskIndex: 3, correct: true }),
    choiceRow({ taskIndex: 0, correct: true, answerSnapshot: { selectedIndex: 0 }, elapsedMs: 900 }),
    'мусор',
    choiceRow({ taskIndex: 2, correct: false, elapsedMs: ARENA_ANSWER_MS.guess_phrase }),
    choiceRow({ taskIndex: 1, correct: false, elapsedMs: 2_000 }),
  ]);

  it('строки идут по порядку заданий, битые выпадают', () => {
    expect(rows.map((row) => row.taskIndex)).toEqual([0, 1, 2, 3]);
  });

  it('сводка считает верное, неверное и просроченное отдельно', () => {
    const summary = arenaReviewSummary(rows);
    expect(summary.total).toBe(4);
    expect(summary.correct).toBe(2);
    expect(summary.wrong).toBe(1);
    expect(summary.timeout).toBe(1);
  });

  it('повторить предлагается всё, что не сошлось', () => {
    expect(arenaReviewSummary(rows).retryTaskIndexes).toEqual([1, 2]);
  });

  it('самое долгое задание находится', () => {
    expect(arenaReviewSummary(rows).slowestTaskIndex).toBe(2);
  });

  it('пустой разбор не роняет и ничего не выдумывает', () => {
    const summary = arenaReviewSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.retryTaskIndexes).toEqual([]);
    expect(summary.slowestTaskIndex).toBeNull();
  });

  it('идеальный матч не предлагает повторов', () => {
    const perfect = arenaReviewRows([
      choiceRow({ taskIndex: 0, correct: true }),
      choiceRow({ taskIndex: 1, correct: true }),
    ]);
    expect(arenaReviewSummary(perfect).retryTaskIndexes).toEqual([]);
  });
});

/**
 * Пустой разбор читался как «ты ничего не отвечал»: экран говорил «Разбор пока
 * не готов» и замолкал, не объясняя, когда он появится и появится ли. А пишется
 * он при закрытии матча — то есть чаще всего ждать надо соперника.
 */
describe('пустой разбор объясняет себя и не запирает', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_review.tsx'), 'utf8');
  const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

  it('к пустоте добавлено объяснение', () => {
    expect(source).toContain("'reviewEmptyHint'");
    for (const lang of langs) {
      expect(arenaText(lang, 'reviewEmptyHint').length).toBeGreaterThan(0);
    }
  });

  it('дорога назад есть и при пустоте, и при отказе', () => {
    expect(source).toContain("rows.length || view === 'empty' || view === 'error'");
  });
});
