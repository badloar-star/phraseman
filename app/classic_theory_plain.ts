// classic_theory_plain.ts — теория урока в НОВОМ формате «как для ребёнка» (Теория 12, 05.11): data[N].plain === true в theory.json курса.
// Форма: { plain, title{9}, chapters[{ id, titleByLocale, textByLocale (строки через \n), translated,
//          examples[{phraseId, say{ru,uk}}], practice[{commandByLocale, sample, promptPhraseId, options[id…], answerId}] }] }.
// Рендер: название главы → строки текста (каждая отдельным абзацем) → карточки примеров (фраза курса + перевод + «Читается: …» для ru/uk)
// → задания: sample:true — сразу показан верный ответ (не засчитывается), sample:false — задание «выберите верную фразу».
// Старые уроки (без plain) идут прежним путём (classic_theory_view.ts). Тексты и команды берутся ИЗ ДАННЫХ — код ничего не подставляет.
import { lazyContent } from './content_lazy';
import { classicCourseActiveFor } from './classic_course_phrases';
import type { ClassicCourseLang } from './classic_course_registry.gen';
import { getRawClassicPhrases, rawPhraseTranslation, type RawClassicPhrase } from './classic_raw_phrases';
import type { TheoryBlock, TheoryDrill, TheoryExample, TheorySection } from '../components/theory/TheoryLessonView';
import type { ClassicTheoryView } from './classic_theory_view';

type RawFile = { data?: Record<string, unknown> };

const filesOf = lazyContent('classic_theory_plain_files', () => ({
  /* eslint-disable @typescript-eslint/no-require-imports */
  en: require('../modules/classic-courses/en/theory.json') as RawFile,
  es: require('../modules/classic-courses/es/theory.json') as RawFile,
  fr: require('../modules/classic-courses/fr/theory.json') as RawFile,
  de: require('../modules/classic-courses/de/theory.json') as RawFile,
  it: require('../modules/classic-courses/it/theory.json') as RawFile,
  /* eslint-enable @typescript-eslint/no-require-imports */
}));

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Текст под локаль интерфейса: своя → английская → русская. */
function pick(map: unknown, locale: string): string {
  const m = obj(map);
  return str(m[locale]) || str(m.en) || str(m.ru);
}

function plain(text: string): Record<string, string> {
  return { ru: text, uk: text, en: text, es: text, ptBr: text, vi: text, id: text, tr: text, pl: text };
}

const READING_LABEL: Readonly<Record<string, string>> = { ru: 'Читается', uk: 'Читається' };

/** true, если урок написан в новом формате. */
export function isClassicPlainLesson(target: unknown, lessonId: number): boolean {
  if (!classicCourseActiveFor(target)) return false;
  try {
    return obj(obj(filesOf()[target as ClassicCourseLang]?.data)[String(lessonId)]).plain === true;
  } catch (error: unknown) {
    console.warn('[THEORY-DRILLS] plain detect failed', target, lessonId, error instanceof Error ? error.message : String(error)); // guard-ok: причина
    return false;
  }
}

function findPhrase(phrases: readonly RawClassicPhrase[], id: string): RawClassicPhrase | undefined {
  return phrases.find((p) => p.id === id || p.id.endsWith(`:${id}`));
}

const cache = new Map<string, ClassicTheoryView | null>();

/** Экран теории урока нового формата. null — урок не в новом формате (или данных нет). */
export function getClassicPlainView(target: unknown, lessonId: number, locale: string): ClassicTheoryView | null {
  if (!isClassicPlainLesson(target, lessonId)) return null;
  const t = target as ClassicCourseLang;
  const key = `${t}:${lessonId}:${locale}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const d = obj(obj(filesOf()[t]?.data)[String(lessonId)]);
  const phrases = getRawClassicPhrases(t, lessonId);
  let exampleTotal = 0;
  let drillTotal = 0;
  const sections: TheorySection[] = [];
  arr(d.chapters).forEach((rawChapter, i) => {
    const ch = obj(rawChapter);
    const blocks: TheoryBlock[] = [];
    // строки текста — отдельные абзацы (каждая — одна короткая мысль)
    for (const line of pick(ch.textByLocale, locale).replace(/`/g, '').split('\n').map((l) => l.trim()).filter((l) => l)) {
      blocks.push({ kind: 'body', text: line });
    }
    // карточки примеров
    const examples: TheoryExample[] = [];
    for (const rawEx of arr(ch.examples)) {
      const ex = obj(rawEx);
      const p = findPhrase(phrases, str(ex.phraseId));
      if (!p) {
        console.log('[THEORY-DRILLS] plain: пример без фразы курса', JSON.stringify({ target: t, lessonId, phraseId: str(ex.phraseId) })); // guard-ok: ранний выход с причиной
        continue;
      }
      const say = str(obj(ex.say)[locale]);
      const label = READING_LABEL[locale];
      examples.push({ en: p.target, translation: rawPhraseTranslation(p, locale), ...(say && label ? { reading: `${label}: ${say}` } : {}) });
    }
    if (examples.length > 0) blocks.push({ kind: 'examples', examples });
    exampleTotal += examples.length;
    // задания
    for (const rawPractice of arr(ch.practice)) {
      const pr = obj(rawPractice);
      const command = pick(pr.commandByLocale, locale).replace(/`/g, '');
      const answer = findPhrase(phrases, str(pr.answerId));
      const options = arr(pr.options).map((o) => findPhrase(phrases, str(o))).filter((p): p is RawClassicPhrase => !!p);
      if (!command || !answer || options.length < 2 || !options.includes(answer)) {
        console.log('[THEORY-DRILLS] plain: задание пропущено', JSON.stringify({ target: t, lessonId, chapter: str(ch.id), hasCommand: !!command, answerFound: !!answer, options: options.length })); // guard-ok: ранний выход с причиной
        continue;
      }
      if (pr.sample === true) {
        // образец: сразу показываем верный ответ, не считаем заданием
        blocks.push({ kind: 'note', text: `${command}\n→ ${answer.target}` });
        continue;
      }
      let drill: TheoryDrill;
      if (options.length === 2) {
        const answerIsA = options[0] === answer;
        drill = { type: 'binary', question: plain(command), optionA: options[0]!.target, optionB: options[1]!.target, correct: answerIsA ? 'A' : 'B', explain: plain(answer.target) };
      } else {
        // 3 и более фраз: выбор из списка, фразы столбиком (в строку длинные фразы не помещаются)
        drill = { type: 'choice', instruction: plain(command), before: '', after: '', options: options.slice(0, 4).map((p) => p.target), answer: answer.target, stacked: true, hideSentence: true, why: plain(answer.target) };
      }
      blocks.push({ kind: 'drill', drill });
      drillTotal += 1;
    }
    sections.push({
      num: pad2(i + 1),
      title: pick(ch.titleByLocale, locale) || `${i + 1}`,
      exampleCount: examples.length,
      defaultOpen: i === 0,
      blocks,
    });
  });
  const view: ClassicTheoryView | null = sections.length > 0
    ? { title: pick(d.title, locale), sections, metrics: { sections: sections.length, examples: exampleTotal, drills: drillTotal } }
    : null;
  console.log(`[THEORY-DRILLS] plain view ${t} lesson=${lessonId} locale=${locale} sections=${sections.length} drills=${drillTotal} examples=${exampleTotal}`); // guard-ok: трасса сборки экрана
  cache.set(key, view);
  return view;
}

export default function __ClassicTheoryPlainRouteShim() {
  return null;
}
