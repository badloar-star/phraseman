// classic_lesson_words.ts — «Слова урока» классических курсов fr/es/de/it из glossary.json.
// зачем (владелец 05.11: «по принципу уроков старого курса английского точно так же во все курсы всех языков; новые слова в словаре, которые
// встречаются в фразах — все; новый урок — новые слова БЕЗ ПОВТОРОВ предыдущих»): слова урока N = ТОЛЬКО леммы с firstLesson === N, то есть каждое
// слово лежит в том уроке, где оно впервые встретилось во фразах. Английский курс не трогаем — у него прежний словарь (lesson_words.tsx).
import type { Word } from './lesson_words';
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';

type Meaning = Readonly<Partial<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>>;
type GlossaryLemma = Readonly<{ lemma: string; meaning: Meaning; firstLesson: number; phraseIds?: readonly string[] }>;
type Glossary = Readonly<{ lemmas: readonly GlossaryLemma[] }>;

export type ClassicWordsLang = 'es' | 'fr' | 'de' | 'it';

// Статические require — чтобы Metro вшил файлы; грузятся лениво (холодный старт не платит за словари).
const glossaryOf = lazyContent('classic_glossaries', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  es: require('../modules/classic-courses/es/glossary.json') as Glossary,
  fr: require('../modules/classic-courses/fr/glossary.json') as Glossary,
  de: require('../modules/classic-courses/de/glossary.json') as Glossary,
  it: require('../modules/classic-courses/it/glossary.json') as Glossary,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

export function isClassicWordsLang(target: unknown): target is ClassicWordsLang {
  return target === 'es' || target === 'fr' || target === 'de' || target === 'it';
}

/** true, если у курса этого языка слова урока берутся из словаря курса (а не из английского банка). */
export function classicWordsActiveFor(target: unknown): target is ClassicWordsLang {
  return isClassicWordsLang(target) && classicCourseActiveFor(target);
}

const bankCache = new Map<string, Word[]>();

/** Слова урока N курса `target`: только леммы, впервые встретившиеся в уроке N. Пустой список — слов в уроке нет. */
export function classicLessonWordBank(target: ClassicWordsLang, lessonId: number): Word[] {
  const cacheKey = `${target}:${lessonId}`;
  const cached = bankCache.get(cacheKey);
  if (cached) return cached.slice();
  const out: Word[] = [];
  let lemmas: readonly GlossaryLemma[] = [];
  try {
    lemmas = glossaryOf()[target]?.lemmas ?? [];
  } catch (error: unknown) {
    console.warn('[CLASSIC-WORDS] glossary load failed', target, error instanceof Error ? error.message : String(error)); // guard-ok: причина пустого списка слов
  }
  // зачем (владелец 05.11: «новый урок — новые слова БЕЗ ПОВТОРОВ предыдущих»): в словаре бывают одинаковые написания с разным значением
  // (es: clase, en, mañana…) под разными уроками — слово остаётся только в самом раннем из них.
  const earliest = new Map<string, number>();
  for (const item of lemmas) {
    const k = String(item.lemma ?? '').trim().toLocaleLowerCase();
    if (!k) continue;
    const prev = earliest.get(k);
    if (prev === undefined || item.firstLesson < prev) earliest.set(k, item.firstLesson);
  }
  const seen = new Set<string>();
  for (const item of lemmas) {
    if (item.firstLesson !== lessonId) continue;
    const lemma = String(item.lemma ?? '').trim();
    const key = lemma.toLocaleLowerCase();
    if (!lemma || seen.has(key)) continue;
    if (earliest.get(key) !== lessonId) continue;
    seen.add(key);
    const m = item.meaning ?? {};
    const en = m.en ?? lemma;
    out.push({
      en: lemma, // поле `en` в экране слов — слово ИЗУЧАЕМОГО языка (так же сделан французский банк)
      ru: m.ru ?? en,
      uk: m.uk ?? m.ru ?? en,
      es: m.es ?? en,
      'pt-BR': m['pt-BR'] ?? en,
      vi: m.vi ?? en,
      id: m.id ?? en,
      tr: m.tr ?? en,
      pl: m.pl ?? en,
      pos: 'phrases',
      definition: m.ru ?? en,
    });
  }
  console.log(`[CLASSIC-WORDS] bank ${target} lesson=${lessonId} words=${out.length} (glossary lemmas=${lemmas.length})`); // guard-ok: трасса состава словаря урока
  bankCache.set(cacheKey, out);
  return out.slice();
}

export function classicLessonWordCount(target: ClassicWordsLang, lessonId: number): number {
  return classicLessonWordBank(target, lessonId).length;
}

export function classicLessonWordKeys(target: ClassicWordsLang, lessonId: number): Set<string> {
  return new Set(classicLessonWordBank(target, lessonId).map((w) => w.en));
}

export default function __ClassicLessonWordsRouteShim() {
  return null;
}
