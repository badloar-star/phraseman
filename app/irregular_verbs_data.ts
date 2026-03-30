export interface IrregularVerb {
  base: string;
  past: string;
  pp: string;
  ru: string;
  uk: string;
}

// Placeholder for Lesson 1 - waiting for user data
export const IRREGULAR_VERBS_BY_LESSON: Record<number, IrregularVerb[]> = {
  1: [],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(Object.keys(IRREGULAR_VERBS_BY_LESSON).map(Number));
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
