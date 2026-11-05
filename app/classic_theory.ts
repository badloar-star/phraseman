// classic_theory.ts — «Теория» классических курсов fr/es/de/it из modules/classic-courses/<lang>/theory.json.
// зачем (владелец 05.11: «Раздел теория во всех языках английский показывает»): теория не-английского курса — это ЕГО теория (главы с примерами
// из фраз курса, тексты на языке интерфейса), а не английские am/is/are. Вступление урока (intro.json) — отдельная вещь и теорией не подменяется.
// Два формата файлов: `chapters` (fr/de/it: chapters[{exampleIds,textByLocale}], title, table) и `studio2` (es: localized[locale] с главами,
// формулой, историей, таблицей). Оба приводятся к одной форме ClassicTheory на нужную локаль интерфейса.
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import { getRawClassicPhrases, rawPhraseTranslation } from './classic_raw_phrases';

export type ClassicTheoryExample = Readonly<{ target: string; translation: string }>;
export type ClassicTheorySection = Readonly<{
  title?: string;
  body: string;
  note?: string;
  examples: readonly ClassicTheoryExample[];
}>;
export type ClassicTheory = Readonly<{
  title: string;
  /** Короткие вводные строки (формула, история, правило) — перед главами. */
  lead: readonly string[];
  sections: readonly ClassicTheorySection[];
  /** Таблица форм: строки из двух колонок. */
  table: readonly (readonly [string, string])[];
  /** Ошибка → верно (если автор дал пару). */
  wrong?: string;
  right?: string;
  /** Совет «как не ошибиться». */
  strategy?: string;
}>;

type Loc = Readonly<Record<string, string>>;
type RawFile = Readonly<{ format?: string; data?: Readonly<Record<string, unknown>> }>;

