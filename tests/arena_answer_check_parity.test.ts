import {
  ARENA_ANSWER_JOINER,
  arenaAnswerFingerprint,
  arenaAnswerIsCorrect,
  arenaCanonicalAnswerValue,
  arenaHash32,
  arenaPairIsCorrect,
  type ArenaAnswerCheckTask,
} from '../modules/arena/answer_check';
import {
  answerFingerprint,
  canonicalAnswerValue,
  tournamentHash32,
} from '../functions/src/tournament_core';

/**
 * Паритет локальной проверки ответа с серверной.
 *
 * Владелец (D-12): вердикт «верно / неверно» обязан появляться мгновенно, без
 * обращения к серверу. Это возможно только потому, что клиент считает тот же
 * отпечаток ответа, что и сервер.
 *
 * Расхождение здесь даёт худший из возможных сбоев: игрок видит «неверно», а
 * сервер засчитывает «верно» — или наоборот. Поэтому три функции сверяются
 * побайтово.
 *
 * ИСТОРИЯ: первая версия клиента склеивала массив ответа пустой строкой,
 * потому что в серверном исходнике разделитель записан НЕВИДИМЫМ управляющим
 * символом U+0001 и выглядит как пустые кавычки. Все задания со сборкой
 * перевода и все пары считались бы неверными. Нашёл этот тест.
 */

describe('паритет хеша и канонического вида', () => {
  it.each(['', 'a', 'match-1|task-9|3', 'Ёжик в тумане', '🔥🔥', 'x'.repeat(500), '0', '-1', '  пробелы  '])(
    'считает одинаковый хеш для %j', (seed) => {
      expect(arenaHash32(seed)).toBe(tournamentHash32(seed));
    });

  it.each([
    [0], [1], [42], [-1], ['3'], [' 3 '], [null], [undefined], [true],
    [[]], [[1, 2, 3]], [['a ', ' b']], [['раз', 'два']], [[0]], [''],
  ])('канонизирует %j одинаково', (value) => {
    expect(arenaCanonicalAnswerValue(value)).toBe(canonicalAnswerValue(value));
  });

  it('разделяет элементы массива тем же управляющим символом, что и сервер', () => {
    // Без разделителя ['ab','c'] и ['a','bc'] дали бы один отпечаток, и
    // неверный порядок слов засчитался бы как верный.
    expect(ARENA_ANSWER_JOINER).toBe('\u0001');
    expect(arenaCanonicalAnswerValue(['ab', 'c'])).not.toBe(arenaCanonicalAnswerValue(['a', 'bc']));
    expect(arenaCanonicalAnswerValue(['ab', 'c'])).toBe(canonicalAnswerValue(['ab', 'c']));
  });
});

describe('паритет отпечатков', () => {
  const salts = ['m1', 'match_abc-123', ''];
  const taskIds = ['t1', 'task.9', ''];
  const answers: unknown[] = [0, 3, [1, 2, 3, 4], ['раз', 'два'], '', null];

  it('совпадает на всех сочетаниях соли, задания и ответа', () => {
    for (const salt of salts) {
      for (const taskId of taskIds) {
        for (const answer of answers) {
          expect(arenaAnswerFingerprint(salt, taskId, answer))
            .toBe(answerFingerprint(salt, taskId, answer));
        }
      }
    }
  });
});

describe('локальный вердикт', () => {
  const MATCH_ID = 'match_test_1';
  const fp = (taskId: string, value: unknown) => answerFingerprint(MATCH_ID, taskId, value);

  it('принимает верный выбор и отвергает остальные', () => {
    const task: ArenaAnswerCheckTask = {
      taskId: 'c1', mode: 'guess_phrase', kind: 'choice', answerFingerprints: [fp('c1', 2)],
    };
    for (const index of [0, 1, 2, 3]) {
      expect(arenaAnswerIsCorrect(MATCH_ID, task, { selectedIndex: index })).toBe(index === 2);
    }
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { selectedIndex: '2' })).toBe(false);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, null)).toBe(false);
  });

  it('различает порядок слов в собранном переводе', () => {
    const task: ArenaAnswerCheckTask = {
      taskId: 't1', mode: 'translate_build', kind: 'translate',
      answerFingerprints: [fp('t1', ['i', 'am', 'here'])],
    };
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { tokens: ['i', 'am', 'here'] })).toBe(true);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { tokens: [' i ', 'am', ' here'] })).toBe(true);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { tokens: ['am', 'i', 'here'] })).toBe(false);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { tokens: ['i', 'am'] })).toBe(false);
  });

  it('проверяет каждую пару отдельно', () => {
    const solution = [1, 0, 3, 2];
    const task: ArenaAnswerCheckTask = {
      taskId: 'p1', mode: 'speed_match', kind: 'match',
      answerFingerprints: solution.map((value) => fp('p1', value)),
    };
    for (let pair = 0; pair < 4; pair += 1) {
      for (let selected = 0; selected < 4; selected += 1) {
        expect(arenaPairIsCorrect(MATCH_ID, task, pair, selected)).toBe(solution[pair] === selected);
      }
    }
    expect(arenaPairIsCorrect(MATCH_ID, task, 9, 0)).toBe(false);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { selectedIndexes: solution })).toBe(true);
    expect(arenaAnswerIsCorrect(MATCH_ID, task, { selectedIndexes: [1, 0, 3, 3] })).toBe(false);
  });
});
