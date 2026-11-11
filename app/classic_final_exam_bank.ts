/**
 * зачем (владелец 11.11, F01 «Иностранные финальные экзамены»): итоговый экзамен ES/DE/IT открывал АНГЛИЙСКИЙ банк
 * (exam.tsx: всё, что не fr, шло в EXAM_POOL), а французский получал пустой список. Здесь — свой банк для каждого
 * из четырёх языков: задания собираются из фраз классического курса ЭТОГО языка (modules/classic-courses/<lang>,
 * 32 урока × 50 фраз, D202). Ничего не сочиняется: предложение, верное слово и неверные варианты — те же, что
 * ученик уже видел в уроках. Перевод показывается подсказкой — без него пропуск неоднозначен («___ aquí.»).
 * Firebase не трогаем: банк целиком из сборки, ноль чтений.
 */
import type { Lang } from '../constants/i18n';
import { classicCourseActiveFor, getClassicLessonPhrases, type ClassicCourseLang } from './classic_course_phrases';
import type { LessonPhrase } from './lesson_data_types';
import { classicLessonNumberTitle, classicLessonTopic } from './lesson_titles_for_study_target';

export type ClassicFinalExamTarget = Exclude<ClassicCourseLang, 'en'>;

export const CLASSIC_FINAL_EXAM_LESSON_COUNT = 32;
export const CLASSIC_FINAL_EXAM_QUESTION_COUNT = 50;
const OPTION_COUNT = 4;
const LOG = '[EXAM-BANK]';

export type ClassicFinalExamQuestion = {
  lessonNum: number;
  /** Тема урока на языке интерфейса (во всех полях одна — examTopicForLang вернёт её при любом языке). */
  topic: string;
  /** Стабильный ключ темы для аналитики (не зависит от языка интерфейса). */
  rawTopic: string;
  topicUK: string;
  topicES: string;
  topicPtBr: string;
  topicVi: string;
  topicId: string;
  topicTr: string;
  topicPl: string;
  /** Предложение на изучаемом языке с пропуском `___`. */
  q: string;
  /** Перевод всего предложения на язык интерфейса — снимает неоднозначность пропуска. */
  hint: string;
  opts: string[];
  correct: number;
  type: 'fill';
  /** id фразы курса (`es:01:01`) — по нему ошибка в «Моих ошибках» привязана к своему языку и уроку. */
  phraseId: string;
};

type Rng = () => number;

/** Язык с собственным банком итогового экзамена; `null` — английский (свой EXAM_POOL) или курс выключен. */
export function classicFinalExamTarget(target: unknown): ClassicFinalExamTarget | null {
  if (target === 'en') return null;
  return classicCourseActiveFor(target) ? (target as ClassicFinalExamTarget) : null;
}

