/**
 * «Дуэль на 5 фраз» (идея 3) — фразы хода: задания «Собери фразу» из занятий, которые ученик уже прошёл.
 *
 * зачем (координатор 22.10: «фразы — из уже пройденного, без новых загрузок»; контракт docs/work/tasks/friends-duel-2026-10-22.md):
 * тексты курса вшиты в приложение, по сети ходят только id. id фразы = id задания курса («en:lesson-02:session-03:i01»):
 * у обоих игроков один курс, поэтому одна и та же фраза. Здесь — чистые функции над строкой занятия (без диска и сети),
 * чтение курса и прогресса — duel_phrase_source.ts.
 * Ничего не переписываем: ситуация, плитки и их порядок — те же, что ученик видел в уроке (то же перемешивание по id задания).
 */
import { projectLearnerVisiblePromptV1 } from '../../modules/learning-v2/content/learner_visible_text_v1';
import { stableShuffleLearningV2OptionsV1 } from '../../modules/learning-v2/runtime/stable_option_shuffle_v1';
import { DUEL_PHRASES, pickDuelPhrases } from './duel_core';

export type DuelAuthoredLocale = 'ru' | 'uk';
export type DuelSessionRef = Readonly<{ lessonOrdinal: number; sessionOrdinal: number }>;

/** Строка занятия курса — то, что дуэли нужно из FACTORY_NATIVE_MANIFEST_V1. */
export type DuelCourseRow = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  practiceTitlesByAuthoredLocale: Readonly<Record<DuelAuthoredLocale, readonly Readonly<{ ordinal: number; title: string }>[]>>;
  loadLearner: (locale: DuelAuthoredLocale) => unknown;
}>;

export type DuelTile = Readonly<{ responseId: string; text: string }>;

/** Разбор одной фразы после «Проверить»: верно ли, сколько заняла, пояснение (если есть). */
export type DuelPhraseVerdict = Readonly<{ correct: boolean; ms: number; detail: string | null }>;

export type DuelPhrase = Readonly<{
  id: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  targetPhrase: string;
  orderedTokens: readonly string[];
  /** Ситуация из строки задания урока (без «Соберите фразу —»); пусто — карточки нет. */
  situation: string | null;
  /** Цель «Скажи по-английски» — только проверенный смысл из задания (последняя «цитата» в ru и uk); нет — блока нет. */
  goal: string | null;
  /** Плитки в порядке урока (стабильное перемешивание по id задания — у обоих игроков одинаково). */
  tiles: readonly DuelTile[];
  /** Пояснение после верного ответа, если автор его написал. */
  completionFeedback: string | null;
  /** Разбор неверной плитки по порядку отвлекающих слов (authoredDistractorTokens), если есть. */
  distractorFeedback: readonly (string | null)[];
}>;

const PHRASE_ID_RE = /^[a-z]{2}:lesson-(\d{2}):session-(\d{2}):\S{1,48}$/u;
const MAX_PHRASE_ID_LENGTH = 96;
/** Сколько занятий читать на пул: в занятии 2–5 заданий «Собери фразу», трёх хватает на 5 разных фраз. */
const POOL_SESSIONS_TARGET = 3;
/** Потолок чтения: даже если в пройденных занятиях повторяются одни и те же фразы, больше 8 файлов курса не открываем. */
const POOL_SESSIONS_MAX = 8;

type Plain = Record<string, unknown>;

function plain(value: unknown): Plain | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Plain) : null;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function capitalized(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase('ru') + value.slice(1) : value;
}

/** Текст на языке подачи; uk без перевода — ru (как localized() курса). */
function authoredText(source: Plain | null, locale: DuelAuthoredLocale): string {
  if (!source) return '';
  return clean(locale === 'uk' ? source.uk ?? source.ru : source.ru);
}

/** Как в курсе (localizedSceneMeaning): «Соберите фразу — ситуация» → «ситуация». */
function sceneOf(text: string): string {
  return text.replace(/^.+?\s+—\s+/u, '').trim();
}

/** Как в курсе (reviewedQuotedMeaning): смысл — последняя «цитата», если она есть и в ru, и в uk. */
function reviewedQuote(meaning: Plain | null, locale: DuelAuthoredLocale): string | null {
  const lastQuote = (text: string) => [...text.matchAll(/«([^»]+)»/gu)].at(-1)?.[1]?.trim() || null;
  const ru = lastQuote(authoredText(meaning, 'ru'));
  const uk = lastQuote(authoredText(meaning, 'uk'));
  if (!ru || !uk) return null;
  return locale === 'uk' ? uk : ru;
}

