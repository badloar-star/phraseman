import type { Lang } from '../constants/i18n';
import { LESSON_WORD_ES_BY_EN } from './lesson_words_es_by_en';
import { LESSON_WORD_ES } from './lesson_words_es_map';

/** Часть речи словаря (`lesson_words`) — для эвристики мн. числа в скобках. */
export type LessonWordGlossPos =
  | 'pronouns'
  | 'verbs'
  | 'irregular_verbs'
  | 'adjectives'
  | 'adverbs'
  | 'nouns'
  | 'prepositions'
  | 'conjunctions'
  | 'articles'
  | 'phrases';

/** Минимальные поля слова для подсказки перевода в тренажёре словаря. */
export type LessonWordGlossInput = {
  en: string;
  ru: string;
  uk: string;
  es?: string;
  /** Если задано, для `nouns` снимаем и `(folders)` при лемме `folder`. */
  pos?: LessonWordGlossPos;
};

/**
 * Лемма + «s» как 3 л. наст. (puts), а не мн. ч. — не считать совпадением с `(puts)` при `put` + pos nouns.
 */
const LEMMA_PLUS_S_NOT_NOUN_PLURAL = new Set([
  'put',
  'set',
  'cut',
  'let',
  'bet',
  'bit',
  'fit',
  'hit',
  'sit',
  'quit',
  'knit',
  'shut',
  'wet',
  'go',
  'do',
]);

/**
 * Текст в скобках или после «/» в конце глоссы — это подсказка к тому же EN-слову, что и `en`
 * (точное совпадение или мн./ед. для существительных).
 */
export function englishDisambigTokenMatchesLemma(token: string, en: string, pos?: string): boolean {
  const i = token.trim().toLowerCase();
  const e = en.trim().toLowerCase();
  if (!i || !e) return false;
  if (i === e) return true;
  if (pos !== 'nouns') return false;
  if (/[^aeiou]y$/i.test(e) && i === `${e.slice(0, -1)}ies`) return true;
  if (/[^aeiou]y$/i.test(i) && e === `${i.slice(0, -1)}ies`) return true;
  if (i === `${e}es` || e === `${i}es`) return true;
  if (i === `${e}s` && !LEMMA_PLUS_S_NOT_NOUN_PLURAL.has(e)) return true;
  if (e === `${i}s` && !LEMMA_PLUS_S_NOT_NOUN_PLURAL.has(i)) return true;
  return false;
}

/**
 * Раунд «выберите английский перевод»: хвост «… (washes)» или «… / puts» дублирует правильный ответ.
 * Снимаем только финальные скобки или финальный сегмент после «/», если он совпадает с леммой `en`
 * (не трогаем «Ты / Вы», «Реклама / объявление» и т.п., где после «/» не английская лемма).
 */
export function stripTrailingEnglishHeadwordParen(raw: string, en: string, pos?: string): string {
  const enNorm = en.trim().toLowerCase();
  if (!enNorm) return raw;
  let s = raw.trimEnd();
  for (;;) {
    let changed = false;
    const m = s.match(/\s*\(\s*([^)]*?)\s*\)\s*$/);
    if (m && englishDisambigTokenMatchesLemma(m[1], en, pos)) {
      s = s.slice(0, m.index).trimEnd();
      changed = true;
    }
    const slashIdx = s.lastIndexOf('/');
    if (slashIdx > 0) {
      const left = s.slice(0, slashIdx).trimEnd();
      const right = s.slice(slashIdx + 1).trim();
      if (left.length > 0 && englishDisambigTokenMatchesLemma(right, en, pos)) {
        s = left;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s;
}

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
  const raw = stripTrailingEnglishHeadwordParen(lang === 'uk' ? word.uk : word.ru, word.en, word.pos);
  // Узкий смысл (не confusing с what / now / early) задаём короткой глоссой как в словаре.
  if (lang === 'ru' && word.en === 'when') return 'Когда';
  if (lang === 'uk' && word.en === 'when') return 'Коли';
  // Глагол visit ≠ сущ. views («просмотры»): показываем короткое пояснение прямо в подсказке.
  if (lang === 'ru' && word.en.toLowerCase() === 'visit') return 'Посещать (наведываться; не «просмотр» страницы — view)';
  if (lang === 'ru' && word.en.toLowerCase() === 'visits') return 'Посещает (она/он: she visits…; не «просмотры» — views)';
  if (lang === 'uk' && word.en.toLowerCase() === 'visit') return 'Відвідувати (не «перегляд» сторінки — view)';
  if (lang === 'uk' && word.en.toLowerCase() === 'visits') return 'Відвідує (вона/він: she visits…; не «перегляди» — views)';
  // fruits — мн. ч.; жалобы lesson_words word_fruits («Плодиков» и т.п. в старых сборках).
  if (lang === 'ru' && word.en.toLowerCase() === 'fruits') return 'Фрукты';
  if (lang === 'uk' && word.en.toLowerCase() === 'fruits') return 'Фрукти';
  // Словарная мн. числа — «детали» (номинатив), не «деталями» (твор.).
  if (lang === 'ru' && word.en === 'details' && /^деталями$/i.test(raw.trim())) return 'Детали';
  if (lang !== 'ru' || !EN_PLURAL_WEEKDAYS.has(word.en)) return raw;
  const s = raw.trim();
  if (!s) return raw;
  const rest = s.replace(/^по\s+/i, '').trim();
  if (!rest) return raw;
  return `По ${rest.toLowerCase()}`;
}
