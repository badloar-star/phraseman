// зачем: урок 1 — это 56 сессий (владелец, 2026-08-16), и ВСЕ 56 учат ОДНОЙ
// конструкции — глаголу to be (владелец, 2026-08-17).
//
// ⛔ ГЛАВНОЕ ПРАВИЛО, ИЗ-ЗА КОТОРОГО КАРТА ПЕРЕПИСАНА ЦЕЛИКОМ:
//
// Первая версия этой карты была ОШИБОЧНОЙ. Она раскладывала по уроку 1:
// настоящее простое (с. 25), настоящее длительное (с. 33), прошедшее (с. 41),
// неправильные глаголы (с. 42, 44), будущее (с. 49), сравнительную степень
// (с. 53). Это материал уроков 2–12 по спецификации. Урок 1 съедал треть курса,
// а на 31 оставшийся урок грамматики не оставалось.
//
// Владелец 2026-08-17: «а как мы разобьём на 56 сессий, а потом ещё 32 урока,
// если в первых 10 сессиях уже что-то больше, чем to be? Смотри, оно же должно
// двигаться правильно, как в 32 уроках, то есть первый урок to be (как в
// оригинале). Значит все 56 сессий должны учить to be».
//
// Спецификация (docs/v2/03, эпизод 1) подтверждает: «I am / you are как фразовые
// модели, сокращение I'm, личные местоимения без полной таблицы to be».
// Владелец разрешил расширить до ПОЛНОЙ таблицы (he/she/it/we/they) — это та же
// конструкция, дробить её на два урока искусственно. Дальше границы держатся
// строго по спецификации: have — урок 3, like/want — урок 4, и так далее.
//
// НИКАКОГО другого глагола в уроке 1. Запрещены: have, like, want, do, can, go,
// see, любое прошедшее и будущее, there is/are. Исключение ровно одно —
// застывшие формулы вежливости (Thank you, Nice to meet you, See you later):
// они не разбираются как грамматика и не порождают заданий на форму.
//
// Полные правила построения уроков: docs/v2/LESSON_DESIGN_RULES.ru.md
// Неподвижный стиль интро и восьми локалей:
// docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md
//
// ПРАВИЛА ВЛАДЕЛЬЦА, по которым построена эта карта:
//
// 1. НЕ КАЖДАЯ СЕССИЯ — ФРАЗЫ. Есть разные типы (см. SessionKind ниже).
// 2. СЛОВА ИДУТ ДО ФРАЗ. «Юзер не может начать сессию, не ознакомившись со
//    словами — он же не знает их». Слово получает НЕСКОЛЬКО касаний за сессию
//    (услышать → вспомнить → собрать → применить), а не один выбор из пяти:
//    один выбор — это узнавание, а не отработка (владелец, 2026-08-17).
// 2A. КАЖДАЯ ОБЫЧНАЯ УЧЕБНАЯ СЕССИЯ по возможности приносит новую полезную
//    лексику. Если budget/чистая грамматическая цель этого не допускают, нужна
//    явная редакторская причина. Voice, recall и checkpoint новых слов не дают.
// 3. АКТИВНОЕ ПРИПОМИНАНИЕ. Фразы МОГУТ повторяться в поздних сессиях — это не
//    дублирование, а извлечение из памяти после задержки.
// 4. ГОЛОСОВЫЕ СЕССИИ отдельным типом.
// 5. ВОСЕМЬ ЯЗЫКОВ ОБЯЗАТЕЛЬНЫ. Решение владельца 2026-08-16: «все языки должны
//    быть, это строго при генерации». Объяснения, подсказки и разборы ошибок
//    пишутся сразу на ru, uk, es, pt-BR, vi, id, tr, pl. Маркер
//    [[NEEDS_TRANSLATION]] в готовой сессии — ошибка: сессия с ним считается
//    ненаписанной, а не частично готовой.
// 6. ФИЛЬТР ПРИГОДНОСТИ ФРАЗ обязателен (владелец, 2026-08-17). Отбраковываются
//    непереводимые краткие ответы (Yes, I am), фразы без смысла вне диалога
//    (And you?), мёртвый учебниковый язык (How do you do) и чужие имена
//    (I am Anna). Исполняемый фильтр: phrase_admissibility_filter_v1.ts.
//
// ПОЧЕМУ НЕТ СЕССИЙ НА НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ И ПРЕДЛОГИ. Они были в первой версии
// (с. 42, 44 и с. 18, 30, 46, 50) и убраны вместе с остальным забегом вперёд:
// неправильный глагол — это прошедшее время, а предлоги места и времени идут с
// теми уроками, где появляются их конструкции. В уроке про to be им нечего
// делать. Типы SessionKind для них сохранены — пригодятся в уроках 5+.
//
// АУДИТ ЭТАЛОНА (app/lesson_data_*, 2026-08-16), на который опирается карта:
//   • фразы — lesson_data_1_8_phrases_source.ts: фраза + разбор по словам +
//     5 дистракторов + категория;
//   • теория — lesson_intro_screens_lesson1_v2.ts: экраны concept/formula/practice;
//   • неправильные глаголы — irregular_verbs_data.ts: base/past/pp + альтформы,
//     порция на урок = 6 (IRREGULAR_VERB_PORTION_SIZE), это число сохраняем;
//   • предлоги — семь тренировок по типам: место in/on/at, время in/on/at,
//     направление to/into/from, длительность for/since, глагольные связки.