function tokenList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tokens = value.map(clean);
  return tokens.every((t) => t.length > 0) ? tokens : null;
}

/** Урок и занятие из id фразы; чужой формат или слишком длинный id — null. */
export function parseDuelPhraseId(id: unknown): DuelSessionRef | null {
  if (typeof id !== 'string' || id.length > MAX_PHRASE_ID_LENGTH) return null;
  const match = PHRASE_ID_RE.exec(id);
  if (!match) return null;
  const lessonOrdinal = Number(match[1]);
  const sessionOrdinal = Number(match[2]);
  return lessonOrdinal >= 1 && sessionOrdinal >= 1 ? { lessonOrdinal, sessionOrdinal } : null;
}

export function duelSessionKey(ref: DuelSessionRef): string {
  return `${ref.lessonOrdinal}:${ref.sessionOrdinal}`;
}

function phraseFromRaw(
  raw: Plain,
  ordinalTitle: string | undefined,
  row: DuelCourseRow,
  locale: DuelAuthoredLocale,
): DuelPhrase | null {
  const mode = plain(raw.modePayload);
  const id = clean(raw.interactionId);
  const ref = parseDuelPhraseId(id);
  if (!mode || ref === null || ref.lessonOrdinal !== row.lessonOrdinal || ref.sessionOrdinal !== row.sessionOrdinal) return null;
  const targetPhrase = clean(mode.targetPhrase);
  const orderedTokens = tokenList(mode.orderedTokens);
  const distractors = tokenList(mode.authoredDistractorTokens ?? mode.distractorTokens ?? []) ?? [];
  if (!targetPhrase || !orderedTokens || orderedTokens.length === 0) return null;
  // Тот же текст задания, что видит урок: заголовок занятия (или prompt), без хвоста, равного ответу.
  const prompt = clean(projectLearnerVisiblePromptV1({ title: ordinalTitle ?? clean(raw.prompt), family: 'phrase_builder', correctText: targetPhrase }));
  const meaning = plain(mode.localizedMeaning) ?? plain(mode.localizedScene);
  const scene = sceneOf(authoredText(meaning, locale) || prompt);
  const explanation = plain(mode.explanationV1);
  const completion = authoredText(plain(explanation?.completionFeedbackByLocale) ?? plain(mode.completionFeedbackByLocale), locale);
  const slotFeedback = Array.isArray(mode.slotFeedback) ? mode.slotFeedback : [];
  const tiles = [...orderedTokens, ...distractors].map((text, index) => ({
    responseId: `${id}:t${String(index + 1).padStart(2, '0')}`,
    text,
  }));
  const goal = reviewedQuote(meaning, locale);
  return Object.freeze({
    id,
    lessonOrdinal: row.lessonOrdinal,
    sessionOrdinal: row.sessionOrdinal,
    targetPhrase,
    orderedTokens: Object.freeze(orderedTokens),
    situation: scene ? capitalized(scene) : null,
    goal: goal ? capitalized(goal) : null,
    tiles: stableShuffleLearningV2OptionsV1(id, tiles),
    completionFeedback: completion || null,
    distractorFeedback: Object.freeze(distractors.map((_, index) => authoredText(plain(plain(slotFeedback[index])?.feedbackByLocale), locale) || null)),
  });
}

/**
 * Все задания «Собери фразу» одного занятия на языке подачи. Битое задание пропускаем (вернём меньше),
 * число пропущенных — в skipped, чтобы читатель курса записал его в журнал.
 */
export function duelPhrasesFromRow(row: DuelCourseRow, locale: DuelAuthoredLocale): Readonly<{ phrases: readonly DuelPhrase[]; skipped: number }> {
  const learner = plain(row.loadLearner(locale));
  const raws = Array.isArray(learner?.interactions) ? learner.interactions : [];
  // Номера заголовков — порядок заданий в источнике (как в курсе: ordinal → interactions[ordinal − 1]).
  const titleById = new Map<string, string>();
  for (const entry of row.practiceTitlesByAuthoredLocale[locale] ?? []) {
    const id = clean(plain(raws[entry.ordinal - 1])?.interactionId);
    if (id) titleById.set(id, entry.title);
  }
  const phrases: DuelPhrase[] = [];
  let skipped = 0;
  for (const value of raws) {
    const raw = plain(value);
    if (!raw || raw.family !== 'phrase_builder') continue;
    const phrase = phraseFromRaw(raw, titleById.get(clean(raw.interactionId)), row, locale);
    if (phrase) phrases.push(phrase);
    else skipped += 1;
  }
  return { phrases: Object.freeze(phrases), skipped };
}

