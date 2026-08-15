/**
 * Grammar map of the app's 32 core lessons.
 *
 * This is the single source of truth for which grammatical construction lives in
 * which lesson and how hard it is.
 *
 * Lesson order mirrors LESSON_NAMES_RU in constants/lessons.ts (1-indexed).
 * Pure module, no runtime deps — fully unit-testable.
 */

export type CefrBand = 'A1' | 'A2' | 'B1' | 'B2';

export type LessonGrammarEntry = {
  lessonId: number;
  /** Stable grammar construction tags taught/required by this lesson. */
  constructions: string[];
  level: CefrBand;
  /** Earlier lessons whose grammar this lesson builds on. */
  requiresLessons: number[];
};

export const LESSON_COUNT = 32;

/**
 * The 32 lessons in teaching order. `constructions` are lowercase kebab tags that
 * plan phrases reference to declare what grammar they need.
 */
export const LESSON_GRAMMAR_MAP: readonly LessonGrammarEntry[] = [
  { lessonId: 1, level: 'A1', constructions: ['to-be', 'pronouns'], requiresLessons: [] },
  { lessonId: 2, level: 'A1', constructions: ['to-be-negation', 'to-be-questions'], requiresLessons: [1] },
  { lessonId: 3, level: 'A1', constructions: ['present-simple'], requiresLessons: [1] },
  { lessonId: 4, level: 'A2', constructions: ['present-simple-negation'], requiresLessons: [3] },
  { lessonId: 5, level: 'A2', constructions: ['present-simple-questions'], requiresLessons: [3] },
  { lessonId: 6, level: 'A2', constructions: ['wh-questions'], requiresLessons: [5] },
  { lessonId: 7, level: 'A2', constructions: ['to-have'], requiresLessons: [3] },
  { lessonId: 8, level: 'A2', constructions: ['prepositions-time'], requiresLessons: [3] },
  { lessonId: 9, level: 'A2', constructions: ['there-is', 'there-are'], requiresLessons: [1] },
  { lessonId: 10, level: 'A2', constructions: ['modals'], requiresLessons: [3] },
  { lessonId: 11, level: 'A2', constructions: ['past-simple-regular'], requiresLessons: [3] },
  { lessonId: 12, level: 'A2', constructions: ['past-simple-irregular'], requiresLessons: [11] },
  { lessonId: 13, level: 'A2', constructions: ['future-simple'], requiresLessons: [3] },
  { lessonId: 14, level: 'A2', constructions: ['comparatives', 'superlatives'], requiresLessons: [3] },
  { lessonId: 15, level: 'A2', constructions: ['possessive-pronouns'], requiresLessons: [1] },
  { lessonId: 16, level: 'B1', constructions: ['phrasal-verbs'], requiresLessons: [3] },
  { lessonId: 17, level: 'A2', constructions: ['present-continuous'], requiresLessons: [3] },
  { lessonId: 18, level: 'A2', constructions: ['imperative'], requiresLessons: [3] },
  { lessonId: 19, level: 'A2', constructions: ['prepositions-place'], requiresLessons: [9] },
  { lessonId: 20, level: 'A2', constructions: ['articles'], requiresLessons: [3] },
  { lessonId: 21, level: 'B1', constructions: ['indefinite-pronouns'], requiresLessons: [3] },
  { lessonId: 22, level: 'B1', constructions: ['gerund'], requiresLessons: [3, 17] },
  { lessonId: 23, level: 'B1', constructions: ['passive-voice'], requiresLessons: [11, 12] },
  { lessonId: 24, level: 'B1', constructions: ['present-perfect'], requiresLessons: [12] },
  { lessonId: 25, level: 'B1', constructions: ['past-continuous'], requiresLessons: [11, 17] },
  { lessonId: 26, level: 'B1', constructions: ['conditionals'], requiresLessons: [13, 11] },
  { lessonId: 27, level: 'B1', constructions: ['reported-speech'], requiresLessons: [11, 24] },
  { lessonId: 28, level: 'B1', constructions: ['reflexive-pronouns'], requiresLessons: [15] },
  { lessonId: 29, level: 'B1', constructions: ['used-to'], requiresLessons: [11] },
  { lessonId: 30, level: 'B2', constructions: ['relative-clauses'], requiresLessons: [5] },
  { lessonId: 31, level: 'B2', constructions: ['complex-object'], requiresLessons: [22, 24] },
  { lessonId: 32, level: 'B1', constructions: ['review'], requiresLessons: [] },
];

const ENTRY_BY_ID: ReadonlyMap<number, LessonGrammarEntry> = new Map(
  LESSON_GRAMMAR_MAP.map((entry) => [entry.lessonId, entry]),
);

const CONSTRUCTION_TO_LESSON: ReadonlyMap<string, number> = new Map(
  LESSON_GRAMMAR_MAP.flatMap((entry) =>
    entry.constructions.map((construction) => [construction, entry.lessonId] as const),
  ),
);

export function lessonGrammarEntry(lessonId: number): LessonGrammarEntry | undefined {
  return ENTRY_BY_ID.get(lessonId);
}

/** The lesson that introduces a given construction tag, if any. */
export function lessonForConstruction(construction: string): number | undefined {
  return CONSTRUCTION_TO_LESSON.get(construction);
}

/** All constructions available once the learner has finished lessons 1..maxLessonId. */
export function constructionsUpToLesson(maxLessonId: number): Set<string> {
  const available = new Set<string>();
  for (const entry of LESSON_GRAMMAR_MAP) {
    if (entry.lessonId <= maxLessonId) {
      for (const construction of entry.constructions) available.add(construction);
    }
  }
  return available;
}
