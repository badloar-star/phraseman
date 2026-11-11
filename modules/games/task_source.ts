/**
 * Откуда игры берут задания. Владелец 11.11.2026: «фразы должны корректно подбираться для режимов игры, без багов».
 *
 * зачем один модуль: только он решает, какие задания дать и доступна ли игра для языка обучения. Экраны и разминка
 * спрашивают его и не знают о банке. Правило: человек никогда не получает задания не на том языке, который учит, —
 * если для языка заданий нет, игра в разминку не попадает.
 */
import { peekHomeScreenHydration } from '../../app/home_screen_hydration';
import { EXACT_BANK_EN } from './bank/exact_en';
import { FORMS_BANK_EN } from './bank/forms_en';
import { ODD_WORD_BANK_EN } from './bank/odd_word_en';
import { SORT_BANK_EN } from './bank/sort_en';
import { HUNT_SEED_TASKS, ORDER_SEED_TASKS, isValidHuntTask, isValidOrderTask, type HuntTask, type OrderTask } from './dialogue_core';
import { isValidOddWordTask, type OddWordTask } from './odd_word_core';
import { QUIZ_SEED_DECKS, isValidQuizRound, type QuizDeck, type QuizKind } from './quiz_core';
import type { SortDeck } from './sort_core';

export type GameId = 'flow' | 'odd_word' | 'sort' | 'listen' | 'memory' | 'exact' | 'forms' | 'hunt' | 'order';

const BANK_LANGUAGE = 'en';
const LESSON_MIN = 1;
const LESSON_MAX = 32;

/** Урок, на котором сейчас человек: последний открытый, иначе первый. Читается из памяти, без диска и сети. */
export function currentGameLesson(studyTarget: string): number {
  let last: number | null = null;
  try {
    last = peekHomeScreenHydration(studyTarget as never)?.lastLessonId ?? null;
  } catch (error) {
    console.warn(`[GAMES] lesson:peek_failed ${error instanceof Error ? error.message : String(error)}`);
  }
  return typeof last === 'number' && Number.isInteger(last) && last >= LESSON_MIN && last <= LESSON_MAX ? last : LESSON_MIN;
}

/**
 * Запись банка для урока: сам урок, иначе ближайший предыдущий, для которого задания есть.
 * зачем: задания старше текущего урока содержали бы слова, которых человек ещё не видел.
 */
export function bankEntryForLesson<T>(bank: Readonly<Record<number, T>>, lesson: number, usable: (entry: T) => boolean): T | null {
  for (let n = Math.min(LESSON_MAX, Math.max(LESSON_MIN, Math.floor(lesson))); n >= LESSON_MIN; n -= 1) {
    const entry = bank[n];
    if (entry !== undefined && usable(entry)) return entry;
  }
  return null;
}

export function oddWordTasksFor(studyTarget: string, lesson: number): readonly OddWordTask[] {
  if (studyTarget !== BANK_LANGUAGE) return [];
  const tasks = bankEntryForLesson(ODD_WORD_BANK_EN, lesson, (list) => list.some(isValidOddWordTask));
  return (tasks ?? []).filter(isValidOddWordTask);
}

export function sortDeckFor(studyTarget: string, lesson: number): SortDeck | null {
  if (studyTarget !== BANK_LANGUAGE) return null;
  return bankEntryForLesson(SORT_BANK_EN, lesson, (deck) => deck.tasks.length > 0);
}

/** Колода викторины. «Точное слово» и «Три формы» — из банка; «На слух» и «Память» — пока примеры из макета. */
export function quizDeckFor(kind: QuizKind, studyTarget: string, lesson: number): QuizDeck | null {
  if (studyTarget !== BANK_LANGUAGE) return null;
  const seed = QUIZ_SEED_DECKS[kind];
  if (kind === 'exact') {
    const rounds = bankEntryForLesson(EXACT_BANK_EN, lesson, (list) => list.some(isValidQuizRound));
    return rounds ? { ...seed, rounds: rounds.filter(isValidQuizRound) } : null;
  }
  if (kind === 'forms') {
    const rounds = FORMS_BANK_EN.filter(isValidQuizRound);
    return rounds.length > 0 ? { ...seed, rounds } : null;
  }
  return seed;
}

export function huntTasksFor(studyTarget: string): readonly HuntTask[] {
  return studyTarget === BANK_LANGUAGE ? HUNT_SEED_TASKS.filter(isValidHuntTask) : [];
}

export function orderTasksFor(studyTarget: string): readonly OrderTask[] {
  return studyTarget === BANK_LANGUAGE ? ORDER_SEED_TASKS.filter(isValidOrderTask) : [];
}

/** Есть ли у игры задания для этого языка и урока. «Поток» берёт фразы прямо из уроков любого курса. */
export function isGameAvailable(id: GameId, studyTarget: string, lesson: number): boolean {
  switch (id) {
    case 'flow': return true;
    case 'odd_word': return oddWordTasksFor(studyTarget, lesson).length > 0;
    case 'sort': return sortDeckFor(studyTarget, lesson) !== null;
    case 'listen':
    case 'memory':
    case 'exact':
    case 'forms': return (quizDeckFor(id, studyTarget, lesson)?.rounds.length ?? 0) > 0;
    case 'hunt': return huntTasksFor(studyTarget).length > 0;
    case 'order': return orderTasksFor(studyTarget).length > 0;
    default: return false;
  }
}

/** Взять из длинного списка порцию на одну игру; порция меняется от дня к дню, внутри дня стабильна. */
export function dailyPortion<T>(items: readonly T[], size: number, daySeed: number): readonly T[] {
  if (items.length <= size) return items;
  const start = ((Math.floor(daySeed) % items.length) + items.length) % items.length;
  return Array.from({ length: size }, (_, i) => items[(start + i) % items.length]);
}
