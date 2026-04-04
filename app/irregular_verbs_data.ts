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
  4: [
    { base: 'see', past: 'saw', pp: 'seen', ru: 'Видеть', uk: 'Бачити' },
    { base: 'pay', past: 'paid', pp: 'paid', ru: 'Платить', uk: 'Платити' },
    { base: 'sell', past: 'sold', pp: 'sold', ru: 'Продавать', uk: 'Продавати' },
    { base: 'lose', past: 'lost', pp: 'lost', ru: 'Терять', uk: 'Втрачати' },
    { base: 'spend', past: 'spent', pp: 'spent', ru: 'Тратить', uk: 'Витрачати' },
  ],
  5: [
    { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити' },
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'find', past: 'found', pp: 'found', ru: 'Находить', uk: 'Знаходити' },
    { base: 'cost', past: 'cost', pp: 'cost', ru: 'Стоить', uk: 'Коштувати' },
    { base: 'hear', past: 'heard', pp: 'heard', ru: 'Слышать', uk: 'Чути' },
    { base: 'sing', past: 'sang', pp: 'sung', ru: 'Петь', uk: 'Співати' },
    { base: 'sleep', past: 'slept', pp: 'slept', ru: 'Спать', uk: 'Спати' },
  ],
  6: [
    { base: 'send', past: 'sent', pp: 'sent', ru: 'Отправлять', uk: 'Відправляти' },
    { base: 'leave', past: 'left', pp: 'left', ru: 'Уходить', uk: 'Йти' },
    { base: 'keep', past: 'kept', pp: 'kept', ru: 'Хранить', uk: 'Зберігати' },
    { base: 'meet', past: 'met', pp: 'met', ru: 'Встречать', uk: 'Зустрічати' },
    { base: 'put', past: 'put', pp: 'put', ru: 'Класть', uk: 'Класти' },
  ],
  7: [
    { base: 'have', past: 'had', pp: 'had', ru: 'Иметь', uk: 'Мати' },
  ],
  8: [
  ],
  9: [
  ],
  10: [
    { base: 'show', past: 'showed', pp: 'shown', ru: 'Показывать', uk: 'Показувати' },
  ],
  12: [
    { base: 'bring', past: 'brought', pp: 'brought', ru: 'Приносить', uk: 'Приносити' },
    { base: 'make', past: 'made', pp: 'made', ru: 'Делать', uk: 'Робити' },
    { base: 'give', past: 'gave', pp: 'given', ru: 'Давать', uk: 'Давати' },
    { base: 'tell', past: 'told', pp: 'told', ru: 'Рассказывать', uk: 'Розповідати' },
    { base: 'say', past: 'said', pp: 'said', ru: 'Сказать', uk: 'Сказати' },
  ],
  13: [
    { base: 'choose', past: 'chose', pp: 'chosen', ru: 'Выбирать', uk: 'Вибирати' },
    { base: 'cut', past: 'cut', pp: 'cut', ru: 'Резать', uk: 'Різати' },
    { base: 'shut', past: 'shut', pp: 'shut', ru: 'Закрывать', uk: 'Зачиняти' },
    { base: 'get', past: 'got', pp: 'got', ru: 'Получать', uk: 'Отримувати' },
  ],
  14: [
  ],
  15: [
  ],
  16: [
    { base: 'wake', past: 'woke', pp: 'woken', ru: 'Просыпаться', uk: 'Прокидатися' },
    { base: 'throw', past: 'threw', pp: 'thrown', ru: 'Бросать', uk: 'Кидати' },
    { base: 'sit', past: 'sat', pp: 'sat', ru: 'Сидеть', uk: 'Сидіти' },
    { base: 'deal', past: 'dealt', pp: 'dealt', ru: 'Иметь дело', uk: 'Мати справу' },
    { base: 'hang', past: 'hung', pp: 'hung', ru: 'Вешать', uk: 'Вішати' },
  ],
  17: [
    { base: 'set', past: 'set', pp: 'set', ru: 'Накрывать (на стол)', uk: 'Накривати' },
    { base: 'draw', past: 'drew', pp: 'drawn', ru: 'Рисовать', uk: 'Малювати' },
  ],
  18: [
    { base: 'feed', past: 'fed', pp: 'fed', ru: 'Кормить', uk: 'Годувати' },
    { base: 'hide', past: 'hid', pp: 'hidden', ru: 'Прятать', uk: 'Ховати' },
  ],
  19: [
    { base: 'lie', past: 'lay', pp: 'lain', ru: 'Лежать', uk: 'Лежати' },
    { base: 'stand', past: 'stood', pp: 'stood', ru: 'Стоять', uk: 'Стояти' },
    { base: 'grow', past: 'grew', pp: 'grown', ru: 'Расти', uk: 'Рості' },
  ],
  20: [
  ],
  21: [
    { base: 'steal', past: 'stole', pp: 'stolen', ru: 'Красть', uk: 'Красти' },
  ],
  22: [
    { base: 'ride', past: 'rode', pp: 'ridden', ru: 'Ездить', uk: 'Їздити' },
    { base: 'forbid', past: 'forbade', pp: 'forbidden', ru: 'Запрещать', uk: 'Забороняти' },
  ],
  23: [
  ],
  24: [
    { base: 'lend', past: 'lent', pp: 'lent', ru: 'Одалживать', uk: 'Позичати' },
    { base: 'win', past: 'won', pp: 'won', ru: 'Выигрывать', uk: 'Вигравати' },
  ],
  25: [
  ],
  26: [
    { base: 'catch', past: 'caught', pp: 'caught', ru: 'Ловить', uk: 'Ловити' },
    { base: 'run', past: 'ran', pp: 'run', ru: 'Запускать', uk: 'Запускати' },
    { base: 'burn', past: 'burnt/burned', pp: 'burnt/burned', ru: 'Гореть', uk: 'Горіти' },
    { base: 'hold', past: 'held', pp: 'held', ru: 'Держать', uk: 'Тримати' },
  ],
  27: [
  ],
  28: [
    { base: 'hurt', past: 'hurt', pp: 'hurt', ru: 'Ранить', uk: 'Поранити' },
  ],
  29: [
    { base: 'dwell', past: 'dwelt', pp: 'dwelt', ru: 'Обитать', uk: 'Мешкати' },
    { base: 'overcome', past: 'overcame', pp: 'overcome', ru: 'Преодолевать', uk: 'Долати' },
    { base: 'fly', past: 'flew', pp: 'flown', ru: 'Летать', uk: 'Літати' },
  ],
  30: [
    { base: 'lead', past: 'led', pp: 'led', ru: 'Вести', uk: 'Вести' },
    { base: 'begin', past: 'began', pp: 'begun', ru: 'Начинать', uk: 'Починати' },
  ],
  31: [
    { base: 'let', past: 'let', pp: 'let', ru: 'Позволять', uk: 'Дозволяти' },
    { base: 'fall', past: 'fell', pp: 'fallen', ru: 'Падать', uk: 'Падати' },
    { base: 'shake', past: 'shook', pp: 'shaken', ru: 'Трясти', uk: 'Трусити' },
    { base: 'hit', past: 'hit', pp: 'hit', ru: 'Ударять', uk: 'Вдаряти' },
  ],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).filter(([, v]) => v.length > 0).map(([k]) => Number(k))
);
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