/** Верно, если собранные слова совпали с ответом урока (сравнение по тексту: в 127 фразах курса есть одинаковые слова). */
export function duelAnswerIsCorrect(phrase: DuelPhrase, pickedResponseIds: readonly string[]): boolean {
  const textById = new Map(phrase.tiles.map((tile) => [tile.responseId, tile.text]));
  const picked = pickedResponseIds.map((id) => textById.get(id));
  if (picked.some((text) => text === undefined)) return false;
  return picked.join(' ') === phrase.orderedTokens.join(' ');
}

/** Номер плитки в источнике («…:t05» → 4): сначала слова ответа, за ними отвлекающие. Чужая плитка — −1. */
function tileSourceIndex(phrase: DuelPhrase, responseId: string): number {
  if (!phrase.tiles.some((tile) => tile.responseId === responseId)) return -1;
  return Number(responseId.slice(responseId.lastIndexOf(':t') + 2)) - 1;
}

/** Первая поставленная отвлекающая плитка — её разбор (если автор его написал). */
export function duelWrongFeedback(phrase: DuelPhrase, pickedResponseIds: readonly string[]): string | null {
  const firstDistractor = phrase.orderedTokens.length;
  for (const responseId of pickedResponseIds) {
    const index = tileSourceIndex(phrase, responseId);
    if (index >= firstDistractor) return phrase.distractorFeedback[index - firstDistractor] ?? null;
  }
  return null;
}

const normalizedTarget = (phrase: DuelPhrase) => phrase.targetPhrase.toLocaleLowerCase('en').replace(/[.?!,]/gu, '').replace(/\s+/gu, ' ').trim();

/**
 * Пять фраз вызова из пройденных занятий. Занятия перемешиваем зерном и читаем по одному, пока не наберём пять РАЗНЫХ фраз
 * (одинаковые «I am here.» из разных занятий считаем одной), но не больше POOL_SESSIONS_MAX файлов.
 * Меньше пяти разных — пустой список: дуэли нет, экран вызова предложит «Позвать на занятие».
 */
export function buildDuelPhraseSet(
  sessions: readonly DuelSessionRef[],
  seed: number,
  loadSession: (ref: DuelSessionRef) => readonly DuelPhrase[],
): Readonly<{ phrases: readonly DuelPhrase[]; sessionsRead: number }> {
  const byKey = new Map(sessions.map((ref) => [duelSessionKey(ref), ref]));
  const order = pickDuelPhrases([...byKey.keys()], seed, byKey.size);
  const byTarget = new Map<string, DuelPhrase>();
  let sessionsRead = 0;
  for (const key of order) {
    if (sessionsRead >= POOL_SESSIONS_MAX) break;
    if (sessionsRead >= POOL_SESSIONS_TARGET && byTarget.size >= DUEL_PHRASES) break;
    const ref = byKey.get(key);
    if (!ref) continue;
    sessionsRead += 1;
    for (const phrase of loadSession(ref)) {
      const target = normalizedTarget(phrase);
      if (!byTarget.has(target)) byTarget.set(target, phrase);
    }
  }
  const candidates = [...byTarget.values()];
  const chosenIds = pickDuelPhrases(candidates.map((p) => p.id), seed);
  const byId = new Map(candidates.map((p) => [p.id, p]));
  return { phrases: chosenIds.map((id) => byId.get(id)).filter((p): p is DuelPhrase => p !== undefined), sessionsRead };
}

/**
 * Фразы дуэли по id с сервера (ход друга, итог): ровно 5 разных корректных id, каждая нашлась в курсе на телефоне.
 * Иначе null — экран покажет «не удалось открыть дуэль», а не чужие фразы.
 */
export function resolveDuelPhrases(ids: unknown, loadSession: (ref: DuelSessionRef) => readonly DuelPhrase[]): DuelPhrase[] | null {
  if (!Array.isArray(ids) || ids.length !== DUEL_PHRASES || new Set(ids).size !== DUEL_PHRASES) return null;
  const cache = new Map<string, readonly DuelPhrase[]>();
  const phrases: DuelPhrase[] = [];
  for (const id of ids) {
    const ref = parseDuelPhraseId(id);
    if (ref === null) return null;
    const key = duelSessionKey(ref);
    const session = cache.get(key) ?? loadSession(ref);
    cache.set(key, session);
    const phrase = session.find((p) => p.id === id);
    if (!phrase) return null;
    phrases.push(phrase);
  }
  return phrases;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
