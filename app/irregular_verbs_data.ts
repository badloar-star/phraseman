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
  3: [
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити' },
    { base: 'read', past: 'read', pp: 'read', ru: 'Читать', uk: 'Читати' },
    { base: 'teach', past: 'taught', pp: 'taught', ru: 'Учить', uk: 'Навчати' },
    { base: 'swim', past: 'swam', pp: 'swum', ru: 'Плавать', uk: 'Плавати' },
    { base: 'play', past: 'played', pp: 'played', ru: 'Играть', uk: 'Грати' },
  ],
  4: [
    { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити' },
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти' },
    { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити' },
    { base: 'buy', past: 'bought', pp: 'bought', ru: 'Покупать', uk: 'Купувати' },
    { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити' },
    { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти' },
  ],
  5: [
    { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити' },
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'know', past: 'knew', pp: 'known', ru: 'Знать', uk: 'Знати' },
    { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити' },
    { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти' },
    { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити' },
    { base: 'live', past: 'lived', pp: 'lived', ru: 'Жить', uk: 'Жити' },
    { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти' },
  ],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(Object.keys(IRREGULAR_VERBS_BY_LESSON).map(Number));
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
