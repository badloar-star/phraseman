import type { MaxVoiceReviewReceiptV1 } from './max_voice_finalize_types';

/**
 * Compact display projection for MAX review cards.
 *
 * The server payload remains available for expanded details and practice. Only
 * the calm top-level narrative is shortened here, at word boundaries.
 */

export interface ReviewCorrectionLike {
  original: string;
  corrected: string;
  note: string;
  kind?: 'fix' | 'polish';
}

export type TomorrowActionKind = 'phrase' | 'tip' | 'fallback';

export interface TomorrowAction {
  kind: TomorrowActionKind;
  text: string;
}

export interface MaxReviewProjection {
  sessionId: string;
  hero: string;
  worked: string[];
  correction: MaxVoiceReviewReceiptV1['correction'];
  tomorrowActions: string[];
  targetPhrase: string | null;
  nextConversation: string | null;
  goal: MaxVoiceReviewReceiptV1['goal'];
  durationSec: number;
  status: MaxVoiceReviewReceiptV1['status'];
}

export function projectMaxReview(receipt: MaxVoiceReviewReceiptV1): MaxReviewProjection {
  const worked = receipt.worked
    .map((item) => compactReviewText(item, 180))
    .filter(Boolean)
    .slice(0, 2);
  return {
    sessionId: receipt.sessionId,
    hero: worked[0] ?? '',
    worked,
    correction: receipt.correction,
    tomorrowActions: Array.from(receipt.tomorrowActions).slice(0, 3),
    targetPhrase: receipt.targetPhrase,
    nextConversation: receipt.nextTopic,
    goal: receipt.goal,
    durationSec: receipt.durationSec,
    status: receipt.status,
  };
}

/**
 * Третье лицо → «вы» в уже сохранённых разборах.
 *
 * зачем (владелец 2026-08-23): «на экране завершения не должно быть написано
 * Learner, там должно быть "вы" и склонение текста соответственно». Источник
 * лечится на сервере (метка говорящего в транскрипте + промпт), но разборы,
 * записанные ДО этой правки, лежат в Firestore навсегда и переписать их
 * нечем — правим на чтении, здесь.
 *
 * Глагол обязан согласоваться: «Learner выбрал имя» → «Вы выбрали имя».
 * Прошедшее время в русском выдаёт род окончанием (-л/-ла/-ло), у «вы» его
 * быть не должно, поэтому меняем и подлежащее, и следующий за ним глагол.
 */
// Границы слова: в JS `\b` считается по [A-Za-z0-9_] и с кириллицей НЕ даёт
// границу — «Ученик» и «ученика» просто не находились. Явные lookaround по
// «не-букве» работают одинаково для обоих алфавитов.
const NOT_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_AFTER = '(?![\\p{L}\\p{N}])';
const SUBJECT = '(?:Learners?|The learner|[Уу]ченик|[Уу]ченица|[Сс]тудент|[Сс]тудентка|[Уу]чащийся)';
const OBLIQUE = '(?:ученика|ученику|учеником|ученике|студента|студенту|студентом|студенте)';

/** «поздоровался/поздоровалась» → «поздоровались» (возвратный глагол). */
const SUBJECT_REFLEXIVE_VERB = new RegExp(
  `${NOT_BEFORE}${SUBJECT}${NOT_AFTER}\\s+(\\p{L}+?)(?:лся|лась|лось)${NOT_AFTER}`,
  'gu',
);
/** «выбрал/выбрала» → «выбрали» (обычный глагол прошедшего времени). */
const SUBJECT_PLAIN_VERB = new RegExp(
  `${NOT_BEFORE}${SUBJECT}${NOT_AFTER}\\s+(\\p{L}+?)(?:ла|ло|л)${NOT_AFTER}`,
  'gu',
);
const SUBJECT_ALONE = new RegExp(`${NOT_BEFORE}${SUBJECT}${NOT_AFTER}`, 'gu');
const SUBJECT_OBLIQUE = new RegExp(`${NOT_BEFORE}${OBLIQUE}${NOT_AFTER}`, 'giu');
/** «Вы» строчное только в середине предложения, не после точки и не в начале. */
const MID_SENTENCE_YOU = /(?<=[^.!?\n][  ,;:—-]\s*)(?<![\p{L}\p{N}])Вы(?![\p{L}\p{N}])/gu;

export function humanizeReviewSubject(value: string): string {
  return value
    .replace(SUBJECT_REFLEXIVE_VERB, (_match, stem: string) => `Вы ${stem}лись`)
    .replace(SUBJECT_PLAIN_VERB, (_match, stem: string) => `Вы ${stem}ли`)
    // Косвенные падежи раньше подлежащего: «ученику» не должно стать «Вы».
    .replace(SUBJECT_OBLIQUE, 'вас')
    .replace(SUBJECT_ALONE, 'Вы')
    .replace(MID_SENTENCE_YOU, 'вы');
}

export function compactReviewText(value: string, maxChars: number): string {
  const normalized = humanizeReviewSubject(value).trim().replace(/\s+/gu, ' ');
  if (normalized.length <= maxChars) return normalized;
  const budget = Math.max(2, Math.floor(maxChars) - 1);
  const head = normalized.slice(0, budget);
  const wordBoundary = head.lastIndexOf(' ');
  const cutAt = wordBoundary >= Math.floor(budget * 0.6) ? wordBoundary : budget;
  return `${head.slice(0, cutAt).trimEnd()}…`;
}

export function projectReviewHighlight<T extends ReviewCorrectionLike>(correction: T): {
  original: string;
  corrected: string;
  note: string;
  full: T;
} {
  return {
    original: compactReviewText(correction.original, 96),
    corrected: compactReviewText(correction.corrected, 112),
    note: compactReviewText(correction.note, 150),
    full: correction,
  };
}

export function resolveTomorrowPlan(input: {
  homework: readonly string[];
  tip: string;
  nextTopic: string;
  fallbackAction: string;
}): { actions: TomorrowAction[]; detailsActions: TomorrowAction[]; nextTopic: string } {
  const allActions: TomorrowAction[] = [];
  const seen = new Set<string>();
  const add = (raw: string, kind: TomorrowActionKind): void => {
    const value = raw.trim().replace(/\s+/gu, ' ');
    const key = value.toLocaleLowerCase();
    if (value === '' || seen.has(key)) return;
    seen.add(key);
    allActions.push({ kind, text: value });
  };

  for (const phrase of input.homework) add(phrase, 'phrase');
  add(input.tip, 'tip');
  if (allActions.length === 0) add(input.fallbackAction, 'fallback');

  return {
    actions: allActions.slice(0, 3),
    detailsActions: allActions.slice(3),
    nextTopic: input.nextTopic.trim().replace(/\s+/gu, ' '),
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
