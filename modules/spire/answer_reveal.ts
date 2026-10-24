/**
 * Шпиль — восстановление правильного ответа по отпечаткам (пакет D, «Правильно: …»).
 * Чистый модуль: ни React, ни сети, ни часов.
 *
 * зачем (макет spire.html, состояние «Ошибка — правильный ответ»; владелец T20):
 * после ошибки игрок сразу видит верный вариант. Ответов в пакете недели нет —
 * только отпечатки (соль пакета + id задания + канонический ответ, как у Арены).
 * Соль не секретна, поэтому верный вариант находится перебором того, что уже
 * лежит на экране: индекс варианта для выбора/пар, порядок слов из банка для
 * сборки. Перебор сборки ограничен (SPIRE_REVEAL_MAX_TRIES): не нашли — честно
 * «не показываем», а не выдумываем ответ.
 */
import { arenaAnswerFingerprint } from '../arena/answer_check';

/** Потолок перебора сборки: ~8 слов из 9 — это 9!/1! ≈ 360k, режем раньше. */
export const SPIRE_REVEAL_MAX_TRIES = 40_000;
/** Потолок для поиска после ошибки на экране (жалоба №3, координатор 24.10): 40 000 стояли в кадре секундами. */
export const SPIRE_REVEAL_FAST_TRIES = 5_000;

/** Индекс верного варианта выбора или null (отпечаток не совпал ни с одним). */
export function spireRevealChoiceIndex(saltId: string, taskId: string, optionCount: number, fingerprint: string): number | null {
  for (let i = 0; i < optionCount; i += 1) {
    if (arenaAnswerFingerprint(saltId, taskId, i) === fingerprint) return i;
  }
  return null;
}

/** Верные индексы по каждой паре/подвопросу (null там, где не нашли). */
export function spireRevealItemIndexes(
  saltId: string,
  taskId: string,
  optionCounts: readonly number[],
  fingerprints: readonly string[],
): readonly (number | null)[] {
  return optionCounts.map((count, i) => (fingerprints[i] ? spireRevealChoiceIndex(saltId, taskId, count, fingerprints[i]) : null));
}

/**
 * Порядок слов сборки: перебор перестановок длины tokenCount из банка слов,
 * без повтора позиции банка. null — не нашли в пределах лимита.
 */
export function spireRevealTokens(
  saltId: string,
  taskId: string,
  wordBank: readonly string[],
  tokenCount: number,
  fingerprint: string,
  maxTries: number = SPIRE_REVEAL_MAX_TRIES,
): readonly string[] | null {
  if (tokenCount < 1 || tokenCount > wordBank.length) return null;
  let tries = 0;
  const used = new Array<boolean>(wordBank.length).fill(false);
  const path: string[] = [];
  const dfs = (): readonly string[] | null => {
    if (path.length === tokenCount) {
      tries += 1;
      return arenaAnswerFingerprint(saltId, taskId, path) === fingerprint ? [...path] : null;
    }
    for (let i = 0; i < wordBank.length; i += 1) {
      if (tries >= maxTries) return null;
      if (used[i]) continue;
      used[i] = true;
      path.push(wordBank[i]);
      const found = dfs();
      path.pop();
      used[i] = false;
      if (found) return found;
    }
    return null;
  };
  return dfs();
}
