// зачем: урок 1 — это 56 сессий (владелец, 2026-08-16), а спецификация даёт
// эпизоду 1 всего ~7 фраз. Владелец выбрал «расширять тему вглубь»: тема одна —
// «рассказать о себе и о людях вокруг», но покрытие полное.
//
// ПРАВИЛА ВЛАДЕЛЬЦА (2026-08-16), по которым построена эта карта:
//
// 1. НЕ КАЖДАЯ СЕССИЯ — ФРАЗЫ. Есть разные типы (см. SessionKind ниже).
// 2. СЛОВА ИДУТ ДО ФРАЗ. «Юзер не может начать сессию, не ознакомившись со
//    словами — он же не знает их». Поэтому перед каждой фразовой сессией стоит
//    словарная, которая вводит её лексику. То же для неправильных глаголов.
// 3. АКТИВНОЕ ПРИПОМИНАНИЕ. Фразы МОГУТ повторяться в поздних сессиях — это не
//    дублирование, а извлечение из памяти после задержки.
// 4. ОТДЕЛЬНЫЕ СЕССИИ на неправильные глаголы и предлоги — как в эталоне, где
//    предлоги вынесены в diagnosis_training_preposition_* и не смешаны с фразами.
// 5. ГОЛОСОВЫЕ СЕССИИ отдельным типом.
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
  /** Новые слова перед фразовой сессией: узнавание, значение, звучание. */
  | 'vocabulary'
  /** Фразы из уже введённых слов — основная механика эталона. */
  | 'phrases'
  /** Неправильные глаголы порцией по 6, как в эталоне. */
  | 'irregular_verbs'
  /** Предлоги по типам, отдельно от фраз. */
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
    vocabulary: ['listen_choose', 'sound_contrast', 'speed_match'],
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
    // ── Глава 1. Я и собеседник ───────────────────────────────────────────
    { sessionOrdinal: 1, kind: 'phrases', title: 'Первые слова о себе', teaches: ['copula_be', 'first_person_singular', 'state_adjective', 'adverb_place', 'negation_not'], builtOn: [] },
    { sessionOrdinal: 2, kind: 'phrases', title: 'Вежливые слова и знакомство', teaches: ['fixed_expression', 'politeness', 'greeting', 'farewell', 'self_introduction', 'indefinite_article', 'present_simple_verb', 'preposition_place'], builtOn: [1] },
    { sessionOrdinal: 3, kind: 'phrases', title: 'Спросить и ответить', teaches: ['second_person', 'question_inversion', 'short_answer', 'turn_taking'], builtOn: [1, 2] },
    { sessionOrdinal: 4, kind: 'phrases', title: 'Вопросы со словами что, где, как', teaches: ['question_word', 'third_person_singular', 'possessive_your', 'possessive_my', 'definite_article', 'quantifier', 'demonstrative'], builtOn: [1, 2, 3] },
    { sessionOrdinal: 5, kind: 'voice', title: 'Скажи вслух: знакомство', teaches: ['spoken_production'], builtOn: [1, 2, 3, 4], recalls: [1, 2, 3] },
    { sessionOrdinal: 6, kind: 'vocabulary', title: 'Слова: он, она, люди', teaches: ['third_person_pronoun_lexis'], builtOn: [4] },
    { sessionOrdinal: 7, kind: 'phrases', title: 'Он, она, оно', teaches: ['third_person_pronoun'], builtOn: [6], recalls: [1, 3] },
    { sessionOrdinal: 8, kind: 'checkpoint', title: 'Собираем знакомство целиком', teaches: [], builtOn: [1, 2, 3, 4, 5, 6, 7], recalls: [1, 2, 3, 4, 7] },

    // ── Глава 2. Люди вокруг меня ─────────────────────────────────────────
    { sessionOrdinal: 9, kind: 'vocabulary', title: 'Слова: мы, они, много', teaches: ['plural_lexis'], builtOn: [7] },
    { sessionOrdinal: 10, kind: 'phrases', title: 'Мы и они', teaches: ['plural_pronoun', 'plural_noun'], builtOn: [9], recalls: [7] },
    { sessionOrdinal: 11, kind: 'vocabulary', title: 'Слова: семья', teaches: ['family_noun'], builtOn: [7] },
    { sessionOrdinal: 12, kind: 'phrases', title: 'Моя семья', teaches: ['possessive_his_her'], builtOn: [11], recalls: [4] },
    { sessionOrdinal: 13, kind: 'phrases', title: 'Чей это', teaches: ['possessive_question', 'possessive_apostrophe'], builtOn: [12], recalls: [4] },
    { sessionOrdinal: 14, kind: 'vocabulary', title: 'Слова: числа до двадцати', teaches: ['number_1_20'], builtOn: [] },
    { sessionOrdinal: 15, kind: 'phrases', title: 'Сколько лет', teaches: ['age_expression'], builtOn: [14], recalls: [12] },
    { sessionOrdinal: 16, kind: 'checkpoint', title: 'Рассказ о семье целиком', teaches: [], builtOn: [9, 10, 11, 12, 13, 14, 15], recalls: [7, 10, 12, 13, 15] },

    // ── Глава 3. Мои вещи и место ─────────────────────────────────────────
    { sessionOrdinal: 17, kind: 'vocabulary', title: 'Слова: мои вещи', teaches: ['everyday_object_noun'], builtOn: [4] },
    { sessionOrdinal: 18, kind: 'phrases', title: 'Это моё', teaches: ['demonstrative_distance'], builtOn: [17], recalls: [4, 13] },
    { sessionOrdinal: 19, kind: 'prepositions', title: 'Где лежит: in, on, at', teaches: ['preposition_position'], builtOn: [17] },
    { sessionOrdinal: 20, kind: 'phrases', title: 'Где что лежит', teaches: [], builtOn: [19], recalls: [17, 18] },
    { sessionOrdinal: 21, kind: 'vocabulary', title: 'Слова: цвета и размеры', teaches: ['colour_adjective', 'size_adjective'], builtOn: [17] },
    { sessionOrdinal: 22, kind: 'phrases', title: 'Какой он', teaches: ['descriptive_adjective', 'adjective_before_noun'], builtOn: [21], recalls: [12] },
    { sessionOrdinal: 23, kind: 'voice', title: 'Скажи вслух: моя комната', teaches: [], builtOn: [20, 22], recalls: [17, 20, 22] },
    { sessionOrdinal: 24, kind: 'checkpoint', title: 'Дом и вещи целиком', teaches: [], builtOn: [17, 18, 19, 20, 21, 22, 23], recalls: [18, 20, 22] },

    // ── Глава 4. Что я делаю ──────────────────────────────────────────────
    { sessionOrdinal: 25, kind: 'vocabulary', title: 'Слова: дела дня', teaches: ['daily_verb_lexis'], builtOn: [2] },
    { sessionOrdinal: 26, kind: 'phrases', title: 'Каждый день', teaches: ['present_simple_routine', 'third_person_s'], builtOn: [25], recalls: [7] },
    { sessionOrdinal: 27, kind: 'phrases', title: 'Я не делаю', teaches: ['negation_do_not_verb'], builtOn: [26], recalls: [1] },
    { sessionOrdinal: 28, kind: 'phrases', title: 'Ты делаешь?', teaches: ['question_do'], builtOn: [26, 27], recalls: [3] },
    { sessionOrdinal: 29, kind: 'vocabulary', title: 'Слова: время и дни', teaches: ['time_lexis', 'weekday_noun'], builtOn: [14] },
    { sessionOrdinal: 30, kind: 'prepositions', title: 'Когда: in, on, at', teaches: ['preposition_time'], builtOn: [29], recalls: [19] },
    { sessionOrdinal: 31, kind: 'phrases', title: 'Который час и как часто', teaches: ['time_telling', 'frequency_adverb'], builtOn: [29, 30], recalls: [26] },
    { sessionOrdinal: 32, kind: 'checkpoint', title: 'Мой день целиком', teaches: [], builtOn: [25, 26, 27, 28, 29, 30, 31], recalls: [26, 27, 28, 31] },

    // ── Глава 5. Прямо сейчас ─────────────────────────────────────────────
    { sessionOrdinal: 33, kind: 'phrases', title: 'Прямо сейчас', teaches: ['present_continuous'], builtOn: [26], recalls: [25] },
    { sessionOrdinal: 34, kind: 'phrases', title: 'Сейчас или обычно', teaches: ['continuous_vs_simple'], builtOn: [33], recalls: [26] },
    { sessionOrdinal: 35, kind: 'voice', title: 'Скажи вслух: что происходит', teaches: [], builtOn: [33, 34], recalls: [33] },
    { sessionOrdinal: 36, kind: 'vocabulary', title: 'Слова: умения', teaches: ['ability_lexis'], builtOn: [25] },
    { sessionOrdinal: 37, kind: 'phrases', title: 'Умею и не умею', teaches: ['modal_can'], builtOn: [36], recalls: [27] },
    { sessionOrdinal: 38, kind: 'phrases', title: 'Можно? Просьба', teaches: ['modal_can_permission', 'polite_request'], builtOn: [37], recalls: [2] },
    { sessionOrdinal: 39, kind: 'recall', title: 'Вспоминаем всё о себе', teaches: [], builtOn: [], recalls: [1, 7, 12, 22, 26, 33, 37] },
    { sessionOrdinal: 40, kind: 'checkpoint', title: 'Разговор о делах целиком', teaches: [], builtOn: [33, 34, 35, 36, 37, 38, 39], recalls: [33, 34, 37, 38] },

    // ── Глава 6. Что было ─────────────────────────────────────────────────
    { sessionOrdinal: 41, kind: 'phrases', title: 'Было и не было', teaches: ['past_be'], builtOn: [1, 7], recalls: [1] },
    { sessionOrdinal: 42, kind: 'irregular_verbs', title: 'Неправильные глаголы: первая шестёрка', teaches: ['past_simple_irregular'], builtOn: [41] },
    { sessionOrdinal: 43, kind: 'phrases', title: 'Вчера я делал', teaches: ['past_simple_regular'], builtOn: [42], recalls: [26] },
    { sessionOrdinal: 44, kind: 'irregular_verbs', title: 'Неправильные глаголы: вторая шестёрка', teaches: [], builtOn: [42], recalls: [42] },
    { sessionOrdinal: 45, kind: 'phrases', title: 'Я не делал. Ты был?', teaches: ['past_negation', 'past_question'], builtOn: [43, 44], recalls: [27, 28] },
    { sessionOrdinal: 46, kind: 'prepositions', title: 'Как долго: for и since', teaches: ['preposition_duration'], builtOn: [30, 43] },
    { sessionOrdinal: 47, kind: 'phrases', title: 'Короткая история', teaches: ['past_time_marker', 'narrative_sequence'], builtOn: [45, 46], recalls: [43] },
    { sessionOrdinal: 48, kind: 'checkpoint', title: 'Рассказ о прошлом целиком', teaches: [], builtOn: [41, 42, 43, 44, 45, 46, 47], recalls: [41, 43, 45, 47] },

    // ── Глава 7. Свободная речь о себе ────────────────────────────────────
    { sessionOrdinal: 49, kind: 'vocabulary', title: 'Слова: планы и места', teaches: ['plan_lexis'], builtOn: [25] },
    { sessionOrdinal: 50, kind: 'phrases', title: 'Планы', teaches: ['going_to_future'], builtOn: [49], recalls: [33] },
    { sessionOrdinal: 51, kind: 'prepositions', title: 'Куда: to, into, from', teaches: ['preposition_direction'], builtOn: [19, 50] },
    { sessionOrdinal: 52, kind: 'phrases', title: 'Почему и потому что', teaches: ['because_clause', 'conjunction_and_but_too'], builtOn: [50], recalls: [37] },
    { sessionOrdinal: 53, kind: 'phrases', title: 'Сравниваем', teaches: ['comparative_adjective', 'superlative_adjective'], builtOn: [22], recalls: [22] },
    { sessionOrdinal: 54, kind: 'phrases', title: 'Когда не понял', teaches: ['clarification_request', 'register_politeness'], builtOn: [38], recalls: [2, 38] },
    { sessionOrdinal: 55, kind: 'voice', title: 'Скажи вслух: рассказ о себе', teaches: [], builtOn: [50, 52, 53, 54], recalls: [1, 12, 26, 43, 50] },
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