function shuffledCopy<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const norm = (value: string): string => value.trim().toLocaleLowerCase();
/** Слова строки без знаков препинания по краям — для списка «это тоже верно, в неверные варианты не брать». */
function bareTokens(text: string): string[] {
  return text.split(/\s+/).map((t) => norm(t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’']+$/gu, ''))).filter(Boolean);
}

/** Позиция слова в предложении, если оно стоит там целым словом РОВНО один раз; иначе -1 (пропуск был бы неоднозначен). */
export function soleWholeWordIndex(sentence: string, word: string): number {
  if (!word) return -1;
  const opensInto = /['’-]$/.test(word); // «J’», «Peux-» — следующая буква законно стоит вплотную
  let found = -1;
  let from = 0;
  for (;;) {
    const at = sentence.indexOf(word, from);
    if (at < 0) break;
    const before = at > 0 ? sentence[at - 1] : '';
    const after = sentence[at + word.length] ?? '';
    const wholeWord = !(before && LETTER_OR_DIGIT.test(before)) && (opensInto || !(after && LETTER_OR_DIGIT.test(after)));
    if (wholeWord) {
      if (found >= 0) return -1;
      found = at;
    }
    from = at + 1;
  }
  return found;
}

function hintFor(phrase: LessonPhrase, target: ClassicFinalExamTarget, lang: Lang): string {
  const locales = phrase.classic?.sourceLocales as Record<string, string> | undefined;
  const targetText = norm(phrase.english);
  // зачем: интерфейс на языке курса (испанский интерфейс + испанский курс) — «перевод» совпал бы с ответом; берём следующий язык.
  for (const locale of [lang, 'en', 'ru'] as const) {
    if (locale === target) continue;
    const text = (locales?.[locale] ?? '').trim();
    if (text && norm(text) !== targetText) return text;
  }
  return '';
}

function topicFor(lang: Lang, target: ClassicFinalExamTarget, lessonNum: number): string {
  return classicLessonTopic(lang, target, lessonNum) ?? classicLessonNumberTitle(lang, lessonNum);
}

/**
 * Одно задание из одной фразы курса. `null` — из фразы честное задание не собрать
 * (нет перевода, слово повторяется, не набирается трёх заведомо неверных вариантов).
 */
export function classicExamQuestionFromPhrase(
  phrase: LessonPhrase,
  lessonNum: number,
  target: ClassicFinalExamTarget,
  lang: Lang,
  rng: Rng = Math.random,
): ClassicFinalExamQuestion | null {
  const sentence = phrase.english;
  const hint = hintFor(phrase, target, lang);
  if (!sentence || !hint) return null;

  // зачем: «qui/qua», «Estoy/Yo estoy» — слова из принятых вариантов ответа неверными быть не могут.
  const alsoCorrect = new Set<string>(bareTokens(sentence));
  for (const alternative of phrase.alternatives ?? []) for (const token of bareTokens(alternative)) alsoCorrect.add(token);
  for (const sequence of phrase.classic?.accepted ?? []) for (const token of sequence) for (const bare of bareTokens(token)) alsoCorrect.add(bare);

  for (const tile of shuffledCopy(phrase.words ?? [], rng)) {
    const correct = (tile.correct || tile.text || '').trim();
    if (!correct) continue;
    const at = soleWholeWordIndex(sentence, correct);
    if (at < 0) continue;
    const seen = new Set<string>([norm(correct)]);
    const wrong: string[] = [];
    for (const raw of tile.distractors ?? []) {
      const option = (raw ?? '').trim();
      const key = norm(option);
      if (!option || seen.has(key) || alsoCorrect.has(key)) continue;
      seen.add(key);
      wrong.push(option);
    }
    if (wrong.length < OPTION_COUNT - 1) continue;
    const opts = shuffledCopy([correct, ...shuffledCopy(wrong, rng).slice(0, OPTION_COUNT - 1)], rng);
    const topic = topicFor(lang, target, lessonNum);
    return {
      lessonNum,
      topic,
      rawTopic: `${target}:lesson:${lessonNum}`,
      topicUK: topic,
      topicES: topic,
      topicPtBr: topic,
      topicVi: topic,
      topicId: topic,
      topicTr: topic,
      topicPl: topic,
      q: `${sentence.slice(0, at)}___${sentence.slice(at + correct.length)}`,
      hint,
      opts,
      correct: opts.indexOf(correct),
      type: 'fill',
      phraseId: String(phrase.id ?? ''),
    };
  }
  return null;
}

/** До двух заданий урока: [обязательное, запасное]. Одинаковые «пропуск + перевод» в один экзамен не попадают. */
function lessonCandidates(
  lessonNum: number,
  target: ClassicFinalExamTarget,
  lang: Lang,
  rng: Rng,
  usedKeys: Set<string>,
): ClassicFinalExamQuestion[] {
  const found: ClassicFinalExamQuestion[] = [];
  for (const phrase of shuffledCopy(getClassicLessonPhrases(lessonNum, target), rng)) {
    const question = classicExamQuestionFromPhrase(phrase, lessonNum, target, lang, rng);
    if (!question) continue;
    const key = `${question.q}\u0000${question.hint}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    found.push(question);
    if (found.length === 2) break;
  }
  return found;
}

function assemble(
  perLesson: readonly ClassicFinalExamQuestion[][],
  count: number,
  rng: Rng,
): ClassicFinalExamQuestion[] {
  // зачем: как в английском экзамене — минимум одно задание из каждого урока, остальное добирается вторыми заданиями.
  const mandatory = perLesson.flatMap((pair) => pair.slice(0, 1));
  const extras = perLesson.flatMap((pair) => pair.slice(1, 2));
  const needed = Math.max(0, count - mandatory.length);
  return shuffledCopy([...mandatory, ...shuffledCopy(extras, rng).slice(0, needed)], rng).slice(0, count);
}

/** Синхронная сборка — для тестов и сторожей. Экран использует loadClassicFinalExamQuestions (не держит кадр). */
export function buildClassicFinalExamQuestions(
  target: ClassicFinalExamTarget,
  lang: Lang,
  count = CLASSIC_FINAL_EXAM_QUESTION_COUNT,
  rng: Rng = Math.random,
): ClassicFinalExamQuestion[] {
  const usedKeys = new Set<string>();
  const perLesson: ClassicFinalExamQuestion[][] = [];
  for (let lessonNum = 1; lessonNum <= CLASSIC_FINAL_EXAM_LESSON_COUNT; lessonNum++) {
    perLesson.push(lessonCandidates(lessonNum, target, lang, rng, usedKeys));
  }
  return assemble(perLesson, count, rng);
}

const nextTick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Банк для экрана. Уроки читаются по одному с уступкой кадра между ними: 32 файла курса (~2 МБ) разом
 * заморозили бы открытие экрана. Пустой результат = экзамен не стартует (английский банк НЕ подставляется).
 */
export async function loadClassicFinalExamQuestions(
  target: ClassicFinalExamTarget,
  lang: Lang,
  count = CLASSIC_FINAL_EXAM_QUESTION_COUNT,
  rng: Rng = Math.random,
): Promise<ClassicFinalExamQuestion[]> {
  const startedAt = Date.now();
  const usedKeys = new Set<string>();
  const perLesson: ClassicFinalExamQuestion[][] = [];
  const emptyLessons: number[] = [];
  for (let lessonNum = 1; lessonNum <= CLASSIC_FINAL_EXAM_LESSON_COUNT; lessonNum++) {
    const pair = lessonCandidates(lessonNum, target, lang, rng, usedKeys);
    if (pair.length === 0) emptyLessons.push(lessonNum);
    perLesson.push(pair);
    await nextTick();
  }
  const questions = assemble(perLesson, count, rng);
  if (emptyLessons.length > 0 || questions.length < count) {
    // guard-ok: неполный банк — причина в журнале, экзамен идёт с тем, что собралось (или не стартует при нуле)
    console.warn(`${LOG} неполный банк target=${target} ui=${lang} собрано=${questions.length}/${count} уроки_без_заданий=[${emptyLessons.join(',')}] источник=сборка:classic-courses`);
  }
  console.log(`${LOG} готов target=${target} ui=${lang} заданий=${questions.length} уроков=${CLASSIC_FINAL_EXAM_LESSON_COUNT - emptyLessons.length} мс=${Date.now() - startedAt}`); // guard-ok: итог сборки банка
  return questions;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __ClassicFinalExamBankRouteShim() {
  return null;
}
