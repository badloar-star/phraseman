export interface IrregularVerb {
  base: string;
  past: string;
  pp: string;
  ru: string;
  uk: string;
}

// Irregular Verbs by Lesson
export const IRREGULAR_VERBS_BY_LESSON: Record<number, IrregularVerb[]> = {
  1: [
    { base: 'be', past: 'was/were', pp: 'been', ru: 'Быть', uk: 'Бути' },
    { base: 'break', past: 'broke', pp: 'broken', ru: 'Ломать', uk: 'Ламати' },
  ],
  2: [
    { base: 'be', past: 'was/were', pp: 'been', ru: 'Быть', uk: 'Бути' },
    { base: 'build', past: 'built', pp: 'built', ru: 'Строить', uk: 'Будувати' },
  ],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(Object.keys(IRREGULAR_VERBS_BY_LESSON).map(Number));
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
