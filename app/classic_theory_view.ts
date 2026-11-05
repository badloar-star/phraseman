// classic_theory_view.ts — «Теория» классических курсов fr/es/de/it в виде экрана TheoryLessonView (как в английском): разделы-аккордеон,
// примеры из фраз курса и ИНТЕРАКТИВНЫЕ ЗАДАНИЯ «Разделы n/m · задания k/N».
// зачем (владелец 05.11: «как в английском курсе»): задания УЖЕ написаны автором в theory.json (по 20 на урок × 32 урока × 4 языка:
// fr/it `drills`, de `lab`, es `sharedActivities`); здесь они превращаются в 4 вида заданий существующего экрана БЕЗ новых текстов курса:
//   choice/form → «Выбери, как сказать», match → «Какая фраза значит…», build → «Собери фразу». Непонятные новичку виды (spot, transfer, transform) убраны
//   (стандарт «как ребёнку», 05.11). У каждого задания одна команда простыми словами, у первого в разделе — образец. Порядок вариантов детерминирован (хэш id) — один и тот же ответ не «прыгает» между открытиями.
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import { getClassicKnownWords, getClassicTheory, theoryTokens } from './classic_theory';
import { classicWordFirstLesson } from './classic_lesson_words';
import { getClassicPlainView } from './classic_theory_plain';
import { getRawClassicPhrases, rawPhraseTranslation, type RawClassicPhrase } from './classic_raw_phrases';
import type { TheoryBlock, TheoryDrill, TheorySection } from '../components/theory/TheoryLessonView';

type Target = 'es' | 'fr' | 'de' | 'it';
type Kind = 'choice' | 'binary' | 'word_bank';
type Loc9 = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;

/** Короткие подписи интерфейса заданий (не контент курса). {t} — перевод фразы на языке интерфейса. Список отдан Переводчику на проверку. */
const UI = {
  part: { ru: 'Часть', uk: 'Частина', en: 'Part', es: 'Parte', 'pt-BR': 'Parte', vi: 'Phần', id: 'Bagian', tr: 'Bölüm', pl: 'Część' } as Loc9,
  example: { ru: 'Образец', uk: 'Зразок', en: 'Example', es: 'Ejemplo', 'pt-BR': 'Exemplo', vi: 'Mẫu', id: 'Contoh', tr: 'Örnek', pl: 'Przykład' } as Loc9,
  // Одна понятная команда на задание — формулировки из docs/work/classic_task_commands_9lang.md (Ревизор/Переводчик; «вы»); дальше идёт фраза в кавычках.
  choose: { ru: 'Выберите, как сказать:', uk: 'Оберіть, як сказати:', en: 'Choose how to say:', es: 'Elija cómo decirlo:', 'pt-BR': 'Escolha como dizer:', vi: 'Chọn cách nói:', id: 'Pilih cara mengatakan:', tr: 'Nasıl söyleneceğini seçin:', pl: 'Wybierz, jak powiedzieć:' } as Loc9,
  build: { ru: 'Соберите фразу:', uk: 'Складіть фразу:', en: 'Build the sentence:', es: 'Arme la frase:', 'pt-BR': 'Monte a frase:', vi: 'Ghép câu:', id: 'Susun kalimatnya:', tr: 'Cümleyi kurun:', pl: 'Ułóż zdanie:' } as Loc9,
  which: { ru: 'Найдите верную фразу:', uk: 'Знайдіть правильну фразу:', en: 'Find the right sentence:', es: 'Encuentre la frase correcta:', 'pt-BR': 'Encontre a frase certa:', vi: 'Tìm câu đúng:', id: 'Temukan kalimat yang benar:', tr: 'Doğru cümleyi bulun:', pl: 'Znajdź poprawne zdanie:' } as Loc9,
} as const;

/** Команда задания на языке интерфейса; у первого задания раздела — готовый образец ответа. */
function instruction(kind: 'choose' | 'build' | 'which', translation: string, locale: string, sample: string | null): Record<string, string> {
  const key = (locale in UI.part ? locale : 'en') as keyof Loc9;
  const [open, close] = locale === 'ru' || locale === 'uk' || locale === 'es' || locale === 'pt-BR' ? ['«', '»'] : locale === 'pl' ? ['„', '”'] : ['“', '”'];
  const text = `${UI[kind][key]} ${open}${translation}${close}`;
  return plain(sample ? `${text}\n${UI.example[key]}: ${sample}` : text);
}

