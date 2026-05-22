import type { Lang } from '../constants/i18n';
import { LESSON_WORD_ES_BY_EN } from './lesson_words_es_by_en';
import { LESSON_WORD_ES } from './lesson_words_es_map';
import { getLessonWordSourceLocaleGloss } from './lesson_words_source_locales';

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
  'pt-BR'?: string;
  vi?: string;
  id?: string;
  tr?: string;
  pl?: string;
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

const SINGULAR_NOUN_PROMPT_OVERRIDES: Record<string, { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> = {
  book: { ru: 'Книга', uk: 'Книжка', es: 'libro', 'pt-BR': 'livro', vi: 'sách', id: 'buku', tr: 'kitap', pl: 'książka' },
  car: { ru: 'Машина', uk: 'Машина', es: 'carro', 'pt-BR': 'carro', vi: 'xe hơi', id: 'mobil', tr: 'araba', pl: 'samochód' },
};

const VERB_PROMPT_OVERRIDES: Record<string, { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> = {
  bring: { ru: 'Приносить', uk: 'Приносити', es: 'traer', 'pt-BR': 'trazer', vi: 'mang đến', id: 'membawa', tr: 'getirmek', pl: 'przynosić' },
  brush: { ru: 'Чистить щёткой; расчёсывать', uk: 'Чистити щіткою; розчісувати', es: 'cepillar', 'pt-BR': 'escovar', vi: 'chải', id: 'menyikat', tr: 'fırçalamak', pl: 'szczotkować; czesać' },
  find: { ru: 'Находить', uk: 'Знаходити', es: 'encontrar', 'pt-BR': 'encontrar', vi: 'tìm thấy', id: 'menemukan', tr: 'bulmak', pl: 'znajdować' },
};

/**
 * Текст подсказки для раунда «узнай перевод» (RU / UK / ES).
 */
export function lessonWordRecognitionPrompt(word: LessonWordGlossInput, lang: Lang): string {
  if (lang !== 'ru' && lang !== 'uk' && lang !== 'es') {
    const plannedPrompt = (word as Record<string, unknown>)[lang as string];
    if (typeof plannedPrompt === 'string' && plannedPrompt.trim()) return plannedPrompt;
    const centralPrompt = getLessonWordSourceLocaleGloss(word.en, lang as never, word.pos);
    if (centralPrompt) return centralPrompt;
  }

  const enLower = word.en.trim().toLowerCase();
  const verbPrompt = word.pos === 'verbs' ? VERB_PROMPT_OVERRIDES[enLower] : undefined;
  if (verbPrompt) {
    if (lang === 'es') return verbPrompt.es;
    if (lang === 'ru') return verbPrompt.ru;
    if (lang === 'uk') return verbPrompt.uk;
  }
  const singularNoun = word.pos === 'nouns' ? SINGULAR_NOUN_PROMPT_OVERRIDES[enLower] : undefined;
  if (singularNoun) {
    if (lang === 'es') return singularNoun.es;
    if (lang === 'ru') return singularNoun.ru;
    if (lang === 'uk') return singularNoun.uk;
  }
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
  // tableware is narrower than generic "dishes"; keep "Посуда" free for dishes.
  if (enLower === 'tableware') {
    if (lang === 'ru') return 'Столовая посуда';
    if (lang === 'uk') return 'Столовий посуд';
  }
  // Узкий смысл (не confusing с what / now / early) задаём короткой глоссой как в словаре.
  if (lang === 'ru' && word.en === 'when') return 'Когда';
  if (lang === 'uk' && word.en === 'when') return 'Коли';
  // Thursday: RU is «Четверг»; «Четвер» is Ukrainian and can leak from stale rows.
  if (lang === 'ru' && enLower === 'thursday') return 'Четверг';
  if (lang === 'uk' && enLower === 'thursday') return 'Четвер';
  // Глагол visit ≠ сущ. views («просмотры»): показываем короткое пояснение прямо в подсказке.
  if (lang === 'ru' && enLower === 'visit') return 'Посещать (наведываться; не «просмотр» страницы — view)';
  if (lang === 'ru' && enLower === 'visits') return 'Посещает (она/он: she visits…; не «просмотры» — views)';
  if (lang === 'uk' && enLower === 'visit') return 'Відвідувати (не «перегляд» сторінки — view)';
  if (lang === 'uk' && enLower === 'visits') return 'Відвідує (вона/він: she visits…; не «перегляди» — views)';
  // fruits — мн. ч.; жалобы lesson_words word_fruits («Плодиков» и т.п. в старых сборках).
  if (lang === 'ru' && enLower === 'fruits') return 'Фрукты';
  if (lang === 'uk' && enLower === 'fruits') return 'Фрукти';
  // Словарная мн. числа — «детали» (номинатив), не «деталями» (твор.).
  if (lang === 'ru' && word.en === 'details' && /^деталями$/i.test(raw.trim())) return 'Детали';
  if (lang !== 'ru' || !EN_PLURAL_WEEKDAYS.has(word.en)) return raw;
  const s = raw.trim();
  if (!s) return raw;
  const rest = s.replace(/^по\s+/i, '').trim();
  if (!rest) return raw;
  return `По ${rest.toLowerCase()}`;
}
