/**
 * Подсветка ошибочных букв в ответе «Напиши» — макет docs/design/v2-app/cards-v2.html, кадр «Напиши — неверно»
 * (`d<span class="bad">i</span>lay` при эталоне `delay`).
 *
 * зачем (Карточки 2.0 12.10): после проверки поле ввода показывает то, что человек набрал, и красным подчёркивает буквы,
 * которых нет в эталоне. Сравнение — по наибольшей общей подпоследовательности без учёта регистра: «dilay» против «delay» даёт
 * ровно одну лишнюю букву «i». Пробелы не подсвечиваются. У перевода бывают варианты («привет / здравствуй») — берём тот, с которым
 * совпадение лучше. Чистая функция, без обращения к сети и хранилищу.
 */

export type RecallDiffPart = Readonly<{ text: string; wrong: boolean }>;

/** Верхний предел длины, после которого сравнение не делаем (поле ввода и так ограничено; страховка от квадратичной работы). */
const MAX_DIFF_LENGTH = 240;

const fold = (ch: string): string => ch.toLowerCase();

/** Какие символы набранного `typed` входят в наибольшую общую подпоследовательность с `expected`. */
function matchedMask(typed: readonly string[], expected: readonly string[]): boolean[] {
  const n = typed.length;
  const m = expected.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = fold(typed[i]) === fold(expected[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const mask = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (fold(typed[i]) === fold(expected[j])) {
      mask[i] = true;
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return mask;
}

/** Разбить набранный ответ на куски «как есть» / «лишняя буква» относительно эталона. */
export function markWrongLetters(typed: string, expected: string): RecallDiffPart[] {
  const letters = Array.from(typed);
  if (letters.length === 0) return [];
  if (letters.length > MAX_DIFF_LENGTH) return [{ text: typed, wrong: false }];
  const variants = expected.split(/\s*[\/;]\s*/).filter(Boolean);
  const candidates = variants.length > 0 ? variants : [expected];
  let bestMask: boolean[] | null = null;
  let bestWrong = Infinity;
  for (const candidate of candidates) {
    const target = Array.from(candidate);
    if (target.length > MAX_DIFF_LENGTH) continue;
    const mask = matchedMask(letters, target);
    const wrong = mask.reduce((count, ok, index) => count + (ok || /\s/.test(letters[index]) ? 0 : 1), 0);
    if (wrong < bestWrong) {
      bestWrong = wrong;
      bestMask = mask;
    }
  }
  if (!bestMask) return [{ text: typed, wrong: false }];
  const parts: { text: string; wrong: boolean }[] = [];
  letters.forEach((ch, index) => {
    const wrong = !bestMask![index] && !/\s/.test(ch);
    const last = parts[parts.length - 1];
    if (last && last.wrong === wrong) last.text += ch;
    else parts.push({ text: ch, wrong });
  });
  return parts;
}
