/**
 * lesson_mistake_facet.ts — какой ТИП ошибки записать в журнал «Мои ошибки»
 * при промахе в уроке (app/lesson1.tsx → captureObjectiveAttempt).
 *
 * зачем (репорт #15 Ольга, 2026-09-20): в lesson1.tsx тип был записан
 * константой `kind: 'word_order'`, поэтому КАЖДАЯ ошибка из урока приходила
 * в раздел с одной и той же подсказкой «Сверь порядок слов» — даже когда
 * человек перепутал форму слова или пропустил артикль. Дословно из репорта:
 * «Какую бы ошибку я не сделала, приложение мне советует обратить внимание
 * на порядок слов».
 *
 * Правило выбора (порядок проверок важен):
 *  • слов меньше, чем нужно, и пропущенное слово есть в эталоне → missing_token;
 *  • набор слов тот же, а порядок другой → word_order (настоящая перестановка);
 *  • слово заменено на однокоренное/похожее по форме → form;
 *  • всё остальное (подставлено другое слово) → meaning.
 *
 * Типы берём из общего контракта, чтобы подписи в разделе (mistake_facet_copy)
 * и подсказки в сессии (mistake_practice_session) не разошлись с журналом.
 */

import type { MistakeFacet } from '../modules/mistake-practice/contracts';

const normalizeToken = (value: string): string => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[.,!?;:'"”“’`]/g, '');

const splitTokens = (value: string): string[] => value
  .split(/\s+/)
  .map(normalizeToken)
  .filter((token) => token.length > 0);

/** Мультимножество слов: порядок не важен, повторы важны. */
const sameWordBag = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const token of left) counts.set(token, (counts.get(token) ?? 0) + 1);
  for (const token of right) {
    const left = counts.get(token) ?? 0;
    if (left === 0) return false;
    counts.set(token, left - 1);
  }
  return true;
};

/**
 * Одно слово вместо другого, но корень тот же: loves/love, went/go, cars/car.
 * Это ошибка ФОРМЫ, а не значения — подсказка должна говорить про окончание.
 */
const sameStem = (expected: string, picked: string): boolean => {
  if (!expected || !picked || expected === picked) return false;
  const shorter = expected.length <= picked.length ? expected : picked;
  const longer = expected.length <= picked.length ? picked : expected;
  if (shorter.length < 3) return false;
  // «love» ⊂ «loves», «car» ⊂ «cars», «work» ⊂ «worked»/«working».
  if (longer.startsWith(shorter) && longer.length - shorter.length <= 3) return true;
  // Общий префикс от 4 букв: «studies»/«studied», «closing»/«closed».
  let common = 0;
  while (common < shorter.length && shorter[common] === longer[common]) common += 1;
  return common >= 4;
};

export function lessonMistakeFacet(input: {
  readonly expectedPhrase: string;
  readonly answeredPhrase: string;
}): MistakeFacet {
  const expected = splitTokens(input.expectedPhrase);
  const answered = splitTokens(input.answeredPhrase);

  // Ничего не собрано — учить нечему, кроме самой фразы.
  if (expected.length === 0 || answered.length === 0) return 'meaning';

  // Те же слова, другой порядок — единственный честный «порядок слов».
  if (sameWordBag(expected, answered)) return 'word_order';

  const expectedSet = new Set(expected);
  const answeredSet = new Set(answered);

  // Слов меньше, и всё собранное есть в эталоне → человек пропустил слово.
  if (answered.length < expected.length
    && answered.every((token) => expectedSet.has(token))) {
    return 'missing_token';
  }

  // Ровно одна замена: сравниваем подставленное слово с ожидаемым.
  const missing = expected.filter((token) => !answeredSet.has(token));
  const extra = answered.filter((token) => !expectedSet.has(token));
  if (missing.length === 1 && extra.length === 1) {
    return sameStem(missing[0]!, extra[0]!) ? 'form' : 'meaning';
  }

  // Лишние слова при полном совпадении набора нужных — тоже сбой сборки фразы.
  if (missing.length === 0 && extra.length > 0) return 'word_order';

  return 'meaning';
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
