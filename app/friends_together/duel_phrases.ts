/**
 * «Дуэль на 5 фраз» (идея 3) — фразы хода: «Собери фразу» из уроков классического курса, которые ученик уже прошёл.
 *
 * зачем (координатор 22.10: «фразы — из уже пройденного, без новых загрузок»; контракт docs/work/tasks/friends-duel-2026-10-22.md):
 * тексты курса вшиты в приложение, по сети ходят только id. У обоих игроков один и тот же курс в сборке, поэтому по id
 * находится одна и та же фраза.
 * зачем (владелец 11.11): курс занятий, из которого дуэль брала фразы раньше, удалён — источник заменён на уроки
 * классического курса (все пять языков). id фразы дуэли = «<язык>:classic:<урок двумя цифрами>:<id фразы курса>».
 * Дуэли, начатые на удалённом курсе, по id больше не находятся: экран покажет «не удалось открыть дуэль».
 * Здесь — чистые функции над фразами урока (без диска и сети); чтение курса и прогресса — duel_phrase_source.ts.
 */
import type { LessonPhrase } from '../lesson_data_types';
import { DUEL_PHRASES, pickDuelPhrases } from './duel_core';

/** Урок классического курса: язык курса и номер урока. */
export type DuelLessonRef = Readonly<{ lang: string; lessonOrdinal: number }>;

export type DuelTile = Readonly<{ responseId: string; text: string }>;

/** Разбор одной фразы после «Проверить»: верно ли, сколько заняла, пояснение (если есть). */
export type DuelPhraseVerdict = Readonly<{ correct: boolean; ms: number; detail: string | null }>;

export type DuelPhrase = Readonly<{
  id: string;
  lessonOrdinal: number;
  targetPhrase: string;
  orderedTokens: readonly string[];
  /** Другие верные порядки плиток из данных курса (если есть). */
  acceptedTokenSequences: readonly (readonly string[])[];
  /** Карточка «Ситуация»: у фраз классического курса её нет — всегда null (поле осталось ради вёрстки экрана). */
  situation: string | null;
  /** Цель «Скажи по-…»: перевод фразы на язык интерфейса; нет перевода или он совпал с ответом — блока нет. */
  goal: string | null;
  /** Плитки: слова ответа и отвлекающие, перемешаны стабильно по id фразы — у обоих игроков одинаково. */
  tiles: readonly DuelTile[];
  /** Пояснение после верного ответа: у фраз классического курса его нет — всегда null. */
  completionFeedback: string | null;
  /** Разбор неверной плитки по порядку отвлекающих слов: у классического курса разборов нет — все null. */
  distractorFeedback: readonly (string | null)[];
}>;

const PHRASE_ID_RE = /^([a-z]{2}):classic:(\d{2}):(\S{1,48})$/u;
const MAX_PHRASE_ID_LENGTH = 96;
/** Сколько уроков читать на пул: в уроке 50 фраз, одного хватает на 5 разных — берём два ради разнообразия. */
const POOL_LESSONS_TARGET = 2;
/** Потолок чтения: больше 4 файлов курса на один вызов не открываем. */
const POOL_LESSONS_MAX = 4;
/** Сколько отвлекающих плиток добавляем к словам ответа. */
const DISTRACTOR_TILES_MAX = 3;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Стабильное перемешивание плиток по id фразы: не зависит от порядка входа, одинаково на обоих телефонах,
 * верное слово может оказаться на любом месте (тот же алгоритм, которым плитки перемешивались раньше).
 */
export function stableShuffleDuelTiles<T extends Readonly<{ responseId: string }>>(seed: string, options: readonly T[]): readonly T[] {
  if (options.length < 2) return Object.freeze([...options]);
  const shuffled = [...options].sort((left, right) => (left.responseId < right.responseId ? -1 : left.responseId > right.responseId ? 1 : 0));
  let state = fnv1a32(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
    const otherIndex = Math.floor(random * (index + 1));
    const other = shuffled[otherIndex]!;
    shuffled[otherIndex] = shuffled[index]!;
    shuffled[index] = other;
  }
  return Object.freeze(shuffled);
}

/** id фразы дуэли по языку курса, номеру урока и id фразы курса; номер вне 1..99 или пустой id — null. */
export function duelPhraseIdFor(lang: string, lessonOrdinal: number, classicPhraseId: string): string | null {
  if (!Number.isInteger(lessonOrdinal) || lessonOrdinal < 1 || lessonOrdinal > 99) return null;
  const id = `${lang}:classic:${String(lessonOrdinal).padStart(2, '0')}:${classicPhraseId}`;
  return PHRASE_ID_RE.test(id) && id.length <= MAX_PHRASE_ID_LENGTH ? id : null;
}

