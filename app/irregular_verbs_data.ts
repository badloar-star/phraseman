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
    { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити' },
    { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити' },
    { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти' },
    { base: 'know', past: 'knew', pp: 'known', ru: 'Знать', uk: 'Знати' },
    { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти' },
    { base: 'buy', past: 'bought', pp: 'bought', ru: 'Покупать', uk: 'Купувати' },
    { base: 'read', past: 'read', pp: 'read', ru: 'Читать', uk: 'Читати' },
    { base: 'live', past: 'lived', pp: 'lived', ru: 'Жить', uk: 'Жити' },
    { base: 'come', past: 'came', pp: 'come', ru: 'Приходить', uk: 'Приходити' },
    { base: 'write', past: 'wrote', pp: 'written', ru: 'Писать', uk: 'Писати' },
    { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити' },
    { base: 'feel', past: 'felt', pp: 'felt', ru: 'Чувствовать', uk: 'Відчувати' },
    { base: 'forget', past: 'forgot', pp: 'forgotten', ru: 'Забывать', uk: 'Забувати' },
    { base: 'take', past: 'took', pp: 'taken', ru: 'Брать', uk: 'Брати' },
    { base: 'teach', past: 'taught', pp: 'taught', ru: 'Преподавать', uk: 'Викладати' },
    { base: 'wear', past: 'wore', pp: 'worn', ru: 'Носить', uk: 'Носити' },
  ],
  5: [
    { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити' },
    { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити' },
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'know', past: 'knew', pp: 'known', ru: 'Знать', uk: 'Знати' },
    { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити' },
    { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти' },
    { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити' },
    { base: 'buy', past: 'bought', pp: 'bought', ru: 'Покупать', uk: 'Купувати' },
    { base: 'find', past: 'found', pp: 'found', ru: 'Находить', uk: 'Знаходити' },
    { base: 'cost', past: 'cost', pp: 'cost', ru: 'Стоить', uk: 'Коштувати' },
    { base: 'feel', past: 'felt', pp: 'felt', ru: 'Чувствовать', uk: 'Відчувати' },
    { base: 'forget', past: 'forgot', pp: 'forgotten', ru: 'Забывать', uk: 'Забувати' },
    { base: 'hear', past: 'heard', pp: 'heard', ru: 'Слышать', uk: 'Чути' },
    { base: 'lose', past: 'lost', pp: 'lost', ru: 'Терять', uk: 'Втрачати' },
    { base: 'pay', past: 'paid', pp: 'paid', ru: 'Платить', uk: 'Платити' },
    { base: 'read', past: 'read', pp: 'read', ru: 'Читать', uk: 'Читати' },
    { base: 'sell', past: 'sold', pp: 'sold', ru: 'Продавать', uk: 'Продавати' },
    { base: 'sing', past: 'sang', pp: 'sung', ru: 'Петь', uk: 'Співати' },
    { base: 'sleep', past: 'slept', pp: 'slept', ru: 'Спать', uk: 'Спати' },
    { base: 'take', past: 'took', pp: 'taken', ru: 'Брать', uk: 'Брати' },
    { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти' },
    { base: 'wear', past: 'wore', pp: 'worn', ru: 'Носить', uk: 'Носити' },
    { base: 'write', past: 'wrote', pp: 'written', ru: 'Писать', uk: 'Писати' },
  ],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(Object.keys(IRREGULAR_VERBS_BY_LESSON).map(Number));
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
