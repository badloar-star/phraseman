// classic_theory_view.ts — «Теория» классических курсов fr/es/de/it в виде экрана TheoryLessonView (как в английском): разделы-аккордеон,
// примеры из фраз курса и ИНТЕРАКТИВНЫЕ ЗАДАНИЯ «Разделы n/m · задания k/N».
// зачем (владелец 05.11: «как в английском курсе»): задания УЖЕ написаны автором в theory.json (по 20 на урок × 32 урока × 4 языка:
// fr/it `drills`, de `lab`, es `sharedActivities`); здесь они превращаются в 4 вида заданий существующего экрана БЕЗ новых текстов курса:
//   choice/transfer/form → choice (выбери форму), spot → spot_slip (найди неверное слово), match → binary (какая фраза верна),
//   build/transform → word_bank (собери фразу). Порядок вариантов детерминирован (хэш id) — один и тот же ответ не «прыгает» между открытиями.
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import { getClassicTheory } from './classic_theory';
import { getRawClassicPhrases, rawPhraseTranslation, type RawClassicPhrase } from './classic_raw_phrases';
import type { TheoryBlock, TheoryDrill, TheorySection } from '../components/theory/TheoryLessonView';

type Target = 'es' | 'fr' | 'de' | 'it';
type Kind = 'choice' | 'spot_slip' | 'binary' | 'word_bank';
type Loc9 = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;

/** Короткие подписи интерфейса заданий (не контент курса). */
const UI = {
  part: { ru: 'Часть', uk: 'Частина', en: 'Part', es: 'Parte', 'pt-BR': 'Parte', vi: 'Phần', id: 'Bagian', tr: 'Bölüm', pl: 'Część' } as Loc9,
  forms: { ru: 'Формы', uk: 'Форми', en: 'Forms', es: 'Formas', 'pt-BR': 'Formas', vi: 'Dạng', id: 'Bentuk', tr: 'Biçimler', pl: 'Formy' } as Loc9,
  spot: {
    ru: 'Найди неверное слово', uk: 'Знайди неправильне слово', en: 'Find the wrong word', es: 'Encuentra la palabra incorrecta',
    'pt-BR': 'Encontre a palavra errada', vi: 'Tìm từ sai', id: 'Temukan kata yang salah', tr: 'Yanlış kelimeyi bul', pl: 'Znajdź błędne słowo',
  } as Loc9,
  binary: {
    ru: 'Какая фраза верна?', uk: 'Яка фраза правильна?', en: 'Which phrase is correct?', es: '¿Qué frase es correcta?',
    'pt-BR': 'Qual frase está correta?', vi: 'Câu nào đúng?', id: 'Kalimat mana yang benar?', tr: 'Hangi cümle doğru?', pl: 'Które zdanie jest poprawne?',
  } as Loc9,
} as const;