const filesOf = lazyContent('classic_theory_files', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  es: require('../modules/classic-courses/es/theory.json') as RawFile,
  fr: require('../modules/classic-courses/fr/theory.json') as RawFile,
  de: require('../modules/classic-courses/de/theory.json') as RawFile,
  it: require('../modules/classic-courses/it/theory.json') as RawFile,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Текст под локаль интерфейса: своя → английская → русская → первая непустая. */
function pick(map: unknown, locale: string): string {
  const m = obj(map) as Loc;
  return str(m[locale]) || str(m.en) || str(m.ru) || Object.values(m).map(str).find((x) => x) || '';
}

/** Обратные кавычки в данных — разметка слов изучаемого языка; в тексте экрана они не нужны. */
export function stripTheoryMarkup(text: string): string {
  return text.replace(/`/g, '');
}

function examplesFor(target: 'es' | 'fr' | 'de' | 'it', lessonId: number, ids: unknown, locale: string): ClassicTheoryExample[] {
  const phrases = getRawClassicPhrases(target, lessonId);
  const out: ClassicTheoryExample[] = [];
  for (const raw of arr(ids)) {
    const id = str(raw);
    if (!id) continue;
    const p = phrases.find((x) => x.id === id || x.id.endsWith(`:${id}`));
    if (!p) continue;
    // зачем: перевод на ЯЗЫК ИНТЕРФЕЙСА (включая английский); раньше en в данных терялся и англоязычный интерфейс получал русский перевод.
    out.push({ target: p.target, translation: rawPhraseTranslation(p, locale) });
  }
  return out;
}

/** Первое предложение главы как название, если оно короче 70 знаков; иначе undefined (экран подставит «Часть N»). */
export function firstSentenceTitle(body: string): string | undefined {
  const m = body.match(/^[^.!?…\n]{3,69}[.!?…]?/);
  const text = (m?.[0] ?? '').trim().replace(/[.!?…]+$/, '');
  return text.length >= 3 && text.length <= 70 && text.length < body.length ? text : undefined;
}

function fromChapters(target: 'es' | 'fr' | 'de' | 'it', lessonId: number, d: Record<string, unknown>, locale: string): ClassicTheory | null {
  const chapters = arr(d.chapters);
  if (chapters.length === 0) return null;
  const sections: ClassicTheorySection[] = [];
  for (const c of chapters) {
    const ch = obj(c);
    const body = stripTheoryMarkup(pick(ch.textByLocale, locale));
    if (!body) continue;
    // зачем: название главы — своё (titleByLocale, Теория 12) или первое предложение текста; «Часть N» остаётся последним запасным вариантом
    const explicit = stripTheoryMarkup(pick(ch.titleByLocale, locale));
    sections.push({ title: explicit || firstSentenceTitle(body), body, examples: examplesFor(target, lessonId, ch.exampleIds, locale) });
  }
  if (sections.length === 0) return null;
  const table: [string, string][] = [];
  for (const row of arr(d.table)) {
    const cells = arr(row).map(str);
    if (cells.length >= 2 && cells[0] && cells[1]) table.push([stripTheoryMarkup(cells[0]), stripTheoryMarkup(cells[1])]);
  }
  return { title: stripTheoryMarkup(pick(d.title, locale)), lead: [], sections, table };
}

function fromStudio2(target: 'es' | 'fr' | 'de' | 'it', lessonId: number, d: Record<string, unknown>, locale: string): ClassicTheory | null {
  const localized = obj(d.localized);
  const loc = obj(localized[locale] ?? localized.en ?? localized.ru);
  const chapters = arr(loc.chapters);
  if (chapters.length === 0) return null;
  const sections: ClassicTheorySection[] = [];
  for (const c of chapters) {
    const ch = obj(c);
    const body = stripTheoryMarkup(str(ch.body));
    if (!body) continue;
    sections.push({
      title: stripTheoryMarkup(str(ch.title)) || undefined,
      body,
      note: stripTheoryMarkup(str(ch.note)) || undefined,
      examples: examplesFor(target, lessonId, ch.samples, locale),
    });
  }
  if (sections.length === 0) return null;
  const table: [string, string][] = [];
  for (const t of arr(loc.tables)) {
    for (const row of arr(obj(t).rows)) {
      const r = obj(row);
      const left = str(r[target]);
      const right = [str(r.gloss), str(r.sample)].filter((x) => x).join(' · ');
      if (left && right) table.push([stripTheoryMarkup(left), stripTheoryMarkup(right)]);
    }
  }
  const lead = [str(loc.formula), str(loc.story), str(loc.use), str(loc.choose), str(loc.nuance)].map(stripTheoryMarkup).filter((x) => x);
  return {
    title: stripTheoryMarkup(str(loc.title)),
    lead,
    sections,
    table,
    wrong: stripTheoryMarkup(str(loc.wrong)) || undefined,
    right: stripTheoryMarkup(str(loc.right)) || undefined,
    strategy: stripTheoryMarkup(pick(d.strategy, locale)) || undefined,
  };
}

// ─── Слова, «введённые» теорией ────────────────────────────────────────────────────────────────────────────────────────────
// зачем (Ревизор 05.11: в заданиях слова, которых человек ещё не видел — est/là/au/prêt, è/pronto, müde/lerne…): задание урока N может
// использовать только слова, которые уже встретились на экране теории — в текстах глав и примерах ЭТОГО урока (до раздела с заданием
// включительно) или прошлых уроков. Набор не зависит от языка интерфейса (берём тексты всех локалей): состав заданий не «прыгает» при смене языка.
const TOKEN_RE = /[\p{L}\p{M}]+/gu;

/** Слова строки в нижнем регистре; апострофы делят слово (n’est → n, est). */
export function theoryTokens(text: string): string[] {
  return (text.toLocaleLowerCase().match(TOKEN_RE) ?? []);
}

function addTokens(into: Set<string>, text: unknown): void {
  if (typeof text === 'string') for (const w of theoryTokens(text)) into.add(w);
}

function addPhraseTokens(into: Set<string>, target: 'es' | 'fr' | 'de' | 'it', lessonId: number, ids: unknown): void {
  const phrases = getRawClassicPhrases(target, lessonId);
  for (const raw of arr(ids)) {
    const id = str(raw);
    const p = phrases.find((x) => x.id === id || x.id.endsWith(`:${id}`));
    if (p) addTokens(into, p.target);
  }
}

const sectionWordsCache = new Map<string, Set<string>[]>();

/** Слова по разделам теории урока (каждый элемент — слова одного раздела: текст всех локалей, название и примеры). */
export function getClassicSectionWords(target: 'es' | 'fr' | 'de' | 'it', lessonId: number): Set<string>[] {
  const key = `${target}:${lessonId}`;
  const cached = sectionWordsCache.get(key);
  if (cached) return cached;
  const out: Set<string>[] = [];
  try {
    const d = obj(obj(filesOf()[target]?.data)[String(lessonId)]);
    if (d.localized) {
      const localized = obj(d.localized);
      const base = arr(obj(localized.ru).chapters).length || arr(obj(localized.en).chapters).length;
      for (let i = 0; i < base; i += 1) {
        const words = new Set<string>();
        for (const loc of Object.values(localized)) {
          const ch = obj(arr(obj(loc).chapters)[i]);
          addTokens(words, ch.title);
          addTokens(words, ch.body);
          addPhraseTokens(words, target, lessonId, ch.samples);
        }
        out.push(words);
      }
    } else {
      for (const c of arr(d.chapters)) {
        const ch = obj(c);
        const words = new Set<string>();
        for (const text of Object.values(obj(ch.textByLocale))) addTokens(words, text);
        for (const text of Object.values(obj(ch.titleByLocale))) addTokens(words, text);
        addPhraseTokens(words, target, lessonId, ch.exampleIds);
        out.push(words);
      }
    }
  } catch (error: unknown) {
    console.warn('[THEORY-DRILLS] section words failed', target, lessonId, error instanceof Error ? error.message : String(error)); // guard-ok: причина пустого набора слов
  }
  sectionWordsCache.set(key, out);
  return out;
}

/** Слова, введённые к разделу sectionIndex урока lessonId: все разделы прошлых уроков + разделы 0..sectionIndex этого урока. */
export function getClassicKnownWords(target: 'es' | 'fr' | 'de' | 'it', lessonId: number, sectionIndex: number): Set<string> {
  const known = new Set<string>();
  for (let n = 1; n < lessonId; n += 1) for (const words of getClassicSectionWords(target, n)) for (const w of words) known.add(w);
  const own = getClassicSectionWords(target, lessonId);
  for (let i = 0; i <= Math.min(sectionIndex, own.length - 1); i += 1) for (const w of own[i]!) known.add(w);
  return known;
}

const cache = new Map<string, ClassicTheory | null>();

/** Теория урока на языке интерфейса; null — у курса для этого урока теории нет (пункт скрывается, английский не подставляется). */
export function getClassicTheory(target: unknown, lessonId: number, locale: string): ClassicTheory | null {
  if (!classicCourseActiveFor(target) || target === 'en') return null;
  const t = target as 'es' | 'fr' | 'de' | 'it';
  const key = `${t}:${lessonId}:${locale}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let result: ClassicTheory | null = null;
  try {
    const file = filesOf()[t];
    const d = obj(obj(file?.data)[String(lessonId)]);
    if (Object.keys(d).length > 0) {
      result = file?.format === 'studio2' || d.localized ? fromStudio2(t, lessonId, d, locale) : fromChapters(t, lessonId, d, locale);
    }
  } catch (error: unknown) {
    console.warn('[CLASSIC-THEORY] load failed', t, lessonId, error instanceof Error ? error.message : String(error)); // guard-ok: причина отсутствия теории
  }
  console.log(`[CLASSIC-THEORY] ${t} lesson=${lessonId} locale=${locale} sections=${result?.sections.length ?? 0} table=${result?.table.length ?? 0}`); // guard-ok: трасса выбора теории
  cache.set(key, result);
  return result;
}

export default function __ClassicTheoryRouteShim() {
  return null;
}