/** Язык курса и урок из id фразы; чужой формат (в том числе id удалённого курса занятий) или слишком длинный id — null. */
export function parseDuelPhraseId(id: unknown): DuelLessonRef | null {
  if (typeof id !== 'string' || id.length > MAX_PHRASE_ID_LENGTH) return null;
  const match = PHRASE_ID_RE.exec(id);
  if (!match) return null;
  const lessonOrdinal = Number(match[2]);
  return lessonOrdinal >= 1 ? { lang: match[1]!, lessonOrdinal } : null;
}

export function duelLessonKey(ref: DuelLessonRef): string {
  return `${ref.lang}:${ref.lessonOrdinal}`;
}

const sameWord = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Отвлекающие слова фразы: по одному от первых слов ответа, без повторов и без слов самого ответа (выбор стабилен по id). */
function pickDistractors(id: string, phrase: LessonPhrase, orderedTokens: readonly string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < phrase.words.length && out.length < DISTRACTOR_TILES_MAX; index += 1) {
    const options = (phrase.words[index]?.distractors ?? []).map(clean).filter((text) => text.length > 0);
    if (options.length === 0) continue;
    const start = fnv1a32(`${id}:d${index}`) % options.length;
    for (let step = 0; step < options.length; step += 1) {
      const candidate = options[(start + step) % options.length]!;
      if (orderedTokens.some((token) => sameWord(token, candidate)) || out.some((taken) => sameWord(taken, candidate))) continue;
      out.push(candidate);
      break;
    }
  }
  return out;
}

/** Перевод фразы на язык интерфейса: точный перевод курса, для украинского — ukrainian, иначе русский. */
function meaningFor(phrase: LessonPhrase, interfaceLang: string): string {
  const locales = phrase.classic?.sourceLocales as Readonly<Record<string, string>> | undefined;
  return clean(locales?.[interfaceLang]) || (interfaceLang === 'uk' ? clean(phrase.ukrainian) : '') || clean(phrase.russian);
}

/** Одна фраза урока классического курса → фраза дуэли. Пустой ответ, нет плиток или id не строится — null. */
export function duelPhraseFromClassic(phrase: LessonPhrase, ref: DuelLessonRef, interfaceLang: string): DuelPhrase | null {
  const targetPhrase = clean(phrase.english);
  const orderedTokens = phrase.words.map((word) => clean(word.text));
  const id = duelPhraseIdFor(ref.lang, ref.lessonOrdinal, String(phrase.id));
  if (id === null || !targetPhrase || orderedTokens.length === 0 || orderedTokens.some((token) => token.length === 0)) return null;
  const distractors = pickDistractors(id, phrase, orderedTokens);
  const tiles = [...orderedTokens, ...distractors].map((text, index) => ({
    responseId: `${id}:t${String(index + 1).padStart(2, '0')}`,
    text,
  }));
  const meaning = meaningFor(phrase, interfaceLang);
  // зачем: язык интерфейса совпал с языком курса — «перевод» был бы готовым ответом на экране, цель не показываем.
  const goal = meaning && !sameWord(meaning, targetPhrase) ? meaning : null;
  const accepted = (phrase.classic?.accepted ?? []).map((sequence) => sequence.map(clean)).filter((sequence) => sequence.length > 0);
  return Object.freeze({
    id,
    lessonOrdinal: ref.lessonOrdinal,
    targetPhrase,
    orderedTokens: Object.freeze(orderedTokens),
    acceptedTokenSequences: Object.freeze(accepted.map((sequence) => Object.freeze(sequence))),
    situation: null,
    goal,
    tiles: stableShuffleDuelTiles(id, tiles),
    completionFeedback: null,
    distractorFeedback: Object.freeze(distractors.map(() => null)),
  });
}

/**
 * Все фразы одного урока как фразы дуэли. Битую фразу пропускаем (вернём меньше),
 * число пропущенных — в skipped, чтобы читатель курса записал его в журнал.
 */
export function duelPhrasesFromLesson(
  lessonPhrases: readonly LessonPhrase[],
  ref: DuelLessonRef,
  interfaceLang: string,
): Readonly<{ phrases: readonly DuelPhrase[]; skipped: number }> {
  const phrases: DuelPhrase[] = [];
  let skipped = 0;
  for (const raw of lessonPhrases) {
    const phrase = duelPhraseFromClassic(raw, ref, interfaceLang);
    if (phrase) phrases.push(phrase);
    else skipped += 1;
  }
  return { phrases: Object.freeze(phrases), skipped };
}

