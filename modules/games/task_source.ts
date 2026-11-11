/**
 * Откуда игры берут задания. Владелец 11.11.2026: «фразы должны корректно подбираться для режимов игры, без багов»,
 * «оно должно работать на всех языках».
 *
 * зачем один модуль: только он решает, какие задания дать и доступна ли игра для языка обучения. Экраны и разминка
 * спрашивают его и не знают о банке. Правило: человек никогда не получает задания не на том языке, который учит, —
 * если для языка заданий нет, игра в разминку не попадает. Банки языков — в реестре `bank/index.ts`.
 */
import { peekHomeScreenHydration } from '../../app/home_screen_hydration';
import { gameBankFor } from './bank';
import { isValidHuntTask, isValidOrderTask, type HuntTask, type OrderTask } from './dialogue_core';
import { isValidOddWordTask, type OddWordTask } from './odd_word_core';
import { QUIZ_SEED_DECKS, isValidQuizRound, type QuizDeck, type QuizKind, type QuizRound } from './quiz_core';
import type { SortDeck } from './sort_core';

export type GameId = 'flow' | 'odd_word' | 'sort' | 'listen' | 'memory' | 'exact' | 'forms' | 'hunt' | 'order';

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
export function bankEntryForLesson<T>(bank: Readonly<Record<number, T>> | undefined, lesson: number, usable: (entry: T) => boolean): T | null {
  if (!bank) return null;
  for (let n = Math.min(LESSON_MAX, Math.max(LESSON_MIN, Math.floor(lesson))); n >= LESSON_MIN; n -= 1) {
    const entry = bank[n];
    if (entry !== undefined && usable(entry)) return entry;
  }
  return null;
}

export function oddWordTasksFor(studyTarget: string, lesson: number): readonly OddWordTask[] {
  const tasks = bankEntryForLesson(gameBankFor(studyTarget)?.oddWord, lesson, (list) => list.some(isValidOddWordTask));
  return (tasks ?? []).filter(isValidOddWordTask);
}

export function sortDeckFor(studyTarget: string, lesson: number): SortDeck | null {
  return bankEntryForLesson(gameBankFor(studyTarget)?.sort, lesson, (deck) => deck.tasks.length > 0);
}

function quizRoundsFor(kind: QuizKind, studyTarget: string, lesson: number): readonly QuizRound[] {
  const bank = gameBankFor(studyTarget);
  if (!bank) return [];
  if (kind === 'forms') return (bank.forms ?? []).filter(isValidQuizRound);
  const rounds = bankEntryForLesson(bank[kind], lesson, (list) => list.some(isValidQuizRound));
  return (rounds ?? []).filter(isValidQuizRound);
}

/** Колода викторины для языка и урока; null — у языка нет заданий этой игры. */
export function quizDeckFor(kind: QuizKind, studyTarget: string, lesson: number): QuizDeck | null {
  const rounds = quizRoundsFor(kind, studyTarget, lesson);
  return rounds.length > 0 ? { ...QUIZ_SEED_DECKS[kind], rounds } : null;
}

export function huntTasksFor(studyTarget: string, lesson: number = LESSON_MAX): readonly HuntTask[] {
  const tasks = bankEntryForLesson(gameBankFor(studyTarget)?.hunt, lesson, (list) => list.some(isValidHuntTask));
  return (tasks ?? []).filter(isValidHuntTask);
}

export function orderTasksFor(studyTarget: string, lesson: number = LESSON_MAX): readonly OrderTask[] {
  const tasks = bankEntryForLesson(gameBankFor(studyTarget)?.order, lesson, (list) => list.some(isValidOrderTask));
  return (tasks ?? []).filter(isValidOrderTask);
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
    case 'forms': return quizDeckFor(id, studyTarget, lesson) !== null;
    case 'hunt': return huntTasksFor(studyTarget, lesson).length > 0;
    case 'order': return orderTasksFor(studyTarget, lesson).length > 0;
    default: return false;
  }
}

/** Взять из длинного списка порцию на одну игру; порция меняется от дня к дню, внутри дня стабильна. */
export function dailyPortion<T>(items: readonly T[], size: number, daySeed: number): readonly T[] {
  if (items.length <= size) return items;
  // зачем: нечисловой день (NaN, бесконечность) давал start = NaN и порцию из пустых мест — игра открывалась без заданий;
  // сторож: tests/game_content_integrity.test.ts
  const day = Number.isFinite(daySeed) ? Math.floor(daySeed) : 0;
  const start = ((day % items.length) + items.length) % items.length;
  return Array.from({ length: size }, (_, i) => items[(start + i) % items.length]);
}
