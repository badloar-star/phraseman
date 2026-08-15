import type { ArenaTaskMode } from './contract';

/**
 * Локальная проверка ответа.
 *
 * Владелец (D-12): задержек быть не должно вообще. Значит вердикт «верно /
 * неверно» обязан появляться без обращения к серверу.
 *
 * Механика — отпечатки правильных ответов, которые уже есть в турнирном ядре
 * (`functions/src/tournament_core.ts`). Отпечаток считается обычным хешем от
 * строки «соль | идентификатор задания | канонический ответ», где солью служит
 * идентификатор матча. Соль не секретна и клиенту известна, поэтому проверять
 * можно локально.
 *
 * Три функции ниже ОБЯЗАНЫ совпадать с серверными до последнего символа:
 * `tournamentHash32`, `canonicalAnswerValue`, `answerFingerprint`. Расхождение
 * означает «показали верно, начислили ноль» — самый непонятный для игрока сбой
 * из возможных. Есть тест паритета.
 */

/** FNV-1a, 32 бита. Побайтовая копия серверной реализации. */
export function arenaHash32(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Разделитель элементов массива в каноническом виде ответа.
 *
 * Управляющий символ, а не пустая строка: без разделителя списки ['ab','c'] и
 * ['a','bc'] дали бы одинаковый отпечаток, и неверный порядок слов засчитался
 * бы как верный. Серверная реализация использует ровно этот символ — в
 * исходнике он записан невидимым литералом U+0001 и выглядит как пустые
 * кавычки, поэтому здесь он задан видимым escape.
 */
export const ARENA_ANSWER_JOINER = '\u0001';

/** Канонический вид ответа: одинаковый на сервере и на клиенте. */
export function arenaCanonicalAnswerValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).join(ARENA_ANSWER_JOINER);
  }
  return String(value ?? '').trim();
}

export function arenaAnswerFingerprint(saltId: string, taskId: string, answer: unknown): string {
  return arenaHash32(`${saltId}|${taskId}|${arenaCanonicalAnswerValue(answer)}`).toString(36);
}

export type ArenaAnswerCheckTask = Readonly<{
  taskId: string;
  mode: ArenaTaskMode;
  kind: 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match';
  answerFingerprints: readonly string[];
}>;

/**
 * Верен ли обычный ответ. Для заданий с выбором сравнивается отпечаток
 * выбранного индекса, для сборки перевода — отпечаток списка слов.
 */
export function arenaAnswerIsCorrect(
  saltId: string,
  task: ArenaAnswerCheckTask,
  answer: unknown,
): boolean {
  const expected = task.answerFingerprints;
  if (!expected.length) return false;
  const record = answer && typeof answer === 'object' ? answer as Record<string, unknown> : null;
  if (!record) return false;

  if (task.kind === 'choice' || task.kind === 'listen') {
    if (!Number.isInteger(record.selectedIndex)) return false;
    return expected[0] === arenaAnswerFingerprint(saltId, task.taskId, record.selectedIndex);
  }
  if (task.kind === 'translate' || task.kind === 'dictate') {
    if (!Array.isArray(record.tokens)) return false;
    return expected[0] === arenaAnswerFingerprint(saltId, task.taskId, record.tokens);
  }
  // Задания с подвопросами: отпечаток на каждый пункт.
  const selected = record.selectedIndexes;
  if (!Array.isArray(selected) || selected.length !== expected.length) return false;
  return selected.every((value, index) =>
    Number.isInteger(value) && expected[index] === arenaAnswerFingerprint(saltId, task.taskId, value));
}

/**
 * Верна ли одна пара. Пара проверяется своим отпечатком по номеру левой
 * карточки — ровно так же, как её проверит сервер.
 */
export function arenaPairIsCorrect(
  saltId: string,
  task: ArenaAnswerCheckTask,
  pairIndex: number,
  selectedIndex: number,
): boolean {
  const expected = task.answerFingerprints[pairIndex];
  if (!expected || !Number.isInteger(selectedIndex)) return false;
  return expected === arenaAnswerFingerprint(saltId, task.taskId, selectedIndex);
}
