export type LearningV2EnglishLexicalSenseV1 = Readonly<{
  id: string;
  english: string;
  glossRu: string;
  partOfSpeech: string;
  lessonOrdinal: number;
  sourceEvidenceRefs: readonly string[];
}>;

export type LearningV2EnglishLexicalRetrievalEdgeV1 = Readonly<{
  senseId: string;
  targetLessonOrdinal: number;
  reason: string;
}>;

type LexemeSeed = readonly [english: string, glossRu: string, partOfSpeech: string];

const EVIDENCE_REFS = Object.freeze(["EV-CEFR-01", "EV-EP-01", "PH-VOCAB-01", "OC-SCENARIO-01"]);

/** Ten deliberate core senses per non-checkpoint lesson. Repeated forms in
 * later lessons are retrieval unless a distinct sense/POS is explicitly listed.
 */
const LESSON_LEXEMES: Readonly<Record<number, readonly LexemeSeed[]>> = Object.freeze({
  1: [["hello", "привет", "interjection"], ["name", "имя", "noun"], ["from", "из; родом из", "preposition"], ["country", "страна", "noun"], ["language", "язык", "noun"], ["English", "английский язык", "proper_noun"], ["Russian", "русский язык", "proper_noun"], ["yes", "да", "response"], ["no", "нет", "response"], ["goodbye", "до свидания", "interjection"]],
  2: [["man", "мужчина", "noun"], ["woman", "женщина", "noun"], ["boy", "мальчик", "noun"], ["girl", "девочка", "noun"], ["friend", "друг; подруга", "noun"], ["phone", "телефон", "noun"], ["bag", "сумка", "noun"], ["key", "ключ", "noun"], ["door", "дверь", "noun"], ["table", "стол", "noun"]],
  3: [["mother", "мать; мама", "noun"], ["father", "отец; папа", "noun"], ["sister", "сестра", "noun"], ["brother", "брат", "noun"], ["family", "семья", "noun"], ["car", "машина", "noun"], ["wallet", "кошелёк", "noun"], ["coat", "пальто; куртка", "noun"], ["photo", "фотография", "noun"], ["children", "дети", "plural_noun"]],
  4: [["coffee", "кофе", "noun"], ["tea", "чай", "noun"], ["water", "вода", "noun"], ["music", "музыка", "noun"], ["film", "фильм", "noun"], ["read", "читать", "verb"], ["cook", "готовить", "verb"], ["walk", "гулять; ходить пешком", "verb"], ["play", "играть", "verb"], ["now", "сейчас", "adverb"]],
  5: [["wake up", "просыпаться", "phrasal_verb"], ["breakfast", "завтрак", "noun"], ["work", "работать", "verb"], ["study", "учиться", "verb"], ["lunch", "обед", "noun"], ["go", "идти; ехать", "verb"], ["come", "приходить; приезжать", "verb"], ["start", "начинать", "verb"], ["finish", "заканчивать", "verb"], ["sleep", "спать", "verb"]],
  6: [["morning", "утро", "noun"], ["afternoon", "день после полудня", "noun"], ["evening", "вечер", "noun"], ["night", "ночь", "noun"], ["today", "сегодня", "adverb"], ["Monday", "понедельник", "proper_noun"], ["weekend", "выходные", "noun"], ["always", "всегда", "adverb"], ["usually", "обычно", "adverb"], ["sometimes", "иногда", "adverb"]],
  7: [["help", "помогать; помощь", "verb"], ["open", "открывать", "verb"], ["close", "закрывать", "verb"], ["carry", "нести", "verb"], ["wait", "ждать", "verb"], ["stop", "остановиться", "verb"], ["show", "показывать", "verb"], ["call", "звонить", "verb"], ["write", "писать", "verb"], ["listen", "слушать", "verb"]],
  9: [["kitchen", "кухня", "noun"], ["bathroom", "ванная", "noun"], ["bedroom", "спальня", "noun"], ["living room", "гостиная", "noun"], ["bed", "кровать", "noun"], ["chair", "стул", "noun"], ["sofa", "диван", "noun"], ["window", "окно", "noun"], ["park", "парк", "noun"], ["bank", "банк", "noun"]],
  10: [["price", "цена", "noun"], ["cash", "наличные", "noun"], ["card", "банковская карта", "noun"], ["kilo", "килограмм", "measure"], ["bottle", "бутылка", "container"], ["box", "коробка", "container"], ["pair", "пара", "measure"], ["size", "размер", "noun"], ["receipt", "чек", "noun"], ["available", "в наличии; доступный", "adjective"]],
  11: [["sit", "сидеть", "verb"], ["stand", "стоять", "verb"], ["run", "бежать", "verb"], ["talk", "разговаривать", "verb"], ["eat", "есть", "verb"], ["drink", "пить", "verb"], ["dance", "танцевать", "verb"], ["rain", "идти о дожде", "verb"], ["happen", "происходить", "verb"], ["look", "смотреть; выглядеть", "verb"]],
  12: [["yesterday", "вчера", "adverb"], ["school", "школа", "noun"], ["office", "офис", "noun"], ["hospital", "больница", "noun"], ["hotel", "отель", "noun"], ["tired", "уставший", "adjective"], ["busy", "занятый", "adjective"], ["quiet", "тихий", "adjective"], ["late", "поздно; опоздавший", "adjective"], ["early", "рано; ранний", "adjective"]],
  13: [["visit", "посещать", "verb"], ["watch", "смотреть", "verb"], ["travel", "путешествовать", "verb"], ["meet", "встречать; встречаться", "verb"], ["see", "видеть", "verb"], ["have", "иметь; проводить", "verb"], ["stay", "оставаться", "verb"], ["party", "вечеринка", "noun"], ["trip", "поездка", "noun"], ["last", "прошлый", "adjective"]],
  14: [["head", "голова", "noun"], ["stomach", "живот; желудок", "noun"], ["back", "спина", "noun"], ["pain", "боль", "noun"], ["cold", "простуда", "noun"], ["cough", "кашель", "noun"], ["fever", "температура; жар", "noun"], ["sick", "больной; плохо себя чувствующий", "adjective"], ["dizzy", "испытывающий головокружение", "adjective"], ["medicine", "лекарство", "noun"]],
  15: [["tonight", "сегодня вечером", "adverb"], ["tomorrow", "завтра", "adverb"], ["next week", "на следующей неделе", "time_phrase"], ["cinema", "кинотеатр", "noun"], ["restaurant", "ресторан", "noun"], ["free", "свободный", "adjective"], ["maybe", "возможно", "adverb"], ["together", "вместе", "adverb"], ["plan", "план", "noun"], ["appointment", "назначенная встреча", "noun"]],
  17: [["ticket", "билет", "noun"], ["platform", "платформа", "noun"], ["gate", "выход на посадку", "noun"], ["exit", "выход", "noun"], ["entrance", "вход", "noun"], ["train", "поезд", "noun"], ["bus", "автобус", "noun"], ["flight", "рейс", "noun"], ["airport", "аэропорт", "noun"], ["timetable", "расписание", "noun"]],
  18: [["reservation", "бронь", "noun"], ["booking", "бронирование", "noun"], ["room", "номер; комната", "noun"], ["seat", "место для сидения", "noun"], ["luggage", "багаж", "noun"], ["suitcase", "чемодан", "noun"], ["reception", "стойка регистрации", "noun"], ["single", "одноместный", "adjective"], ["double", "двухместный", "adjective"], ["document", "документ", "noun"]],
  19: [["menu", "меню", "noun"], ["soup", "суп", "noun"], ["salad", "салат", "noun"], ["rice", "рис", "noun"], ["bread", "хлеб", "noun"], ["meat", "мясо", "noun"], ["fish", "рыба", "noun"], ["milk", "молоко", "noun"], ["egg", "яйцо", "noun"], ["allergy", "аллергия", "noun"]],
  20: [["fast", "быстрый", "adjective"], ["slow", "медленный", "adjective"], ["big", "большой", "adjective"], ["small", "маленький", "adjective"], ["cheap", "дешёвый", "adjective"], ["expensive", "дорогой", "adjective"], ["comfortable", "удобный", "adjective"], ["easy", "лёгкий; простой", "adjective"], ["difficult", "трудный", "adjective"], ["quality", "качество", "noun"]],
  21: [["ever", "когда-либо", "adverb"], ["never", "никогда", "adverb"], ["abroad", "за границей", "adverb"], ["try", "пробовать", "verb"], ["fly", "летать", "verb"], ["drive", "водить машину", "verb"], ["climb", "подниматься; взбираться", "verb"], ["win", "побеждать", "verb"], ["learn", "выучить; научиться", "verb"], ["lose", "терять; проигрывать", "verb"]],
  22: [["allowed", "разрешено", "adjective"], ["forbidden", "запрещено", "adjective"], ["helmet", "шлем", "noun"], ["seat belt", "ремень безопасности", "noun"], ["smoke", "курить", "verb"], ["park", "парковаться", "verb"], ["touch", "трогать", "verb"], ["safe", "безопасный", "adjective"], ["careful", "осторожный", "adjective"], ["required", "обязательный", "adjective"]],
  23: [["sorry", "извините", "discourse_marker"], ["repeat", "повторить", "verb"], ["mean", "иметь в виду", "verb"], ["understand", "понимать", "verb"], ["agree", "соглашаться", "verb"], ["disagree", "не соглашаться", "verb"], ["really", "действительно", "adverb"], ["interesting", "интересный", "adjective"], ["opinion", "мнение", "noun"], ["exactly", "именно; точно", "adverb"]],
  25: [["project", "проект", "noun"], ["task", "задача", "noun"], ["meeting", "рабочая встреча", "noun"], ["class", "занятие", "noun"], ["deadline", "крайний срок", "noun"], ["break", "перерыв", "noun"], ["schedule", "расписание", "noun"], ["temporary", "временный", "adjective"], ["currently", "в настоящее время", "adverb"], ["normal", "обычный; нормальный", "adjective"]],
  26: [["while", "пока; в то время как", "conjunction"], ["when", "когда", "conjunction"], ["suddenly", "внезапно", "adverb"], ["fall", "падать", "verb"], ["break", "ломаться", "verb"], ["arrive", "прибывать", "verb"], ["leave", "уходить; уезжать", "verb"], ["cross", "переходить; пересекать", "verb"], ["accident", "происшествие", "noun"], ["interruption", "прерывание", "noun"]],
  27: [["broken", "сломанный", "adjective"], ["missing", "отсутствующий", "adjective"], ["wrong", "неправильный; не тот", "adjective"], ["noisy", "шумный", "adjective"], ["dirty", "грязный", "adjective"], ["refund", "возврат денег", "noun"], ["replace", "заменить", "verb"], ["change", "поменять", "verb"], ["repair", "починить", "verb"], ["manager", "менеджер", "noun"]],
  28: [["if", "если", "conjunction"], ["delay", "задержка", "noun"], ["cancel", "отменить", "verb"], ["miss", "пропустить; не успеть", "verb"], ["chance", "возможность; шанс", "noun"], ["result", "результат", "noun"], ["alternative", "альтернатива", "noun"], ["problem", "проблема", "noun"], ["solution", "решение", "noun"], ["otherwise", "иначе", "adverb"]],
  29: [["person", "человек", "noun"], ["place", "место", "noun"], ["building", "здание", "noun"], ["worker", "работник", "noun"], ["visitor", "посетитель", "noun"], ["corner", "угол", "noun"], ["nearby", "поблизости", "adverb"], ["opposite", "напротив", "preposition"], ["inside", "внутри", "adverb"], ["outside", "снаружи", "adverb"]],
  30: [["message", "сообщение", "noun"], ["text", "текстовое сообщение", "noun"], ["say", "сказать", "verb"], ["tell", "сообщить кому-то", "verb"], ["ask", "просить; спрашивать", "verb"], ["reply", "ответить", "verb"], ["remember", "помнить", "verb"], ["forget", "забывать", "verb"], ["promise", "обещать", "verb"], ["news", "новость; новости", "noun"]],
  31: [["goal", "цель", "noun"], ["change", "изменение", "noun"], ["begin", "начинать", "verb"], ["move", "переезжать; двигаться", "verb"], ["achieve", "достигать", "verb"], ["next", "следующий", "adjective"], ["future", "будущее", "noun"], ["progress", "прогресс", "noun"], ["experience", "опыт", "noun"], ["step", "шаг", "noun"]],
});