function plain(text: string): Record<string, string> {
  return { ru: text, uk: text, en: text, es: text, ptBr: text, vi: text, id: text, tr: text, pl: text };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Детерминированная перестановка по id (без Math.random: порядок не меняется между открытиями). */
function shuffled<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  let state = hash(seed) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Единая форма задания из любого формата файла. */
type DrillSpec = Readonly<{
  id: string;
  chapter: number | null; // 1-based, null — не указана
  phraseId: string;
  kind: Kind;
  slot: number | null; // 0-based позиция слова во фразе
  bad: string; // типичная ошибка / «рядом стоящая» неверная форма
  options: readonly string[];
  why: Record<string, string> | null;
  /** es `match`: id второй фразы пары (выбор «какая фраза переводит это»). */
  other: string;
}>;

const EXCLUDED_KINDS: ReadonlySet<string> = new Set(['spot', 'transfer', 'transform']);

function kindOf(raw: string): Kind | null {
  switch (raw) {
    // зачем (владелец 05.11: «не надо делать задания, которые без основательного контекста не понять»): оставлены три простых вида —
    // выбрать, как сказать; выбрать верную фразу; собрать фразу. «Найди неверную форму» (spot), «перенос» (transfer) и «преобразование» (transform) убраны.
    case 'choice': case 'form': return 'choice';
    case 'match': return 'binary';
    case 'build': return 'word_bank';
    default: return null;
  }
}

function fromAuthoredDrills(target: Target, lessonId: number, list: unknown[]): DrillSpec[] {
  const out: DrillSpec[] = [];
  for (const raw of list) {
    const d = obj(raw);
    const kind = kindOf(str(d.kind));
    const item = num(d.item);
    if (!kind || item === null) {
      if (!kind && EXCLUDED_KINDS.has(str(d.kind))) continue;
      console.log('[THEORY-DRILLS] drill skipped (kind/item)', JSON.stringify({ target, lessonId, id: str(d.id), kind: str(d.kind), item })); // guard-ok: ранний выход с причиной
      continue;
    }
    out.push({
      id: str(d.id) || `${target}:${pad2(lessonId)}:${pad2(item)}:lab`,
      chapter: num(d.chapter),
      phraseId: `${target}:${pad2(lessonId)}:${pad2(item)}`,
      kind,
      slot: num(d.slot),
      bad: str(d.bad),
      options: arr(d.options).map(str).filter((x) => x),
      why: null,
      other: '',
    });
  }
  return out;
}

function fromStudioActivities(target: Target, lessonId: number, data: Record<string, unknown>, locale: string): DrillSpec[] {
  const activities = arr(data.sharedActivities);
  const chapterOf = new Map<number, number>();
  arr(data.chapterActivities).forEach((pair, chapterIndex) => {
    for (const idx of arr(pair)) {
      const n = num(idx);
      if (n !== null && !chapterOf.has(n)) chapterOf.set(n, chapterIndex + 1);
    }
  });
  const out: DrillSpec[] = [];
  activities.forEach((raw, index) => {
    const a = obj(raw);
    const kind = kindOf(str(a.kind));
    const id = str(a.id);
    if (!kind || !id) {
      if (!kind && EXCLUDED_KINDS.has(str(a.kind))) return;
      console.log('[THEORY-DRILLS] activity skipped (kind/id)', JSON.stringify({ target, lessonId, index, kind: str(a.kind) })); // guard-ok: ранний выход с причиной
      return;
    }
    const seq = arr(a.seq).map(str);
    const right = str(a.right);
    const slotFromSeq = right ? seq.indexOf(right) : -1;
    const fb = obj(a.feedback);
    const why = Object.keys(fb).length > 0
      ? { ru: str(fb.ru), uk: str(fb.uk) || str(fb.ru), en: str(fb.en) || str(fb.ru), es: str(fb.es) || str(fb.en) || str(fb.ru), ptBr: str(fb['pt-BR']) || str(fb.en), vi: str(fb.vi) || str(fb.en), id: str(fb.id) || str(fb.en), tr: str(fb.tr) || str(fb.en), pl: str(fb.pl) || str(fb.en) }
      : null;
    void locale;
    out.push({
      id: `${id}:${index}`,
      chapter: chapterOf.get(index) ?? null,
      phraseId: id,
      kind,
      slot: slotFromSeq >= 0 ? slotFromSeq : num(a.i),
      bad: str(a.near),
      options: [right, str(a.near)].filter((x) => x),
      why,
      other: str(a.other),
    });
  });
  return out;
}

function wordsOf(p: RawClassicPhrase): string[] {
  return p.tiles.map((t) => t.correct || t.text);
}

/** Слова строки, которых нет среди введённых теорией (пусто — все известны). */
function unknownWords(text: string, introduced: (word: string) => boolean): string[] {
  return theoryTokens(text).filter((w) => !introduced(w));
}

function buildDrill(spec: DrillSpec, phrase: RawClassicPhrase, locale: string, byId: ReadonlyMap<string, RawClassicPhrase>, sample: string | null, introduced: (word: string) => boolean): TheoryDrill | null {
  // зачем (Ревизор 05.11): задание может использовать только слова, уже встреченные в теории этого и прошлых уроков (est/là/au/prêt… не вводились)
  const unknown = unknownWords(phrase.target, introduced);
  if (unknown.length > 0) {
    console.log('[THEORY-DRILLS] drill skipped (слова не введены теорией)', JSON.stringify({ id: spec.id, kind: spec.kind, unknown })); // guard-ok: ранний выход с причиной
    return null;
  }
  const words = wordsOf(phrase);
  const slot = spec.slot !== null && spec.slot >= 0 && spec.slot < words.length ? spec.slot : null;
  const correct = slot !== null ? words[slot]! : '';
  // зачем: после ответа показываем верную фразу целиком, а не грамматический комментарий автора (стандарт «как ребёнку»)
  const whyText = plain(phrase.target);
  const translation = rawPhraseTranslation(phrase, locale);
  if (!translation) return null;
  switch (spec.kind) {
    case 'choice': {
      // фраза из одного слова не даёт задания «выбери форму» (остался бы один пропуск без контекста)
      if (slot === null || !correct || words.length < 2) return null;
      const pool = [correct, spec.bad, ...spec.options, ...(phrase.tiles[slot]?.distractors ?? [])];
      // варианты ответа тоже только из введённых слов (верное слово — всегда)
      const options = shuffled(Array.from(new Set(pool.filter((x) => x && (x === correct || unknownWords(x, introduced).length === 0)))).slice(0, 3), spec.id);
      if (!options.includes(correct)) options[0] = correct;
      if (options.length < 2) return null;
      return { type: 'choice', instruction: instruction('choose', translation, locale, sample), before: words.slice(0, slot).join(' '), after: words.slice(slot + 1).join(' '), options, answer: correct, why: whyText };
    }
    case 'binary': {
      // es `match`: пара фраз — варианты = обе фразы; fr/it/de: верная фраза и та же с типичной ошибкой на месте slot
      const otherPhrase = spec.other ? byId.get(spec.other) : undefined;
      let wrong = '';
      if (otherPhrase) {
        wrong = otherPhrase.target;
      } else if (slot !== null && spec.bad && spec.bad !== correct) {
        wrong = words.map((w, i) => (i === slot ? spec.bad : w)).join(' ');
      }
      if (!wrong || wrong === phrase.target) return null;
      const wrongUnknown = unknownWords(wrong, introduced);
      if (wrongUnknown.length > 0) {
        console.log('[THEORY-DRILLS] drill skipped (неверный вариант со словами вне теории)', JSON.stringify({ id: spec.id, unknown: wrongUnknown })); // guard-ok: ранний выход с причиной
        return null;
      }
      const rightFirst = hash(spec.id) % 2 === 0;
      return { type: 'binary', question: instruction('which', translation, locale, sample), optionA: rightFirst ? phrase.target : wrong, optionB: rightFirst ? wrong : phrase.target, correct: rightFirst ? 'A' : 'B', explain: whyText };
    }
    case 'word_bank': {
      if (words.length < 2) return null;
      const extra = phrase.tiles.flatMap((t) => t.distractors).filter((d) => !words.includes(d));
      return { type: 'word_bank', instruction: instruction('build', translation, locale, sample), prompt: plain(translation), answer: words, distractors: shuffled(Array.from(new Set(extra.filter((d) => unknownWords(d, introduced).length === 0))), spec.id).slice(0, 2) };
    }
    default:
      return null;
  }
}

export type ClassicTheoryView = Readonly<{
  title: string;
  sections: TheorySection[];
  metrics: Readonly<{ sections: number; examples: number; drills: number }>;
}>;

const viewCache = new Map<string, ClassicTheoryView | null>();
const filesOf = lazyContent('classic_theory_view_files', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  es: require('../modules/classic-courses/es/theory.json') as { data?: Record<string, unknown> },
  fr: require('../modules/classic-courses/fr/theory.json') as { data?: Record<string, unknown> },
  de: require('../modules/classic-courses/de/theory.json') as { data?: Record<string, unknown> },
  it: require('../modules/classic-courses/it/theory.json') as { data?: Record<string, unknown> },
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

/** Теория урока в виде разделов экрана TheoryLessonView + задания. null — у курса для урока теории нет (пункт скрыт). */
export function getClassicTheoryView(target: unknown, lessonId: number, locale: string): ClassicTheoryView | null {
  if (!classicCourseActiveFor(target) || target === 'en') return null;
  const t = target as Target;
  const key = `${t}:${lessonId}:${locale}`;
  if (viewCache.has(key)) return viewCache.get(key) ?? null;
  // новый формат «как для ребёнка» (plain:true) — отдельный разбор; старые уроки идут ниже прежним путём
  const plainView = getClassicPlainView(t, lessonId, locale);
  if (plainView) {
    viewCache.set(key, plainView);
    return plainView;
  }
  const theory = getClassicTheory(t, lessonId, locale);
  if (!theory) {
    console.log('[THEORY-DRILLS] нет теории для урока', JSON.stringify({ target: t, lessonId, locale })); // guard-ok: ранний выход с причиной
    viewCache.set(key, null);
    return null;
  }
  const data = obj(obj(filesOf()[t]?.data)[String(lessonId)]);
  const specs = data.localized
    ? fromStudioActivities(t, lessonId, data, locale)
    : fromAuthoredDrills(t, lessonId, arr(data.drills).length > 0 ? arr(data.drills) : arr(data.lab));
  const phrases = getRawClassicPhrases(t, lessonId);
  const byId = new Map(phrases.map((p) => [p.id, p] as const));
  const sectionCount = theory.sections.length;
  const pending: { spec: DrillSpec; phrase: RawClassicPhrase }[][] = theory.sections.map(() => []);
  let skipped = 0;
  specs.forEach((spec, order) => {
    const phrase = byId.get(spec.phraseId);
    if (!phrase) {
      skipped += 1;
      console.log('[THEORY-DRILLS] drill skipped (нет фразы)', JSON.stringify({ target: t, lessonId, id: spec.id, kind: spec.kind, phraseId: spec.phraseId })); // guard-ok: ранний выход с причиной
      return;
    }
    const chapterIndex = Math.min(sectionCount - 1, Math.max(0, (spec.chapter ?? (order % sectionCount) + 1) - 1));
    pending[chapterIndex]!.push({ spec, phrase });
  });
  const partWord = UI.part[(locale in UI.part ? locale : 'en') as keyof Loc9];
  let exampleTotal = 0;
  let built = 0;
  const sections: TheorySection[] = theory.sections.map((section, i) => {
    // зачем (владелец 05.11: «понятно как ребёнку»): на экране только простой текст главы, примеры и задания. Без блоков «нюансы», «стратегия»,
    // «ошибка → верно», таблицы форм и справок — они остаются в данных и вернутся, когда Теория перепишет их простыми словами.
    const blocks: TheoryBlock[] = [{ kind: 'body', text: section.body }];
    if (section.examples.length > 0) {
      // зачем (владелец 06.11): под фразой — «Читается: …» (ru/uk), как у теории нового формата; данные — modules/classic-courses/<lang>/say.json
      const readingLabel = locale === 'uk' ? 'Читається' : 'Читается';
      blocks.push({ kind: 'examples', examples: section.examples.slice(0, 6).map((e) => ({ en: e.target, translation: e.translation, ...(e.reading ? { reading: `${readingLabel}: ${e.reading}` } : {}) })) });
    }
    const first = section.examples[0];
    const sampleLine = first ? `${first.target} — ${first.translation}` : null;
    // слово «введено», если встретилось в теории до этого раздела И в словаре курса его первый урок не позже текущего (владелец/Ревизор 05.11)
    const knownHere = getClassicKnownWords(t, lessonId, i);
    const introduced = (word: string): boolean => {
      if (!knownHere.has(word)) return false;
      const first = classicWordFirstLesson(t, word);
      return first === undefined || first <= lessonId;
    };
    let builtHere = 0;
    pending[i]!.forEach((entry) => {
      const drill = buildDrill(entry.spec, entry.phrase, locale, byId, builtHere === 0 ? sampleLine : null, introduced);
      if (!drill) {
        skipped += 1;
        console.log('[THEORY-DRILLS] drill skipped', JSON.stringify({ target: t, lessonId, id: entry.spec.id, kind: entry.spec.kind, slot: entry.spec.slot })); // guard-ok: ранний выход с причиной
        return;
      }
      blocks.push({ kind: 'drill', drill });
      builtHere += 1;
      built += 1;
    });
    exampleTotal += section.examples.length;
    return {
      num: pad2(i + 1),
      title: section.title || `${partWord} ${i + 1}`,
      exampleCount: section.examples.length,
      defaultOpen: i === 0,
      blocks,
    };
  });
  console.log(`[THEORY-DRILLS] view ${t} lesson=${lessonId} locale=${locale} sections=${sections.length} drills=${built} skipped=${skipped} specs=${specs.length}`); // guard-ok: трасса сборки экрана
  const view: ClassicTheoryView = { title: theory.title, sections, metrics: { sections: sections.length, examples: exampleTotal, drills: built } };
  viewCache.set(key, view);
  return view;
}

export default function __ClassicTheoryViewRouteShim() {
  return null;
}
