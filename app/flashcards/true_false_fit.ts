// true_false_fit.ts — размеры слова и перевода на карточке «Правда / ложь».
//
// зачем (владелец 11.11.2026, жалоба Стеллы: «интерфейс обязан подстраиваться под размер устройства»): карточка — зона фиксированной
// высоты 210 (макет `.swz`), а слово было жёстко 34 и перевод 22. На узком экране или при крупном системном шрифте длинная фраза
// переносилась на 3–4 строки и вылезала за карточку. Правило то же, что у карточек (владелец 18.10): длиннее текст или уже место —
// кегль меньше, перенос по словам, без «…» и без adjustsFontSizeToFit. То, что помещается, остаётся 34 и 22 — вид совпадает с макетом.
import { effectiveFontScale } from '../../constants/font_scale_cap';
import { estimateWrappedLines } from './fit_phrase_font';

export const TRUE_FALSE_WORD_SIZE = 34;
export const TRUE_FALSE_WORD_LINE = 40;
export const TRUE_FALSE_WORD_MIN = 18;
export const TRUE_FALSE_TRANSLATION_SIZE = 22;
export const TRUE_FALSE_TRANSLATION_LINE = 28;
export const TRUE_FALSE_TRANSLATION_MIN = 15;
/** Поля карточки по горизонтали (20 + 20) — стиль `card`. */
export const TRUE_FALSE_SIDE_PADDING = 40;
/** Высота под оба текста: зона 210 − поля 40 − черта с отступами 29. */
export const TRUE_FALSE_TEXT_HEIGHT = 141;
export type TrueFalseFit = Readonly<{ wordSize: number; wordLine: number; translationSize: number; translationLine: number }>;

const line = (size: number, baseSize: number, baseLine: number): number =>
  (size === baseSize ? baseLine : Math.round((size * baseLine) / baseSize));

export function trueFalseFit(input: Readonly<{ word: string; translation: string; cardWidth: number; fontScale: number }>): TrueFalseFit {
  const scale = effectiveFontScale(input.fontScale);
  const widthPx = input.cardWidth - TRUE_FALSE_SIDE_PADDING;
  const at = (wordSize: number): TrueFalseFit => {
    // зачем: слово и перевод уменьшаются ВМЕСТЕ, в пропорции макета 34 : 22. Раздельная подгонка давала перекос: на более узком экране
    // перевод сжимался до минимума, освобождал место, и слово становилось крупнее, чем на широком (поймано тестом на монотонность).
    const translationSize = Math.max(TRUE_FALSE_TRANSLATION_MIN, Math.round((wordSize * TRUE_FALSE_TRANSLATION_SIZE) / TRUE_FALSE_WORD_SIZE));
    return {
      wordSize,
      wordLine: line(wordSize, TRUE_FALSE_WORD_SIZE, TRUE_FALSE_WORD_LINE),
      translationSize,
      translationLine: line(translationSize, TRUE_FALSE_TRANSLATION_SIZE, TRUE_FALSE_TRANSLATION_LINE),
    };
  };
  if (widthPx <= 0) return at(TRUE_FALSE_WORD_SIZE);
  for (let wordSize = TRUE_FALSE_WORD_SIZE; wordSize > TRUE_FALSE_WORD_MIN; wordSize -= 1) {
    const fit = at(wordSize);
    const height =
      estimateWrappedLines(input.word, fit.wordSize, widthPx, scale) * fit.wordLine * scale +
      estimateWrappedLines(input.translation, fit.translationSize, widthPx, scale) * fit.translationLine * scale;
    if (height <= TRUE_FALSE_TEXT_HEIGHT) return fit;
  }
  // не помещается и на минимуме — минимум; дальше текст переносится как есть (без «…» и без adjustsFontSizeToFit)
  return at(TRUE_FALSE_WORD_MIN);
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __TrueFalseFitRouteShim() {
  return null;
}
