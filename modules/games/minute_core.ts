/**
 * Игра «Минута знаний» — правила без React. Эталон: docs/design/v2-app/elevate-games.js, `minute()`.
 * Экран показывает одно правило «в двух строках»: фразу с выделенным словом, объяснение и до двух примеров.
 *
 * зачем так: новых текстов не пишем — материал берётся из объяснений банка заданий (`bank/*`):
 *  • «Точное слово» — фраза с верным словом на месте пропуска + пояснение (`note`);
 *  • «Охота на ошибку» — исправленная реплика + объяснение (`why`).
 * Примеры — фразы того же урока с переводом («Лишнее слово» без лишнего слова, «На слух»), в которых есть
 * выделенное слово. Подходящих нет — карточка идёт без примеров: чужое правило примером не подпираем.
 */
import { huntFixedLines, isValidHuntTask, type HuntTask } from './dialogue_core';
import { MINUTE_EXAMPLES_MAX } from './minute_motion';
import { isValidOddWordTask, type OddWordTask } from './odd_word_core';
import { isValidQuizRound, type QuizRound } from './quiz_core';

export interface MinutePart {
  readonly text: string;
  /** Слово выделено подложкой — о нём правило. */
  readonly mark: boolean;
}

export interface MinuteExample {
  readonly text: string;
  readonly translation: string;
}

export interface MinuteCard {
  /** id задания-источника: по нему экран находит правило к ошибке из другой игры. */
  readonly id: string;
  readonly parts: readonly MinutePart[];
  readonly rule: string;
  readonly examples: readonly MinuteExample[];
}

export interface MinuteSources {
  readonly exact?: readonly QuizRound[];
  readonly hunt?: readonly HuntTask[];
  readonly oddWord?: readonly OddWordTask[];
  readonly listen?: readonly QuizRound[];
}

const splitWords = (text: string): string[] => text.split(/\s+/).filter((w) => w.length > 0);
const tokens = (text: string): string[] =>
  text.toLowerCase().replace(/[?!.,;:¿¡]/g, ' ').split(/\s+/).filter((w) => w.length > 0);
const norm = (text: string): string => tokens(text).join(' ');

export function isValidMinuteCard(card: MinuteCard): boolean {
  return Boolean(card.id) && card.parts.length >= 2 && card.parts.every((part) => part.text.trim().length > 0)
    && card.parts.some((part) => part.mark) && card.parts.some((part) => !part.mark)
    && card.rule.trim().length > 0 && card.examples.length <= MINUTE_EXAMPLES_MAX
    && card.examples.every((e) => e.text.trim().length > 0 && e.translation.trim().length > 0);
}

/** Фразы урока с переводом — запас для примеров. Повторы по тексту убираются. */
export function minuteExamplePool(sources: MinuteSources): readonly MinuteExample[] {
  const pool: MinuteExample[] = [];
  const seen = new Set<string>();
  const add = (text: string, translation: string | undefined): void => {
    const key = norm(text);
    if (!key || !translation || !translation.trim() || seen.has(key)) return;
    seen.add(key);
    pool.push({ text: text.trim(), translation: translation.trim() });
  };
  for (const task of sources.oddWord ?? []) {
    if (!isValidOddWordTask(task)) continue;
    add(task.words.filter((_, i) => i !== task.extraIndex).join(' '), task.translation);
  }
  for (const round of sources.listen ?? []) {
    if (!isValidQuizRound(round) || round.prompt.kind !== 'audio') continue;
    add(round.prompt.text, round.note);
  }
  return pool;
}

/** Примеры к правилу: фразы, где есть все выделенные слова; сама фраза правила примером не идёт. */
export function pickMinuteExamples(parts: readonly MinutePart[], pool: readonly MinuteExample[]): readonly MinuteExample[] {
  const marked = parts.filter((part) => part.mark).flatMap((part) => tokens(part.text));
  if (marked.length === 0) return [];
  const own = norm(parts.map((part) => part.text).join(' '));
  return pool
    .filter((example) => {
      const words = tokens(example.text);
      return norm(example.text) !== own && marked.every((word) => words.includes(word));
    })
    .slice(0, MINUTE_EXAMPLES_MAX);
}

/** Правило из задания «Точного слова»: верное слово встаёт в пропуск и выделяется. */
export function minuteCardFromGap(round: QuizRound, pool: readonly MinuteExample[]): MinuteCard | null {
  if (!isValidQuizRound(round) || round.prompt.kind !== 'gap' || !round.note || !round.note.trim()) return null;
  const correct = round.options[round.correctIndex].trim();
  const parts: MinutePart[] = [
    ...splitWords(round.prompt.before).map((text) => ({ text, mark: false })),
    { text: correct, mark: true },
    ...splitWords(round.prompt.after).map((text) => ({ text, mark: false })),
  ];
  const card: MinuteCard = { id: round.id, parts, rule: round.note.trim(), examples: pickMinuteExamples(parts, pool) };
  return isValidMinuteCard(card) ? card : null;
}

/** Правило из «Охоты на ошибку»: реплика уже исправлена, исправленное слово выделено. */
export function minuteCardFromHunt(task: HuntTask, pool: readonly MinuteExample[]): MinuteCard | null {
  if (!isValidHuntTask(task) || !task.why.trim()) return null;
  const line = huntFixedLines(task)[task.wrong.line];
  if (!line) return null;
  const parts: MinutePart[] = line.words.map((text, i) => ({ text, mark: i === task.wrong.word }));
  const card: MinuteCard = { id: task.id, parts, rule: task.why.trim(), examples: pickMinuteExamples(parts, pool) };
  return isValidMinuteCard(card) ? card : null;
}

/** Все правила, которые можно показать по заданиям урока. Пустой список — материала нет, экран открывается итогом. */
export function minuteCards(sources: MinuteSources): readonly MinuteCard[] {
  const pool = minuteExamplePool(sources);
  const cards = [
    ...(sources.exact ?? []).map((round) => minuteCardFromGap(round, pool)),
    ...(sources.hunt ?? []).map((task) => minuteCardFromHunt(task, pool)),
  ];
  const seen = new Set<string>();
  return cards.filter((card): card is MinuteCard => {
    if (!card || seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

/**
 * Какое правило показать: то, на котором человек ошибся (`itemId` — id задания из другой игры), иначе правило дня.
 * Правило дня стабильно внутри дня и меняется от дня к дню.
 */
export function pickMinuteCard(cards: readonly MinuteCard[], itemId: string | null | undefined, daySeed: number): MinuteCard | null {
  if (cards.length === 0) return null;
  const asked = itemId ? cards.find((card) => card.id === itemId) : undefined;
  if (asked) return asked;
  const seed = Number.isFinite(daySeed) ? Math.floor(daySeed) : 0;
  return cards[((seed % cards.length) + cards.length) % cards.length];
}