/**
 * Тип сессии. Определяет, ЧЕМ она наполнена, и какие режимы уместны.
 *
 * Режимы подобраны под задачу, а не «по кругу»: форму глагола нужно извлекать
 * из памяти на скорость, предлог — различать в контексте, фразу — собирать.
 */
export type SessionKind =
  /**
   * Слова И СРАЗУ фразы из них, в одной сессии (владелец, 2026-08-16: «сессии
   * могут включать в себя и отработку слов и сразу фраз с этими словами, так
   * лучше будет»). Слоты 4–7 знакомят со словами, 8–12 собирают из них фразы —
   * человек не встречает слово, которого не видел, но и не ждёт целую сессию.
   */
  | 'words_then_phrases'
  /** Фразы из слов, введённых ранее — когда новой лексики нет. */
  | 'phrases'
  /**
   * Неправильные глаголы С НЕМЕДЛЕННОЙ ОТРАБОТКОЙ во фразах: форма и её
   * применение в одной сессии. Владелец: «будет скучно, если целая сессия
   * будет учить одному неправильному глаголу».
   */
  | 'irregular_verbs'
  /** Предлоги по типам плюс фразы с ними — отдельно от общего потока. */
  | 'prepositions'
  /** Голос: произнести, сравнить с образцом, ответить вслух. */
  | 'voice'
  /** Возврат пройденного после задержки — активное припоминание. */
  | 'recall'
  /** Граница главы: сборка всего, без новых конструкций. */
  | 'checkpoint';

/**
 * Семьи заданий под каждый тип сессии.
 *
 * Обоснование выбора:
 * • irregular_verbs → speed_match ведущий (форму доводят до автоматизма),
 *   context_gap_grammar (форма по смыслу), listen_choose (went/want на слух
 *   неразличимы), scripted_repeat_compare (caught/bought не читаются по буквам);
 * • prepositions → context_gap_grammar ведущий (in/on/at различимы только в
 *   контексте), sound_contrast (в беглой речи предлоги безударны и глотаются),
 *   phrase_builder (ловит пропуск предлога — типичная ошибка русскоязычных);
 * • vocabulary → listen_choose и sound_contrast: сначала узнать слово на слух
 *   и на письме, до всякой сборки;
 * • voice → scripted_repeat_compare как ядро.
 */
export const SESSION_KIND_FAMILIES: Readonly<Record<SessionKind, readonly string[]>> =
  Object.freeze({
    // Сначала узнать слово (слух + различение), потом собрать из него фразу.
    words_then_phrases: [
      'listen_choose',
      'sound_contrast',
      'phrase_builder',
      'context_gap_grammar',
    ],
    phrases: ['phrase_builder', 'listen_choose', 'context_gap_grammar'],
    irregular_verbs: [
      'speed_match',
      'context_gap_grammar',
      'listen_choose',
      'scripted_repeat_compare',
    ],
    prepositions: ['context_gap_grammar', 'sound_contrast', 'phrase_builder'],
    voice: ['scripted_repeat_compare', 'listen_build_dictation'],
    recall: ['speed_match', 'listen_build_dictation', 'phrase_builder'],
    checkpoint: ['phrase_builder', 'listen_build_dictation', 'context_gap_grammar'],
  });

