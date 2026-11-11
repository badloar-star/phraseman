// language_title_fit.ts — кегль названия языка в строке выбора языка онбординга.
//
// зачем (владелец 11.11.2026, жалоба Стеллы; найдено на эмуляторе: ширина 320 + системный шрифт 1.5): слово «Французский» не помещалось
// в строку рядом с флагом и рвалось на последней букве («Французски / й»). Название языка — одно слово, переносить его нельзя:
// кегль уменьшается расчётом ровно настолько, чтобы самое длинное слово влезло целиком. Без adjustsFontSizeToFit (правило владельца).
// На макетной ширине и при обычном шрифте размер остаётся 16.5/21 — вид совпадает с макетом.
import { effectiveFontScale } from '../../constants/font_scale_cap';

export const LANGUAGE_TITLE_SIZE = 16.5;
export const LANGUAGE_TITLE_LINE = 21;
export const LANGUAGE_TITLE_MIN = 12;
/** Средняя ширина знака полужирного начертания в em, с запасом на широкие буквы («Ф», «ш», «ц»). */
const CHAR_WIDTH_EM = 0.62;
/**
 * Всё, что в строке занято не названием: поля экрана 20 + 20, поля карточки 12 + 12, флаг 76, отметка выбора 23, два зазора по 12.
 * Числа — из стилей CleanOnboarding (`languageCard`, `languageAsset`, `radioLarge`).
 */
export const LANGUAGE_ROW_OCCUPIED = 187;

/** Длина самого длинного слова названия — именно оно не должно рваться. */
export function longestWordLength(title: string): number {
  return title.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
}

export type LanguageTitleFit =Readonly<{ fontSize: number; lineHeight: number }>;

export function languageTitleFit(input: Readonly<{ title: string; windowWidth: number; fontScale: number }>): LanguageTitleFit {
  const scale = effectiveFontScale(input.fontScale);
  const widthPx = input.windowWidth - LANGUAGE_ROW_OCCUPIED;
  const longestWord = longestWordLength(input.title);
  if (widthPx <= 0 || longestWord === 0) return { fontSize: LANGUAGE_TITLE_SIZE, lineHeight: LANGUAGE_TITLE_LINE };
  const fits = widthPx / (longestWord * CHAR_WIDTH_EM * scale);
  if (fits >= LANGUAGE_TITLE_SIZE) return { fontSize: LANGUAGE_TITLE_SIZE, lineHeight: LANGUAGE_TITLE_LINE };
  // шаг 0.5 вниз; ниже минимума не опускаемся — дальше слово переносится как раньше
  const fontSize = Math.max(LANGUAGE_TITLE_MIN, Math.floor(fits * 2) / 2);
  return { fontSize, lineHeight: Math.round((fontSize * LANGUAGE_TITLE_LINE) / LANGUAGE_TITLE_SIZE) };
}