function senseSlug(english: string): string {
  return english.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function materializeSenses(): readonly LearningV2EnglishLexicalSenseV1[] {
  return Object.freeze(Object.entries(LESSON_LEXEMES).flatMap(([lesson, lexemes]) => {
    const lessonOrdinal = Number(lesson);
    return lexemes.map(([english, glossRu, partOfSpeech]) => Object.freeze({
      id: `en.${senseSlug(english)}.sense.l${String(lessonOrdinal).padStart(2, "0")}`,
      english,
      glossRu,
      partOfSpeech,
      lessonOrdinal,
      sourceEvidenceRefs: EVIDENCE_REFS,
    }));
  }));
}

function retrievalTargets(lessonOrdinal: number): readonly number[] {
  const nextCheckpoint = [8, 16, 24, 32].find((checkpoint) => checkpoint > lessonOrdinal);
  return Object.freeze([...new Set([
    Math.min(lessonOrdinal + 1, 32),
    Math.min(lessonOrdinal + 4, 32),
    nextCheckpoint,
  ].filter((target): target is number => typeof target === "number" && target > lessonOrdinal))]);
}

export const LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 = materializeSenses();

export const LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1 = Object.freeze(
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.flatMap((sense) =>
    retrievalTargets(sense.lessonOrdinal).map((targetLessonOrdinal) => Object.freeze({
      senseId: sense.id,
      targetLessonOrdinal,
      reason: targetLessonOrdinal === 32
        ? "кумулятивное извлечение в финальном переносе"
        : "разнесённое извлечение в изменённом сценарном контексте",
    })),
  ),
);
