export interface IrregularVerb {
  base: string;
  past: string;
  pp: string;
  ru: string;
  uk: string;
}

const IRREGULAR_VERB_GLOSSARY: Record<string, IrregularVerb> = {
  break: { base: 'break', past: 'broke', pp: 'broken', ru: 'Ломать', uk: 'Ламати' },
  bring: { base: 'bring', past: 'brought', pp: 'brought', ru: 'Приносить', uk: 'Приносити' },
  build: { base: 'build', past: 'built', pp: 'built', ru: 'Строить', uk: 'Будувати' },
  buy: { base: 'buy', past: 'bought', pp: 'bought', ru: 'Покупать', uk: 'Купувати' },
  choose: { base: 'choose', past: 'chose', pp: 'chosen', ru: 'Выбирать', uk: 'Вибирати' },
  come: { base: 'come', past: 'came', pp: 'come', ru: 'Приходить', uk: 'Приходити' },
  cost: { base: 'cost', past: 'cost', pp: 'cost', ru: 'Стоить', uk: 'Коштувати' },
  drink: { base: 'drink', past: 'drank', pp: 'drunk', ru: 'Пить', uk: 'Пити' },
  drive: { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити' },
  eat: { base: 'eat', past: 'ate', pp: 'eaten', ru: 'Есть', uk: 'Їсти' },
  fall: { base: 'fall', past: 'fell', pp: 'fallen', ru: 'Падать', uk: 'Падати' },
  feel: { base: 'feel', past: 'felt', pp: 'felt', ru: 'Чувствовать', uk: 'Відчувати' },
  find: { base: 'find', past: 'found', pp: 'found', ru: 'Находить', uk: 'Знаходити' },
  forget: { base: 'forget', past: 'forgot', pp: 'forgotten', ru: 'Забывать', uk: 'Забувати' },
  get: { base: 'get', past: 'got', pp: 'gotten', ru: 'Получать', uk: 'Отримувати' },
  give: { base: 'give', past: 'gave', pp: 'given', ru: 'Давать', uk: 'Давати' },
  go: { base: 'go', past: 'went', pp: 'gone', ru: 'Идти; ехать', uk: 'Іти; їхати' },
  have: { base: 'have', past: 'had', pp: 'had', ru: 'Иметь', uk: 'Мати' },
  hear: { base: 'hear', past: 'heard', pp: 'heard', ru: 'Слышать', uk: 'Чути' },
  hit: { base: 'hit', past: 'hit', pp: 'hit', ru: 'Ударять', uk: 'Вдаряти' },
  hurt: { base: 'hurt', past: 'hurt', pp: 'hurt', ru: 'Причинять боль', uk: 'Завдавати болю' },
  keep: { base: 'keep', past: 'kept', pp: 'kept', ru: 'Держать; хранить', uk: 'Тримати; зберігати' },
  know: { base: 'know', past: 'knew', pp: 'known', ru: 'Знать', uk: 'Знати' },
  leave: { base: 'leave', past: 'left', pp: 'left', ru: 'Уходить; оставлять', uk: 'Іти; залишати' },
  let: { base: 'let', past: 'let', pp: 'let', ru: 'Позволять', uk: 'Дозволяти' },
  lose: { base: 'lose', past: 'lost', pp: 'lost', ru: 'Терять', uk: 'Втрачати' },
  make: { base: 'make', past: 'made', pp: 'made', ru: 'Делать; заставлять', uk: 'Робити; змушувати' },
  meet: { base: 'meet', past: 'met', pp: 'met', ru: 'Встречать', uk: 'Зустрічати' },
  pay: { base: 'pay', past: 'paid', pp: 'paid', ru: 'Платить', uk: 'Платити' },
  put: { base: 'put', past: 'put', pp: 'put', ru: 'Класть; ставить', uk: 'Класти; ставити' },
  read: { base: 'read', past: 'read', pp: 'read', ru: 'Читать', uk: 'Читати' },
  ring: { base: 'ring', past: 'rang', pp: 'rung', ru: 'Звонить', uk: 'Дзвонити' },
  run: { base: 'run', past: 'ran', pp: 'run', ru: 'Бегать', uk: 'Бігати' },
  say: { base: 'say', past: 'said', pp: 'said', ru: 'Сказать', uk: 'Сказати' },
  see: { base: 'see', past: 'saw', pp: 'seen', ru: 'Видеть', uk: 'Бачити' },
  sell: { base: 'sell', past: 'sold', pp: 'sold', ru: 'Продавать', uk: 'Продавати' },
  send: { base: 'send', past: 'sent', pp: 'sent', ru: 'Отправлять', uk: 'Надсилати' },
  shake: { base: 'shake', past: 'shook', pp: 'shaken', ru: 'Трясти', uk: 'Трусити' },
  sing: { base: 'sing', past: 'sang', pp: 'sung', ru: 'Петь', uk: 'Співати' },
  sit: { base: 'sit', past: 'sat', pp: 'sat', ru: 'Сидеть', uk: 'Сидіти' },
  sleep: { base: 'sleep', past: 'slept', pp: 'slept', ru: 'Спать', uk: 'Спати' },
  speak: { base: 'speak', past: 'spoke', pp: 'spoken', ru: 'Говорить', uk: 'Говорити' },
  stand: { base: 'stand', past: 'stood', pp: 'stood', ru: 'Стоять', uk: 'Стояти' },
  strike: { base: 'strike', past: 'struck', pp: 'struck', ru: 'Ударять', uk: 'Вдаряти' },
  take: { base: 'take', past: 'took', pp: 'taken', ru: 'Брать', uk: 'Брати' },
  tell: { base: 'tell', past: 'told', pp: 'told', ru: 'Рассказывать; говорить', uk: 'Розповідати; говорити' },
  think: { base: 'think', past: 'thought', pp: 'thought', ru: 'Думать', uk: 'Думати' },
  understand: { base: 'understand', past: 'understood', pp: 'understood', ru: 'Понимать', uk: 'Розуміти' },
  wake: { base: 'wake', past: 'woke', pp: 'woken', ru: 'Просыпаться; будить', uk: 'Прокидатися; будити' },
  wear: { base: 'wear', past: 'wore', pp: 'worn', ru: 'Носить', uk: 'Носити' },
  write: { base: 'write', past: 'wrote', pp: 'written', ru: 'Писать', uk: 'Писати' },
};

const LESSON_IRREGULAR_BASES = {
  1: [],
  2: [],
  3: ['buy', 'come', 'cost', 'drink', 'drive', 'eat', 'feel', 'forget', 'hear', 'know', 'read', 'speak', 'take', 'understand', 'wear', 'write'],
  4: ['break', 'lose', 'pay', 'see', 'sell', 'send'],
  5: ['find', 'sing', 'sleep'],
  6: ['get', 'go', 'keep', 'meet', 'put'],
  7: ['have'],
  8: ['leave', 'run'],
  9: [],
  10: [],
  11: [],
  12: ['bring', 'build', 'choose', 'give', 'make', 'say', 'sit', 'stand', 'tell', 'think'],
  13: [],
  14: [],
  15: [],
  16: ['wake'],
  17: [],
  18: ['let'],
  19: [],
  20: [],
  21: [],
  22: [],
  23: [],
  24: [],
  25: ['ring'],
  26: [],
  27: [],
  28: ['hurt'],
  29: [],
  30: [],
  31: ['fall', 'hit', 'shake', 'strike'],
  32: [],
} satisfies Record<number, string[]>;

function verbsForLesson(bases: string[]): IrregularVerb[] {
  return bases.map((base) => {
    const verb = IRREGULAR_VERB_GLOSSARY[base];
    if (!verb) throw new Error(`Missing irregular verb glossary row: ${base}`);
    return verb;
  });
}

export const IRREGULAR_VERBS_BY_LESSON: Record<number, IrregularVerb[]> = Object.fromEntries(
  Object.entries(LESSON_IRREGULAR_BASES).map(([lessonId, bases]) => [Number(lessonId), verbsForLesson(bases)])
) as Record<number, IrregularVerb[]>;

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).filter(([, verbs]) => verbs.length > 0).map(([lessonId]) => Number(lessonId))
);

export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([lessonId, verbs]) => [Number(lessonId), verbs.length])
);

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
