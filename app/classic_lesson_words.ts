// classic_lesson_words.ts — «Слова урока» классических курсов fr/es/de/it из glossary.json.
// зачем (владелец 05.11: «по принципу уроков старого курса английского точно так же во все курсы всех языков; новые слова в словаре, которые
// встречаются в фразах — все; новый урок — новые слова БЕЗ ПОВТОРОВ предыдущих»): слова урока N = ТОЛЬКО леммы с firstLesson === N, то есть каждое
// слово лежит в том уроке, где оно впервые встретилось во фразах. Английский курс не трогаем — у него прежний словарь (lesson_words.tsx).
import type { Word } from './lesson_words';
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import { scheduleEnglishWordsSwitch } from './en_words_switch';

type Meaning = Readonly<Partial<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>>;
type GlossaryLemma = Readonly<{ lemma: string; meaning: Meaning; firstLesson: number; phraseIds?: readonly string[] }>;
type Glossary = Readonly<{ lemmas: readonly GlossaryLemma[] }>;

// зачем (координатор 05.11, пункт 2 плана 150: «в 150 только английский курс, слова — по уроку, только новые, все слова заданий покрыты»):
// en тоже берёт слова из glossary.json курса (910 лемм, все слова заданий покрыты). Прежний прогресс en переносится по тексту слова
// (app/en_words_switch.ts), ничего не теряется.
export type ClassicWordsLang = 'en' | 'es' | 'fr' | 'de' | 'it';

// Статические require — чтобы Metro вшил файлы; грузятся лениво (холодный старт не платит за словари).
const glossaryOf = lazyContent('classic_glossaries', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  en: require('../modules/classic-courses/en/glossary.json') as Glossary,
  es: require('../modules/classic-courses/es/glossary.json') as Glossary,
  fr: require('../modules/classic-courses/fr/glossary.json') as Glossary,
  de: require('../modules/classic-courses/de/glossary.json') as Glossary,
  it: require('../modules/classic-courses/it/glossary.json') as Glossary,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

export function isClassicWordsLang(target: unknown): target is ClassicWordsLang {
  return target === 'en' || target === 'es' || target === 'fr' || target === 'de' || target === 'it';
}

/** true, если у курса этого языка слова урока берутся из словаря курса (а не из английского банка). */
export function classicWordsActiveFor(target: unknown): target is ClassicWordsLang {
  return isClassicWordsLang(target) && classicCourseActiveFor(target);
}

const bankCache = new Map<string, Word[]>();

function classicLessonWordBankSnapshot(target: ClassicWordsLang, lessonId: number): Word[] {
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
      // зачем (F18): английское значение — отдельным полем, иначе английский интерфейс показывал вопросом само слово курса
      enGloss: m.en,
      pos: 'phrases',
      definition: m.ru ?? en,
    });
  }
  console.log(`[CLASSIC-WORDS] bank ${target} lesson=${lessonId} words=${out.length} (glossary lemmas=${lemmas.length})`); // guard-ok: трасса состава словаря урока
  bankCache.set(cacheKey, out);
  return out.slice();
}

/**
 * Exact active keys for progress parsing. Unlike the public bank accessor this
 * is deliberately storage-side-effect-free: app-launch cache warming must not
 * schedule an asynchronous migration merely to validate saved key names.
 */
export function classicLessonWordKeysForProgressCompatibility(
  target: ClassicWordsLang,
  lessonId: number,
): ReadonlySet<string> {
  return new Set(classicLessonWordBankSnapshot(target, lessonId).map((word) => word.en));
}

/** Слова урока N курса `target`: только леммы, впервые встретившиеся в уроке N. Пустой список — слов в уроке нет. */
export function classicLessonWordBank(target: ClassicWordsLang, lessonId: number): Word[] {
  // зачем: первое обращение к словам en запускает перенос прежнего прогресса (один раз за запуск, фоном, ничего не удаляет)
  if (target === 'en') scheduleEnglishWordsSwitch((id) => classicLessonWordBankSnapshot('en', id).map((w) => w.en));
  return classicLessonWordBankSnapshot(target, lessonId);
}

/** Урок, в котором слово словаря курса встречается впервые (самый ранний); undefined — слова нет в словаре. */
const firstLessonCache = new Map<ClassicWordsLang, ReadonlyMap<string, number>>();
export function classicWordFirstLesson(target: ClassicWordsLang, word: string): number | undefined {
  let map = firstLessonCache.get(target);
  if (!map) {
    const built = new Map<string, number>();
    try {
      for (const item of glossaryOf()[target]?.lemmas ?? []) {
        const key = String(item.lemma ?? '').trim().toLocaleLowerCase();
        if (!key) continue;
        const prev = built.get(key);
        if (prev === undefined || item.firstLesson < prev) built.set(key, item.firstLesson);
      }
    } catch (error: unknown) {
      console.warn('[CLASSIC-WORDS] first-lesson map failed', target, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    }
    map = built;
    firstLessonCache.set(target, map);
  }
  return map.get(word.toLocaleLowerCase());
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
