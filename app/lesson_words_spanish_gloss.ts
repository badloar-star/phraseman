import type { Lang } from '../constants/i18n';
import { LESSON_WORD_ES_BY_EN } from './lesson_words_es_by_en';
import { LESSON_WORD_ES } from './lesson_words_es_map';

/** Минимальные поля слова для подсказки перевода в тренажёре словаря. */
export type LessonWordGlossInput = {
  en: string;
  ru: string;
  uk: string;
  es?: string;
};

/** on Mondays…Sundays — в RU естественно «по вторникам», а не обрыв «Вторникам». */
export const EN_PLURAL_WEEKDAYS = new Set<string>([
  'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays',
]);

/** Если в данных ещё нет `word.es`, для повторяющихся дней недели даём естественную глоссу. */
export const ES_PLURAL_WEEKDAY_GLOSS: Record<string, string> = {
  Mondays: 'Los lunes',
  Tuesdays: 'Los martes',
  Wednesdays: 'Los miércoles',
  Thursdays: 'Los jueves',
  Fridays: 'Los viernes',
  Saturdays: 'Los sábados',
  Sundays: 'Los domingos',
};

/**
 * Текст подсказки для раунда «узнай перевод» (RU / UK / ES).
 */
export function lessonWordRecognitionPrompt(word: LessonWordGlossInput, lang: Lang): string {
  if (lang === 'es') {
    if (word.es?.trim()) return word.es;
    const manual = LESSON_WORD_ES[word.en]?.trim();
    if (manual) return manual;
    const wk = ES_PLURAL_WEEKDAY_GLOSS[word.en];
    if (wk) return wk;
    const auto = LESSON_WORD_ES_BY_EN[word.en]?.trim();
    if (auto) return auto;
    return word.ru;
  }
  const raw = lang === 'uk' ? word.uk : word.ru;
  if (lang !== 'ru' || !EN_PLURAL_WEEKDAYS.has(word.en)) return raw;
  const s = raw.trim();
  if (!s) return raw;
  const rest = s.replace(/^по\s+/i, '').trim();
  if (!rest) return raw;
  return `По ${rest.toLowerCase()}`;
}