/** Подпись в формате IntroI18nText (ключи ru/uk/en/es/ptBr/…): интерфейс заданий выбирает строку по языку. */
function i18n(loc: Loc9, suffix = ''): Record<string, string> {
  return {
    ru: loc.ru + suffix, uk: loc.uk + suffix, en: loc.en + suffix, es: loc.es + suffix, ptBr: loc['pt-BR'] + suffix,
    vi: loc.vi + suffix, id: loc.id + suffix, tr: loc.tr + suffix, pl: loc.pl + suffix,
  };
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

function kindOf(raw: string): Kind | null {
  switch (raw) {
    case 'choice': case 'transfer': case 'form': return 'choice';
    case 'spot': return 'spot_slip';
    case 'match': return 'binary';
    case 'build': case 'transform': return 'word_bank';
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

function buildDrill(spec: DrillSpec, phrase: RawClassicPhrase, locale: string, byId: ReadonlyMap<string, RawClassicPhrase>): TheoryDrill | null {
  const words = wordsOf(phrase);
  const slot = spec.slot !== null && spec.slot >= 0 && spec.slot < words.length ? spec.slot : null;
  const correct = slot !== null ? words[slot]! : '';
  const whyText = spec.why ?? plain(phrase.target);
  switch (spec.kind) {
    case 'choice': {
      // фраза из одного слова не даёт задания «выбери форму» (остался бы один пропуск без контекста)
      if (slot === null || !correct || words.length < 2) return null;
      const pool = [correct, spec.bad, ...spec.options, ...(phrase.tiles[slot]?.distractors ?? [])];
      const options = shuffled(Array.from(new Set(pool.filter((x) => x))).slice(0, 3), spec.id);
      if (!options.includes(correct)) options[0] = correct;
      if (options.length < 2) return null;
      return { type: 'choice', before: words.slice(0, slot).join(' '), after: words.slice(slot + 1).join(' '), options, answer: correct, why: whyText };
    }
    case 'spot_slip': {
      if (slot === null || !spec.bad || spec.bad === correct) return null;
      const chips = words.map((w, i) => (i === slot ? spec.bad : w));
      return { type: 'spot_slip', chips, answerIndex: slot, hint: i18n(UI.spot), fix: spec.why ?? plain(phrase.target) };
    }
    case 'binary': {
      // es `match`: пара фраз — вопрос = перевод первой, варианты = обе фразы (автор дал пару id/other, текстов «почему» нет)
      const otherPhrase = spec.other ? byId.get(spec.other) : undefined;
      if (otherPhrase) {
        const question = rawPhraseTranslation(phrase, locale);
        if (!question || otherPhrase.target === phrase.target) return null;
        const first = hash(spec.id) % 2 === 0;
        return { type: 'binary', question: plain(question), optionA: first ? phrase.target : otherPhrase.target, optionB: first ? otherPhrase.target : phrase.target, correct: first ? 'A' : 'B', explain: plain(phrase.target) };
      }
      if (slot === null || !spec.bad || spec.bad === correct) return null;
      const right = phrase.target;
      const wrong = words.map((w, i) => (i === slot ? spec.bad : w)).join(' ');
      const rightFirst = hash(spec.id) % 2 === 0;
      return { type: 'binary', question: i18n(UI.binary), optionA: rightFirst ? right : wrong, optionB: rightFirst ? wrong : right, correct: rightFirst ? 'A' : 'B', explain: whyText };
    }
    case 'word_bank': {
      const prompt = rawPhraseTranslation(phrase, locale);
      if (!prompt || words.length < 2) return null;
      const extra = phrase.tiles.flatMap((t) => t.distractors).filter((d) => !words.includes(d));
      return { type: 'word_bank', prompt: plain(prompt), answer: words, distractors: shuffled(Array.from(new Set(extra)), spec.id).slice(0, 2) };
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
  const drillsBySection: TheoryDrill[][] = theory.sections.map(() => []);
  let built = 0;
  let skipped = 0;
  specs.forEach((spec, order) => {
    const phrase = byId.get(spec.phraseId);
    const drill = phrase ? buildDrill(spec, phrase, locale, byId) : null;
    if (!drill) {
      skipped += 1;
      console.log('[THEORY-DRILLS] drill skipped', JSON.stringify({ target: t, lessonId, id: spec.id, kind: spec.kind, phraseFound: !!phrase, slot: spec.slot })); // guard-ok: ранний выход с причиной
      return;
    }
    const chapterIndex = Math.min(sectionCount - 1, Math.max(0, (spec.chapter ?? (order % sectionCount) + 1) - 1));
    drillsBySection[chapterIndex]!.push(drill);
    built += 1;
  });
  const partWord = UI.part[(locale in UI.part ? locale : 'en') as keyof Loc9];
  let exampleTotal = 0;
  const sections: TheorySection[] = theory.sections.map((section, i) => {
    const blocks: TheoryBlock[] = [];
    if (i === 0) for (const line of theory.lead) blocks.push({ kind: 'body', text: line });
    blocks.push({ kind: 'body', text: section.body });
    if (section.examples.length > 0) {
      blocks.push({ kind: 'examples', examples: section.examples.slice(0, 6).map((e) => ({ en: e.target, translation: e.translation })) });
    }
    if (section.note) blocks.push({ kind: 'tip', text: section.note });
    if (i === theory.sections.length - 1) {
      if (theory.wrong && theory.right) blocks.push({ kind: 'fix', fixes: [{ wrong: theory.wrong, right: theory.right }] });
      if (theory.table.length > 0) blocks.push({ kind: 'note', text: theory.table.map(([a, b]) => `${a} — ${b}`).join('\n') });
      if (theory.strategy) blocks.push({ kind: 'tip', text: theory.strategy });
    }
    for (const drill of drillsBySection[i]!) blocks.push({ kind: 'drill', drill });
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
