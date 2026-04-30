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
    { base: 'come', past: 'came', pp: 'come', ru: 'Приходить', uk: 'Приходити' },
    { base: 'write', past: 'wrote', pp: 'written', ru: 'Писать', uk: 'Писати' },
    { base: 'drive', past: 'drove', pp: 'driven', ru: 'Водить', uk: 'Водити' },
    { base: 'feel', past: 'felt', pp: 'felt', ru: 'Чувствовать', uk: 'Відчувати' },
    { base: 'forget', past: 'forgot', pp: 'forgotten', ru: 'Забывать', uk: 'Забувати' },
    { base: 'take', past: 'took', pp: 'taken', ru: 'Брать', uk: 'Брати' },
    { base: 'teach', past: 'taught', pp: 'taught', ru: 'Преподавать', uk: 'Викладати' },
    { base: 'wear', past: 'wore', pp: 'worn', ru: 'Носить', uk: 'Носити' },
    { base: 'cost', past: 'cost', pp: 'cost', ru: 'Стоить', uk: 'Коштувати' },
  ],
  4: [
    { base: 'see', past: 'saw', pp: 'seen', ru: 'Видеть', uk: 'Бачити' },
    { base: 'pay', past: 'paid', pp: 'paid', ru: 'Платить', uk: 'Платити' },
    { base: 'sell', past: 'sold', pp: 'sold', ru: 'Продавать', uk: 'Продавати' },
    { base: 'lose', past: 'lost', pp: 'lost', ru: 'Терять', uk: 'Втрачати' },
    { base: 'spend', past: 'spent', pp: 'spent', ru: 'Тратить', uk: 'Витрачати' },
    { base: 'do', past: 'did', pp: 'done', ru: 'Делать', uk: 'Робити' },
    { base: 'send', past: 'sent', pp: 'sent', ru: 'Отправлять', uk: 'Відправляти' },
  ],
  5: [
    { base: 'go', past: 'went', pp: 'gone', ru: 'Идти', uk: 'Йти' },
    { base: 'find', past: 'found', pp: 'found', ru: 'Находить', uk: 'Знаходити' },
    { base: 'hear', past: 'heard', pp: 'heard', ru: 'Слышать', uk: 'Чути' },
    { base: 'sing', past: 'sang', pp: 'sung', ru: 'Петь', uk: 'Співати' },
    { base: 'sleep', past: 'slept', pp: 'slept', ru: 'Спать', uk: 'Спати' },
  ],
  6: [
    { base: 'leave', past: 'left', pp: 'left', ru: 'Уходить', uk: 'Йти' },
    { base: 'keep', past: 'kept', pp: 'kept', ru: 'Хранить', uk: 'Зберігати' },
    { base: 'meet', past: 'met', pp: 'met', ru: 'Встречать', uk: 'Зустрічати' },
    { base: 'put', past: 'put', pp: 'put', ru: 'Класть', uk: 'Класти' },
    { base: 'get', past: 'got', pp: 'got', ru: 'Получать', uk: 'Отримувати' },
  ],
  7: [
    { base: 'have', past: 'had', pp: 'had', ru: 'Иметь', uk: 'Мати' },
  ],
  8: [
    { base: 'spring', past: 'sprang', pp: 'sprung', ru: 'Прыгать / Пружинить', uk: 'Пострибати / Стискатися' },
  ],
  9: [
  ],
  10: [
    { base: 'show', past: 'showed', pp: 'shown', ru: 'Показывать', uk: 'Показувати' },
    { base: 'choose', past: 'chose', pp: 'chosen', ru: 'Выбирать', uk: 'Вибирати' },
    { base: 'bring', past: 'brought', pp: 'brought', ru: 'Приносить', uk: 'Приносити' },
  ],
  11: [
  ],
  12: [
    { base: 'make', past: 'made', pp: 'made', ru: 'Создавать / готовить', uk: 'Створювати / готувати' },
    { base: 'give', past: 'gave', pp: 'given', ru: 'Давать', uk: 'Давати' },
    { base: 'tell', past: 'told', pp: 'told', ru: 'Рассказывать', uk: 'Розповідати' },
    { base: 'say', past: 'said', pp: 'said', ru: 'Сказать', uk: 'Сказати' },
  ],
  13: [
    { base: 'cut', past: 'cut', pp: 'cut', ru: 'Резать', uk: 'Різати' },
    { base: 'shut', past: 'shut', pp: 'shut', ru: 'Закрывать', uk: 'Зачиняти' },
  ],
  14: [
    { base: 'seek', past: 'sought', pp: 'sought', ru: 'Искать', uk: 'Шукати' },
    { base: 'fight', past: 'fought', pp: 'fought', ru: 'Драться / Бороться', uk: 'Битися / Боротися' },
    { base: 'light', past: 'lit', pp: 'lit', ru: 'Зажигать / Освещать', uk: 'Запалювати / Освітлювати' },
    { base: 'sweep', past: 'swept', pp: 'swept', ru: 'Подметать', uk: 'Підмітати' },
    { base: 'weep', past: 'wept', pp: 'wept', ru: 'Плакать', uk: 'Плакати' },
  ],
  15: [
    { base: 'bend', past: 'bent', pp: 'bent', ru: 'Гнуть / Сгибать', uk: 'Гнути / Згинати' },
    { base: 'split', past: 'split', pp: 'split', ru: 'Расколоть / Делить', uk: 'Розколювати / Ділити' },
    { base: 'stink', past: 'stank', pp: 'stunk', ru: 'Вонять / Плохо пахнуть', uk: 'Смердіти' },
    { base: 'kneel', past: 'kneeled', pp: 'kneeled', ru: 'Стоять на коленях', uk: 'Стояти на колінах' },
    { base: 'spill', past: 'spilled', pp: 'spilled', ru: 'Проливать / Ронять жидкость', uk: 'Проливати / Роняти рідину' },
  ],
  16: [
    { base: 'deal', past: 'dealt', pp: 'dealt', ru: 'Иметь дело / Решать (with)', uk: 'Мати справу / Вирішувати (with)' },
    { base: 'hang', past: 'hung', pp: 'hung', ru: 'Вешать / Висеть', uk: 'Вішати / Висіти' },
    { base: 'lay', past: 'laid', pp: 'laid', ru: 'Класть (положить)', uk: 'Класти (покласти)' },
    { base: 'stick', past: 'stuck', pp: 'stuck', ru: 'Втыкать / Липнуть', uk: 'Встромляти / Липнути' },
    { base: 'tear', past: 'tore', pp: 'torn', ru: 'Рвать', uk: 'Рвати' },
  ],
  17: [
    { base: 'set', past: 'set', pp: 'set', ru: 'Накрывать (на стол) / Ставить', uk: 'Накривати / Ставити' },
    { base: 'flee', past: 'fled', pp: 'fled', ru: 'Бежать (спасаясь)', uk: 'Тікати' },
    { base: 'shine', past: 'shone', pp: 'shone', ru: 'Сиять / Светить', uk: 'Сяяти / Світити' },
    { base: 'sting', past: 'stung', pp: 'stung', ru: 'Жалить / Обжечь (о разуме)', uk: 'Жалити / Пекти (про заувагу)' },
  ],
  18: [
    { base: 'strive', past: 'strove', pp: 'striven', ru: 'Стремиться; добиваться', uk: 'Прагти; досягати' },
    { base: 'thrive', past: 'thrived', pp: 'thrived', ru: 'Преуспевать; процветать', uk: 'Процвітати; мати успіх' },
    { base: 'cling', past: 'clung', pp: 'clung', ru: 'Цепляться; держаться', uk: 'Чіплятися; триматися' },
    { base: 'fling', past: 'flung', pp: 'flung', ru: 'Швырять; бросать', uk: 'Швиряти; кидати' },
    { base: 'sling', past: 'slung', pp: 'slung', ru: 'Бросок; на ремень', uk: 'Слінг; кинути; на ремінь' },
    { base: 'let', past: 'let', pp: 'let', ru: 'Позволять', uk: 'Дозволяти' },
  ],
  19: [
    { base: 'shrink', past: 'shrank', pp: 'shrunk', ru: 'Сжиматься; уменьшаться', uk: 'Стискатися; зменшуватися' },
    { base: 'slink', past: 'slunk', pp: 'slunk', ru: 'Красться; подкрадываться', uk: 'Крастися; підкраватися' },
    { base: 'strew', past: 'strewed', pp: 'strewn', ru: 'Усыпать; разбрасывать', uk: 'Посипати; розкидати' },
    { base: 'slay', past: 'slew', pp: 'slain', ru: 'Убивать (в т.ч. в перен. знач.)', uk: 'Убивати (у т. ч. в перен. знач.)' },
    { base: 'smite', past: 'smote', pp: 'smitten', ru: 'Поражать; сильно ударить', uk: 'Вражати; сильно вдарити' },
    { base: 'lie', past: 'lay', pp: 'lain', ru: 'Лежать', uk: 'Лежати' },
    { base: 'stand', past: 'stood', pp: 'stood', ru: 'Стоять', uk: 'Стояти' },
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
    { base: 'run', past: 'ran', pp: 'run', ru: 'Бегать', uk: 'Бігати' },
    { base: 'burn', past: 'burned', pp: 'burned', ru: 'Гореть', uk: 'Горіти' },
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
    { base: 'fall', past: 'fell', pp: 'fallen', ru: 'Падать', uk: 'Падати' },
    { base: 'shake', past: 'shook', pp: 'shaken', ru: 'Трясти', uk: 'Трусити' },
    { base: 'hit', past: 'hit', pp: 'hit', ru: 'Ударять', uk: 'Вдаряти' },
  ],
  32: [
  ],
};

export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = new Set(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).filter(([, v]) => v.length > 0).map(([k]) => Number(k))
);
export const IRREGULAR_VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(IRREGULAR_VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