/** Верно, если собранные слова совпали с ответом урока или с одним из допустимых порядков курса (сравнение по тексту). */
export function duelAnswerIsCorrect(phrase: DuelPhrase, pickedResponseIds: readonly string[]): boolean {
  const textById = new Map(phrase.tiles.map((tile) => [tile.responseId, tile.text]));
  const picked = pickedResponseIds.map((id) => textById.get(id));
  if (picked.some((text) => text === undefined)) return false;
  const answer = picked.join(' ');
  return answer === phrase.orderedTokens.join(' ') || phrase.acceptedTokenSequences.some((sequence) => sequence.join(' ') === answer);
}

/** Номер плитки в источнике («…:t05» → 4): сначала слова ответа, за ними отвлекающие. Чужая плитка — −1. */
function tileSourceIndex(phrase: DuelPhrase, responseId: string): number {
  if (!phrase.tiles.some((tile) => tile.responseId === responseId)) return -1;
  return Number(responseId.slice(responseId.lastIndexOf(':t') + 2)) - 1;
}

/** Первая поставленная отвлекающая плитка — её разбор (если он есть; у классического курса разборов нет → null). */
export function duelWrongFeedback(phrase: DuelPhrase, pickedResponseIds: readonly string[]): string | null {
  const firstDistractor = phrase.orderedTokens.length;
  for (const responseId of pickedResponseIds) {
    const index = tileSourceIndex(phrase, responseId);
    if (index >= firstDistractor) return phrase.distractorFeedback[index - firstDistractor] ?? null;
  }
  return null;
}

const normalizedTarget = (phrase: DuelPhrase) => phrase.targetPhrase.toLocaleLowerCase().replace(/[.?!,¿¡]/gu, '').replace(/\s+/gu, ' ').trim();

/**
 * Пять фраз вызова из пройденных уроков. Уроки перемешиваем зерном и читаем по одному, пока не наберём пять РАЗНЫХ фраз
 * (одинаковые фразы из разных уроков считаем одной), но не больше POOL_LESSONS_MAX файлов.
 * Меньше пяти разных — пустой список: дуэли нет, экран вызова предложит «Позвать на занятие».
 */
export function buildDuelPhraseSet(
  lessons: readonly DuelLessonRef[],
  seed: number,
  loadLesson: (ref: DuelLessonRef) => readonly DuelPhrase[],
): Readonly<{ phrases: readonly DuelPhrase[]; lessonsRead: number }> {
  const byKey = new Map(lessons.map((ref) => [duelLessonKey(ref), ref]));
  const order = pickDuelPhrases([...byKey.keys()], seed, byKey.size);
  const byTarget = new Map<string, DuelPhrase>();
  let lessonsRead = 0;
  for (const key of order) {
    if (lessonsRead >= POOL_LESSONS_MAX) break;
    if (lessonsRead >= POOL_LESSONS_TARGET && byTarget.size >= DUEL_PHRASES) break;
    const ref = byKey.get(key);
    if (!ref) continue;
    lessonsRead += 1;
    for (const phrase of loadLesson(ref)) {
      const target = normalizedTarget(phrase);
      if (!byTarget.has(target)) byTarget.set(target, phrase);
    }
  }
  const candidates = [...byTarget.values()];
  const chosenIds = pickDuelPhrases(candidates.map((p) => p.id), seed);
  const byId = new Map(candidates.map((p) => [p.id, p]));
  return { phrases: chosenIds.map((id) => byId.get(id)).filter((p): p is DuelPhrase => p !== undefined), lessonsRead };
}

/**
 * Фразы дуэли по id с сервера (ход друга, итог): ровно 5 разных корректных id, каждая нашлась в курсе на телефоне.
 * Иначе null — экран покажет «не удалось открыть дуэль», а не чужие фразы.
 */
export function resolveDuelPhrases(ids: unknown, loadLesson: (ref: DuelLessonRef) => readonly DuelPhrase[]): DuelPhrase[] | null {
  if (!Array.isArray(ids) || ids.length !== DUEL_PHRASES || new Set(ids).size !== DUEL_PHRASES) return null;
  const cache = new Map<string, readonly DuelPhrase[]>();
  const phrases: DuelPhrase[] = [];
  for (const id of ids) {
    const ref = parseDuelPhraseId(id);
    if (ref === null) return null;
    const key = duelLessonKey(ref);
    const lesson = cache.get(key) ?? loadLesson(ref);
    cache.set(key, lesson);
    const phrase = lesson.find((p) => p.id === id);
    if (!phrase) return null;
    phrases.push(phrase);
  }
  return phrases;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