export interface EpisodeSessionPlanEntry {
  readonly sessionOrdinal: number;
  readonly kind: SessionKind;
  /** Тема сессии на языке ученика, без грамматического жаргона. */
  readonly title: string;
  /** Грамматические признаки, которые эта сессия вводит ВПЕРВЫЕ. */
  readonly teaches: readonly string[];
  /** Сессии, без которых эта непроходима. */
  readonly builtOn: readonly number[];
  /**
   * Активное припоминание: какие ранние сессии эта возвращает после задержки.
   * Повтор фраз здесь — намеренный, а не оплошность.
   */
  readonly recalls?: readonly number[];
}

/**
 * Семь глав по восемь сессий. Порядок внутри главы держит одно правило:
 * слово → фраза из этого слова → голос/припоминание → граница главы.
 */
export const EPISODE_01_SESSION_MAP_V1: readonly EpisodeSessionPlanEntry[] =
  Object.freeze([
    // ── Глава 1. Я: утверждение ───────────────────────────────────────────
    // Только I am. Ученик впервые говорит о себе и учится отрицанию.
    { sessionOrdinal: 1, kind: 'words_then_phrases', title: 'Я здесь', teaches: ['copula_be', 'first_person_singular', 'state_adjective', 'adverb_place'], builtOn: [] },
    { sessionOrdinal: 2, kind: 'phrases', title: 'Я не', teaches: ['negation_not'], builtOn: [1], recalls: [1] },
    { sessionOrdinal: 3, kind: 'words_then_phrases', title: 'Как я себя чувствую', teaches: ['feeling_adjective'], builtOn: [1], recalls: [1, 2] },
    { sessionOrdinal: 4, kind: 'phrases', title: 'Я сокращаю: I am и I’m', teaches: ['contraction_im'], builtOn: [1, 2], recalls: [2, 3] },
    { sessionOrdinal: 5, kind: 'words_then_phrases', title: 'Вежливые слова', teaches: ['fixed_expression', 'politeness', 'greeting', 'farewell'], builtOn: [], recalls: [1] },
    { sessionOrdinal: 6, kind: 'words_then_phrases', title: 'Кто я: a и an', teaches: ['indefinite_article', 'profession_noun'], builtOn: [1], recalls: [3, 4] },
    { sessionOrdinal: 7, kind: 'voice', title: 'Скажи вслух: о себе', teaches: ['spoken_production'], builtOn: [1, 2, 3, 4, 6], recalls: [1, 2, 4, 6] },
    { sessionOrdinal: 8, kind: 'checkpoint', title: 'Всё про я целиком', teaches: [], builtOn: [1, 2, 3, 4, 5, 6, 7], recalls: [1, 2, 3, 4, 6] },

    // ── Глава 2. Ты: вопрос ───────────────────────────────────────────────
    // Второе лицо и инверсия. Спецификация: «I am / you are как фразовые модели».
    { sessionOrdinal: 9, kind: 'phrases', title: 'Ты есть', teaches: ['second_person'], builtOn: [1], recalls: [3] },
    { sessionOrdinal: 10, kind: 'phrases', title: 'Ты не', teaches: [], builtOn: [2, 9], recalls: [2, 9] },
    { sessionOrdinal: 11, kind: 'phrases', title: 'Ты готов? Вопрос', teaches: ['question_inversion'], builtOn: [9], recalls: [3, 9] },
    { sessionOrdinal: 12, kind: 'phrases', title: 'Я готов? Вопрос о себе', teaches: [], builtOn: [11], recalls: [1, 11] },
    { sessionOrdinal: 13, kind: 'phrases', title: 'Ты сокращаешь: you’re', teaches: ['contraction_youre'], builtOn: [4, 9], recalls: [4, 10] },
    { sessionOrdinal: 14, kind: 'words_then_phrases', title: 'Где я и где ты', teaches: ['place_noun', 'preposition_place'], builtOn: [9], recalls: [1, 11] },
    { sessionOrdinal: 15, kind: 'voice', title: 'Скажи вслух: спроси меня', teaches: [], builtOn: [11, 12, 13, 14], recalls: [9, 11, 12, 13, 14] },
    { sessionOrdinal: 16, kind: 'checkpoint', title: 'Я и ты целиком', teaches: [], builtOn: [9, 10, 11, 12, 13, 14, 15], recalls: [1, 9, 11, 13, 14] },

    // ── Глава 3. Он, она, оно ─────────────────────────────────────────────
    // Третье лицо единственного числа: is. Владелец разрешил полную таблицу.
    { sessionOrdinal: 17, kind: 'words_then_phrases', title: 'Он и она', teaches: ['third_person_pronoun', 'third_person_singular'], builtOn: [9], recalls: [3] },
    { sessionOrdinal: 18, kind: 'phrases', title: 'Он не, она не', teaches: [], builtOn: [17], recalls: [2, 10, 17] },
    { sessionOrdinal: 19, kind: 'phrases', title: 'Она готова? Вопрос о третьем', teaches: [], builtOn: [11, 17], recalls: [11, 17] },
    { sessionOrdinal: 20, kind: 'words_then_phrases', title: 'Оно: погода и вещи', teaches: ['impersonal_it', 'weather_adjective'], builtOn: [17], recalls: [3] },
    { sessionOrdinal: 21, kind: 'phrases', title: 'Сокращения: he’s, she’s, it’s', teaches: ['contraction_thirdperson'], builtOn: [13, 17, 20], recalls: [13, 18] },
    { sessionOrdinal: 22, kind: 'words_then_phrases', title: 'Моя семья', teaches: ['family_noun', 'possessive_my'], builtOn: [17], recalls: [6, 17] },
    { sessionOrdinal: 23, kind: 'voice', title: 'Скажи вслух: о человеке', teaches: [], builtOn: [17, 20, 21, 22], recalls: [17, 20, 22] },
    { sessionOrdinal: 24, kind: 'checkpoint', title: 'Он, она, оно целиком', teaches: [], builtOn: [17, 18, 19, 20, 21, 22, 23], recalls: [17, 19, 20, 21, 22] },

    // ── Глава 4. Мы и они ─────────────────────────────────────────────────
    // Множественное число: are. Таблица to be закрывается полностью.
    { sessionOrdinal: 25, kind: 'words_then_phrases', title: 'Мы', teaches: ['plural_pronoun'], builtOn: [17], recalls: [9] },
    { sessionOrdinal: 26, kind: 'words_then_phrases', title: 'Они', teaches: ['plural_noun'], builtOn: [25], recalls: [22, 25] },
    { sessionOrdinal: 27, kind: 'phrases', title: 'Мы не, они не', teaches: [], builtOn: [25, 26], recalls: [18, 25, 26] },
    { sessionOrdinal: 28, kind: 'phrases', title: 'Они готовы? Вопрос ко многим', teaches: [], builtOn: [19, 26], recalls: [19, 26] },
    { sessionOrdinal: 29, kind: 'phrases', title: 'Сокращения: we’re, they’re', teaches: ['contraction_plural'], builtOn: [21, 25, 26], recalls: [21, 27] },
    { sessionOrdinal: 30, kind: 'phrases', title: 'Не путать: isn’t и aren’t', teaches: ['negative_contraction'], builtOn: [27, 29], recalls: [18, 27] },
    { sessionOrdinal: 31, kind: 'recall', title: 'Вся таблица: я, ты, он, мы, они', teaches: [], builtOn: [], recalls: [1, 9, 17, 25, 26] },
    { sessionOrdinal: 32, kind: 'checkpoint', title: 'Вся таблица to be целиком', teaches: [], builtOn: [25, 26, 27, 28, 29, 30, 31], recalls: [1, 9, 17, 25, 30] },

    // ── Глава 5. Вопросы со словами ───────────────────────────────────────
    // What / where / who / how — только с to be, без вспомогательного do.
    { sessionOrdinal: 33, kind: 'words_then_phrases', title: 'Что это?', teaches: ['question_word', 'demonstrative'], builtOn: [20], recalls: [20, 28] },
    { sessionOrdinal: 34, kind: 'phrases', title: 'Где?', teaches: [], builtOn: [14, 33], recalls: [14, 33] },
    { sessionOrdinal: 35, kind: 'phrases', title: 'Кто это?', teaches: [], builtOn: [22, 33], recalls: [22, 33] },
    { sessionOrdinal: 36, kind: 'phrases', title: 'Как дела? Как он?', teaches: [], builtOn: [33], recalls: [3, 33] },
    { sessionOrdinal: 37, kind: 'words_then_phrases', title: 'Твой и мой', teaches: ['possessive_your'], builtOn: [22, 33], recalls: [22] },
    { sessionOrdinal: 38, kind: 'words_then_phrases', title: 'Его и её', teaches: ['possessive_his_her'], builtOn: [37], recalls: [17, 37] },
    { sessionOrdinal: 39, kind: 'voice', title: 'Скажи вслух: задай четыре вопроса', teaches: [], builtOn: [33, 34, 35, 36], recalls: [33, 34, 35, 36] },
    { sessionOrdinal: 40, kind: 'checkpoint', title: 'Вопросы целиком', teaches: [], builtOn: [33, 34, 35, 36, 37, 38, 39], recalls: [33, 34, 36, 37, 38] },

    // ── Глава 6. Мир вокруг ───────────────────────────────────────────────
    // Лексика вширь на той же конструкции: то же to be, новые слова.
    { sessionOrdinal: 41, kind: 'words_then_phrases', title: 'Мои вещи', teaches: ['everyday_object_noun'], builtOn: [33, 37], recalls: [33, 37] },
    { sessionOrdinal: 42, kind: 'words_then_phrases', title: 'Цвета', teaches: ['colour_adjective'], builtOn: [41], recalls: [41] },
    { sessionOrdinal: 43, kind: 'words_then_phrases', title: 'Большой и маленький', teaches: ['size_adjective', 'adjective_before_noun'], builtOn: [42], recalls: [42] },
    { sessionOrdinal: 44, kind: 'words_then_phrases', title: 'Числа до двадцати', teaches: ['number_1_20'], builtOn: [], recalls: [26] },
    { sessionOrdinal: 45, kind: 'words_then_phrases', title: 'Сколько тебе лет', teaches: ['age_expression'], builtOn: [44], recalls: [22, 44] },
    { sessionOrdinal: 46, kind: 'words_then_phrases', title: 'Какой человек', teaches: ['descriptive_adjective'], builtOn: [43], recalls: [17, 43] },
    { sessionOrdinal: 47, kind: 'voice', title: 'Скажи вслух: опиши вещь и человека', teaches: [], builtOn: [42, 43, 46], recalls: [41, 43, 46] },
    { sessionOrdinal: 48, kind: 'checkpoint', title: 'Описание целиком', teaches: [], builtOn: [41, 42, 43, 44, 45, 46, 47], recalls: [41, 43, 44, 45, 46] },

    // ── Глава 7. Свободный разговор о себе ────────────────────────────────
    // Ничего нового: сборка всего в связную речь плюс экзамен.
    { sessionOrdinal: 49, kind: 'phrases', title: 'Это и то', teaches: ['demonstrative_distance'], builtOn: [33, 41], recalls: [33, 41] },
    { sessionOrdinal: 50, kind: 'phrases', title: 'Чей это', teaches: ['possessive_question', 'possessive_apostrophe'], builtOn: [38, 49], recalls: [38, 41] },
    { sessionOrdinal: 51, kind: 'phrases', title: 'Моё, твоё, его', teaches: ['possessive_pronoun'], builtOn: [50], recalls: [37, 38, 50] },
    { sessionOrdinal: 52, kind: 'phrases', title: 'И, но, тоже', teaches: ['conjunction_and_but_too'], builtOn: [25, 46], recalls: [46] },
    { sessionOrdinal: 53, kind: 'phrases', title: 'Когда не понял', teaches: ['clarification_request', 'register_politeness'], builtOn: [5, 36], recalls: [5, 36] },
    { sessionOrdinal: 54, kind: 'recall', title: 'Вспоминаем всё', teaches: [], builtOn: [], recalls: [1, 9, 17, 25, 33, 41] },
    { sessionOrdinal: 55, kind: 'voice', title: 'Скажи вслух: расскажи о себе', teaches: [], builtOn: [49, 51, 52, 53], recalls: [1, 6, 22, 45, 46] },
    { sessionOrdinal: 56, kind: 'checkpoint', title: 'Экзамен урока', teaches: [], builtOn: [8, 16, 24, 32, 40, 48, 55], recalls: [8, 16, 24, 32, 40, 48] },
  ]);

/** Всё, что объяснено к началу указанной сессии (включая её собственное интро). */
export function featuresTaughtBySession(sessionOrdinal: number): ReadonlySet<string> {
  const taught = new Set<string>();
  for (const entry of EPISODE_01_SESSION_MAP_V1) {
    if (entry.sessionOrdinal > sessionOrdinal) break;
    for (const feature of entry.teaches) taught.add(feature);
  }
  return taught;
}
