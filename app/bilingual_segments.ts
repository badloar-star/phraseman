// Чистая (без RN) сегментация разбора на «английский / родной язык» — вынесена из
// components/BilingualMistakeText.tsx, чтобы быть юнит-тестируемой без нативных
// зависимостей. Английский = ключевой язык (которому учим), он красится отдельным
// цветом, чтобы не сливаться с переводом.

const LATIN_LETTER = /[A-Za-zÀ-ɏ]/;
const NON_LATIN_LETTER = /[^ -ɏ]/; // кириллица, CJK и т.п.
const LETTER = /[A-Za-zÀ-ɏЀ-ӿԀ-ԯ]/;

export type BilingualSegment = { text: string; english: boolean };

/**
 * Делит строку на сегменты «английский / родной» по словам. Слово относим к
 * английскому, если в нём есть латинская буква и НЕТ не-латинских букв. Пробелы и
 * пунктуация присоединяются к предыдущему сегменту того же типа, чтобы не плодить
 * микрокуски и сохранить естественный перенос строк. Текст сохраняется посимвольно
 * (склейка сегментов даёт исходную строку).
 */
export function segmentBilingual(input: string): BilingualSegment[] {
  const value = String(input ?? '');
  if (!value) return [];
  const chunks = value.match(/[^\s]+|\s+/g) ?? [value];
  const segments: BilingualSegment[] = [];
  for (const chunk of chunks) {
    const hasLatin = LATIN_LETTER.test(chunk);
    const hasNonLatin = NON_LATIN_LETTER.test(chunk);
    const hasAnyLetter = LETTER.test(chunk);
    let english: boolean;
    if (!hasAnyLetter) {
      english = segments.length > 0 ? segments[segments.length - 1]!.english : false;
    } else {
      english = hasLatin && !hasNonLatin;
    }
    const last = segments[segments.length - 1];
    if (last && last.english === english) {
      last.text += chunk;
    } else {
      segments.push({ text: chunk, english });
    }
  }
  return segments;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
